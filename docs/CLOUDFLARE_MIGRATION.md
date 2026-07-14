# Cloudflare migration and cutover

Reviewed: 2026-07-14

## Target

```text
Browser / Expo
      |
Cloudflare Worker (one deployment)
  |-- Workers Static Assets -> React/Vite SPA
  |-- Express via Cloudflare Node HTTP adapter -> versioned REST API
  |-- Durable Object -> browser/xAI realtime voice WebSocket
  |-- Queue producer + consumer -> audiobook generation
  |-- Cron Trigger -> notifications, daily, streak, and weekly tasks
  |-- native R2 binding -> photos, voice samples, audiobooks
  `-- Hyperdrive -> existing managed PostgreSQL

PostgreSQL remains the source of truth. Cloudflare does not provide managed
PostgreSQL; Hyperdrive is the supported Cloudflare connection and pooling layer.
Moving this schema to D1 would change PostgreSQL semantics and replace the queue,
transaction, array, JSONB, and migration model, so it is intentionally not part
of this migration.
```

The deployable implementation is in `services/cloudflare/`. The same Express
application is composed by `services/api/app.js`; Node-only process startup is
isolated in `services/api/nodeServer.js`.

## What is already implemented

- Static assets and API in one Worker deployment.
- Express on Workers with `nodejs_compat` and Hyperdrive's connection string.
- Native R2 in Workers and S3-compatible R2 in the temporary Node runtime,
  including an ownership registry and daily cleanup for abandoned recordings.
- Cloudflare Queue producer/consumer with retry, dead-letter queue, and durable
  PostgreSQL job status.
- Cron Trigger dispatch with Europe/London daylight-saving handling and database
  locks.
- Durable Object voice sessions with one-time tickets, JWT revocation, user
  existence, quota, origin, message, buffer, and session-duration checks.
- Cloudflare observability, dry-run bundle validation, CI, deployment workflow,
  and scheduled verified PostgreSQL archives to R2.

## One-time account setup

Use a Workers Paid plan for production CPU allowances and predictable background
work. Authenticate Wrangler:

```bash
npx wrangler login
```

Create storage and queues:

```bash
npx wrangler r2 bucket create easymemoir-uploads
npx wrangler r2 bucket create easymemoir-uploads-preview
npx wrangler r2 bucket create easymemoir-backups
npx wrangler queues create easy-memoir-audiobook
npx wrangler queues create easy-memoir-audiobook-dlq
npx wrangler queues create easy-memoir-background
npx wrangler queues create easy-memoir-background-dlq
```

Create a cache-disabled Hyperdrive configuration. Cache is disabled because
authentication, payments, job status, and story writes require read-after-write
consistency:

```bash
npx wrangler hyperdrive create easy-memoir-production \
  --connection-string="$DATABASE_URL" \
  --caching-disabled
```

Copy the returned ID into `services/cloudflare/wrangler.jsonc`, replacing the
32-zero placeholder. Do not put the database URL in Wrangler variables.

Set Worker secrets. Repeat `wrangler secret put` for every integration enabled
in production:

```bash
for name in \
  JWT_SECRET \
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \
  GROK_API_KEY REPLICATE_API_TOKEN FISH_AUDIO_API_KEY \
  LULU_CLIENT_KEY LULU_CLIENT_SECRET \
  RESEND_API_KEY \
  TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID TELEGRAM_WEBHOOK_SECRET \
  INTERNAL_CRON_SECRET HEALTH_METRICS_SECRET \
  TELNYX_API_KEY TELNYX_CONNECTION_ID TELNYX_PHONE_NUMBER TELNYX_WEBHOOK_SECRET
do
  npx wrangler secret put "$name" --config services/cloudflare/wrangler.jsonc
done
```

Configure the GitHub `production` environment:

- Secrets: `DATABASE_URL`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and
  `R2_SECRET_ACCESS_KEY`.
- Variables: `CLOUDFLARE_DEPLOY_ENABLED=true`,
  `CLOUDFLARE_BACKUPS_ENABLED=true`, and
  `R2_BACKUP_BUCKET=easymemoir-backups`.
- Protect the environment with required reviewers for the first cutover.

Use a dedicated R2 API token for backups. The Worker itself uses an R2 binding
and does not need R2 access-key secrets.

## Local and preview verification

Install and run all deterministic checks:

```bash
npm ci
npm run test:all
npm run build:cloudflare
cd apps/mobile && npm ci && npm run typecheck && cd ../..
```

For local Worker development, avoid committing a connection string:

```bash
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DATABASE_URL"
npm run cloudflare:dev
```

Before deploying, apply migrations through the direct PostgreSQL connection:

```bash
NODE_ENV=production npm run migrate:status
NODE_ENV=production npm run migrate
```

Inventory the legacy local/provider media first, then copy it to R2. The command
is a dry run unless `--apply` is present and updates chapter-image URLs only
after the corresponding object upload succeeds:

```bash
npm run cloudflare:migrate-media
npm run cloudflare:migrate-media -- --apply
```

Deploy initially to the generated `workers.dev` hostname:

```bash
npm run cloudflare:check
npm run cloudflare:deploy
npm run cloudflare:tail
```

## Preview smoke test

Verify these against the `workers.dev` URL before DNS cutover:

1. `/`, one prerendered marketing route, and a hashed static asset.
2. `GET /api/health` and `GET /api/v1/payments/products`.
3. Register/login/logout and confirm a logged-out JWT is rejected.
4. Password reset request and completion.
5. Create/edit/read a story and upload/read/delete a photo; verify private media
   is fetched with an Authorization header rather than a JWT query parameter.
6. Stripe test Checkout plus a signed webhook and duplicate replay.
7. Audiobook enqueue, queue consumption, status polling, R2 download, retry,
   and DLQ behavior.
8. Authenticated realtime voice and the public one-time demo ticket.
9. Manually invoke the scheduled handler locally and check `cron_health`.
10. GDPR export and deletion of database rows plus R2 objects.

Inspect Worker logs, Queue backlog/DLQ, Durable Object errors, R2 objects, and
Hyperdrive errors throughout the test.

## Domain cutover

Only after preview passes, add the apex hostname as a Worker Custom Domain.
In `services/cloudflare/wrangler.jsonc` add:

```jsonc
"routes": [
  { "pattern": "easymemoir.co.uk", "custom_domain": true }
]
```

The hostname cannot retain an existing CNAME when it becomes a Custom Domain.
Cloudflare creates the DNS record and certificate. Configure `www` as a
Cloudflare redirect to the apex rather than running a second application origin.

Then:

1. Freeze releases on the old provider.
2. Take and verify an on-demand database archive.
3. Apply final forward-only migrations.
4. Deploy the Worker and attach the Custom Domain.
5. Update Stripe, Telegram, Telnyx, Google OAuth, and any other allowlists or
   webhook dashboards to the canonical HTTPS URLs.
6. Set `EXPO_PUBLIC_API_URL=https://easymemoir.co.uk` for the next Expo build.
7. Monitor errors, p95 latency, database connections, Queue lag/DLQ, Cron health,
   R2 failures, payment events, and voice connection failures.
8. Keep the former origin intact but unable to run cron/queue consumers for at
   least one rollback window.

## Rollback

- Application: use `wrangler rollback` to restore the previous Worker version.
- Domain: detach the Custom Domain and restore the prior proxied DNS record if
  the Worker platform itself must be bypassed.
- Jobs: pause the Queue consumer before re-enabling the old pg-boss worker; never
  run both consumers for the same logical job.
- Schedules: remove/pause the Cron Trigger before re-enabling Node cron.
- Database: do not run a down migration. Deploy a compensating forward migration.
- Media: R2 is shared by both runtimes, so a compute rollback does not move files.

## Backups and retention

The scheduled GitHub workflow creates a PostgreSQL custom-format archive,
validates its catalog, writes a SHA-256 sidecar, and uploads both to the backup
R2 bucket. For stronger assurance, set `RESTORE_VERIFY_DATABASE_URL` only to a
dedicated disposable database; the verification step wipes and restores it.

Configure an R2 lifecycle rule for `daily/` in the backup bucket to enforce the
retention policy remotely. Quarterly, restore a randomly selected archive into
an isolated database and run application smoke tests.

## References

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Express on Workers](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/)
- [Hyperdrive PostgreSQL](https://developers.cloudflare.com/hyperdrive/get-started/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

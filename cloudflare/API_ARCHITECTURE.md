# API migration state

The selected deployment starts fresh on the new easy Memoir account. The native Fetch API uses D1 repositories, private R2, Queues, scheduled tasks and voice/phone Durable Objects. See [api/README.md](api/README.md) for current implemented contracts and provider gates. The old PostgreSQL-backed Node/Express runtime remains in the repository and its source data is retained. A historical data import is a separate optional workflow requiring the preservation and cutover evidence below. No hosted API acceptance or domain switch is implied by local implementation.

## Target services

| Current dependency                 | Cloudflare target                                            | Required semantic work                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Express HTTP routes                | API Worker with explicit Fetch routes                        | Preserve `/api` and `/api/v1`, auth scopes, private caching, webhook bytes and error contracts.                         |
| PostgreSQL                         | D1 and explicit repositories                                 | Port every query and transaction; JSON, booleans, arrays, decimal money and dates require deliberate encoding/decoding. |
| Local photos, voice samples, books | Private R2 binding                                           | Use unchanged keys: photos at root, `voices/filename`, `audiobooks/filename`; route ownership checks remain mandatory.  |
| pg-boss                            | Queues plus D1 job status and an outbox                      | Preserve owner-scoped polling, retry/timeout behavior, durable result filenames and duplicate-delivery safety.          |
| node-cron                          | Scheduled Worker events and durable execution claims         | Preserve UTC daily reset and Europe/London reminders/streak/weekly times through DST.                                   |
| ws voice/Telnyx                    | Durable Object session coordinator                           | Preserve authentication, provider connections, transcript writes, expiry and cleanup.                                   |
| Redis cache/locks/revocations      | KV for disposable cache; D1/DO for security and coordination | Do not rely on eventually consistent KV for immediate logout revocation or exclusive claims.                            |

Cloudflare's [Express tutorial](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/) documents the Node HTTP adapter. Runtime compatibility does not convert PostgreSQL SQL, provide persistent local files, replace scheduling or implement the current WebSocket upgrade handler. Hyperdrive can connect a Worker to an external PostgreSQL database, but that would leave the database outside Cloudflare.

## Implemented source improvements

- `services/api/app.js` composes HTTP behavior without starting a listener, migrating a database or scheduling jobs. Node entry points load `.env` before SDK/database modules evaluate.
- Worker boot uses the real migration runner. A PostgreSQL session advisory lock serializes API/worker schema startup; each file keeps its real transaction and rollback.
- Dedicated workers own the cron registry and stop its schedules during shutdown. API-only legacy deployments must explicitly set `RUN_CRON_IN_API=true` until a dedicated worker is deployed. Never enable scheduling in both services without an effective shared execution claim.
- Queue startup waits for initialization and queue creation, is shared by concurrent callers, can retry failed startup and waits during shutdown. Queue names now satisfy pg-boss 12 constraints (`audiobook-generate`, `epub-generate`, `chapter-image`). Inspect any older pending jobs before changing runtime versions or replaying work.
- Photos, voices and audiobooks use one durable media boundary. Production requires R2 by default. `ALLOW_LOCAL_UPLOADS=true` explicitly permits legacy local files while copying them; an R2 outage never falls back to a successful ephemeral-disk upload. No files or credentials are automatically migrated by this refactor.
- `api-storage.js` implements the native R2 binding boundary with the same keys and operations. It is not a deployed API and does not provide an unauthenticated media endpoint. Node reads return `Buffer`; native reads return `Uint8Array` and stream bodies are Web streams.
- Shutdown stops scheduling, drains HTTP/WebSocket/queue activity, then closes the DB. A deadline is armed before asynchronous cleanup; repeated signals share one shutdown.
- Stripe's webhook path retains exact bytes for signature verification. Multipart limits return 413, remote failures return service errors, and private photo/download streams avoid public cache storage.

## D1 contract

The source catalog now exposes `checkoutAvailable`; new monthly/yearly subscription checkout is disabled because its existing ownership, renewal/cancellation and retry lifecycle is incomplete. Historical catalog IDs/prices remain intact. Subscription events are not payment parity for D1, and existing recurring charges require a dedicated lifecycle audit before cutover. Checkout redirect URLs now use parsed origin equality and reject credentials instead of accepting string-prefix matches.

Browser analytics load and send only after analytics consent. Revocation or consent changes in another tab stop collection. Sentry keeps basic error reporting, with replay and performance sampling disabled. These implemented consent changes do not authorize additional analytics collection during migration.

Use `db/schema.sql` and `db/mapping.json` as the explicit stored-data contract. Source JSONB is raw JSON text, arrays are JSON text, booleans are 0/1, exact decimal values are strings, and timestamps preserve source precision. Decode at repository boundaries to preserve existing API return shapes. Do not execute PostgreSQL through a broad regex rewrite or emulate `BEGIN`/`COMMIT` as no-ops. D1 `batch()` can atomically run prepared statements; read-modify-write workflows need constraints, conditional writes or a coordinator, with tests for conflicts and rollback. Existing `db/columns.js` constants are not a complete schema.

Queued work requires an outbox: commit job intent and application changes atomically, publish it idempotently, store attempt/result state, and acknowledge a delivery only after durable completion. A worker crash between publishing and marking the outbox must not create a second audiobook or charge. Migration of pg-boss tables is archival evidence, not runnable Cloudflare Queues work.

## Cutover acceptance

1. Export a consistent PostgreSQL snapshot and source schema, copy private media, and validate counts, types, foreign keys and object hashes against the staged D1/R2 data.
2. Port and test auth/session/revocation, stories/photos, payments and idempotent webhooks, account deletion, memoir export, voice sessions, job status/generation, and scheduled notifications. Preserve authenticated authorization on both route prefixes.
3. Run the deployed API against a separate staging D1/R2 environment. Exercise denied ownership, expired/revoked tokens, missing files, provider outages, duplicate events/deliveries and concurrent transactional updates.
4. Freeze source writes, perform a final delta transfer, repeat data/media verification, then switch the frontend service binding and DNS with a rollback window.
5. Decommission Railway only after destination parity and final source backup verification. This workspace does not currently satisfy these cutover conditions.

# Fresh Cloudflare release verification

The selected release starts with an empty account database on the new **easy Memoir** account. Existing Railway accounts and memories are not imported, and old source resources are retained. Implementation and local verification do not establish a completed public deployment.

## Infrastructure evidence

- Account: `bbdbba416f07c76f4c2754f8a61807f4`, using Wrangler profile `easy-memoir`.
- Isolated D1: `easy-memoir-staging`, `64811ce9-8843-47d6-91b0-a112a1974f90`.
- The guarded initializer verified the 56-table foundation. Frozen native migrations `0001` through `0012` were applied remotely in order.
- Remote schema readback matched all **219** expected tables, indexes and triggers: zero missing, changed or unexpected objects.
- Static catalog seed verified 108 prompts, eight collections, 41 collection items and 33 achievement definitions. This contains no account data.
- Generation, voice compilation, print and artwork staging queues were created. The config binds separate voice and phone Durable Object classes.
- New session, ticket, notification and printer signing secrets were generated outside the checkout. Old account JWTs cannot authorize newly reused account IDs.

Protected initialization, catalog and schema receipts remain outside Git in the operator's deployment directory. No credentials belong in this report.

## Local evidence

Native API tests execute actual workerd, D1, R2 and Durable Objects with synthetic accounts and fake external transports. Coverage includes owner/scope/revocation denial, transaction rollback, paid-effect ambiguity, duplicate events, late uploads, full account export, erasure fences, timezone schedules and interrupted jobs.

The browser check used built assets and the real web Worker → API service binding → native API → local D1/R2 path. It registered a synthetic account, saved an earliest-memory answer, reloaded the page and displayed the exact saved text. A separate read-only D1 check found exactly one corresponding owner and story row. Local outbound provider calls were denied. No customer data, actual emails, calls, purchases or refunds were used.

Backend tests, PostgreSQL migration/backup restoration tests, frontend tests, database tooling, edge routing, readiness checks, lint, formatting, production builds and explicit API/web Wrangler bundle checks are recorded separately by suite. Dependency audit has no high or critical findings; moderate transitive findings remain for review.

Release checks passed: 241 native API tests, 143 web tests, 33 database-tool tests, 13 edge-routing tests and eight readiness tests. Legacy backend verification passed 387 unit tests and all 16 dedicated PostgreSQL tests. Mobile history transport tests and TypeScript checks passed, including authenticated account switching and explicit failures instead of false empty history. Frontend/server/security/Cloudflare lint has no errors; existing warnings remain. Formatting, production build, API/web bundle validation and the staged secret scan passed. These suite totals overlap some focused verification and must not be summed as distinct scenarios.

## Hosted work still required

R2 activation and Workers Paid are account subscription steps. After activation, create the private media bucket, upload the checked font, install the protected secrets and deploy the explicit staging API/web configs. Verify the hosted browser flow, private files, bcrypt CPU, queues, cron and WebSocket upgrades before switching traffic.

Keep paid publishing, printing, phone calls, Telegram and notification delivery disabled until their real provider configuration and acceptance checks pass. Google requires matching browser/API client IDs and the deployed origin authorized in Google Console. Fake-provider tests do not establish actual delivery or merchant acceptance.

The domain still uses Spaceship nameservers at the last check. No DNS change or Railway retirement is established by this report. Historical source-import/cutover gates remain a separate optional workflow.

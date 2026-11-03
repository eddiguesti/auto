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

The follow-up launch guards pass the complete **162-test web suite**, including
account switching, logout, delayed AI responses and failed-regeneration recovery.
Private assistant drafts are owner-scoped and removed on logout; unavailable AI
never fabricates a response or composes a paid story merely because the dialog
was closed. Edited drafts remain available after failed regeneration. Preview
availability and manual routing are covered with the flag both enabled and off.

## Hosted preview evidence — 3 November 2026

Workers Paid and R2 are active. The private Standard-class bucket
`easy-memoir-media-staging` contains the checked Noto Serif font. The explicit
staging API and web configs are deployed; the API has no public Worker URL or
route and is reached through the web Worker's service binding.

Preview: <https://easy-memoir-web-staging.easy-memoir.workers.dev>.

Hosted acceptance passed registration, login, logout/revocation, owner isolation,
story save/read, full account export and account erasure. A memory edited in the
browser survived an independent browser sign-in and reload. A valid PNG uploaded
through the app round-tripped with the same hash; anonymous and other-account
access were denied, and deletion removed access. All ten scheduled maintenance
tasks reported success. Registration and login completed within the configured
CPU budget. Every synthetic account, story and photo was erased afterward;
read-only remote D1 counts confirmed zero users, stories and photos.

Seven bootstrap secrets are installed. Paid AI/voice, merchant, phone, Telegram
and email-delivery credentials are not installed. A read-only check rejected the
saved Resend key with HTTP 401. The preview must be built with
`VITE_MANUAL_PREVIEW=true npm run build:cloudflare` so its notice and primary
manual-writing route accurately describe this configuration.

Protected hosted acceptance and cleanup receipts remain outside the checkout.
No real provider emails, calls, purchases or refunds were used.

## Usage notifications

An account-wide Cloudflare budget alert named **Easy Memoir — first usage charge**
was saved and visually verified at a $0.01 threshold. An hourly local Codex monitor
warns at new 80%, 90% and 100% R2 allowance crossings. Its read-only helper and
14 focused tests are retained in the protected operator deployment directory.
Storage and operation analytics are accessible; billing-period, cost and alert
policy API reads currently return 403. Fallback operation warnings use a clearly
labelled conservative 31-day window, not verified billing-period utilization.
Metrics can lag, and neither notification mechanism imposes an R2 spending cap.
Workers Paid's accepted $5/month base fee is separate from metered usage alerts.

## Work required before production cutover

Keep paid publishing, printing, phone calls, Telegram and notification delivery
disabled until real configuration and provider acceptance pass. AI/voice services
remain off pending the operator's cost preference. Restore valid transactional
email credentials, authorize the deployed Google origin, and verify real voice
WebSocket/provider acceptance before advertising those features as available.
Fake-provider tests do not establish actual delivery or merchant acceptance.

A Free Cloudflare zone is prepared but pending activation. Its assigned
nameservers are `lovisa.ns.cloudflare.com` and `milan.ns.cloudflare.com`. The
domain still uses Spaceship nameservers and retains an existing DNSSEC DS record.
Before changing delegation, export and compare the complete registrar zone,
preserve mail/verification records and coordinate removal of the old DNSSEC
delegation. After activation, attach the frontend domain, update application
origins and re-enable DNSSEC using Cloudflare's new DS. No authoritative DNS
change or Railway retirement is established by this report.

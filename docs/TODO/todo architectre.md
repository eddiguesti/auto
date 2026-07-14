# todo architectre

> Canonical architecture improvement backlog for Easy Memoir  
> Reviewed: 2026-07-14  
> Scope: web, mobile, API, worker, database, storage, integrations, security, delivery, observability, testing, and documentation

## Outcome

Keep Easy Memoir as a **modular monolith** with one HTTP/WebSocket API and one background worker. Do not split it into microservices. First make the existing runtime safe and reproducible; then migrate one feature at a time behind clear module, contract, and data boundaries.

This document supersedes the unchecked April 2026 architecture TODOs as the current execution plan. Those files remain useful historical references, but several of their tasks were partially scaffolded without being adopted by production code.

## Current architecture

```text
Web SPA (React/Vite) -----------+
                                +--> Express API --> PostgreSQL
Mobile app (Expo/React Native) -+       |  |  |       Redis (optional)
                                        |  |  +-----> R2 or local disk
                                        |  +--------> xAI, Stripe, Lulu,
                                        |             Replicate, Resend,
                                        |             Telnyx, Telegram,
                                        |             Fish.audio
                                        +-----------> pg-boss queue

Express also serves the web build, accepts WebSockets, runs cron jobs,
and starts a queue connection.

Background worker (intended queue consumer + cron owner)
  -> currently fails during module loading and is absent from deploy manifests
```

The deployable shape is appropriate for the product. The main problem is that ownership is ambiguous: HTTP routes still own most business logic and SQL, the API and worker both claim cron, local files cross process boundaries, and several new architectural layers are unused facades.

## Audit baseline

| Area            | Verified current state                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code surface    | About 68k lines across 142 API, 129 web, 35 mobile, 2 shared, and 1 worker source files                                                                              |
| API             | 164 route declarations; 33 route files access the database directly; 9 route files use repositories; 0 route files use `domain/`                                     |
| API conventions | Response, pagination, timeout, integration, and centralized config helpers exist but are mostly or entirely unused                                                   |
| Versioning      | `/api/v1` duplicates the unversioned router mounts, but web and mobile still call `/api`; WebSockets and webhooks remain unversioned                                 |
| Database        | Runtime uses numbered SQL migrations; npm migration commands use a separate `node-pg-migrate` JavaScript history                                                     |
| Worker          | `npm run worker` fails because `initDatabase` is no longer exported                                                                                                  |
| Jobs/files      | Audiobook jobs write files on the worker's local disk while API downloads read the API's local disk                                                                  |
| Web             | React Query is configured and used for reads in Home and Chapter; most server state remains manual, while the defined story mutations and payment queries are unused |
| Mobile          | Outside the root app workspace/tooling path, duplicates chapters, hardcodes API hosts, has no tests, and currently has 15 TypeScript errors                          |
| Tests           | Backend: 195/196 passing, approximately 4.4% statement coverage; web: 18/18 passing over a very small surface; E2E covers public rendering only                      |
| Static checks   | Backend and web lint pass with 105 warnings; many are stale React hook dependency warnings                                                                           |
| Build           | Web production build passes; main application chunk is about 316 kB raw / 104 kB gzip, excluding large vendor chunks                                                 |
| Dependencies    | Current production audit reports 31 root/workspace vulnerabilities (3 critical, 6 high) and 24 mobile vulnerabilities (1 critical, 8 high)                           |
| Delivery        | CI uses Node 20, `.nvmrc` and production use Node 22, and local audit used Node 25; Nixpacks deletes the lockfile before install                                     |
| Documentation   | README/deployment/TODO material describes removed functions, old route counts, and already-completed work as pending                                                 |

## Target architecture

```text
apps/
  web/                         React UI; React Query owns remote state
  mobile/                      Expo UI; same contracts and domain content

packages/
  contracts/                   OpenAPI-generated request/response types + schemas
  api-client/                  shared versioned client for web and mobile
  domain-content/              chapters, style options, product/entitlement metadata

services/api/
  bootstrap/                   app factory, middleware order, HTTP/WS startup, shutdown
  modules/<feature>/
    http/                      route/controller + input validation only
    application/               use cases, transactions, orchestration
    domain/                    business rules with no Express or SQL imports
    data/                      repositories and SQL
    integrations/              feature-specific provider adapters
  platform/
    config/ db/ queue/ storage/ auth/ observability/

services/worker/
  bootstrap/                   queue consumers and cron scheduling only
  handlers/                    calls the same application use cases as the API
```

### Mandatory dependency direction

```text
HTTP / worker handler -> application use case -> domain policy
                                             -> repository interface -> PostgreSQL
                                             -> provider interface   -> external API
```

- Routes do not issue SQL or call vendors directly.
- Domain code does not know about Express, PostgreSQL, environment variables, or vendor SDKs.
- API and worker share application modules, not route modules.
- PostgreSQL remains the source of truth; Redis is used only where its loss has an explicitly designed effect.
- User files are stored in object storage in production. Local disk is development-only.
- Breaking API changes start in a new version and are contract-tested against both clients.

## P0 — make production safe

### ARCH-001 — Preserve Stripe's raw webhook body

- [ ] Mount `POST /api/webhooks/stripe` before the global `express.json()` middleware, or exclude that path from JSON parsing.
- [ ] Reject requests when the webhook secret or signature is missing.
- [ ] Add a real HTTP test using a Stripe-signed raw payload; assert invalid signatures fail and duplicate events do not duplicate entitlements or payments.
- [ ] Make `stripe_event_id` unique in the immutable audit table and record every handled event transactionally.

Done when a production-shaped request reaches `stripe.webhooks.constructEvent()` as a `Buffer`, and the test would fail if middleware order regresses.

### ARCH-002 — Repair and deploy the worker

- [ ] Replace the removed `initDatabase()` import so `npm run worker` boots successfully.
- [ ] Add a worker service to the chosen production manifest; remove or explicitly deprecate unused Render/Railway alternatives.
- [ ] Make the worker the only cron scheduler. The API may enqueue and inspect jobs but must not schedule cron jobs.
- [ ] Add worker readiness, queue lag, active/failed job, and last-consumer-heartbeat checks.
- [ ] Add a worker boot smoke test to CI.
- [ ] Decide how schema migration is run before both API and worker start; prefer a single release command/job, not two racing processes.

Done when one API plus one worker can be deployed from configuration in the repository and an audiobook job is consumed in staging.

### ARCH-003 — Remove cross-process local-file coupling

- [ ] Store audiobook output and voice samples in R2 (or one selected object store), not `uploads/` in production.
- [ ] Use user-namespaced keys such as `users/{userId}/photos/...`, `voice/...`, and `audiobooks/...`.
- [ ] Persist object key, content type, size, checksum, provider, and lifecycle status in the database.
- [ ] Return short-lived authorized downloads or stream through an ownership-checked endpoint.
- [ ] Fail startup for production features requiring object storage; do not silently fall back to an ephemeral filesystem.
- [ ] Add orphan cleanup and account-deletion jobs for every object category.

Done when API and worker can run on separate hosts with no shared filesystem and all upload/download/delete flows still pass.

### ARCH-004 — Use one migration system

- [ ] Choose the SQL runner and `schema_migrations` as the only migration history.
- [ ] Remove or convert the `.js` migrations, `pgmigrations` config, `node-pg-migrate` dependency, and npm scripts that operate on the other history.
- [ ] Rename every migration with a strict monotonic number; move the unnumbered performance-index migration into that sequence.
- [ ] Add a PostgreSQL advisory lock around migration execution to prevent concurrent deploy races.
- [ ] Record a checksum and fail on edits to an applied migration.
- [ ] Move reference-data seeding out of every API startup; version it as migrations or an explicit idempotent release task.
- [ ] Test the complete chain against an empty database and a sanitized production-shaped snapshot.
- [ ] Add migration status, backup, rollback/forward-fix, and restore instructions.

Done when local, CI, staging, API startup, worker startup, and operator commands all agree on one ordered migration history.

### ARCH-005 — Close known dependency vulnerabilities and make the gate real

- [ ] Triage and upgrade the current critical/high root and mobile advisories, starting with `protobufjs`, `fast-xml-parser`, `shell-quote`, `express-rate-limit`, `ws`, `form-data`, and mobile transitive packages.
- [ ] Separate runtime from development audit results and document accepted exceptions with owner and expiry.
- [ ] Remove `continue-on-error` and `|| true` for critical/high dependency and static-security checks.
- [ ] Pin third-party GitHub Actions to immutable commit SHAs.
- [ ] Add automated dependency update PRs and a monthly supported-runtime upgrade cadence.

Done when CI blocks new unapproved critical/high runtime vulnerabilities and current exceptions are explicit and time-bounded.

### ARCH-006 — Secure authentication recovery and revocation

- [ ] Fix the duplicated `WHERE` clause in the password-reset throttling query.
- [ ] Replace tests that only assert mock values with HTTP tests for register, login, logout, reset, verify, scoped magic links, deleted users, and admin access.
- [ ] Decide a fail-secure policy for blacklist lookup failures. A database error must not make a known-revoked credential valid.
- [ ] Make password reset, token use, password update, and user-wide invalidation atomic where required.
- [ ] Apply soft-deleted-user checks consistently to token use and all auth lookup paths.
- [ ] Standardize unauthenticated/invalid/expired responses and client behavior.

Done when recovery emails are actually generated in an integration test and revoked/deleted users cannot authenticate through HTTP or WebSocket paths.

### ARCH-007 — Apply HTTP security and cost controls to WebSockets

- [ ] Extract one credential-verification service used by HTTP and WebSockets, including revocation and scoped-token policy.
- [ ] Enforce AI entitlements and usage quotas on voice WebSockets; an upgrade request must not bypass `checkAIQuota`.
- [ ] Validate `Origin`, cap connections per user/IP, cap message and pending-buffer size, and add idle/session deadlines and heartbeat termination.
- [ ] Add upstream connect timeout, backpressure handling, structured close reasons, and metrics for concurrent sessions and bytes.
- [ ] Move public one-time tickets to a multi-instance-safe store or explicitly keep voice traffic single-instance.
- [ ] Never place reusable long-lived JWTs in logs; plan a short-lived WebSocket ticket for authenticated users too.

Done when the same account, revocation, entitlement, and abuse rules apply to REST and voice sessions.

### ARCH-008 — Fix graceful shutdown and process ownership

- [ ] Make shutdown idempotent and stop accepting new HTTP/WebSocket work before closing dependencies.
- [ ] Await HTTP draining, WebSocket closure, queue stop, and database close in order.
- [ ] Clear the force-exit timer on successful shutdown and exit `0`; use `1` only after a real timeout/failure.
- [ ] Give worker jobs a drain window and make abandoned jobs retryable.
- [ ] Add signal tests for API and worker.

Done when SIGTERM drains a healthy process within the platform grace period without severing in-flight database work or always exiting as a failure.

## P1 — establish architecture boundaries and contracts

### ARCH-009 — Create a testable API bootstrap

- [ ] Split `createApp(dependencies)` from `listen()` so tests can run the real middleware/router stack without starting production cron, sockets, or vendors.
- [ ] Inject database, queue, storage, clock, ID generator, logger, and provider clients through a composition root.
- [ ] Keep middleware order in one reviewed bootstrap module, with explicit raw-body, public, protected, admin, not-found, and error phases.
- [ ] Add an automated route inventory showing method, path, auth/scope, validation, rate limit, and response schema.

### ARCH-010 — Migrate backend features as vertical slices

- [ ] Start with `stories`, then `auth`, `payments`, `voice`, `game`, `memory`, `export`, and remaining integrations.
- [ ] For each slice: controller validates and maps HTTP; application service owns use case/transaction; repository owns SQL; integration adapter owns vendor details.
- [ ] Move all direct route SQL into repositories and ban DB imports/`.query()` in route folders with ESLint.
- [ ] Replace the unused/broken domain facades with working use cases; do not keep facades that routes never call.
- [ ] Remove compatibility re-export shells after imports reach canonical locations.
- [ ] Keep changes incremental: one slice must be contract- and integration-tested before starting the next.

Done when new route code cannot bypass the dependency direction and the selected slice has no business logic or SQL in its controller.

### ARCH-011 — Make background side effects durable

- [ ] Replace fire-and-forget entity extraction and chapter-image work with named pg-boss jobs.
- [ ] Add consumers for every declared job or delete unused job names.
- [ ] Use a transactional outbox, or a documented equivalent, where a database write and required job publication must not diverge.
- [ ] Define retry limits, exponential backoff, idempotency key, timeout, dead-letter behavior, and operator replay for each job.
- [ ] Derive chapter completion from canonical server data, never client-provided `total_questions` or a default of five.
- [ ] Report job state to clients with stable product states rather than raw queue implementation states.

### ARCH-012 — Publish one versioned API contract

- [ ] Make `/api/v1` the canonical HTTP base and update web, mobile, emails, Telegram, webhooks, and documentation.
- [ ] Remove duplicated router registration by mounting a v1 router once; keep an explicit, measured compatibility layer for legacy clients.
- [ ] Define a consistent success/error/pagination envelope and machine-readable error codes.
- [ ] Complete OpenAPI coverage for all public endpoints, including auth, scopes, rate limits, file/binary responses, and webhook schemas.
- [ ] Generate client types and request functions from the contract; add a breaking-change check in CI.
- [ ] Publish a deprecation policy and remove unversioned aliases only after usage reaches zero.

### ARCH-013 — Standardize validation, errors, and pagination

- [ ] Put schemas beside each feature and validate path, query, headers, and body for every mutation endpoint.
- [ ] Validate chapter/question IDs, product IDs, state transitions, sizes, enums, and ownership against canonical server rules.
- [ ] Adopt one error hierarchy and one error envelope; settle the current 502-versus-503 external-service test/implementation mismatch.
- [ ] Use the existing pagination middleware or delete it. Require bounded pagination for every list endpoint and exports/jobs for very large collections.
- [ ] Add lint/route-inventory gates for missing validation and unbounded list handlers.
- [ ] Ensure internal errors, SQL messages, paths, provider payloads, and stack traces cannot reach production clients.

### ARCH-014 — Centralize configuration and feature availability

- [ ] Route all environment access through a validated configuration object; remove direct `process.env` reads from feature code.
- [ ] Classify dependencies as required, feature-required, or optional and expose that status consistently.
- [ ] Make missing Stripe, queue, storage, or voice configuration disable the feature visibly or fail startup according to policy—never fail deep inside a request unexpectedly.
- [ ] Validate URL origins, secret entropy, timeouts, pool sizes, product mode, and production-only flags at boot.
- [ ] Make `.env.example`, deploy manifests, and validation code derive from the same inventory.

### ARCH-015 — Wrap all external providers

- [ ] Create canonical adapters for xAI, Stripe, Replicate, Fish.audio, Lulu, Resend, Telnyx, Telegram, and R2.
- [ ] Apply per-operation deadlines, bounded retries with jitter, concurrency limits, and circuit/open-state metrics.
- [ ] Retry only safe/idempotent operations; supply provider idempotency keys to paid or mutating calls.
- [ ] Normalize provider failures into stable application errors with retry guidance.
- [ ] Record latency, result, cost/usage, and provider request ID without logging memoir text, audio, tokens, or secrets.
- [ ] Delete unused `withTimeout` and integration aliases if they are not adopted.

### ARCH-016 — Make product catalog and entitlements a domain module

- [ ] Centralize product IDs, prices, currencies, included artifacts, free chapters, premium duration, refund rules, and feature entitlements.
- [ ] Remove contradictory hardcoded prices from marketing pages, legal pages, support answers, notifications, export status, and payment routes.
- [ ] Fetch display pricing from a safe catalog endpoint or generate client constants from the same source.
- [ ] Model payment and entitlement transitions explicitly and transactionally, including refund and subscription cancellation.
- [ ] Add tests proving every sellable UI product maps to a Stripe product rule and grants exactly the promised entitlement.

### ARCH-017 — Define the data lifecycle

- [ ] Decide soft-delete, retention, purge, legal/financial retention, and restore windows with product/legal owners.
- [ ] Replace the manual account-deletion query list with a tested deletion application service driven by schema ownership and object manifests.
- [ ] Preserve required payment audit records while pseudonymizing user references when appropriate.
- [ ] Include all user channels and artifacts in export/delete: web, mobile, Telegram, Telnyx, memos, photos, voice samples, audiobooks, generated images, queue payloads, and analytics identifiers.
- [ ] Strip photo EXIF metadata, validate/decode uploads safely, and add malware/content policy appropriate to the product.
- [ ] Add scheduled purge jobs, dry-run reports, audit records, and end-to-end data-subject tests.

## P2 — improve web, mobile, and shared packages

### ARCH-018 — Finish web server-state migration

- [ ] Use React Query for onboarding, settings, payments, exports/jobs, admin lists, styles, reviews, and other remote state.
- [ ] Adopt the existing story mutations or replace them; do not maintain unused query scaffolding.
- [ ] Keep form drafts/local interaction state in components, but do not copy cached server data into a second source of truth without a deliberate edit buffer.
- [ ] Centralize 401/403/429/retry/offline handling in the generated API client.
- [ ] Use optimistic updates only where rollback behavior is tested; persist offline story drafts before promising offline support.
- [ ] Clear user-scoped caches on logout and account switch.

### ARCH-019 — Organize the web app by feature

- [ ] Move page-specific components/hooks/queries under `features/auth`, `memoir`, `voice`, `payments`, `export`, `admin`, and `marketing` as those areas change.
- [ ] Split oversized components and pages, starting with BookOrderWizard, voice/onboarding flows, Landing, Blog, Chapter, and ChapterReview.
- [ ] Model complex voice, onboarding, checkout, and export flows as explicit state machines/reducers rather than scattered booleans.
- [ ] Remove dead components, unused query hooks, and duplicate API abstractions after migration.
- [ ] Turn React hook dependency warnings into errors after fixing them; add focused tests for cancellation, race, autosave, and unmount behavior.

### ARCH-020 — Unify web forms and accessibility

- [ ] Use shared Zod schemas or contract-derived schemas for auth, profile, story, book order, and settings forms.
- [ ] Standardize field errors, pending/disabled states, retry messages, and server error mapping.
- [ ] Audit keyboard order, focus restoration/trapping, labels, live regions, contrast, reduced motion, touch targets, zoom, and screen-reader behavior.
- [ ] Add automated axe checks and manual senior-user accessibility scenarios to release QA.
- [ ] Set and enforce WCAG 2.2 AA as the product baseline.

### ARCH-021 — Add web performance and PWA budgets

- [ ] Set budgets for entry JS, per-route JS, CSS, LCP, INP, CLS, and image weight; fail CI on meaningful regression.
- [ ] Lazy-load analytics and other nonessential vendors; verify route chunks and reduce the 316 kB raw entry chunk.
- [ ] Measure real-user performance separately for marketing and authenticated flows.
- [ ] Version or disable caching for unhashed `sw.js`, manifests, and mutable root assets; keep only hashed assets immutable for one year.
- [ ] Test service-worker upgrade, logout, offline shell, stale asset, and rollback behavior.

### ARCH-022 — Choose one SEO rendering pipeline

- [ ] Decide between build-time prerendering and another intentional rendering strategy for public pages.
- [ ] If prerendering remains, run `build:seo` in production and fail when any route cannot render; derive route/blog lists from one source.
- [ ] Remove duplicate static/dynamic sitemap and robots ownership.
- [ ] Validate canonical tags, structured data, status codes, social images, and noindex rules from built artifacts.
- [ ] Keep authenticated SPA routes out of the public render/index pipeline.

### ARCH-023 — Make mobile a first-class workspace or isolate it

- [ ] Make an explicit product decision: ship mobile and include it in the monorepo gates, or move/freeze it outside the active product workspace.
- [ ] If active, add it to root scripts and CI with `expo-doctor`, TypeScript, lint, unit/component tests, and an EAS preview build.
- [ ] Fix all 15 current TypeScript errors before feature work.
- [ ] Replace the hardcoded localhost/production URL with validated `EXPO_PUBLIC_API_URL` environment profiles suitable for real devices.
- [ ] Add typed navigation parameters and eliminate broad `any` response types.
- [ ] Define supported Expo/React Native upgrade cadence and release ownership.

### ARCH-024 — Share contracts and canonical domain content with mobile

- [ ] Move mobile onto the canonical 24-chapter package; remove its 1,488-line duplicate.
- [ ] Add package exports and types that work in Node, Vite, and Metro without source-path hacks.
- [ ] Share API schemas/client, product metadata, entitlement rules, and design tokens where behavior must match.
- [ ] Keep platform UI components separate; share semantics and tokens, not DOM/native implementations.
- [ ] Add a CI test proving web, mobile, API, worker, and Telegram reference valid canonical chapter/question IDs.

### ARCH-025 — Define mobile remote/offline state

- [ ] Adopt one remote-state/cache layer with the same query keys and invalidation semantics as web where practical.
- [ ] Design encrypted local drafts, retry queues, conflict policy, and attachment uploads before advertising offline use.
- [ ] Centralize secure token storage, expiry/logout, 401 handling, and cache clearing.
- [ ] Add network-transition and interrupted-recording/upload tests.
- [ ] Measure crash-free sessions, startup time, voice failure rate, and API compatibility by app version.

## P3 — reliability, quality, and operating discipline

### ARCH-026 — Replace superficial tests with a production-shaped pyramid

- [ ] Keep fast unit tests for pure policies, validators, repositories, and provider adapters.
- [ ] Add Supertest tests against `createApp()` and ephemeral PostgreSQL with real migrations and constraints.
- [ ] Rename or replace current “integration” tests that only exercise mocks/literals and do not import routes.
- [ ] Cover authentication, authorization/ownership, Stripe webhook, story autosave, job enqueue/consume, storage, export, deletion, and failure/retry paths.
- [ ] Add authenticated Playwright journeys; current E2E only proves public pages render.
- [ ] Add mobile component and API-contract tests.
- [ ] Raise backend coverage from about 4.4% with staged floors based on meaningful modules, not generated/seeds; target 60% first, then 80% on application/domain code.

### ARCH-027 — Make CI reproducible and non-mutating

- [ ] Standardize Node 22 across `engines`, `.nvmrc`, CI, Nixpacks, Render, and contributor docs.
- [ ] Stop deleting `package-lock.json`; use one reproducible `npm ci` workspace install.
- [ ] Change lint scripts so CI never uses `--fix`; make warnings fail after the existing backlog is cleared.
- [ ] Add backend JS type-check, mobile type-check, worker boot, clean-DB migrations, contract diff, web/mobile build, bundle budget, and route inventory jobs.
- [ ] Cache safely without hiding lockfile or generated-contract changes.
- [ ] Run authenticated E2E against production-shaped environment dependencies, not only the Vite dev server.

### ARCH-028 — Build actionable observability

- [ ] Replace mixed `console` usage with structured logging and consistent request/job/provider correlation IDs.
- [ ] Use route templates rather than raw IDs in metric labels; move beyond per-process in-memory metrics.
- [ ] Separate liveness, readiness, and admin diagnostics. Readiness must reflect required DB, queue, worker, storage, and migration state.
- [ ] Protect detailed metrics/diagnostics from public access.
- [ ] Attach safe user/tenant context to Sentry and scrub memoir content, audio, tokens, phone/email, provider bodies, and secrets.
- [ ] Define SLOs and alerts for API availability/latency, auth failures, payment webhooks, queue lag/failures, cron freshness, storage errors, voice sessions, and external-provider cost.
- [ ] Add runbook links to alerts.

### ARCH-029 — Improve database performance and consistency

- [ ] Inventory every query by feature and verify indexes using production-like `EXPLAIN (ANALYZE, BUFFERS)` data.
- [ ] Add missing foreign-key/composite/partial indexes through migrations; remove redundant indexes deliberately.
- [ ] Require bounded lists and cursor pagination for feeds/history; make large export/generation work asynchronous.
- [ ] Use transactions for multi-record state changes and explicit lock/optimistic-version policy for races.
- [ ] Add query cancellation/deadlines and slow-query telemetry.
- [ ] Define pool budgets across API, worker, queue, migrations, and admin tools so total connections stay below the database limit.

### ARCH-030 — Harden caching and distributed controls

- [ ] Decide which cache/rate-limit/lock behavior must be distributed and which may be process-local.
- [ ] Give global/auth/support/voice rate limiters a shared production store; key authenticated limits by user where appropriate.
- [ ] Remove Redis `KEYS` pattern deletion in favor of namespaced version keys or `SCAN`.
- [ ] Document fail-open/fail-closed behavior separately for caching, cron locks, auth revocation, quotas, and abuse controls.
- [ ] Test multiple API/worker instances and Redis interruption.

### ARCH-031 — Automate backup and disaster recovery

- [ ] Schedule encrypted off-site PostgreSQL backups from infrastructure, not a developer crontab.
- [ ] Include object-storage inventory/versioning/retention in recovery scope.
- [ ] Replace “can query production” verification with an automated restore into an isolated database plus integrity checks.
- [ ] Define and test RPO/RTO, credential rotation, retention, deletion exceptions, and restore authority.
- [ ] Run and record quarterly restore drills.
- [ ] Make the shell script load environment safely; do not `export $(... | xargs)` secrets.

### ARCH-032 — Keep documentation and ownership current

- [ ] Rewrite README architecture and endpoint inventory from the current code or generate it.
- [ ] Replace deployment instructions that still reference `initDatabase()` and old table/route names.
- [ ] Add ADRs for modular monolith, SQL migrations, pg-boss, object storage, API versioning, auth/session model, mobile status, and SEO pipeline.
- [ ] Add runbooks for deploy/rollback, migrations, worker/queue, Stripe webhooks, provider outage, key rotation, backups/restores, and data deletion.
- [ ] Archive or mark superseded architecture TODOs so completed scaffolding is not repeatedly planned.
- [ ] Add CODEOWNERS and a PR checklist covering contracts, migrations, privacy, observability, tests, rollback, and docs.

## Execution order

| Milestone                 | Required items       | Exit condition                                                                                            |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| M0 — release safety       | ARCH-001 to ARCH-008 | Payments, worker, migrations, auth, WebSockets, storage, and shutdown pass production-shaped smoke tests  |
| M1 — platform contract    | ARCH-009, 012–017    | Testable app factory, one API contract/config/provider/storage/data-lifecycle model                       |
| M2 — vertical slices      | ARCH-010, 011, 013   | Stories/auth/payments migrated; no direct SQL/vendor calls in their controllers                           |
| M3 — clients              | ARCH-018 to ARCH-025 | Web remote state is coherent; mobile status is explicit and gated; shared contracts/content are canonical |
| M4 — operational maturity | ARCH-026 to ARCH-032 | Reproducible CI, meaningful tests, SLOs/alerts, restore drill, current runbooks                           |

Do not begin a broad folder move before M0. Structural changes should follow a working vertical slice and contract tests, not precede them.

## Definition of done for every item

- [ ] Behavior and rollback/forward-fix path are documented.
- [ ] Unit, integration, contract, and/or E2E coverage matches the risk.
- [ ] Security, privacy, accessibility, and multi-instance effects were considered.
- [ ] Logs/metrics/alerts make failure diagnosable without exposing user content.
- [ ] CI passes with no new ignored warnings or vulnerability exceptions.
- [ ] Old path/scaffolding/config/documentation is removed after migration.
- [ ] Production or staging verification evidence is linked from the task/PR.

## Explicit non-goals

- No microservices split.
- No database replacement.
- No bulk TypeScript rewrite of the backend before boundaries and tests exist.
- No big-bang web or backend folder reshuffle.
- No new feature work inside a broken boundary without also moving that slice toward the target.

## Evidence reviewed

- Root/workspace manifests, lockfiles, Node and lint/test/build configurations
- Web routing, contexts, API clients, React Query hooks, PWA, prerender, and main product pages
- Mobile navigation, contexts, API service, screens, shared-data duplication, and TypeScript build
- API bootstrap, middleware order, routes, schemas, repositories, domain facades, integrations, jobs, cron, WebSockets, storage, config, metrics, and shutdown
- SQL/JavaScript migrations, baseline schema, seeds, indexes, backup scripts, and data export/deletion flows
- Railway, Render, Nixpacks, GitHub Actions, Husky, deployment, QA, and prior architecture documentation
- Executed web/backend tests, coverage, lint, web build, mobile type-check, worker boot, and production dependency audits on 2026-07-14

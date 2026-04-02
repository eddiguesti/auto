# Architecture Issues Register

**Date:** 2026-04-02
**Project:** Easy Memoir

Issues are ordered by severity. Each issue includes root cause, risks, and a concrete remediation direction.

---

## CRITICAL

---

### ISSUE-001 — Runtime Schema Creation via `initDatabase()`

**Severity:** Critical
**Area:** Data / Backend
**File:** `services/api/db/index.js`

**What is wrong:**
`initDatabase()` executes `CREATE TABLE IF NOT EXISTS` statements on every server startup. Schema changes made after the initial deployment are never captured in version-controlled migrations. The `001_baseline.js` migration exists, but schema additions made directly to `initDatabase()` will silently diverge from it.

**Why it is architecturally wrong:**
Schema is mutable shared state. It must be managed via version-controlled, ordered, idempotent migration files — not runtime code. The current model makes it impossible to know what schema version is running in production, breaks rollback, and makes multi-environment parity unreliable.

**Risks:**

- Silent schema drift between environments (dev vs prod vs staging)
- Impossible to roll back a schema change
- No audit trail of what changed and when
- Migrations and `initDatabase()` may conflict after first production deploy
- Adding a column in `initDatabase()` without a matching migration means the column only appears on next full redeploy or fresh DB

**Root Cause:**
Schema management was deferred — `initDatabase()` was a pragmatic bootstrap choice that was never refactored into a proper migration system.

**Remediation:**

1. Freeze `initDatabase()` — remove all DDL from it; replace with a check that migrations have run
2. Convert the full current schema to a `001_full_schema.sql` migration
3. Add a `schema_migrations` tracking table
4. Run migrations automatically on startup (or via explicit `npm run migrate:up` only)
5. Never modify `initDatabase()` again for schema changes

---

### ISSUE-002 — In-Memory Token Blacklist Fallback Breaks Logout Security

**Severity:** Critical
**Area:** Security / Backend
**File:** `services/api/utils/tokenBlacklist.js`, `services/api/utils/redis.js`

**What is wrong:**
The token blacklist (used on logout and password reset) falls back to an in-memory Map when Redis is unavailable. On server restart, the in-memory store is wiped. Any token revoked before restart becomes valid again.

**Why it is architecturally wrong:**
Token revocation is a security primitive. It must be durable. An "optional" backing store for security state is a contradictory design — if the store disappears, the security guarantee disappears with it.

**Risks:**

- Logged-out users can regain access if server restarts after logout
- Password-reset tokens can be reused if server restarts between reset and expiry
- Redis misconfiguration (which silently falls back) cannot be detected in production until a security incident

**Root Cause:**
Redis was added as an optional dependency to reduce infrastructure cost. The fallback was designed for convenience but the security implication was not fully evaluated.

**Remediation:**

1. Make Redis a hard dependency (fail startup if `REDIS_URL` not set in production)
2. Alternatively, move token blacklist to PostgreSQL (`token_blacklist` table with `jti`, `expires_at`, `user_id`) — removes Redis dependency entirely
3. Add startup validation that checks blacklist persistence is reachable
4. Add integration test that verifies logout is durable across service restart

---

### ISSUE-003 — No Service Layer: Business Logic in Route Handlers

**Severity:** Critical
**Area:** Backend
**Files:** `services/api/routes/*.js` (most files)

**What is wrong:**
Business logic (payment eligibility checks, story completion rules, game state transitions, entity extraction triggers) is implemented directly in Express route handlers. Routes should be thin HTTP adapters — they should delegate to a service layer that contains all business behavior.

**Why it is architecturally wrong:**

- Business logic coupled to HTTP means it cannot be called from cron jobs, WebSocket handlers, or background workers without going through Express
- It cannot be unit tested without mocking the HTTP layer
- It cannot be reused across routes without copy-paste
- Error handling, validation, and business rules are mixed in the same function

**Risks:**

- Duplicated business rules across routes (payment checks appear in multiple places)
- Cron jobs and WebSocket handlers re-implement the same logic independently
- Business behavior changes require searching across all route files
- Test coverage requires HTTP-level integration tests for what should be unit-testable logic

**Root Cause:**
Repository pattern was introduced but no corresponding service layer was created. Logic migrated out of routes stopped at the repository — the middle layer was skipped.

**Remediation:**

1. Create `services/api/domain/` directory
2. Introduce domain service classes: `StoryService`, `PaymentService`, `GameService`, `ExportService`, `VoiceService`, `AuthService`
3. Move all business rules from route handlers into domain services
4. Routes call: `validate → service → respond`
5. Repositories remain purely for data access

---

### ISSUE-004 — No API Versioning

**Severity:** Critical
**Area:** API
**Files:** `services/api/routes/index.js`, all route files

**What is wrong:**
All API endpoints are mounted at `/api/...` with no version prefix. The mobile app, web client, Telegram integration, and any external callers all use the same unversioned endpoints.

**Why it is architecturally wrong:**
Without versioning, there is no safe path to make a breaking change. Any field rename, endpoint restructure, or contract change must be deployed atomically with all clients. This is only feasible when the single web client is deployed from the same repo — it breaks the moment the mobile app ships to the App Store (where you cannot force upgrades).

**Risks:**

- Mobile app in App Store will break on any backend breaking change
- Cannot run A/B experiments on API behavior
- Cannot deprecate old behavior while migrating clients
- Telegram and any future integrations have no compatibility contract

**Root Cause:**
Versioning was deferred because initially there was only one web client deployed from the same codebase. The mobile app makes this untenable.

**Remediation:**

1. Add `/api/v1/` prefix to all existing endpoints (thin router redirect is acceptable initially)
2. Document the versioning contract in `ref_architecture_principles.md`
3. Treat the mobile app as a permanently external client from this point

---

## HIGH

---

### ISSUE-005 — App.jsx: 50+ Routes in a Single File

**Severity:** High
**Area:** Frontend
**File:** `apps/web/src/App.jsx`

**What is wrong:**
All route definitions, lazy imports, auth guards, redirect logic, and layout wrapping are defined in a single `App.jsx` file. At 50+ routes this becomes a merge conflict magnet, is difficult to navigate, and makes the routing contract opaque.

**Risks:**

- Every new page requires editing the same file (high contention)
- Route guards inconsistently applied (easy to miss ProtectedRoute wrapper)
- Cannot progressively load route configs
- Navigation structure is invisible without reading the full file

**Remediation:**

1. Split into feature-based route config files: `authRoutes.js`, `appRoutes.js`, `adminRoutes.js`, `marketingRoutes.js`
2. Each exports a `<Route>` subtree
3. `App.jsx` becomes a thin router that composes these subtrees
4. Enforce consistent guard wrapping per route group

---

### ISSUE-006 — No Server-State Management on Frontend

**Severity:** High
**Area:** Frontend
**Files:** `apps/web/src/hooks/useApi.js`, most page components

**What is wrong:**
The frontend has no React Query, SWR, or equivalent server-state library. Every component manages its own fetch lifecycle via `useEffect`+`useState` or the `useApi` hook. There is no cache, no background revalidation, no deduplication of concurrent identical requests, and no optimistic updates.

**Why it is architecturally wrong:**
Server state management (loading, error, caching, revalidation, synchronization) is a solved problem. Reinventing it per-component produces inconsistent UX, duplicate loading spinners, stale data, and race conditions.

**Risks:**

- Data goes stale without refresh (e.g., story list after adding a story)
- Multiple components fetching the same data simultaneously
- Loading state inconsistencies across the app
- No standard cache invalidation model means bugs compound as features grow

**Remediation:**

1. Introduce React Query (`@tanstack/react-query`) as the server-state layer
2. Wrap all API calls in query/mutation hooks
3. Replace manual `useEffect`+`useState` data fetching with `useQuery`
4. Define query key conventions per resource
5. The `useApi` hook can remain as the authenticated fetch primitive underneath React Query

---

### ISSUE-007 — chapters.js Duplicated in Frontend and Shared Package

**Severity:** High
**Area:** Cross-cutting / Frontend
**Files:** `apps/web/src/data/chapters.js`, `packages/shared/chapters.js`

**What is wrong:**
The chapter and question definitions exist in two places. The shared package was created specifically to be the single source of truth, but the frontend duplicate remains.

**Risks:**

- Frontend and API chapters diverge silently (different question IDs, text, ordering)
- Any chapter structure change requires two edits
- Mobile app must choose which version to use

**Remediation:**

1. Delete `apps/web/src/data/chapters.js`
2. Update all frontend imports to use `@lifestory/shared`
3. Do the same for `styleOptions.js` and `voiceConfig.js` if duplicated
4. Add a lint rule that prevents importing from `src/data/` for shared concepts

---

### ISSUE-008 — Direct DB Access in Route Handlers (Bypassing Repository Layer)

**Severity:** High
**Area:** Backend / Data
**Files:** Various routes in `services/api/routes/`

**What is wrong:**
Several route handlers import the DB pool directly and execute SQL queries inline, bypassing the repository layer that exists for this purpose.

**Risks:**

- Repository abstraction provides no protection if routes bypass it
- Cannot mock data access for testing
- SQL scattered across route files is harder to review for injection risks
- Schema changes require searching both repositories AND route files

**Remediation:**

1. Audit all routes for direct `db.query()` / `pool.query()` calls
2. Move each inline query to the appropriate repository
3. Enforce in code review: routes must not import `db` or `pool` directly
4. Add ESLint rule or pre-commit check to detect direct DB imports in route files

---

### ISSUE-009 — Admin Authorization is Ad-Hoc

**Severity:** High
**Area:** Security / Backend
**Files:** `services/api/routes/admin.js`, auth middleware

**What is wrong:**
Admin functionality exists but the authorization model is enforced per-route rather than at a centralized middleware level. There is no clear `requireAdmin` middleware applied to the entire admin router.

**Risks:**

- New admin routes can be added without auth if the developer forgets the per-route check
- Authorization logic is invisible to code reviewers scanning the route mount point
- Admin endpoints may be partially protected

**Remediation:**

1. Create a `requireAdmin` middleware that checks `req.user.role === 'admin'` (or equivalent)
2. Apply it to the entire admin router at mount time: `app.use('/api/admin', requireAdmin, adminRouter)`
3. Remove per-route admin checks
4. Add integration test that verifies non-admin JWT returns 403 on all admin endpoints

---

### ISSUE-010 — No Standard Pagination Contract

**Severity:** High
**Area:** API / Data
**Files:** `services/api/routes/stories.js`, `services/api/routes/memory.js`, others

**What is wrong:**
List endpoints return unbounded result sets. No standard `limit`, `offset`, or cursor-based pagination is enforced across the API.

**Risks:**

- As users accumulate stories (30+ chapters × multiple questions), list queries will return hundreds of rows
- Memory entity graph will grow unboundedly with no pagination
- Single large query can timeout or OOM the API process
- Frontend renders unbounded lists without virtualization

**Remediation:**

1. Define a standard pagination contract: `GET /api/v1/stories?limit=20&offset=0`
2. Response envelope includes `{ data: [], pagination: { total, limit, offset, hasMore } }`
3. Apply to all list endpoints
4. Add a default maximum limit (e.g. 100) enforced server-side

---

## MEDIUM

---

### ISSUE-011 — External Service Calls Without Timeout or Circuit Breaker

**Severity:** Medium
**Area:** Backend / Reliability
**Files:** `services/api/services/grokService.js`, routes calling Fish.audio, Telnyx, Replicate, Lulu

**What is wrong:**
Routes that call external APIs (Grok, Replicate, Fish.audio, Telnyx, Lulu) have no explicit request timeout. If an upstream service is slow or hanging, the Express request thread blocks until Node's default socket timeout (which is effectively infinite for most HTTP clients).

**Risks:**

- A slow Grok response holds a request thread indefinitely
- Under concurrent load, all threads block → process becomes unresponsive
- Cascading failure: one degraded external service takes down the entire API

**Remediation:**

1. Set explicit timeouts on all external HTTP calls (5-10s for completions, 30s for generation)
2. Implement basic circuit-breaker pattern for critical external services (Grok, Stripe)
3. Return `503` with `Retry-After` header when upstream is degraded
4. Add timeout telemetry to structured logs

---

### ISSUE-012 — Redis Treated as Optional Infrastructure

**Severity:** Medium
**Area:** Infra / Security
**Files:** `services/api/utils/redis.js`, `services/api/utils/tokenBlacklist.js`, `services/api/middleware/rateLimiters.js`

**What is wrong:**
Redis is used for token blacklist, rate limiting, and caching but is configured as optional with in-memory fallbacks. In production, this means Redis misconfiguration is invisible — the app starts, appears to work, but is running degraded security and ephemeral rate limit state.

**Remediation:**

1. In production (`NODE_ENV=production`), fail startup if `REDIS_URL` is not set and reachable
2. Remove in-memory fallback for security-sensitive uses (token blacklist, rate limiting)
3. In-memory fallback acceptable only for non-security caching
4. Add health check that reports Redis connectivity status

---

### ISSUE-013 — Three.js Book Renderer Not Code-Split

**Severity:** Medium
**Area:** Frontend / Performance
**File:** `apps/web/src/utils/bookRenderer/`, `apps/web/src/components/BookPreview.jsx`

**What is wrong:**
The Three.js book visualization (3D book mockup) is not lazily loaded. Three.js is a large library (~600KB gzipped) and the BookPreview component is only used on the Export page. It inflates the initial bundle for all users.

**Remediation:**

1. Ensure `BookPreview.jsx` is imported with `React.lazy()` and `Suspense`
2. Verify Vite chunk splitting correctly isolates the Three.js vendor chunk
3. Add bundle size check to CI (`vite-bundle-visualizer` or `bundlesize`)

---

### ISSUE-014 — Multiple Canonical Landing Pages

**Severity:** Medium
**Area:** Frontend / Maintainability
**Files:** `apps/web/src/pages/Landing.jsx`, `LandingDesign1.jsx`, `FacebookLanding.jsx`

**What is wrong:**
Three landing page variants exist. It is unclear which is the production landing page, which is active, and whether all three are maintained. Dead routes accumulate stale code.

**Remediation:**

1. Identify the single production landing page
2. Move A/B variants to a clearly named `experiments/` directory or delete them
3. Add a comment in `App.jsx` noting which is the active route
4. Schedule deletion of deprecated variants

---

### ISSUE-015 — No Idempotency Keys on Stripe Checkout Creation

**Severity:** Medium
**Area:** Backend / Payments
**File:** `services/api/routes/payments.js`

**What is wrong:**
Stripe checkout session creation does not use idempotency keys. A double-click or network retry can create duplicate checkout sessions for the same purchase intent.

**Remediation:**

1. Generate a deterministic idempotency key per purchase attempt: `hash(userId + productId + requestTimestamp_rounded_to_minute)`
2. Pass as `idempotencyKey` to Stripe API call
3. Alternatively, use Stripe's built-in payment link / product catalog to avoid session creation per click

---

### ISSUE-016 — `utils/` Directory has No Cohesion

**Severity:** Medium
**Area:** Backend / Maintainability
**Directory:** `services/api/utils/`

**What is wrong:**
`utils/` contains infrastructure helpers (logger, redis, cache), domain logic (gameStateManager, promptSelector, memoryContext), and external service wrappers (r2, sentry). This is a symptom of missing layer discipline — things that don't fit the current structure get dumped in utils.

**Remediation:**

1. Move `gameStateManager.js`, `promptSelector.js`, `memoryContext.js` to `domain/` (they are domain logic)
2. Move `r2.js`, `redis.js`, `sentry.js`, `tokenBlacklist.js` to `infrastructure/`
3. Keep `utils/` for pure stateless helpers: `logger.js`, `errors.js`, `security.js`, `validateEnv.js`

---

### ISSUE-017 — No Outbox / Event Pattern for Cross-Domain Side Effects

**Severity:** Medium
**Area:** Backend / Reliability
**Files:** `services/api/routes/stories.js`, `services/api/routes/ai.js`, `services/api/routes/voice.js`

**What is wrong:**
When a story is saved, multiple side effects are triggered synchronously in the request handler: entity extraction, game state update, streak update, achievement check. If any step fails, the request fails but partial side effects may have already occurred.

**Risks:**

- Story saved but achievement not awarded (silent inconsistency)
- Story saved but entity extraction failed (memory graph incomplete)
- Slow side effects inflate response latency

**Remediation:**

1. Short term: Wrap all side effects in try/catch, log failures, but don't fail the primary operation
2. Medium term: Move side effects to an async task queue (bull/bullmq with Redis, or pg-based queue)
3. Ensure the primary write (story save) is atomic and side effects are eventually consistent

---

## LOW

---

### ISSUE-018 — blogPosts.js Hardcoded in Frontend

**Severity:** Low
**Area:** Frontend / Content
**File:** `apps/web/src/data/blogPosts.js`

**What is wrong:**
Blog content is defined in a JS file. Non-developer content authors cannot publish posts, and post history grows the JS bundle.

**Remediation:**
Move to a markdown-based content system (MDX files with Vite import), a headless CMS (Contentful, Sanity), or a `/api/blog-posts` endpoint backed by the existing DB.

---

### ISSUE-019 — Mobile App Adds Toolchain Complexity Without Delivery

**Severity:** Low
**Area:** Infra / Maintainability
**Directory:** `apps/mobile/`

**What is wrong:**
The React Native Expo app is included in the monorepo but appears to be in early/placeholder state. It adds Expo toolchain dependencies and CI surface without delivering user value yet.

**Remediation:**
Either actively develop the mobile app with full parity testing, or move it to a separate repository until it is ready for active development. Keeping an inactive app in the monorepo creates noise.

---

### ISSUE-020 — Cron Lock is DB-Dependent Without Alerting

**Severity:** Low
**Area:** Backend / Reliability
**File:** `services/api/cron/lock.js`

**What is wrong:**
The distributed cron lock uses PostgreSQL. If the DB is unreachable, cron jobs silently fail to acquire the lock (or error) with no alerting. Daily prompt generation and streak resets are missed without notification.

**Remediation:**

1. Add explicit Sentry error capture on cron lock acquisition failure
2. Add a health metric for cron job execution (last run timestamp per job)
3. Consider moving to a dedicated job queue (BullMQ) for reliability

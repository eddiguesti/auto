# Refactor Roadmap

**Date:** 2026-04-02
**Project:** Easy Memoir

---

## Overview

This roadmap is designed to be worked in phases. Each phase delivers working software — no phase requires a big-bang rewrite. The order is driven by risk reduction and dependency sequence.

**Guiding principle:** Fix the most dangerous problems first. Then fix the architecture. Then improve scalability. Then harden for the long term.

---

## Phase 1 — Stabilize (Risk Reduction)

**Goal:** Eliminate production-threatening issues without touching product features.
**Duration estimate:** 1–2 sprints
**Can ship to production:** Yes, as small isolated PRs

### Tasks

#### 1.1 Token Blacklist Durability (CRITICAL)

- [ ] Migrate `tokenBlacklist.js` to use PostgreSQL table instead of Redis/in-memory
- [ ] Create migration: `001_add_token_blacklist_table.sql`
- [ ] Update `auth` middleware to query DB for revoked JTIs
- [ ] Remove in-memory fallback entirely
- [ ] Test: logout → same token → `401`

**Risk:** Low (additive DB change, logic swap in one file)
**Expected outcome:** Revoked tokens remain revoked across server restarts

#### 1.2 Admin Route Authorization (CRITICAL for security)

- [ ] Create `requireAdmin` middleware
- [ ] Apply at admin router mount point
- [ ] Remove per-route checks
- [ ] Add integration tests

**Risk:** Very low (additive middleware)
**Expected outcome:** Admin endpoints correctly gate on role, not just authenticated status

#### 1.3 External Service Timeouts (HIGH for reliability)

- [ ] Add explicit timeout (15s) to all Grok API calls
- [ ] Add timeout (60s) to Replicate calls
- [ ] Add timeout (120s) to Fish.audio calls
- [ ] On timeout: return `503` with `Retry-After`

**Risk:** Low (wraps existing calls, does not change behavior on success path)
**Expected outcome:** Slow upstream services cannot hang request threads

#### 1.4 Side Effect Error Isolation (HIGH for reliability)

- [ ] Wrap entity extraction, game state update, achievement check in `try/catch` that logs but does not propagate
- [ ] Story save route succeeds even if downstream processing fails

**Risk:** Low (error handling change only)
**Expected outcome:** Story saves are durable; background failures are logged, not surfaced to user

#### 1.5 Stripe Idempotency Keys (MEDIUM for data integrity)

- [ ] Add deterministic idempotency key to Stripe checkout session creation
- [ ] Test double-submit behavior

**Risk:** Very low (Stripe handles this gracefully)
**Expected outcome:** No duplicate checkout sessions from double-clicks or retries

#### 1.6 Redis Hard Dependency in Production

- [ ] Add production startup check: fail if `REDIS_URL` not set
- [ ] Document in `.env.example`

**Risk:** Low (fails loudly at startup, not silently in production)
**Expected outcome:** Redis misconfiguration caught before traffic is served

---

## Phase 2 — Correct Architecture

**Goal:** Fix the layer model. Move logic to the right layer. Establish patterns that new code follows.
**Duration estimate:** 3–4 sprints
**Can ship incrementally:** Yes — one domain service at a time

### Tasks

#### 2.1 Database Migrations-Only Model (CRITICAL data safety)

- [ ] Write `001_full_baseline.sql` migration
- [ ] Write `runner.js` migration runner
- [ ] Remove `initDatabase()` DDL from `db/index.js`
- [ ] Update startup sequence to call `runner.runMigrations()`
- [ ] Test on a clean DB: migrations run correctly and app starts

**Risk:** Medium. **Mitigation:** Test thoroughly on a staging DB before deploying to production. Back up production DB before first deploy. Run the migration against a copy of the production schema to verify no conflicts.
**Expected outcome:** Schema history is version-controlled and auditable

#### 2.2 Introduce Domain Services (incremental, one at a time)

Start with the highest-churn domain:

- [ ] **Sprint A:** Create `StoryService.js` — move story save, update, delete logic from `routes/stories.js`
- [ ] **Sprint A:** Create `AuthService.js` — move auth logic from `routes/auth.js`
- [ ] **Sprint B:** Create `GameService.js` — consolidate `utils/gameStateManager.js` + `routes/game/*.js`
- [ ] **Sprint B:** Create `PaymentService.js` — move eligibility checks + Stripe logic from `routes/payments.js`
- [ ] **Sprint C:** Create `ExportService.js` — move EPUB/PDF logic from `routes/export.js`
- [ ] **Sprint C:** Create `VoiceService.js` — move session management from `routes/voice.js`
- [ ] **Sprint D:** Create `MemoryService.js` — consolidate entity extraction + memory graph

**For each service:**

- Write unit tests for the service before refactoring the route
- Refactor the route to call the service
- Verify all existing integration tests still pass
- Delete any dead code in utils/ that was moved

**Risk:** Medium per service (behavior moves, not changes). **Mitigation:** Test-first, refactor second.
**Expected outcome:** Business logic is testable without HTTP; routes are < 50 lines each

#### 2.3 Eliminate Direct DB Calls in Routes

- [ ] Run `grep -rn "db\.query\|pool\.query" services/api/routes/` to find all violations
- [ ] Move each to the appropriate repository
- [ ] Add ESLint rule to prevent regression

**Risk:** Low
**Expected outcome:** All data access is through repositories

#### 2.4 Move Utils to Correct Layers

- [ ] Move domain utils (`gameStateManager`, `promptSelector`, `memoryContext`) to `domain/`
- [ ] Move infrastructure utils (`r2`, `redis`, `sentry`, `tokenBlacklist`) to `infrastructure/`
- [ ] Reorganize `services/` → `integrations/`

**Risk:** Low (module renames + import updates)
**Expected outcome:** Directory structure reflects actual architecture

#### 2.5 API Versioning

- [ ] Add `/api/v1/` prefix
- [ ] Update all clients
- [ ] Add legacy redirect middleware

**Risk:** Low with redirect middleware in place
**Expected outcome:** API has a stable versioning contract for mobile app

#### 2.6 chapters.js Deduplication

- [ ] Delete `apps/web/src/data/chapters.js`
- [ ] Update all frontend imports to use `packages/shared`
- [ ] Add ESLint no-restricted-imports rule

**Risk:** Very low
**Expected outcome:** Single source of truth for chapter definitions

---

## Phase 3 — Improve Scalability

**Goal:** Handle user growth, data volume, and feature additions gracefully.
**Duration estimate:** 2–3 sprints
**Can ship incrementally:** Yes

### Tasks

#### 3.1 Pagination on All List Endpoints

- [ ] Create `paginate.js` middleware
- [ ] Apply to all list routes
- [ ] Update frontend to handle paginated responses
- [ ] Update React Query to handle infinite scroll or page-based pagination

**Risk:** Medium (frontend UI changes required). **Mitigation:** Default limit is generous (100) so existing behavior is preserved; UI can adopt pagination progressively.

#### 3.2 React Query Integration (Frontend)

- [ ] Install and configure React Query
- [ ] Migrate key pages (Home, Chapter) to `useQuery`
- [ ] Migrate mutations (story save) to `useMutation` with cache invalidation
- [ ] Migrate remaining pages over 2–3 sprints

**Risk:** Low (additive, pages can be migrated one at a time)
**Expected outcome:** Consistent loading states, automatic caching, background revalidation

#### 3.3 App.jsx Route Split

- [ ] Create feature route files (`authRoutes`, `appRoutes`, `adminRoutes`, `marketingRoutes`)
- [ ] Refactor `App.jsx` to compose them
- [ ] Verify all routes still work

**Risk:** Low
**Expected outcome:** Route config is maintainable and merge conflicts are rare

#### 3.4 Async Story Processing Queue

- [ ] Evaluate: BullMQ (Redis-based) vs pg-boss (Postgres-based) — recommend pg-boss to avoid adding Redis as required dep for queues if DB-based blacklist is used
- [ ] Create `storyProcessingQueue` with jobs for: entity extraction, game state update, achievement check
- [ ] Move post-save side effects from route handler into queue worker
- [ ] Add Sentry capture for queue job failures

**Risk:** Medium (new infrastructure). **Mitigation:** Fallback to synchronous processing if queue is unavailable (with error logging).

#### 3.5 Three.js Code Splitting

- [ ] Confirm `BookPreview` is lazily loaded
- [ ] Add bundle size CI check
- [ ] Target: main bundle < 200KB gzipped

**Risk:** Very low

---

## Phase 4 — Long-Term Hardening

**Goal:** Test coverage, observability, standards enforcement, future extensibility.
**Duration estimate:** Ongoing

### Tasks

#### 4.1 Test Coverage to 80%

- [ ] Run `npm test -- --coverage` — establish current baseline
- [ ] Add unit tests for all domain services created in Phase 2
- [ ] Add integration tests for all payment flows (Stripe mocked)
- [ ] Add integration tests for all auth flows (registration, login, logout, password reset, magic link)
- [ ] Add Playwright E2E tests for: registration → write a story → export EPUB
- [ ] Add E2E test for: purchase premium → access gated feature

#### 4.2 Observability Baseline

- [ ] Structured logging on every request: `{ requestId, userId, method, path, status, duration }`
- [ ] Sentry user context attached in auth middleware
- [ ] Cron job health tracking table
- [ ] `/api/health` returns full dependency status (DB, Redis, cron)
- [ ] Response time header on all responses

#### 4.3 Feature-Based Folder Structure (Frontend)

- [ ] Migrate from flat `pages/` + `components/` to `features/<domain>/pages` + `features/<domain>/components`
- [ ] Do this feature by feature as pages are touched for other work (not a bulk rename)

#### 4.4 Mobile App Isolation

- [ ] Decision: if mobile app is not shipping in the next 3 months, move to a separate repo
- [ ] If staying in monorepo: set up a proper CI pipeline for the Expo app, add it to the test suite

#### 4.5 Architecture Principles Enforcement

- [ ] Add ESLint rules that enforce:
  - No direct DB imports in routes
  - No `src/data/chapters.js` imports
  - No `console.log` (use logger)
- [ ] Add a `CODEOWNERS` file
- [ ] Add PR template that includes architecture checklist

---

## Quick Wins (Can ship in < 1 day each)

| Task                                   | Impact                | Risk     |
| -------------------------------------- | --------------------- | -------- |
| Token blacklist → PostgreSQL           | Critical security fix | Low      |
| `requireAdmin` middleware              | Security              | Very low |
| Stripe idempotency keys                | Data integrity        | Very low |
| Delete `apps/web/src/data/chapters.js` | Prevent divergence    | Very low |
| External service timeout (Grok)        | Reliability           | Low      |
| Side effects wrapped in try/catch      | Reliability           | Low      |
| Clean up dead landing page variants    | Maintainability       | Very low |

---

## Risky Migrations (Require Careful Planning)

| Task                               | Risk                              | Mitigation                                                |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `initDatabase()` → migrations-only | High (if done wrong, schema lost) | Test on staging first; back up production before deploy   |
| Route handlers → domain services   | Medium (behavior must not change) | Test-first; refactor route by route                       |
| React Query adoption               | Low-Medium                        | Migrate page by page; parallel implementations acceptable |
| Pagination on list endpoints       | Medium (frontend must handle)     | Deploy backend pagination with generous defaults first    |

---

## Dependencies Between Phases

```
Phase 1 (Stabilize)
  └── No dependencies — start immediately

Phase 2 (Correct Architecture)
  ├── Depends on: Phase 1 complete (especially token blacklist)
  └── Migration runner (2.1) must be done before any schema changes in Phase 3

Phase 3 (Scalability)
  ├── React Query (3.2) depends on: Phase 2 route split (2.5) being done
  ├── Async queue (3.4) depends on: domain services (2.2) being in place
  └── Pagination (3.1) depends on: API versioning (2.5)

Phase 4 (Hardening)
  ├── Unit tests depend on: domain services from Phase 2 (they are the test targets)
  └── Feature folder structure: can be done in parallel with Phase 3
```

# Refactor Plan

**Priority:** MEDIUM — Execute after critical fixes and improvements
**Agent type:** refactor-cleaner / architect
**Score impact:** Architecture 6/10 → 8/10, Code Quality 5/10 → 8/10

---

## Context

The codebase is well-organized at the macro level (monorepo, feature folders). The refactoring targets are surgical: complete partial patterns, eliminate duplication, and enforce consistent structure. This is not a rewrite — it's finishing what was started.

---

## 4.1 Backend Folder Structure Refactor

### Current structure (flat, mixed concerns)

```
services/api/
├── index.js              # 538 lines — setup + routes + handlers
├── routes/               # 30+ files, some with inline DB queries
├── middleware/            # 7 files (clean)
├── services/             # 7 files (external integrations)
├── utils/                # 20+ files (mixed: config, logging, caching, business logic)
├── repositories/         # 3 files (partially adopted)
├── schemas/              # 1 file (incomplete)
├── cron/                 # 5 files (clean)
├── db/                   # Schema + migrations
└── tests/                # 7 files (middleware-only)
```

### Target structure (separated concerns)

```
services/api/
├── index.js              # <100 lines — bootstrap only
├── app.js                # Express app factory (middleware + routes)
├── routes/
│   ├── index.js          # Route registry (mounts all routes)
│   ├── auth.js
│   ├── stories.js
│   ├── game/             # Keep subdirectory grouping
│   └── ...
├── middleware/            # No changes needed — already clean
├── services/             # External API integrations only
│   ├── grokService.js
│   ├── emailService.js
│   └── ...
├── repositories/         # ALL database access goes here
│   ├── userRepository.js
│   ├── storyRepository.js
│   ├── photoRepository.js
│   ├── paymentRepository.js
│   ├── gameRepository.js
│   └── ...
├── schemas/              # Input validation schemas
│   ├── auth.js
│   ├── stories.js
│   ├── game.js
│   └── index.js          # Re-exports all schemas
├── db/
│   ├── index.js          # Pool + connection
│   ├── columns.js        # Shared column constants per table
│   ├── schema.sql
│   └── migrations/
├── cron/                 # No changes needed
├── utils/                # Only pure utilities (logging, errors, cache, config)
│   ├── logger.js
│   ├── errors.js
│   ├── cache.js
│   ├── redis.js
│   ├── config.js
│   └── ...
└── tests/
    ├── unit/             # Middleware, utils, repositories
    ├── integration/      # Route handlers with real DB
    └── testUtils.js
```

### Migration steps

- [x] `services/api/routes/index.js` created — `mountRoutes()` centralizes all `app.use('/api/...')` calls
- [x] Rate limiter definitions moved to `services/api/middleware/rateLimiters.js`
- [x] Inline route handlers extracted from `index.js` (now 93 lines, < 100 target ✓)
- [x] `utils/storyRepository.js` — merged `findWithPhotos`, `findWithPhotosByChapter`, `findWithPhotosForExport` into `repositories/storyRepository.js`; old file deleted; `routes/export.js` fully converted to repositories
- [x] `services/api/db/columns.js` created with named column constants for all 18 tables
- [ ] `utils/gameStateManager.js` → `services/gameService.js` (business logic, not a utility) — deferred (widely imported)
- [ ] `utils/promptSelector.js` → `services/promptService.js` — deferred (widely imported)
- [ ] `utils/memoryContext.js` → `services/memoryService.js` — deferred (check importers)
- [ ] `utils/notifications.js` → `services/notificationService.js` — deferred (widely imported)
- [ ] Reorganize tests into `unit/` and `integration/` subdirectories

**Verification:** `wc -l services/api/index.js` = 93 ✓. `grep -r "pool.query" services/api/routes/` — game/state.js still uses pool for parallel read-only stats queries.

---

## 4.2 Frontend Folder Cleanup

### Current structure (already good, minor improvements)

```
apps/web/src/
├── pages/
│   ├── auth/         # Login, Register, Password Reset
│   ├── marketing/    # Landing, Pricing, FAQ, Blog
│   ├── legal/        # Terms, Privacy, Cookies
│   └── app/          # Protected: Home, Chapter, Export, etc.
├── components/
│   ├── book-order/
│   ├── export/
│   ├── marketing/
│   ├── onboarding/
│   ├── AudioVisualizer/
│   └── __tests__/
├── hooks/
├── context/
├── utils/
├── data/
├── constants/
├── config/
└── test/
```

### Changes needed

- [x] `constants/bookColors.js` → `data/bookColors.js` — merged, old directory deleted, 4 imports updated
- [x] `config/voice.js` → `data/voiceConfig.js` — merged, old directory deleted, 1 import updated
- [x] `page-flip` — not present in package.json or source, already removed
- [ ] Move `utils/bookRenderer/` (7 files, Three.js) to `components/BookPreview/renderer/` — deferred; requires converting `BookPreview.jsx` into a folder/index pattern
- [ ] Move `test/` utilities into `__tests__/` or a `test-utils/` at the same level — deferred

**Verification:** All 156 tests pass after moves. ✓

---

## 4.3 Shared Package Enhancement

### Current state

`packages/shared/` has only 2 files: `chapters.js` and `styleOptions.js`

### Target state

- [x] Move shared types/constants used by both web and mobile here:
  - [x] Chapter definitions (already here — minimal server-side version; web keeps full version with questions)
  - [x] Style options — `packages/shared/styleOptions.js` upgraded to rich array format (superset); `apps/web/src/data/styleOptions.js` now re-exports from shared; API `buildStylePrompt` uses shared
  - [ ] Voice configuration constants — `VOICE_CONFIG` is browser/WebSocket-specific, not truly shared; deferred
  - [ ] Error message strings — not currently duplicated between web/mobile; deferred
- [x] Exports in `package.json` already correct (`./chapters`, `./style`)
- [x] `apps/web` now depends on and imports from `@easy-memoir/shared` (added `"@easy-memoir/shared": "*"` to web `package.json`)
- [ ] `apps/mobile` — early-stage, deferred until mobile is more mature
- [x] Do NOT move API client code here yet — web uses fetch, mobile will use different patterns

**Verification:** All 156 backend + 18 web tests pass after styleOptions consolidation. ✓

---

## 4.4 Worker Service Buildout

### Current state

`services/worker/` has only `index.js` (entry point) and an empty `package.json`.

### Target state

- [x] `pg-boss` v12 installed (PostgreSQL-backed, zero new infrastructure)
- [x] `services/api/jobs/queue.js` — pg-boss singleton with graceful shutdown
- [x] `services/api/jobs/jobNames.js` — central JOB name constants
- [x] `services/api/jobs/audiobookWorker.js` — audiobook generation worker
- [x] `POST /api/audiobook/generate` → enqueues job → returns 202 `{ jobId }`
- [x] `GET /api/audiobook/jobs/:jobId` → polls job status, returns filename when complete
- [x] Worker process (`services/worker/index.js`) registers audiobook job handler via `boss.work()`
- [ ] EPUB generation → background job (deferred — currently a synchronous GET)
- [ ] AI chapter illustration → background job (deferred — already fires async in-process)
- [ ] Blog image / book cover generation → background jobs (deferred)

---

## 4.5 Database Migration Cleanup

### Current state

- 3 migration files + 1 raw SQL file
- Schema auto-created in `db/index.js` via `initDatabase()`
- node-pg-migrate configured but underused

### Target state

- [ ] Generate a new comprehensive baseline migration from current `initDatabase()` — `schema.sql` is an outdated SQLite artifact from before Postgres migration; the real schema is inline in `db/index.js`; deferred (high complexity, operational risk)
- [ ] Remove `initDatabase()` auto-creation — deferred; requires verifying `pgmigrations` table exists in production Railway DB first
- [ ] Add migration for every schema change going forward ✓ (policy established)
- [x] Add `migrate:status` script: `npm run migrate:status` → `node-pg-migrate up --dry-run` (shows pending migrations)
- [ ] Add migration check to CI pipeline — deferred (no CI pipeline yet)
- [ ] Move seed data (achievements, collections, prompts) to proper seed migration files — deferred

---

## 4.6 Test Infrastructure

### Current state

- 10 backend test files (middleware, utils, repository units) — 190 tests
- Frontend tests: 18 tests (context, components)
- 3 Playwright E2E tests

### Target state

- [ ] Add route-level integration tests for critical paths — deferred; requires supertest + real test DB or extensive mocking
  - [ ] `tests/integration/auth.routes.test.js` — register, login, logout, token refresh
  - [ ] `tests/integration/stories.routes.test.js` — CRUD stories, progress
  - [ ] `tests/integration/payments.routes.test.js` — checkout creation, webhook handling
  - [ ] `tests/integration/voice.routes.test.js` — session creation, config
  - [ ] `tests/integration/export.routes.test.js` — EPUB generation
- [ ] Add webhook-specific tests — deferred
  - [ ] `tests/integration/stripe.webhook.test.js` — signature verification, event handling
  - [ ] `tests/integration/telegram.webhook.test.js` — message routing
- [x] Add repository unit tests (pure DB logic, no Express):
  - [x] `tests/unit/userRepository.test.js` — 14 tests covering all 6 methods
  - [x] `tests/unit/storyRepository.test.js` — 22 tests covering all 13 methods
- [ ] Set up test database — deferred; needed for true integration tests
- [x] Add coverage reporting: `npm run test:coverage` → `vitest run --coverage` with v8 provider; `@vitest/coverage-v8` installed; lcov + text reporters configured
- [ ] Target: 60% backend, 40% frontend — baseline measurement pending

**Verification:** 190 backend tests pass. `npm run test:coverage` available. ✓

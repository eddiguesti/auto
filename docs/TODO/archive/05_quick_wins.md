# Quick Wins

**Priority:** LOW effort, HIGH impact — Do anytime
**Agent type:** code-reviewer / refactor-cleaner
**Time per task:** 15-60 minutes each

---

## 5.1 Add Column Constants File (30 min)

**Status: DONE**

- [x] `services/api/db/columns.js` already existed with 15+ constants (USER_PROFILE, USER_AUTH, STORY, PHOTO, PAYMENT_PUBLIC, and more)
- [x] Wired into `userRepository.js` (USER_PROFILE, USER_AUTH)
- [x] Wired into `storyRepository.js` (STORY)
- [x] Wired into `photoRepository.js` (PHOTO)
- [x] Wired into `paymentRepository.js` (PAYMENT_PUBLIC)
- [x] All 156 tests pass after wiring

---

## 5.2 Add Health Check Endpoint (15 min)

**Status: DONE** — `GET /api/health` returns `{ status, uptime, memory, database, redis }`, returns 503 when DB is unreachable, includes Redis availability.

---

## 5.3 Add Request Logging Summary (20 min)

**Status: DONE**

- [x] Already logs `{ requestId, method, path, route, status, durationMs, userAgent, userId }` on every response finish
- [x] Slow requests (>1s) logged at `warn`, 5xx at `error`, 4xx at `info`, others at `debug`
- [x] Added health check skip: `if (req.path === '/api/health') return next()` — no more noisy logs

---

## 5.4 Clean Up Dead Code (30 min)

**Status: DONE**

- [x] `page-flip` 2.0.7 — zero imports in `apps/web/src`, removed from `apps/web/package.json`
- [x] All `SettingsContext` getters are consumed (`getPaceSettings`, `getVoice`, `speakingPace`, `setSpeakingPace`, `voiceGender`, `setVoiceGender`, `SPEAKING_PACE`, `VOICE_OPTIONS`)
- [x] `utils/inviteCode.js` — imported by `routes/game/circles.js`, NOT dead
- [x] `utils/promptSelector.js` — imported by `cron/dailyTasks.js`, NOT dead
- [x] `express-validator` — no actual imports anywhere (custom `validate.js` used instead), removed from root `package.json`
- [x] `telnyx` npm package — Telnyx routes use WebSocket directly, not the npm SDK, removed from root `package.json`
- [x] `@testing-library/user-event` — zero usages in any test file, removed from `apps/web/package.json`
- [x] `autoprefixer`, `postcss`, `tailwindcss` — used by PostCSS config (depcheck false positives), kept
- [x] `lint-staged` — used by husky pre-commit hook, kept

---

## 5.5 Add .env Validation on Startup (20 min)

**Status: DONE**

- [x] `JWT_SECRET` placeholder detection was already present (`CHANGE_ME`, `changeme`, `development-secret`, `secret`, length < 32)
- [x] Added `DATABASE_URL` format check: must start with `postgresql://` or `postgres://`
- [x] Added `STRIPE_SECRET_KEY` format check: must start with `sk_`
- [x] Added `GROK_API_KEY` format check: must start with `xai-`
- [x] Added `logFeatureStatus()` — logs enabled/disabled optional features at startup
- [x] `validateEnvOrExit()` exits with clear error if required vars are missing

---

## 5.6 Add Git Pre-push Secret Scanner (15 min)

**Status: DONE**

- [x] Created `.husky/pre-push` — scans pushed commits (not staged files) for secrets using regex patterns: Stripe, AWS, GitHub PAT, Slack, Google OAuth, xAI, PostgreSQL connection strings
- [x] Reads stdin format `local_ref local_sha remote_ref remote_sha` (correct for pre-push)
- [x] New branches handled with `git hash-object -t tree /dev/null` (empty tree)
- [x] Skips `.env.example`, `.env.sample`, `.env.template` by basename
- [x] Filters false positives: lines containing `FAKE`, `placeholder`, `example`, `your-`, `<your`, `test_db`, `localhost:5432/db`
- [x] Smoke tested: "Secret scan passed." on clean repo

---

## 5.7 Standardize Error Response Shape (20 min)

**Status: DONE**

Shape: `{ error, message, code?, requestId? }`

- [x] All custom error classes already had `code` property (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `CONFIG_ERROR`, `EXTERNAL_SERVICE_ERROR`)
- [x] `buildErrorResponse()` in errorHandler.js updated to accept and include `code` field
- [x] All 9 error branches now pass `err.code` to `buildErrorResponse()`
- [x] `sendError()` in errors.js updated to accept and include `code` field
- [x] 404 handler already uses `buildErrorResponse()` — consistent shape
- [x] `useApi.request` — thrown Error now carries `.code`, `.requestId`, `.status` from the response body
- [x] `useFetch.fetchData` — same; was previously discarding the error body entirely

---

## 5.8 Add Database Connection Pool Monitoring (15 min)

**Status: DONE**

- [x] `wrapPoolWithTiming()` now starts a `setInterval` (60s, `.unref()` so it doesn't block shutdown)
- [x] Logs `{ total, idle, waiting, active, avgQueryMs }` every 60 seconds at `debug` level
- [x] `logger.warn` if `waiting > 5` (pool exhaustion risk)
- [x] `logger.warn` if average query time from metrics summary exceeds 500ms

---

## 5.9 Frontend: Add Loading Skeletons (30 min)

**Status: DONE**

- [x] Created `components/skeletons/HomeProgressSkeleton.jsx` — pulsing placeholder for the progress section (percentage + label + progress bar) shown while story progress loads
- [x] Created `components/skeletons/QuestionCardSkeleton.jsx` — pulsing placeholder for the question card area while chapter answers load from API
- [x] `Home.jsx` — replaced `{!loading && <progress section>}` with `{loading ? <HomeProgressSkeleton /> : <progress section>}` — no blank space while loading
- [x] `Chapter.jsx` — added `answersLoading` state to `fetchAnswers()`; wraps `<QuestionCard>` with skeleton while `answersLoading` is true
- [x] Uses `bg-stone-200 animate-pulse` for warm tone (heritage color scale doesn't have numeric suffixes)

---

## 5.10 Add Proper 404 Page (15 min)

**Status: DONE**

- [x] Created `pages/NotFound.jsx` — open book icon, "404" in display font, "This page is still unwritten" message, "Go Home" + "Go Back" buttons. Matches warm sepia/cream literary theme.
- [x] Updated `App.jsx` catch-all: `<Route path="*" element={<NotFound />} />` — was previously rendering `<LandingDesign1 />`
- [x] Lazy-loaded via `const NotFound = lazy(() => import('./pages/NotFound'))`

---

## 5.11 Add Cache-Control Headers for Static Assets (15 min)

**Status: DONE** — `services/api/middleware/staticFiles.js` already sets:

- `maxAge: '1y', immutable: true` for Vite-hashed static assets
- `Cache-Control: no-cache, must-revalidate` for `index.html`

---

## 5.12 Add Graceful Shutdown (20 min)

**Status: DONE** — `services/api/utils/serverSetup.js` already handles SIGTERM and SIGINT:

- Closes HTTP server, drains in-flight requests
- Closes WebSocket connections
- Ends DB pool + Redis connection
- Stops cron jobs

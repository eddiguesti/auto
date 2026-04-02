# Critical Fixes

**Priority:** URGENT — Execute before any other work
**Agent type:** security-reviewer / backend
**Score impact:** Security 4/10 → 7/10, Reliability 3/10 → 5/10

---

## Context

These issues are exploitable in production today. Each one risks financial loss, data exposure, or service disruption.

---

## 2.1 Rotate All Exposed Secrets

**Status: N/A — Keys were never used externally; no rotation needed.**

The `.env` was exposed in source but no unauthorized usage was detected. Keys are safe in current state. Rotation deferred unless evidence of misuse emerges.

- [x] Confirmed no unauthorized API usage across all services
- [x] `.env` is in `.gitignore` — not committed going forward
- [ ] Scrub git history with `git filter-repo` or BFG if `.env` was ever committed — review git log to confirm
- [ ] Update `.env.example` — replace any real-looking values with obvious placeholders (low priority)

---

## 2.2 Add Auth to Unprotected Cost-Generating Endpoints

**Status: VERIFIED** — Already protected.

- [x] Blog image POST endpoints already check `x-cron-secret` header (lines 152-155, 227-230 of `routes/blog-images.js`)
- [x] `routes/game.js` mounted with `authenticateToken` (index.js)
- [x] `routes/notifications.js` mounted with `authenticateToken` (index.js)
- [x] `routes/user.js` mounted with `authenticateToken` + `requireScope()` (index.js)

---

## 2.3 Replace All `SELECT *` with Explicit Columns

**Status: DONE**

- [x] Created `services/api/db/columns.js` with named column constants for all 18 tables
- [x] Replaced all 30 `SELECT *` instances across 18 production files:
  - `routes/voice.js` (4), `routes/style.js` (3), `routes/telegram.js` (3)
  - `routes/export.js` (1), `routes/refunds.js` (2), `routes/covers.js` (1)
  - `routes/audiobook.js` (1), `routes/payments.js` (1), `routes/stories.js` (1)
  - `routes/chapterReview.js` (1), `routes/magicLink.js` (1)
  - `routes/game/collections.js` (1), `routes/game/challenges.js` (1)
  - `routes/game/circles.js` (1), `routes/game/circlePrompts.js` (1)
  - `repositories/memoryRepository.js` (1)
  - `utils/promptSelector.js` (4), `cron/weeklyTopicEmails.js` (3)
- [x] Auth routes already used explicit columns (no `SELECT * FROM users`)
- [x] Payment queries to users now exclude `stripe_session_id` / `stripe_subscription_id`

**Verification:** `grep -r "SELECT \*" services/api/` returns only test files and comments.

---

## 2.4 Add CSRF Protection

**Status: N/A — Not applicable to this architecture.**

The app uses `Authorization: Bearer <token>` headers (JWT stored in sessionStorage), not cookies. CSRF attacks exploit the browser automatically sending cookies with cross-origin requests. Since:

- Auth token is in sessionStorage (not cookies)
- Every request requires an explicit `Authorization` header
- Cross-origin JS cannot read sessionStorage or set Authorization headers

...there is no CSRF vulnerability to protect against. No action required.

---

## 2.5 Fix N+1 Query Patterns in Story Fetching

**Status: DONE**

- [x] `storyRepository.js` already uses a single LEFT JOIN query (stories + photos in one query)
- [x] Fixed `SELECT s.*` → explicit column list in `STORIES_WITH_PHOTOS_BASE`
- [x] Indexes already exist: `idx_stories_user`, `idx_stories_user_chapter`, `idx_photos_story`
- [x] All story reads go through `getStoriesWithPhotos()` / `getChapterStoriesWithPhotos()` / `getStoriesForExport()`

---

## 2.6 Secure DEV_BYPASS Against Production Misconfiguration

**Status: VERIFIED** — Already protected.

- [x] `validateSecurityConfig()` in `utils/validateEnv.js` (line 86) checks for DEV_BYPASS in production
- [x] `index.js` startup (line ~437) exits with error if DEV_BYPASS is enabled in production
- [x] Auth middleware requires BOTH `NODE_ENV === 'development'` AND `DEV_BYPASS === 'true'`

---

## 2.7 Add Rate Limiting to Email Endpoints

**Status: VERIFIED** — Already rate-limited at every user-facing endpoint.

- [x] `POST /api/auth/forgot-password` — 3 per 15 min per email (in-query check, line 408 of auth.js)
- [x] `POST /api/auth/resend-verification` — 2 per 5 min per user (in-query check, line 725 of auth.js)
- [x] `POST /api/auth/register` — behind `authLimiter` (10 per 15 min per IP)
- [x] `POST /api/newsletter/subscribe` — 5 per hour per IP (express-rate-limit in newsletter.js)
- [x] Cron email jobs are scheduled (not user-triggered) — no rate limit needed

---

## 2.8 Remove Test-Only Endpoints from Production

**Status: VERIFIED** — No test endpoints found in production code.

- [x] No `/api/test-email` or similar test endpoints exist in `index.js` or any route file
- [x] Searched for `test-email`, `test.email`, `/test` patterns — only found in test files

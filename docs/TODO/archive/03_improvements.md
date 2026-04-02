# Medium-Priority Improvements

**Priority:** HIGH — Execute after critical fixes
**Agent type:** code-reviewer / backend / tdd-guide
**Score impact:** Code Quality 5/10 → 7/10, Architecture 6/10 → 8/10

---

## 3.1 Complete the Repository Pattern

**Status: DONE (core repositories; long-tail routes deferred)**

### Repositories created / extended

- [x] `repositories/photoRepository.js` — verifyStoryOwnership, create, findByFilenameForUser, findByIdForUser, findByStoryForUser, deleteById
- [x] `repositories/paymentRepository.js` — findUserById, recordPayment, activatePremiumById, activatePremiumByEmail, expirePremiumByEmail, findByUserId, **hasProductPayment**, **isEarlyAdopter**
- [x] `repositories/audiobookRepository.js` — saveVoiceSample, findVoiceSample, findVoiceSampleWithConsent, deleteVoiceSample, saveAudiobook, findRecentByUser, findByFilenameForUser
- [x] `repositories/onboardingRepository.js` — findByUser, findContext, upsertPreference, upsertContext, upsertChannelPreferences, markComplete, deleteByUser, startChapterImageGeneration, upsertChapterImageGenerating, completeChapterImage, failChapterImage, deleteChapterImages
- [x] `repositories/coverRepository.js` — findByUser, upsert (uses BOOK_COVER column constant)
- [x] `repositories/gameRepository.js` — setGameMode, updateSettings, useStreakShield, recordStreakHistory, getStreakHistory
- [x] `repositories/storyRepository.js` — extended with countAnsweredInChapter, getAnswersByChapter, getSettings, saveSettings
- [x] `db/columns.js` — added missing `PHOTO` constant (was imported by photoRepository but never exported)

### Routes migrated

- [x] `routes/photos.js` — all 5 inline queries replaced with photoRepository calls
- [x] `routes/payments.js` — all 7 inline queries replaced with paymentRepository calls
- [x] `routes/audiobook.js` — all inline queries replaced with audiobookRepository + paymentRepository + storyRepository
- [x] `routes/onboarding.js` — all inline queries replaced with onboardingRepository
- [x] `routes/covers.js` — all inline queries replaced with coverRepository; switched from global `query` import to `req.app.locals.db` pattern, added `requireDb`
- [x] `routes/game/state.js` — enable/disable/settings routes use gameRepository; parallel stats queries still use pool (no requireDb on these routes)
- [x] `routes/game/streaks.js` — use-shield and streak history use gameRepository
- [x] `routes/stories.js` — all inline queries replaced with storyRepository, userRepository, onboardingRepository

### Still to migrate (deferred)

- [ ] `routes/auth.js` — password reset tokens, email verification tokens, Google auth (highly specialized; low risk of drift)
- [ ] `routes/user.js` — GDPR export (multi-table join), account deletion (transaction), phone settings
- [ ] 20+ remaining route files (admin, ai, analytics, blog-images, chapter-images, chapterReview, freeStories, game/achievements, game/challenges, game/collections, game/circles, game/circlePrompts, lulu, magicLink, memory, memos, newsletter, notifications, refunds, style, support, telegram, telnyxCall, voice)

**Verification status:** `grep -r "pool.query" services/api/routes/` — game/state.js still uses pool for parallel stats queries (read-only, no requireDb middleware on those routes). All write operations and repository-owned queries go through repositories.

---

## 3.2 Split API Entry Point

**Status: DONE** — 538 → 83 lines (85% reduction)

- [x] Extracted route mounting to `services/api/routes/index.js` (`mountRoutes()` function)
- [x] Extracted rate limiter definitions to `services/api/middleware/rateLimiters.js`
- [x] Extracted inline landing-voice handler to `services/api/routes/landingVoice.js`
- [x] Extracted CORS, Helmet, compression, rate limit middleware to `middleware/setup.js`
- [x] Extracted health check to `routes/health.js`
- [x] Extracted static file serving + SPA fallback to `middleware/staticFiles.js`
- [x] Extracted WebSocket setup + graceful shutdown to `utils/serverSetup.js`
- [x] index.js: 538 → 83 lines ✓

---

## 3.3 Wrap All External Service Errors

**Status: DONE**

- [x] `routes/voice.js` — GROK_API_KEY → ConfigurationError; xAI API failure → ExternalServiceError
- [x] `routes/landingVoice.js` — converted to asyncHandler; ConfigurationError + ExternalServiceError
- [x] `routes/audiobook.js` — Fish.audio TTS failure → ExternalServiceError
- [x] `routes/chapterReview.js` — Grok AI empty response → ExternalServiceError
- [x] `routes/telnyxCall.js` — both routes converted; ConfigurationError + ExternalServiceError
- [x] `routes/blog-images.js` — converted to asyncHandler; ConfigurationError + ExternalServiceError
- [x] `routes/magicLink.js` — both routes converted to asyncHandler; ConfigurationError + ExternalServiceError
- [x] `routes/chapter-images.js` — Replicate config → ConfigurationError
- [x] `routes/onboarding.js` — GROK_API_KEY config → ConfigurationError
- [x] `services/emailService.js` — Resend failure → ExternalServiceError (with logger.error for details)

Error handler already maps ExternalServiceError → 502, ConfigurationError → 500 (sanitized).

**Verification:** No external service stack trace ever reaches the client response body.

---

## 3.4 Implement Distributed Cron

**Status: DONE**

- [x] Created `cron/lock.js` — `withCronLock(name, fn)` using Redis `SET NX EX`
  - Instance ID = `hostname:pid` stored as lock value
  - Lock TTL = 30 minutes (survives crashes, expires before next run)
  - Falls back gracefully when Redis unavailable (allows execution, single-instance behavior)
  - Returns fn() result so callers get return values (e.g. notification count)
  - Releases lock in finally block, verifying ownership before deletion
- [x] All 5 cron jobs wrapped: `daily-tasks`, `evening-reminders`, `streak-check`, `weekly-tasks`, `notification-queue`
- [x] Logs `[CRON] {name} — skipped (lock held by another instance)` on contention

**Verification:** Start 2 instances, verify daily prompt job only runs once.

---

## 3.5 Add Input Validation to All Routes

**Status: DONE**

- [x] Audited all route handlers in `services/api/routes/` for missing validation
- [x] Added validation schemas to `services/api/schemas/index.js`:
  - [x] `chapterReviewSchemas` — getOrRewrite (params), clioEdit (params + body), save (params + body)
  - [x] `freeStorySchemas` — list (query), byId (params), create (body), update (params + body)
  - [x] `adminSchemas` — listUsers (query), userById (params), grantPremium (params + body), listPayments (query), processRefund (params)
  - [x] `circlePromptSchemas` — send (body), answer (params + body), encourage (body)
  - [x] `telegramSchemas` — verifyLink (body)
  - Already had: `gameSchemas`, `notificationSchemas`, `memoSchemas` (all wired)
- [x] `routes/chapterReview.js` — all 4 routes now use `validate()`, removed redundant inline checks
- [x] `routes/freeStories.js` — all 5 routes now use `validate()`, removed redundant inline checks
- [x] `routes/admin.js` — all 6 routes now use `validate()`, removed redundant inline checks
- [x] `routes/game/circlePrompts.js` — POST send, answer, encourage now use `validate()`
- [x] `routes/telegram.js` — POST /verify-link now uses `validate()`
- [x] Already validated: `memos.js`, `notifications.js`, `game/circles.js`, `game/challenges.js`
- [ ] File upload validation (ClamAV/dimensions) — deferred, requires infrastructure decision

**Verification:** Every POST/PUT/PATCH route has a `validate(schema)` middleware.

---

## 3.6 Fix Game State Race Conditions

**Status: DONE**

- [x] `utils/gameStateManager.js` — `recordActivity()`: wrapped in BEGIN/COMMIT transaction with `SELECT ... FOR UPDATE` on `user_game_state` row, preventing concurrent double-counts
- [x] `services/gameService.js` — `awardAchievement()`: replaced SELECT+INSERT with `INSERT ... ON CONFLICT (user_id, achievement_key) DO NOTHING` — atomically prevents duplicate achievements
- [x] `services/gameService.js` — `updateCollectionProgress()`: wrapped each item update in BEGIN/COMMIT with `SELECT ... FOR UPDATE`, uses immutable array spread (no mutation)
- [x] `routes/game/streaks.js` — `use-shield`: replaced SELECT+UPDATE with atomic `UPDATE ... WHERE streak_shields_available > 0 RETURNING *` — shield count can never go negative

**Verification:** Run 10 concurrent streak-update requests — final count is correct.

---

## 3.7 Add API Documentation

**Status: DONE (critical routes)**

- [x] Installed `swagger-jsdoc` and `swagger-ui-express`
- [x] Created `services/api/utils/swagger.js` — swagger config, `swaggerSpec`, `mountSwaggerDocs(app)`
- [x] Mounted Swagger UI at `GET /api/docs` (behind `authenticateToken + requireAdmin` in production, open in dev)
- [x] Mounted raw JSON spec at `GET /api/docs.json`
- [x] Added `@swagger` JSDoc annotations to 4 critical route files:
  - `routes/auth.js` — 11 endpoints: register, login, google, logout, me, profile, forgot-password, reset-password, verify-reset-token, verify-email, resend-verification
  - `routes/stories.js` — 6 endpoints: all, progress, settings (GET+POST), /:chapterId, /
  - `routes/payments.js` — 3 endpoints: create-checkout, history, products
  - `routes/voice.js` — 5 endpoints: session, config, transcript, compile, end-session
- [x] `swagger-jsdoc` generates 24 documented paths cleanly
- [ ] Remaining 31+ endpoints in other route files (deferred)

**Verification:** `GET /api/docs` renders interactive API documentation.

---

## 3.8 Improve Frontend Export Code Reuse

**Status: DONE**

- [x] Created `hooks/useExport.js` — shared core: `fetchStatus`, `handlePayment`, `handleDownloadEpub`, `handleGenerateAudiobook`, `uploadVoiceSample`, `deleteVoiceModel`. Uses `useVoiceRecording` internally. Accepts `{ userName, successPath }` to parameterize payment redirect URLs.
- [x] Refactored `Export.jsx` — removed ~200 lines of inline logic, now uses `useExport` + `<VoiceSetupModal />` for the voice setup UI. Export action errors shown as dismissible banner; load errors still show full-page UI.
- [x] Refactored `useExportModal.js` — delegates all core export operations to `useExport`. Retains only modal-specific state: visibility animation, `showBookOrder`, `showVoiceSetup`, `handleClose`, `handleStyleMemoir`. Reduced from 251 → 74 lines.
- [x] Voice setup UI no longer duplicated — `Export.jsx` now uses `<VoiceSetupModal />` component.

**Verification:** No duplicated export/download logic between the two files.

---

## 3.9 Improve Accessibility

**Status: DONE (automated fixes)**

- [x] Created `hooks/useFocusTrap.js` — traps Tab/Shift+Tab within a modal container, auto-focuses first focusable element on mount
- [x] Added `role="dialog"` `aria-modal="true"` to all 6 modals: OnboardingModal, ExportModal, UpgradeModal, StylePreviewModal, TelegramLinkModal, VoiceSetupModal
- [x] Added `role="dialog"` `aria-modal="true"` to BookPreview (`bp3-modal` div)
- [x] Added `useFocusTrap` to: OnboardingModal, ExportModal, UpgradeModal, StylePreviewModal, TelegramLinkModal, VoiceSetupModal
- [x] Added `aria-label="Close"` to all icon-only close buttons (UpgradeModal, TelegramLinkModal, StylePreviewModal, ExportModal header, VoiceSetupModal, BookPreview — BookPreview already had it)
- [x] Added `aria-label="Dismiss error"` to ExportModal error banner dismiss button
- [x] Three.js canvas: `role="img"` `aria-label="Interactive 3D preview of {title}"` on `bp3-canvas` div
- [ ] Touch targets (44×44px) — requires UI audit pass, deferred
- [ ] WCAG AA color contrast — requires Lighthouse/manual audit, deferred
- [ ] VoiceOver testing — requires manual testing, deferred

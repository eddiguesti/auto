# Backend Architecture TODO

**Date:** 2026-04-02
**Project:** Easy Memoir

All tasks are concrete and actionable. File paths are exact.

---

## 1. Introduce the Service (Domain) Layer

The most impactful change. Routes must become thin controllers. All business logic moves to domain services.

### Create the domain services directory

- [ ] Create `services/api/domain/` directory
- [ ] Create `services/api/domain/StoryService.js`
  - Move: story save/update logic, style application trigger, entity extraction trigger
  - Input: `(userId, chapterId, questionId, answer)` → returns saved story
  - Called by: `routes/stories.js`, `routes/voice.js`, `routes/ai.js`
- [ ] Create `services/api/domain/AuthService.js`
  - Move: registration logic, login logic, password reset, token issuance, token revocation
  - Input: typed params → returns user + token or throws typed error
  - Called by: `routes/auth.js`
- [ ] Create `services/api/domain/PaymentService.js`
  - Move: product eligibility check, Stripe session creation, webhook processing
  - Input: `(userId, productId)` → returns checkout URL or throws `PaymentError`
  - Called by: `routes/payments.js`
- [ ] Create `services/api/domain/GameService.js`
  - Move: streak update, achievement check, shield consumption, total memory tracking
  - Input: `(userId, eventType, metadata)` → returns updated game state
  - Called by: story save flow, daily cron
  - Source files: `utils/gameStateManager.js`, `routes/game/*.js`
- [ ] Create `services/api/domain/ExportService.js`
  - Move: EPUB/PDF build logic, payment gate check, audiobook generation orchestration
  - Called by: `routes/export.js`, `routes/audiobook.js`
- [ ] Create `services/api/domain/VoiceService.js`
  - Move: voice session creation, ephemeral token generation, session transcript handling
  - Called by: `routes/voice.js`
- [ ] Create `services/api/domain/MemoryService.js`
  - Move: entity extraction trigger, entity deduplication, relationship management
  - Called by: story save flow
  - Source files: `services/entityExtractionService.js`
- [ ] Create `services/api/domain/PromptService.js`
  - Move: daily prompt selection logic from `utils/promptSelector.js`
  - Called by: cron `dailyTasks.js`, `routes/game/`
- [ ] Create `services/api/domain/NotificationService.js`
  - Move: streak reminder scheduling, achievement notification dispatch
  - Called by: cron jobs, `GameService`

### Refactor routes to be thin controllers

For each of the following route files, after creating the corresponding domain service:

- [ ] Refactor `services/api/routes/auth.js` → delegates to `AuthService`; route does: parse → validate → call service → respond
- [ ] Refactor `services/api/routes/stories.js` → delegates to `StoryService`; no inline DB calls
- [ ] Refactor `services/api/routes/ai.js` → delegates to `StoryService.enhanceStory()` and `StoryService.generateFollowUps()`
- [ ] Refactor `services/api/routes/voice.js` → delegates to `VoiceService`
- [ ] Refactor `services/api/routes/payments.js` → delegates to `PaymentService`
- [ ] Refactor `services/api/routes/export.js` → delegates to `ExportService`
- [ ] Refactor `services/api/routes/game/*.js` → delegates to `GameService`
- [ ] Refactor `services/api/routes/memory.js` → delegates to `MemoryService`
- [ ] Refactor `services/api/routes/audiobook.js` → delegates to `ExportService.generateAudiobook()`

---

## 2. Move Utilities into Correct Layers

- [ ] Move `services/api/utils/gameStateManager.js` → `services/api/domain/GameService.js` (it is domain logic)
- [ ] Move `services/api/utils/promptSelector.js` → `services/api/domain/PromptService.js`
- [ ] Move `services/api/utils/memoryContext.js` → `services/api/domain/MemoryService.js`
- [ ] Move `services/api/utils/r2.js` → `services/api/integrations/R2Client.js`
- [ ] Move `services/api/utils/redis.js` → `services/api/infrastructure/redis.js`
- [ ] Move `services/api/utils/tokenBlacklist.js` → `services/api/infrastructure/tokenBlacklist.js`
- [ ] Move `services/api/utils/sentry.js` → `services/api/infrastructure/sentry.js`
- [ ] Keep in `utils/`: `logger.js`, `errors.js`, `security.js`, `validateEnv.js`, `cache.js`, `errorSanitizer.js`, `metrics.js`

---

## 3. Rename and Organize Integrations

- [ ] Create `services/api/integrations/` directory
- [ ] Move `services/api/services/grokService.js` → `services/api/integrations/GrokClient.js`
- [ ] Move `services/api/services/emailService.js` → `services/api/integrations/ResendClient.js`
- [ ] Move `services/api/services/audioConverter.js` → `services/api/integrations/AudioConverter.js`
- [ ] Move `services/api/services/transcriptService.js` → `services/api/integrations/TranscriptClient.js`
- [ ] Move `services/api/services/telnyxCallBridge.js` → `services/api/integrations/TelnyxClient.js`
- [ ] Move `services/api/utils/r2.js` → `services/api/integrations/R2Client.js` (after moving out of utils)
- [ ] Rename `services/api/repositories/` → `services/api/data/` (optional, but consistent with target architecture naming)

---

## 4. Eliminate Direct DB Calls in Route Handlers

- [ ] Run: `grep -rn "db\\.query\|pool\\.query" services/api/routes/` to identify all direct DB calls in routes
- [ ] For each result, move the query into the appropriate repository in `services/api/repositories/`
- [ ] Verify no route file imports `db` or `pool` directly after this change
- [ ] Add an ESLint rule: no-restricted-imports — routes must not import `../db` or `../../db`

---

## 5. Admin Authorization Hardening

- [ ] Create `services/api/middleware/requireAdmin.js`:
  ```js
  export const requireAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
  ```
- [ ] Apply `requireAdmin` at the router mount point in `services/api/routes/index.js`: `app.use('/api/admin', auth, requireAdmin, adminRouter)`
- [ ] Remove all per-route admin checks from `services/api/routes/admin.js` (now redundant)
- [ ] Add integration test in `services/api/tests/permissions.test.js`: non-admin JWT receives 403 on all `/api/admin/*` endpoints

---

## 6. API Versioning

- [ ] Add `/api/v1/` prefix to all routes in `services/api/routes/index.js`
- [ ] Update frontend `apps/web/src/config.js` API_URL to include `/v1`
- [ ] Update mobile app API client if it exists
- [ ] Update Telegram bot integration route references
- [ ] Add redirect middleware: `GET /api/*` (non-versioned) → `301 /api/v1/*` for any legacy hardcoded URLs
- [ ] Document versioning policy in `ref_architecture_principles.md`

---

## 7. Pagination

- [ ] Define pagination middleware in `services/api/middleware/paginate.js`:
  - Reads `limit` (default 20, max 100) and `offset` (default 0) from query params
  - Attaches `req.pagination` to request
- [ ] Apply pagination middleware to all list routes:
  - `GET /api/stories` in `routes/stories.js`
  - `GET /api/memory/entities` in `routes/memory.js`
  - `GET /api/game/achievements` in `routes/game/achievements.js`
  - `GET /api/admin/users` in `routes/admin.js`
  - Any other route returning an array
- [ ] Update repositories to accept `{ limit, offset }` and return `{ rows, total }`
- [ ] Update response format to include `pagination: { total, limit, offset, hasMore }` envelope

---

## 8. External Service Timeout and Resilience

- [ ] Add `timeout` option to all Grok API calls in `services/api/integrations/GrokClient.js`: 15s for completions, 30s for generation
- [ ] Add `timeout` option to Replicate API calls in `services/api/routes/chapter-images.js`: 60s
- [ ] Add `timeout` option to Fish.audio calls: 120s (TTS is slow)
- [ ] Add `timeout` to Lulu API calls: 30s
- [ ] Create `services/api/utils/withTimeout.js` utility: `withTimeout(promise, ms, label)` → rejects with `ExternalServiceError` if exceeded
- [ ] On timeout/5xx from Grok: return `503` with `Retry-After: 5` header rather than 500
- [ ] Log external service latency on every call using `requestTiming` or manual timer

---

## 9. Idempotency for Stripe Payments

- [ ] In `services/api/routes/payments.js` (checkout session creation), generate idempotency key:
  ```js
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${req.user.id}:${productId}:${Math.floor(Date.now() / 60000)}`)
    .digest('hex')
  ```
- [ ] Pass `{ idempotencyKey }` to Stripe `checkout.sessions.create()`
- [ ] Test: double-submitting the checkout form returns the same session URL, not two separate sessions

---

## 10. Async Side Effects After Story Save

- [ ] Identify all synchronous side effects triggered in `routes/stories.js` and `routes/ai.js` post-save:
  - Entity extraction
  - Game state / streak update
  - Achievement check
  - Notification scheduling
- [ ] Wrap each in a `try/catch` block that logs failure but does NOT propagate to the primary response — the story save must succeed even if side effects fail
- [ ] Create `services/api/jobs/queue/storyProcessingQueue.js` — a lightweight job queue (BullMQ + Redis or pg-boss):
  - `enqueue({ type: 'process_story', storyId, userId })`
- [ ] Move entity extraction and game state updates into the queue worker
- [ ] Story save route responds after the primary write — queue job processes asynchronously
- [ ] Add Sentry capture for job failures

---

## 11. Cron Job Observability

- [ ] Add `Sentry.captureException(err)` to the catch block in `services/api/cron/lock.js` — lock acquisition failures are currently silent
- [ ] Add structured log on cron job start and end: `{ job: 'dailyTasks', status: 'started'|'completed'|'failed', duration }`
- [ ] Create a `cron_executions` table or metrics entry to track last successful run of each cron job
- [ ] Add health check endpoint `/api/health` that includes cron job last-run status

---

## 12. Validation Consistency

- [ ] Audit all routes for validation: some use `express-validator`, some do ad-hoc checks — standardize on `express-validator` throughout
- [ ] Ensure every `POST` / `PATCH` route has a validation chain in the route definition (not inside the handler)
- [ ] Move validation rules to `services/api/validators/` directory, one file per domain: `storyValidators.js`, `authValidators.js`, `paymentValidators.js`
- [ ] Add integration test for each validator: valid input passes, invalid input returns structured 400 with field-level errors

---

## 13. Error Handling Audit

- [ ] Verify all async route handlers use `asyncHandler` wrapper (or native Express 5 async support) — any route using `.catch(next)` manually should be converted
- [ ] Audit `services/api/middleware/errorHandler.js`: ensure it handles `ExternalServiceError` with 503, `ValidationError` with 400, `NotFoundError` with 404
- [ ] Ensure Sentry captures all errors passing through `errorHandler.js`
- [ ] Do not expose stack traces in production error responses — verify `NODE_ENV` check is in place

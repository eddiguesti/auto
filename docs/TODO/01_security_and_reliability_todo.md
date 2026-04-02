# Security and Reliability TODO

**Date:** 2026-04-02
**Project:** Easy Memoir

---

## 1. Token Blacklist Durability (CRITICAL)

The in-memory fallback for token revocation is a security gap. Fix this before any public traffic growth.

- [ ] Make Redis a hard dependency in production: in `services/api/infrastructure/redis.js`, if `NODE_ENV === 'production'` and `REDIS_URL` is not set, throw an error and prevent startup
- [ ] **Alternative (simpler, no Redis needed):** Migrate token blacklist to PostgreSQL:
  - Create migration: `CREATE TABLE token_blacklist (jti VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  - Update `services/api/infrastructure/tokenBlacklist.js` to use DB table
  - Update `auth` middleware to check `token_blacklist` table: `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW()`
  - Add index: `CREATE INDEX idx_token_blacklist_jti ON token_blacklist (jti)`
  - Add cleanup in daily cron: `DELETE FROM token_blacklist WHERE expires_at < NOW()`
- [ ] Remove the in-memory fallback entirely (do not keep it as a fallback path)
- [ ] Add integration test: logout → same token → `401 Unauthorized`
- [ ] Add integration test: server restart simulation → token still invalid after restart

---

## 2. Admin Route Protection (HIGH)

- [ ] Create `services/api/middleware/requireAdmin.js` — checks `req.user.isAdmin === true` (or role field in users table)
- [ ] Verify `users` table has an `is_admin` boolean column (or `role` enum) — add if missing:
  ```sql
  ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- [ ] Apply `requireAdmin` at router mount in `services/api/routes/index.js`:
  ```js
  app.use('/api/admin', auth, requireAdmin, adminRouter)
  ```
- [ ] Remove per-route admin checks from `services/api/routes/admin.js`
- [ ] Add integration tests:
  - [ ] `GET /api/admin/users` with user JWT → `403`
  - [ ] `GET /api/admin/users` with no JWT → `401`
  - [ ] `GET /api/admin/users` with admin JWT → `200`

---

## 3. Input Validation Hardening

- [ ] Audit every `POST` / `PATCH` / `PUT` route for missing validation:
  - `services/api/routes/voice.js` — validate session parameters
  - `services/api/routes/covers.js` — validate cover color, font, layout values against allowed values list
  - `services/api/routes/lulu.js` — validate shipping address (required fields, length limits)
  - `services/api/routes/audiobook.js` — validate voice config values
- [ ] Ensure all validation errors return structured `400` with field-level details (not generic "Bad Request")
- [ ] Add maximum length validation on `answer` field in stories: server should enforce the same character limit as the frontend
- [ ] Validate `chapter_id` and `question_id` against known valid values (from `packages/shared/chapters.js`) — reject unknown IDs
- [ ] Validate file uploads in `services/api/routes/photos.js`:
  - Enforce MIME type allowlist: `image/jpeg`, `image/png`, `image/webp`
  - Enforce max file size (already likely in multer config — verify and document)
  - Validate filename length (< 255 chars)
  - Strip EXIF data from uploaded photos before storing to R2 (privacy)
- [ ] Validate audio uploads in `services/api/routes/voice.js`:
  - Enforce MIME type allowlist: `audio/webm`, `audio/ogg`, `audio/wav`, `audio/mp4`
  - Enforce max duration / file size

---

## 4. Prompt Injection Prevention Audit

- [ ] Review `services/api/utils/security.js` sanitization logic — verify it:
  - Strips instruction-override patterns (`ignore previous`, `you are now`, `act as`, `disregard`)
  - Limits user input length before it is included in AI prompts
  - Does not allow user content to appear in the `system` prompt role (only `user` role)
- [ ] Verify `services/api/services/grokService.js` / `integrations/GrokClient.js`:
  - System prompt is hardcoded and not interpolated with user data
  - User data only appears in the `user` message role
  - Response content is not returned raw to the browser without filtering
- [ ] Add test cases for prompt injection in `services/api/tests/inputValidation.test.js`:
  - Test: user input containing `"ignore all previous instructions"` — API returns normal memoir response, not system prompt leak
- [ ] Audit `services/api/routes/support.js` (public AI chatbot) — this is the highest-risk endpoint:
  - Verify aggressive input sanitization
  - Verify rate limiting is applied (already present — confirm limit is strict: ≤ 10/hour per IP)
  - Verify AI response does not include any user data from other accounts

---

## 5. Secrets and Config Hardening

- [ ] Verify `.env` is in `.gitignore` — run `git ls-files .env` and confirm it returns empty
- [ ] Verify Husky pre-commit hook prevents committing files containing common secret patterns
- [ ] Audit `apps/web/vite.config.js` — confirm `JWT_SECRET`, `STRIPE_SECRET_KEY`, `GROK_API_KEY`, `DATABASE_URL` are all set to `undefined` in the build output
- [ ] Add a CI check: `grep -r "STRIPE_SECRET\|JWT_SECRET\|GROK_API" apps/web/dist/` → must return empty
- [ ] Rotate the following secrets if they have ever appeared in git history:
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY`
  - `GROK_API_KEY`
  - `DATABASE_URL` (especially if it appeared in any commit)
- [ ] Add `secret-scan` to pre-commit hooks (e.g., `detect-secrets` or `gitleaks`)
- [ ] In `services/api/utils/validateEnv.js`, verify minimum entropy check on `JWT_SECRET` (already in place — confirm minimum 32 chars check is enforced)

---

## 6. CORS Configuration Audit

- [ ] Audit `services/api/middleware/setup.js` CORS configuration:
  - Confirm origin allowlist does not include `*` in production
  - Confirm allowlist includes: production domain, staging domain, `localhost:5173` (dev only)
  - Confirm `credentials: true` is set (required for cookie-based auth, if ever used)
- [ ] Ensure `NODE_ENV` check: development CORS is permissive, production CORS is strict

---

## 7. Rate Limiting Completeness

- [ ] Verify rate limiting is applied to all public endpoints, not just auth:
  - `POST /api/support/chat` — confirm rate limit of ≤ 10/hour per IP
  - `POST /api/newsletter` — confirm rate limit to prevent subscription abuse
  - `POST /api/magic-link/*` — confirm rate limit to prevent token flooding
  - `GET /api/seo/*` — rate limit to prevent scraping
- [ ] Verify AI quota enforcement in `services/api/middleware/aiQuota.js`:
  - Test: exceed quota → `429` with meaningful error message
  - Quota resets: verify daily reset logic is correct
- [ ] Verify rate limiter state is in Redis (not in-memory) in production — in-memory rate limits are per-process and do not work behind a load balancer

---

## 8. Stripe Webhook Security

- [ ] In `services/api/routes/payments.js` webhook handler:
  - Verify `stripe.webhooks.constructEvent()` is called with the raw body buffer (not parsed JSON)
  - Verify the webhook endpoint requires `express.raw()` middleware, not `express.json()`
  - Verify `STRIPE_WEBHOOK_SECRET` is validated at startup in `validateEnv.js`
- [ ] Add logging for all webhook events received: `{ event_type, stripe_event_id, user_id, amount }`
- [ ] Add Sentry capture for webhook processing failures

---

## 9. GDPR and Data Privacy

- [ ] Verify `services/api/routes/user.js` data export endpoint returns ALL user data including:
  - Stories, photos, followups
  - Memory entities and relationships
  - Game state and achievements
  - Payment history (anonymized amounts only)
  - Voice session transcripts
  - Onboarding data
- [ ] Implement soft delete on user account deletion (see `02_data_and_api_todo.md` section 6)
- [ ] Verify photos uploaded to Cloudflare R2 are stored under a user-namespaced path (`/{userId}/photos/...`) so bulk deletion is possible on account closure
- [ ] Strip EXIF metadata from uploaded images before storing (location data in EXIF is a privacy risk)
- [ ] Verify email verification tokens are deleted after use (not just expired)
- [ ] Verify password reset tokens are deleted after use (not just expired)

---

## 10. Fault Tolerance — External Service Failures

- [ ] Wrap all Grok API calls in `try/catch` with `ExternalServiceError` — story save must not fail if AI enhancement fails
- [ ] Wrap entity extraction in `try/catch` — story save must succeed even if NLP fails
- [ ] Wrap Fish.audio calls in `try/catch` — audiobook request must queue for retry rather than fail immediately
- [ ] If Stripe is unreachable, return `503` with `Retry-After` header (not 500)
- [ ] If Replicate (image generation) fails, return a fallback default chapter illustration — do not show an error in the UI
- [ ] Add Sentry `captureException` to all external service error paths

---

## 11. Reliability — Cron Jobs

- [ ] Add explicit error reporting (Sentry capture) to all cron job error handlers in:
  - `services/api/cron/dailyTasks.js`
  - `services/api/cron/weeklyTasks.js`
  - `services/api/cron/weeklyTopicEmails.js`
- [ ] Add structured log on cron job completion: `{ job, status, duration, usersProcessed }`
- [ ] Track last successful cron execution in DB or Redis:
  ```sql
  CREATE TABLE cron_health (job_name VARCHAR(100) PRIMARY KEY, last_success TIMESTAMPTZ, last_attempt TIMESTAMPTZ);
  ```
- [ ] Expose cron health in `GET /api/health` response
- [ ] Alert (via Sentry) if daily cron has not run successfully within 26 hours

---

## 12. Observability

- [ ] Verify `GET /api/health` endpoint:
  - Returns DB connectivity status
  - Returns Redis connectivity status
  - Returns cron last-run status
  - Returns `{ status: 'degraded' }` (not `500`) when a non-critical service is down
- [ ] Verify request ID (`req.id`) is included in all error log entries
- [ ] Verify user ID (`req.user?.id`) is included in structured logs for authenticated requests
- [ ] Add Sentry `setUser({ id, email })` in the auth middleware after token verification so Sentry error reports include user context
- [ ] Verify Sentry DSN is set in both frontend (`apps/web/src/main.jsx`) and backend (`services/api/infrastructure/sentry.js`) — and only initialized when `SENTRY_DSN` is provided
- [ ] Add response time header `X-Response-Time: <ms>` to all API responses (already partially in place via `requestTiming.js` — verify it sets a header, not just logs)

---

## 13. Session and Token Hygiene

- [ ] Audit JWT token expiry — confirm access tokens expire in ≤ 7 days (shorter is safer for this product type)
- [ ] Confirm magic link tokens expire in ≤ 72 hours
- [ ] Confirm email verification tokens expire in 24 hours (already in place — verify)
- [ ] Confirm password reset tokens expire in 1 hour (already in place — verify)
- [ ] Verify voice session ephemeral tokens (5-minute xAI tokens) are never stored in the DB — they should only be sent to the frontend and not persisted

# Data and API TODO

**Date:** 2026-04-02
**Project:** Easy Memoir

---

## 1. Schema Management — Migrate to Migrations-Only Model

This is the highest-priority data task. The current `initDatabase()` pattern is a production risk.

- [ ] Create `services/api/db/migrations/001_full_baseline.sql` containing the complete current schema as a pure SQL file (all `CREATE TABLE` statements, indexes, constraints)
- [ ] Create `services/api/db/schema_migrations` tracking table:
  ```sql
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- [ ] Create `services/api/db/runner.js` — migration runner:
  - Reads all `.sql` files from `migrations/` in version order
  - Checks `schema_migrations` to skip already-applied migrations
  - Applies each in a transaction
  - Records each applied migration in `schema_migrations`
  - Called on server startup before routes are mounted
- [ ] Replace the `initDatabase()` call in `services/api/index.js` with `runner.runMigrations()`
- [ ] Remove all `CREATE TABLE IF NOT EXISTS` statements from `services/api/db/index.js`
- [ ] `services/api/db/index.js` should export only: the connection pool and the `query` helper
- [ ] Update `npm run migrate:up` script to call `runner.js` directly (not just as a startup side effect)
- [ ] Add `npm run migrate:status` script that lists applied vs pending migrations
- [ ] Document migration process in `docs/guides/database-migrations.md`

### Writing future migrations

Every schema change going forward must be a new numbered file:

- [ ] Convention: `services/api/db/migrations/002_<description>.sql`
- [ ] Each migration is additive and non-destructive where possible
- [ ] Destructive migrations (DROP COLUMN, rename) require a corresponding data migration step
- [ ] Never modify `001_full_baseline.sql` after it has been applied to production

---

## 2. Database Index Audit

- [ ] Audit all foreign keys — ensure each has a corresponding index:
  - `stories(user_id)` — verify index exists
  - `stories(chapter_id)` — verify
  - `stories(question_id)` — verify
  - `photos(story_id)` — verify
  - `followups(story_id)` — verify
  - `memory_entities(user_id)` — verify
  - `memory_mentions(story_id, user_id)` — verify composite index
  - `voice_sessions(user_id)` — verify
  - `user_game_state(user_id)` — verify
  - `user_achievements(user_id)` — verify
  - `email_verification_tokens(user_id)` — verify
  - `password_reset_tokens(user_id, token_hash)` — verify
  - `stripe_payments(user_id)` — verify
- [ ] Add missing indexes as `002_add_missing_indexes.sql` migration
- [ ] Audit the `memory_mentions` table: queries likely filter by `user_id` AND `story_id` — add composite index
- [ ] Audit `daily_prompts` or equivalent table for `(user_id, date)` composite index

---

## 3. Query Audit — Prevent N+1 and Unbounded Queries

- [ ] Audit `services/api/repositories/storyRepository.js` — ensure `findByUserChapter()` does not run a query per story to fetch photos; use a single JOIN or batched query
- [ ] Audit `services/api/repositories/memoryRepository.js` — `getEntitiesWithMentions()` should JOIN entities + mentions in a single query, not query mentions per entity
- [ ] Audit `services/api/routes/export.js` — EPUB generation fetches all user stories; add a `LIMIT` guard (even memoirs have a practical maximum)
- [ ] Ensure all list queries in repositories accept `{ limit, offset }` parameters
- [ ] Add `EXPLAIN ANALYZE` log (in development mode) for queries that take > 100ms

---

## 4. Data Integrity Constraints

- [ ] Verify `stories(user_id)` has `ON DELETE CASCADE` — when user is deleted, their stories are deleted
- [ ] Verify `photos(story_id)` has `ON DELETE CASCADE`
- [ ] Verify `followups(story_id)` has `ON DELETE CASCADE`
- [ ] Verify `memory_mentions` and `memory_relationships` cascade on entity deletion
- [ ] Verify `user_achievements(user_id)` cascades on user deletion
- [ ] Verify `voice_sessions(user_id)` cascades on user deletion
- [ ] Verify `stripe_payments(user_id)` does NOT cascade on user deletion (payment records must be retained for financial compliance)
- [ ] Add a `NOT NULL` constraint to `stories(user_id)` if not already present
- [ ] Add a `UNIQUE` constraint on `user_onboarding(user_id)` — one onboarding record per user

---

## 5. API Contract Improvements

### Standardize response envelope

- [ ] Create `services/api/utils/response.js` with helper functions:
  ```js
  export const success = (data, meta = {}) => ({ success: true, data, error: null, meta })
  export const error = (code, message, field = null) => ({
    success: false,
    data: null,
    error: { code, message, field },
    meta: {}
  })
  export const paginated = (rows, total, limit, offset) =>
    success(rows, { pagination: { total, limit, offset, hasMore: offset + limit < total } })
  ```
- [ ] Refactor `services/api/routes/stories.js` to use `response.success()` / `response.paginated()`
- [ ] Refactor `services/api/routes/auth.js` to use `response.success()` / `response.error()`
- [ ] Apply `response.*` helpers to all remaining routes over the next sprint
- [ ] Update error handler middleware to use `response.error()` format

### Consistent HTTP status codes

- [ ] Audit all routes for incorrect status codes:
  - `204` should have no response body — verify any `204` responses don't send data
  - `200` should not be returned for created resources — use `201`
  - `400` vs `422`: use `400` for malformed requests, `422` for valid syntax but business rule violation
- [ ] Fix `services/api/routes/auth.js`: login failure should return `401`, not `400`
- [ ] Fix `services/api/routes/payments.js`: payment eligibility failure should return `402` or `422`, not `403`

### API Versioning

- [ ] Add `v1` prefix to all routes (see `03_backend_architecture_todo.md` section 6 for implementation steps)
- [ ] Ensure the web frontend `apps/web/src/config.js` `API_URL` includes `/v1`

---

## 6. Token and Session Data Management

- [ ] Implement a cleanup job for expired tokens in `services/api/cron/dailyTasks.js`:
  ```sql
  DELETE FROM email_verification_tokens WHERE expires_at < NOW();
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  ```
- [ ] Ensure `schema_migrations` tracking table is never purged by accident — add a safeguard comment
- [ ] Add a `deleted_at` (soft delete) column to `users` table instead of hard deletes — required for GDPR subject access requests and audit trails
  - Migration: `ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL`
  - Update `services/api/repositories/userRepository.js` — `findByEmail()` excludes soft-deleted users
  - Add hard delete job: after 30 days of soft delete, hard delete (GDPR compliance window)

---

## 7. EPUB/PDF Export Data Integrity

- [ ] In `services/api/routes/export.js`, ensure HTML content is escaped before being inserted into EPUB:
  - Verify `escapeHtml()` or equivalent is called on `story.answer` before insertion
  - Verify photo captions are escaped
  - Verify chapter titles and question text are escaped
- [ ] Add `Content-Security-Policy` to EPUB `<meta>` tags to prevent script injection in e-readers
- [ ] Validate that EPUB output is well-formed XML before sending to client (use `epub-gen-memory` validation if available)

---

## 8. Payments Data Consistency

- [ ] Verify `services/api/routes/payments.js` webhook handler is idempotent:
  - If a `payment_intent.succeeded` event is received twice, it should not double-activate premium
  - Add `INSERT ... ON CONFLICT DO NOTHING` or an `IF NOT EXISTS` check when recording payment
- [ ] Verify refund handler in `services/api/routes/refunds.js` updates `premium_until` if user's premium was from the refunded payment
- [ ] Add a `payments_audit_log` table for immutable payment event history (append-only, no updates):
  - Columns: `id`, `user_id`, `event_type`, `stripe_event_id`, `amount`, `product_id`, `created_at`
  - This is separate from `stripe_payments` which is mutable status tracking
- [ ] Stripe webhook: verify `idempotencyKey` in Stripe event metadata to skip duplicate processing

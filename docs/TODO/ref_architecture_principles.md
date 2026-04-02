# Architecture Principles

**Date:** 2026-04-02
**Project:** Easy Memoir

These are mandatory rules for all new and modified code in this codebase.
They exist to prevent the re-introduction of problems that were hard to fix.
When in doubt, apply the principle.

---

## Layer Rules

### Rule L1 — Routes are HTTP adapters only

A route handler does exactly three things:

1. Parse and validate the request
2. Call a domain service
3. Return a response

**Forbidden in route handlers:**

- SQL queries
- Direct database imports (`db`, `pool`)
- Business logic (conditional branching based on product rules)
- Direct external API calls (Grok, Stripe, etc.)
- Imports from `repositories/` directly

```js
// CORRECT
router.post(
  '/stories',
  validate(storySchema),
  asyncHandler(async (req, res) => {
    const story = await StoryService.saveAnswer(req.user.id, req.body)
    res.status(201).json(response.success(story))
  })
)

// WRONG
router.post(
  '/stories',
  asyncHandler(async (req, res) => {
    const existing = await db.query('SELECT * FROM stories WHERE...') // ← NO
    if (existing.rows.length > 0 && req.user.premium_until > Date.now()) {
      // ← NO: business logic
      await grokService.enhance(req.body.answer) // ← NO: external call
    }
  })
)
```

---

### Rule L2 — Domain services have no HTTP knowledge

Domain services must not import or reference:

- `express`, `req`, `res`, `next`
- HTTP status codes
- Request/response objects

They accept typed inputs and return typed outputs (or throw typed errors).

---

### Rule L3 — Repositories do data access only

Repositories must not contain:

- Business rules or conditional logic
- External API calls
- Calls to other repositories (compose in the service layer)

They accept query parameters and return raw data objects.

---

### Rule L4 — Dependencies flow downward only

```
Routes → Domain Services → Repositories → Database
Routes → Domain Services → Integration Clients → External APIs
```

**Never:**

- Repositories calling domain services
- Domain services importing routes
- Infrastructure importing domain logic

---

## API Rules

### Rule A1 — All endpoints are versioned

All API endpoints must be prefixed `/api/v1/`.
Never add an unversioned endpoint.

When a breaking change is required, create a `/api/v2/` route.
The old `/api/v1/` route must remain functional until all clients have migrated.

---

### Rule A2 — Use the standard response envelope

All API responses use `response.success()`, `response.error()`, or `response.paginated()` from `utils/response.js`.

```json
// Success
{ "success": true, "data": {...}, "error": null, "meta": {} }

// Error
{ "success": false, "data": null, "error": { "code": "...", "message": "..." }, "meta": {} }
```

Never return naked objects or arrays as top-level responses.

---

### Rule A3 — List endpoints are always paginated

Every endpoint that returns an array must accept `limit` and `offset` query parameters and return `meta.pagination`.

Default `limit`: 20. Maximum `limit`: 100. These are enforced server-side.

---

### Rule A4 — HTTP status codes are semantically correct

| Scenario                     | Status |
| ---------------------------- | ------ |
| Created resource             | 201    |
| Business rule violation      | 422    |
| Authentication failure       | 401    |
| Authorization failure        | 403    |
| Not found                    | 404    |
| External service unavailable | 503    |
| Validation failure           | 400    |

Never return `200` for an error. Never return `500` for a business rule violation.

---

## Security Rules

### Rule S1 — No secrets in source code

**Never** hardcode API keys, passwords, tokens, or credentials in any file.
**Never** commit `.env` files.
**Always** use environment variables accessed via `config.js`.

---

### Rule S2 — Token revocation is durable

The token blacklist must be backed by persistent storage (PostgreSQL or Redis).
There must be no in-memory fallback for security-sensitive state.

---

### Rule S3 — Admin authorization is centralized

Admin routes are protected by `requireAdmin` middleware applied at the router mount point.
Per-route admin checks are not permitted.

---

### Rule S4 — User input is always validated at the boundary

Every route that accepts a request body or query parameters must have an `express-validator` validation chain.
Validation failures return `400` with field-level error details.

---

### Rule S5 — User data is scoped by user ID

Every repository query that retrieves user data must include `WHERE user_id = $1`.
No query should return data for users other than the authenticated user (except admin routes).

```js
// CORRECT
findByUserChapter(userId, chapterId) {
  return db.query('SELECT * FROM stories WHERE user_id = $1 AND chapter_id = $2', [userId, chapterId]);
}

// WRONG (missing user_id scope)
findByChapter(chapterId) {
  return db.query('SELECT * FROM stories WHERE chapter_id = $1', [chapterId]);
}
```

---

### Rule S6 — External APIs have explicit timeouts

Every external API call must have an explicit timeout.
On timeout: throw `ExternalServiceError`, return `503` to the client.
The default timeout for AI generation is 30s. For fast APIs: 10s.

---

## Data Rules

### Rule D1 — Schema changes are always migrations

All schema changes (CREATE TABLE, ALTER TABLE, CREATE INDEX, DROP) must be written as numbered SQL migration files in `services/api/db/migrations/`.

**Never** modify `db/index.js` to add schema changes.
**Never** run DDL statements in application code at runtime.

---

### Rule D2 — Migrations are numbered and ordered

Migration files are named `NNN_description.sql` where `NNN` is zero-padded (e.g., `003_add_user_role.sql`).
Never modify a migration that has been applied to production.
Never skip a migration number.

---

### Rule D3 — Every write has a corresponding read path

When adding a new column or table, add both the write logic (INSERT/UPDATE) and the read logic (SELECT) in the same PR. Orphaned write paths accumulate as dead data.

---

## Frontend Rules

### Rule F1 — Server state is managed by React Query

All API data fetching uses `useQuery` or `useMutation` from `@tanstack/react-query`.
Do not use `useEffect` + `useState` for API calls.

---

### Rule F2 — Shared data comes from the shared package

Import chapter definitions, style options, and voice config only from `@lifestory/shared`.
Do not import from `apps/web/src/data/` for shared concepts.

---

### Rule F3 — Routes are split by feature

New routes belong in the appropriate feature route file (`authRoutes.jsx`, `appRoutes.jsx`, etc.).
`App.jsx` must not grow beyond composing the four route subtrees.

---

### Rule F4 — Components have one responsibility

A component either fetches data OR renders data — not both.

Container components: fetch data via React Query, pass down via props.
Presentational components: accept props, render markup, no API calls.

---

## Observability Rules

### Rule O1 — Every request has a request ID

All log entries for a request include `requestId`. This is enforced by existing `requestId.js` middleware. Do not log without including `req.id`.

---

### Rule O2 — Errors are captured in Sentry

All unhandled errors and all `ExternalServiceError` throws must be captured in Sentry.
Do not swallow errors silently.

---

### Rule O3 — External service calls are logged

Every external API call (Grok, Stripe, Fish.audio, etc.) logs:

- Service name
- Duration (ms)
- Success or error status
- Request ID

---

## Process Rules

### Rule P1 — New business logic gets a unit test first

Before writing a domain service method, write the unit test.
The test must fail before implementation and pass after.

---

### Rule P2 — Direct DB imports in routes fail CI

The ESLint rule `no-restricted-imports` prevents routes from importing `db` or `pool` directly.
This is enforced in CI. It cannot be bypassed without disabling the rule with a comment justification.

---

### Rule P3 — No `console.log` in server code

Use `logger.info()`, `logger.warn()`, `logger.error()` from `utils/logger.js`.
`console.log` is caught by the ESLint rule and fails CI.

---

### Rule P4 — No magic strings for error codes

Use the error class hierarchy (`AppError`, `ValidationError`, `NotFoundError`, `ExternalServiceError`) from `utils/errors.js`.
Do not throw `new Error('some string')` in domain code.

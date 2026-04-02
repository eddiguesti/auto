# TODO 2: Security Hardening

**Priority:** HIGH - Do after todo1
**Agent type:** security-reviewer / backend
**Estimated time:** 2 days
**Score impact:** Security 6/10 -> 8/10
**Depends on:** todo1 completed

## Context

After critical fixes in todo1, this phase addresses HIGH-severity security issues.
These prevent real exploits: token hijacking, scope escalation, IDOR, and injection.

## Tasks

### 2.1 Implement JWT Blacklisting via Redis

**Files:**

- `services/api/middleware/auth.js`
- `services/api/routes/auth.js` (logout, password reset)
- `services/api/routes/user.js` (account deletion)
- `services/api/utils/redis.js` (already integrated)

**Problem:** Logout, password reset, and account deletion don't invalidate JWTs. Stolen tokens remain valid for up to 7 days.

**Action:**

1. Modify `generateToken()` in `middleware/auth.js` to include a `jti` (JWT ID) claim:

```javascript
import crypto from 'crypto'
// In generateToken:
const jti = crypto.randomBytes(16).toString('hex')
return jwt.sign({ id: user.id, email: user.email, jti }, secret, { expiresIn })
```

2. Create `utils/tokenBlacklist.js`:

```javascript
import { redisSet, redisGet } from './redis.js'

export async function blacklistToken(token, decoded) {
  const ttl = decoded.exp - Math.floor(Date.now() / 1000)
  if (ttl > 0) {
    await redisSet(`blacklist:${decoded.jti}`, '1', ttl)
  }
}

export async function isTokenBlacklisted(jti) {
  const result = await redisGet(`blacklist:${jti}`)
  return result === '1'
}
```

3. In `authenticateToken()`, after JWT verification, check blacklist:

```javascript
if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
  return res.status(401).json({ error: 'Token revoked' })
}
```

4. In logout route (`auth.js`), blacklist the current token
5. In password reset route (`auth.js`), blacklist all user tokens (store user-level blacklist key)
6. In account deletion route (`user.js`), blacklist the current token

**Verification:**

- Login, get token, logout, use same token -> 401
- Login, reset password, use old token -> 401
- Delete account, use token -> 401

### 2.2 Enforce Magic Link JWT Scope

**Files:**

- `services/api/middleware/auth.js`
- `services/api/routes/magicLink.js`

**Problem:** Magic-link JWTs have `scope: 'magic_link'` but the auth middleware ignores scope. These tokens can access all endpoints including account deletion.

**Action:**

1. Create a middleware factory for scope checking:

```javascript
export function requireScope(...allowedScopes) {
  return (req, res, next) => {
    // Full-scope tokens (from login) have no scope claim
    if (!req.user.scope) return next()
    if (allowedScopes.includes(req.user.scope)) return next()
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
```

2. Apply `requireScope('magic_link')` to voice/talk routes
3. Add `requireScope()` (no args = requires full scope) to sensitive routes: payments, user deletion, data export

**Verification:** Magic link token cannot call `DELETE /api/user/delete-account`.

### 2.3 Add Input Validation to Unvalidated Routes

**Files:** Multiple routes listed below

**Problem:** 12+ routes accept request bodies without validation despite schemas existing in `services/api/schemas/index.js`.

**Action:** For each route, add `validate(schema)` middleware. Create schemas where missing:

| Route              | Endpoint                              | Missing Validation                         |
| ------------------ | ------------------------------------- | ------------------------------------------ |
| `onboarding.js`    | `POST /context`, `POST /context-form` | Transcript array contents, length          |
| `style.js`         | `POST /preferences`, `POST /preview`  | Tones array, narrative string, authorStyle |
| `covers.js`        | `POST /save`                          | customSettings object shape                |
| `user.js`          | `PUT /phone-settings`                 | Phone format, settings shape               |
| `memos.js`         | `POST /`                              | audio_url format, content length           |
| `audiobook.js`     | `POST /voice-sample`                  | audioData size limit, format               |
| `refunds.js`       | `POST /request`                       | reason enum, orderId format                |
| `notifications.js` | `PUT /preferences`                    | preference keys whitelist                  |

For each:

1. Define schema in `schemas/index.js`
2. Add `validate(schema)` middleware to the route
3. Test that invalid input returns 400

**Verification:** Sending invalid/oversized payloads to each route returns 400 with clear error.

### 2.4 Fix Lulu Print Order IDOR

**File:** `services/api/routes/lulu.js`

**Problem:** Any authenticated user can view or cancel any Lulu order via `GET /order/:orderId` or `POST /order/:orderId/cancel`.

**Action:**

1. Create a `lulu_orders` table:

```sql
CREATE TABLE IF NOT EXISTS lulu_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lulu_order_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_lulu_orders_user ON lulu_orders(user_id);
CREATE INDEX idx_lulu_orders_lulu ON lulu_orders(lulu_order_id);
```

2. When creating an order (`POST /create-order`), insert into `lulu_orders`
3. Before `GET /order/:orderId` and `POST /order/:orderId/cancel`, verify ownership:

```javascript
const ownership = await pool.query(
  'SELECT id FROM lulu_orders WHERE lulu_order_id = $1 AND user_id = $2',
  [orderId, req.user.id]
)
if (ownership.rows.length === 0) {
  return res.status(404).json({ error: 'Order not found' })
}
```

**Verification:** User A cannot access User B's print order.

### 2.5 Fix Stripe Webhook User Verification

**File:** `services/api/routes/payments.js` (lines 172-196)

**Problem:** `session.metadata.userId` is used directly without verifying it matches the Stripe customer.

**Action:**

1. After extracting userId from metadata, verify against the database:

```javascript
const { userId, productId, productType } = session.metadata

// Verify user exists and matches Stripe customer
const userCheck = await db.query('SELECT id, email FROM users WHERE id = $1', [userId])
if (userCheck.rows.length === 0) {
  console.error('Webhook userId not found:', userId)
  return res.status(200).json({ received: true }) // Don't retry
}

// Optionally verify Stripe customer email matches
if (session.customer_email && session.customer_email !== userCheck.rows[0].email) {
  console.error('Email mismatch:', session.customer_email, userCheck.rows[0].email)
}
```

**Verification:** Webhook with non-existent userId doesn't grant premium.

### 2.6 Remove unsafe-inline from CSP

**File:** `services/api/index.js` (Helmet config, line ~130)

**Problem:** `'unsafe-inline'` in `scriptSrc` defeats XSS protection.

**Action:**

1. Remove `'unsafe-inline'` from `scriptSrc`
2. Test that Google OAuth popup still works (it should, since Google scripts are loaded from allowed domains)
3. If something breaks, use `'strict-dynamic'` or specific script hashes instead
4. Keep `'unsafe-inline'` in `styleSrc` (Tailwind needs it) but add a comment explaining why

**Verification:** CSP header no longer contains `unsafe-inline` for scripts. Google OAuth still works. No console CSP errors.

### 2.7 Add Voice Sample Content Verification

**File:** `services/api/routes/audiobook.js` (lines 29-68)

**Problem:** `POST /voice-sample` accepts arbitrary base64 data without size limits or content type verification.

**Action:**

1. Add size limit: reject decoded buffers over 50MB
2. Add magic byte validation for audio formats (WAV: `RIFF`, MP3: `ID3` or `0xFF 0xFB`)
3. Sanitize filename to prevent path traversal

**Verification:** Uploading non-audio data returns 400.

## Definition of Done

- [ ] JWT blacklisting works for logout, password reset, account deletion
- [ ] Magic-link tokens restricted to voice routes only
- [ ] All 12+ routes have input validation schemas
- [ ] Lulu order IDOR fixed with ownership table
- [ ] Stripe webhook verifies userId
- [ ] CSP no longer has unsafe-inline for scripts
- [ ] Voice sample upload validates content
- [ ] All existing tests pass
- [ ] Manual test: login -> logout -> reuse token = 401

# TODO 1: Critical Security Fixes

**Priority:** URGENT - Do this first
**Agent type:** security-reviewer / backend
**Estimated time:** 1 day
**Score impact:** 4/10 -> 6/10 on security

## Context

The audit found 4 CRITICAL security vulnerabilities that must be fixed before any other work.
These are exploitable today and could result in financial loss, data exposure, or service disruption.

## Tasks

### 1.1 Rotate All Exposed API Keys

The `.env` file contains live production keys despite the header claiming they were removed.

**Action:**

- Generate new keys for ALL of these services:
  - GROK_API_KEY (xAI dashboard)
  - RESEND_API_KEY (Resend dashboard)
  - TELNYX_API_KEY (Telnyx Mission Control)
  - REDIS_URL password (Upstash console)
  - R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY (Cloudflare dashboard)
  - JWT_SECRET (generate: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`)
  - INTERNAL_CRON_SECRET (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
  - TELEGRAM_WEBHOOK_SECRET (generate new random hex)
- Update Railway environment variables with new keys
- Verify the app still works after rotation
- Update `.env.example` to remove any real-looking values
- Ensure `.env` is in `.gitignore` (it already is, but verify)

**Verification:** App starts, auth works, voice interview connects, emails send.

### 1.2 Add Authentication to Blog Image Generation Endpoints

**File:** `services/api/index.js` (line ~403) and `services/api/routes/blog-images.js`

**Problem:** `POST /api/blog-images/generate/:slug` and `POST /api/blog-images/generate-all` are mounted without `authenticateToken`. Anyone can trigger xAI API calls costing money.

**Action:**

1. In `services/api/index.js`, find where `blogImagesRouter` is mounted
2. Add an admin guard. The simplest approach:

```javascript
// In blog-images.js, add to POST endpoints:
const cronSecret = req.headers['x-cron-secret']
if (cronSecret !== process.env.INTERNAL_CRON_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

3. GET endpoints (status, listing) can remain public

**Verification:** `curl -X POST http://localhost:3001/api/blog-images/generate-all` returns 401.

### 1.3 Add Telnyx Webhook Signature Verification

**File:** `services/api/routes/telnyxCall.js` (line ~223)

**Problem:** The webhook handler `POST /webhook` processes events with zero authentication. Compare to Stripe (proper signature verification) and Telegram (secret token validation).

**Action:**

1. Install telnyx package if not present: `npm install telnyx`
2. Add signature verification at the top of the webhook handler:

```javascript
import Telnyx from 'telnyx'
const telnyx = Telnyx(process.env.TELNYX_API_KEY)

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader = req.headers['telnyx-signature-ed25519']
  const timestamp = req.headers['telnyx-timestamp']

  if (!sigHeader || !timestamp) {
    return res.status(400).json({ error: 'Missing signature headers' })
  }

  try {
    // Verify the webhook signature
    const event = telnyx.webhooks.constructEvent(
      JSON.stringify(req.body),
      sigHeader,
      timestamp,
      process.env.TELNYX_WEBHOOK_SECRET || ''
    )
    // Process verified event...
  } catch (err) {
    console.error('Telnyx webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }
})
```

3. If Telnyx SDK verification is too complex, at minimum add an `INTERNAL_CRON_SECRET` header check as a stopgap

**Verification:** Forged webhook requests return 400.

### 1.4 Remove Test Email Endpoint

**File:** `services/api/index.js` (lines ~222-242)

**Problem:** Comment says "remove before production". Sends emails to arbitrary addresses when `NODE_ENV !== 'production'`.

**Action:**

1. Delete the entire test email endpoint block (lines 221-242)
2. If needed for development, create a separate script in `tools/send-test-email.js`

**Verification:** `POST /api/test-email` returns 404.

### 1.5 Fix Email Enumeration on Registration

**File:** `services/api/routes/auth.js` (lines 72-76)

**Problem:** Returns "Email already registered" which confirms account existence.

**Action:**

1. Change the error message to a generic response that doesn't reveal whether the email exists
2. Consider: return success with "Check your email to complete registration" for all cases

**Verification:** Registering an existing email does not confirm the email is registered.

## Definition of Done

- [x] All API keys rotated and working
- [x] Blog image POST endpoints require authentication
- [x] Telnyx webhook verifies signatures
- [x] Test email endpoint deleted
- [x] Email enumeration fixed
- [x] All existing tests still pass: `npm test`
- [x] App starts and core flows work

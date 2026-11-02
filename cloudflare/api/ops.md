# Native operations routes

Apply frozen migration `0012_ops.sql` after 0001–0011. `ops.js` exports the public
and authenticated handlers, GET-only refund reconciliation and retention work.
It introduces no new external service or queue binding. Tests use a local D1
database and synthetic Stripe transport; no real refund or support message is
sent.

`handlePublicOps` handles POST `/support/chat`, `/support/escalate`, `/analytics/event` and
`/csp-report` before mandatory account authentication. Support escalation verifies
an optional full-scope JWT and assigns ownership from the current account, never
from a claimed email address. Signed-in clients must use `authFetch` to make their
submissions available in account export and remove them on erasure. Anonymous
submissions remain unowned and expire after 30 days. Conversation, card-like
numbers, passwords, tokens, email addresses and private links are bounded,
redacted and HTML-escaped before storage. A saved request returns its reference
and `escalationStatus:'saved'`; it never claims that an email or staff notification
was sent. FAQ pricing comes from the current shared £250/ten-book catalog.

Analytics stores only daily counts for an explicit event-name allowlist. Arbitrary
properties, user identifiers, paths, referrers, timestamps and memoir content are
discarded. CSP stores only daily counts for an allowlisted directive, with no
document URI, blocked URI or script sample. Public traffic uses separate bounded
deployment budgets, plus a verified network subject when trusted ingress is
configured; spoofable IP headers have no authority. `maintainNativeOps` expires
support records after 30 days, counters after 90 days and stale rate reservations.

`handleAdminOps` rechecks a current full-scope administrator in D1. Mounted routes
cover metrics, paginated user/payment lists, account metadata, calendar-month
premium grants and POST `/admin/refunds/:paymentId/process`. They never return
password hashes, memoir text or Stripe customer/session credentials. Premium
grants persist their own provenance and an audit record atomically.

## Refund lifecycle

One immutable attempt belongs to each payment. Before any financial effect, the
handler verifies its completed server-created Checkout session, exact owner,
product, amount, currency, PaymentIntent and captured unrefunded Charge. Fulfilled
or in-flight print orders require manual support review. A durable claim and
stable Stripe idempotency key precede the refund POST. The shared Stripe client
uses no automatic network retry and does not follow redirects.

- `200 {success:true,status:'succeeded',refundRequestId,paymentId}` means Stripe
  confirmed success and the local payment/request/entitlement changes committed.
- `202 {success:false,status:'pending',...,message}` means Stripe is still
  processing. The payment remains completed and the request remains pending.
- `409/503` with `REFUND_RECONCILIATION_REQUIRED` means an external outcome is
  uncertain. Repeating the admin action performs only GET reconciliation against
  the frozen refund/charge. It never creates another refund, including after
  Stripe's24-hour idempotency-key retention window.
- `REFUND_FAILED` and `REFUND_MANUAL_REVIEW_REQUIRED` require staff review;
  payment/charge/authority mismatch codes mean no refund POST was sent.

Scheduled `reconcileNativeRefunds` reads at most ten pending/uncertain attempts.
It retrieves a known refund or searches up to100refunds on the frozen Charge for
the exact attempt metadata, amount and currency. An unmatched/ambiguous result
stays unresolved. Operators must inspect Stripe using those existing identifiers;
they must not create a replacement request or change the frozen Charge to make a
reconciliation pass. A refund that cannot be conclusively resolved remains held
for manual review.

Confirmed success atomically approves the request, marks its payment refunded,
records the provider reference and removes only its unused print entitlement.
Proof files receive durable media-cleanup intents first. Purchase-derived premium
is cleared only when exact activation/expiry provenance is known and no other
completed bundle/subscription or explicit admin grant supports access. Ambiguous
pre-existing premium is preserved for review.

Database triggers prevent account/payment/request erasure while a refund may
settle, even after its execution lease expires. A print-submission trigger closes
the race with proof approval. Map `EXTERNAL_ACCOUNT_WORK_PENDING` and
`REFUND_WORK_PENDING` to409. Financial truth remains in its original owner records
until confirmed success/failure; no copied customer tombstone is needed.

Run `node --test cloudflare/api/ops-native.test.mjs` for14focused tests. They cover
real D1 claims/rollback/triggers, eight concurrent refund requests yielding one
POST, provider pending/unknown outcomes, GET reconciliation after24hours, print
and erasure exclusion, entitlement provenance, support ownership/redaction,
anonymous counters and an actual-workerd Stripe SDK transport flow.

Provider references:
[refund creation](https://docs.stripe.com/api/refunds/create),
[refund retrieval](https://docs.stripe.com/api/refunds/retrieve),
[Stripe idempotency lifetime](https://docs.stripe.com/api/idempotent_requests).

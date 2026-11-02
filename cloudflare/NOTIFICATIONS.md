# Native notifications, newsletter and Telegram

`0011_notifications.sql` adds durable delivery jobs, Telegram ingress/authorization
state, newsletter confirmation receipts and a bounded scan cursor. Existing
`notification_queue` and `telegram_messages` remain safe, owner-exportable history.
Full provider envelopes are AES-GCM encrypted before storage; magic URLs,
confirmation/unsubscribe tokens and expiring Telegram link codes are excluded
from plaintext history. Envelope size is capped at 100,000 UTF-8 bytes.

## Configuration and integration

Both switches default to off: `NOTIFICATION_DELIVERY_ENABLED=true` permits the
delivery worker, and `TELEGRAM_ENABLED=true` separately permits Telegram ingress,
processing and outbound replies. Provider configuration alone cannot enable
these effects. Optional `NOTIFICATION_PAYLOAD_KEY` is a fresh secret of at least
32 characters; absent it, a domain-separated JWT secret derives the encryption
and opt-out keys. Pending envelopes encrypted with an old key cannot be opened
after rotation; they fail rather than send incorrect content.

Email uses the existing Resend adapter, `RESEND_API_KEY`, `EMAIL_FROM` and HTTPS
`APP_URL`. Telegram uses `TELEGRAM_BOT_TOKEN` and a separate
`TELEGRAM_WEBHOOK_SECRET` of 32–256 characters. Set the Bot API webhook to the
public frontend's `/api/webhooks/telegram` with that secret token. No live webhook
configuration, email or Telegram message was sent by implementation tests.

Public handlers, before JWT authentication: `handleTelegramWebhook`,
`handleNewsletter` and `handleNotificationOptout`. Authenticated handlers,
after authoritative account/JWT revocation checks: `handleTelegramRoutes` and
`handleNotificationRoutes`; both require full scope. The root entrypoint wires
both `/api` and `/api/v1` prefixes.

The minute scheduler runs `generateNativeNotifications`, `processTelegramInbox`,
`deliverNativeNotifications` and `cleanupNativeNotifications` in order. Cleanup
claims an hourly occurrence internally. Phone outreach uses the direct
`enqueueScheduledTopicCall` contract with a stable user/local-week key. Calls
remain independently disabled until the phone configuration is enabled; unsent
phone intents expire after 24 hours.

## Consent and time

`GET/PUT /notifications/preferences` preserve source fields and accept a JSON
preferences object or its serialized JSON form. Only known boolean keys are
accepted. Preferred times normalize to HH:MM; timezones must be supported IANA
zones. Notification history is owner-scoped and bounded to 1–100 rows per request.

Optional account email requires a verified, active account, its explicit email
channel selection and the current preference. Daily reminders use the preferred
local time, streak warnings 23:00, weekly topics Monday 06:00 and weekly digests
Sunday 10:00. Weekly windows permit a 24-hour catch-up. A missed spring-forward
local time runs at the first later local minute; fall-back repeats share one
civil-date occurrence key. Scheduled pages rotate through 25 users per tick
without permanently truncating the account set. Delivery processes 20 jobs per
tick. These throughput bounds need backlog monitoring before a high-volume
launch.

Achievement, collection, family and inactivity notifications derive from durable
source rows. Family email contains a generic account link rather than copying
another author's private question. Upgrade reminders require explicit opt-in
and a completed free chapter, stop after premium activation, and contain no
fabricated testimonials, outdated discounts or package promises.

Account unsubscribe links display a confirmation form on GET and mutate only
on POST. They disable preferences, remove the email channel and cancel queued
email jobs; requested Telegram replies remain independent. Newsletter consent
is separate: `/newsletter/subscribe` queues a confirmation instead of silently
reactivating an unsubscribed address. Confirmation is single-use; unsubscribing
invalidates earlier confirmation links. Newsletter unsubscribe tokens remain
valid while the subscriber record exists. Link previews never confirm or
withdraw consent. Signup attempts share deployment/email budgets of 100/hour
and 5/hour respectively, with no trust in caller-supplied IP headers.

## Durable processing and privacy

A Telegram webhook verifies its header secret using native HMAC verification,
then validates a bounded private-chat message and commits the durable inbox and
incoming history before acknowledging. Duplicate update IDs cannot create
duplicate effects; conflicting replays are rejected. Groups/channels cannot
authorize a private memoir account. Per-chat and global minute/day budgets bound
public bot work. Guest registration never proves email ownership and never
links a memoir account automatically.

Owner account linking consumes a hashed 8-character code once, expires it after
15 minutes, and fences subsequent work with an authorization revision. Guest
answers import without overwriting website answers. A web edit that races a bot
answer is kept; the Telegram version remains a pending draft in session context
and account export. `pendingAnswers` in link/status responses makes these drafts
visible in the connected-state UI. Unlinking revokes queued work and clears the
old chat's account history. Private chat replies and state transitions commit
before any provider operation.

Every send claims a durable lease and rechecks active ownership, consent,
recipient, source event and Telegram revision in the final SQL write before
starting the external effect. Resend requests reuse the same immutable message
and `Idempotency-Key` for at most five attempts inside a 23-hour window. The
provider currently retains keys for 24 hours. An older uncertain email or an
uncertain Telegram send stops for review; Telegram sendMessage has no matching
idempotency guarantee, so it is never automatically replayed after an ambiguous
send. Unsent notifications expire after 24 hours. Provider fetches use a fixed
origin, manual redirects, bounded responses and deadlines.

The account deletion guard includes active `native_notification_jobs` with
`state='effect_started'` and a future `lease_expires`, including newsletter jobs
associated with the verified account email. Erasure deletes that verified email's
newsletter subscriber record in the same transaction. Owner/chat/subscriber
foreign keys cascade inbox, tokens, envelopes and job metadata. SQL delete
triggers close the race with a send already starting; a short-lived active send
returns 409 before erasure. Messages already accepted by an external provider
cannot be recalled by deleting local records.

Confirmed/cancelled envelopes are wiped immediately; failed/review envelopes are
wiped after 7 days. Completed inbox rows expire after 7 days, while ordinary
Telegram history remains available to the linked account. Inactive unlinked
guests expire after 30 days; notification metadata/history after 30 days. Expired
auth/rate/token rows are cleaned without removing live credentials.

`notifications-native.test.mjs` uses actual workerd/D1 and synthetic provider
bindings to cover durable ACK/rollback, replay and linking races, consent,
provider uncertainty, deletion fences, both DST transitions, weekly claims,
redirects, feature flags and retained competing edits. Browser regressions cover
Telegram pending drafts and Talk's save acknowledgements. No tests contact live
providers or deliver messages.

References: [Telegram Bot API](https://core.telegram.org/bots/api),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).

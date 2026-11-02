# Native phone interviews

`0010_phone.sql` adds call admission, final transcript events, idempotent hangup
commands and scheduled outreach intents to D1. It is additive to the fresh native
schema and migrations 0001–0009. Do not edit an applied migration.

## Worker integration

- Export `PhoneSession` from `session.js`, bind `PHONE_SESSIONS` to that class,
  and add it to a new `new_sqlite_classes` Durable Object migration.
- Run `handleTelnyxPublicRoutes({request,env,db,path})` before JWT authentication
  for `/telnyx/webhook`, `/telnyx/media-stream` and the signed private
  `/telnyx/call`. `path` excludes the `/api` prefix.
- Run `handleTelnyxRoutes({request,env,db,path,user,claims})` after primary-backed
  authentication. POST `/telnyx/request-call` accepts `{phoneNumber}` and an
  optional UUID `Idempotency-Key`; GET `/telnyx/calls/:id` returns only its owner's
  status and saved final transcript. Full account scope is required.
- Await `cancelPhoneInterviewsForUser(db,userId)` before account erasure. Memoir,
  authentication, phone and outreach rows cascade on deletion; minimal provider
  control IDs in `phone_commands` survive until hangup is confirmed.
- Run `processPhoneMaintenance(env)` once per minute. It recovers abandoned calls,
  consumes at most three outreach intents, retries up to twenty idempotent hangup
  commands and expires replay markers. It must run even when new calls are off.
- The existing voice compilation scheduler/`VOICE_COMPILE_QUEUE` consumes the
  finalization outbox. The existing game scheduler consumes `story_outbox`.
  Phone interviews need no additional queue or R2 bucket.
- Notifications import `enqueueScheduledTopicCall(env,{userId,prompt,
occurrenceKey,now})`. `prompt` is `{text,chapter_id?,question_id?}`. A stable
  local-week occurrence key deduplicates per person. Unsent intents expire in24h;
  enqueue and consumption both recheck active ownership and phone consent.

## Configuration and acceptance

Both `TELNYX_CALLS_ENABLED` and `TELNYX_CALLBACKS_VERIFIED` default to false. Core
app startup and browser voice do not require either flag or a Telnyx credential.
Keep both false until hosted callback/media acceptance is complete.

Admission requires the explicit HTTPS origin `TELNYX_CALLBACK_ORIGIN` (an origin
only), `TELNYX_CONNECTION_ID`, E.164 `TELNYX_PHONE_NUMBER`, `TELNYX_PUBLIC_KEY`,
`PHONE_SESSIONS`, and the `TELNYX_API_KEY`/`GROK_API_KEY` secrets. Ticket HMAC uses
`TELNYX_STREAM_SECRET` or the strong existing `JWT_SECRET`. The private HTTP cron
route additionally needs `INTERNAL_CRON_SECRET`: use `signInternalPhoneRequest`
over the exact raw body and pathname, with `X-Internal-Timestamp` and
`X-Internal-Signature`. A plain shared-secret header has no authority.

Callback acceptance must verify the deployed origin, Telnyx connection's webhook
public key, reachable HTTPS/WSS paths, current consent, final transcript receipt,
two-way intelligible audio, barge-in and a confirmed hangup. The automated suite
uses synthetic providers only; it does not prove a hosted carrier connection or
place any real call.

The reviewed transport uses Telnyx inbound-only PCMU8k audio and bidirectional
`rtp` mode with PCMU8k output, passed directly to/from xAI `audio/pcmu`. It avoids
the old bridge's invalid `mp` mode and undocumented PCM conversions. Telnyx's
`command_id` is stable, ring retries are off, ringing is30s, and vendor
`time_limit_secs` is bounded by the persisted30-minute/JWT deadline.

Provider references:
[Telnyx dial](https://developers.telnyx.com/api-reference/call-commands/dial),
[Telnyx media](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming),
[raw signed webhooks](https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks),
[xAI audio formats](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech).

## Failure and data boundaries

Each person has one cross-channel voice lease with a90s expiry, renewed every30s.
Browser and phone renew/release only their own UUID. Frames recheck current
consent, phone number, account, token revocation, lease and total deadline before
relaying; alarms also close idle/revoked calls. Standard WebSockets are intentional
because the DO holds an outbound provider connection. Persisted recovery metadata
contains no transcript, phone number or authentication credential.

Call requests are limited to three per hour and reserve existing daily AI quota.
A durable marker precedes dialing. Ambiguous dial results become
`needs_reconciliation`; retries with the same request key never redial. Signed
callbacks can bind a previously unknown control ID; a late result after deletion
or cancellation records only a hangup intent. Stable command UUIDs make those
hangup retries safe. Completed command records expire after seven days.

Stream tickets are owner-bound, single-use and expire in at most10min. Start
metadata must match the ticket nonce, owner, call and exact codec. Frames are at
most256KiB; pending traffic and per-second traffic are capped at1MiB, total relay
traffic at64MiB, and socket backpressure at1MiB. At most32 out-of-order inbound
chunks (256KiB total) are buffered; duplicates are ignored and conflicting or
unbounded gaps terminate the stream. Outgoing PCMU is emitted in20ms chunks.

Only final author transcripts are persisted, at most64KiB/event,100events and
256KiB/call. A D1 batch records each event, appends to immutable pre-call writing,
updates its source-version checkpoint, clears obsolete compilation and inserts
the story outbox event atomically. A concurrent author edit is preserved and the
raw phone transcript remains available with `transcriptConflict:true`; it never
overwrites newer writing. Successful finalization inserts compilation once.

Run `node --test cloudflare/api/telnyx-native.test.mjs` for actual local workerd
D1/DO/WebSocket tests with fake Telnyx and xAI. They cover signature bytes/time,
replays, owner/scope boundaries, consent, quotas, chunk ordering, transcript CAS,
SQL rollback, duplicate compilation, interruption, erasure races, late callbacks,
lease replacement, traffic limits and scheduled-intent expiry.

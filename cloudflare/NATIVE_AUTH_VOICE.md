# Native authentication and voice contracts

The native API now implements password registration/login, one-time email
verification, forgotten/reset password, reset-token checks, authenticated
verification resend, and Google Identity Services ID-token sign-in. Recovery
responses conceal account existence; token hashes, consumption, password update
and user-wide revocation commit atomically. Passwords remain bcrypt12. Default
trusted-ingress authentication and the explicitly selected workers.dev
[account-budget policy](AUTH_BUDGET.md) remain separate deployment policies.

Google sign-in requires `GOOGLE_CLIENT_ID` matching the browser's GIS client and
an authorized JavaScript origin configured in Google Console. The Worker
verifies RS256 signatures using bounded, cached keys fetched only from Google's
fixed JWKS endpoint; issuer, audience, timestamps, subject and verified email are
checked. Automatic linking to an existing password account requires Google's
authority over the address (Gmail or verified Workspace). A third-party-address
Google identity must not silently take over an existing password account. No
Google client secret is used by this ID-token contract. Provider configuration
and actual hosted acceptance remain separate from synthetic verification.

## Voice bindings and limits

The API exports `VoiceSession` for a SQLite Durable Object binding named
`VOICE_SESSIONS`. `GROK_API_KEY` stays server-side. The optional
`VOICE_TICKET_SECRET` is a separate HMAC secret; absent it, validated `JWT_SECRET`
is used with a voice-specific audience/signature domain. The voice compilation
producer binding is `VOICE_COMPILE_QUEUE`, with its actual queue name in
`VOICE_COMPILE_QUEUE_NAME`. The existing scheduled handler dispatches due durable
compilation rows. Apply native migrations in order, including
`0005_voice_compilation.sql` and `0008_magic_voice.sql`.

`POST /voice/session {chapterId}` creates/resumes an owner interview and returns
its existing session metadata plus a **60-second, single-use ticket**. The
WebSocket URL is `/api/voice/ws?ticket=...`; account JWTs are never accepted in
this query. JWT authentication remains in HTTPS bearer headers. Ordinary voice
configuration, transcript saves and ending an interview do not charge AI quota.
An accepted provider connection and each actual writing request reserve the
shared daily quota before the paid operation.

Standard paired WebSockets are intentional: the outbound provider socket cannot
hibernate. Each user has one browser coordinator and one shared authoritative
D1 voice lease across browser/telephone channels. A 90-second heartbeat lease
renews during 30-second account/token checks; total browser duration remains
bounded by 30 minutes and the JWT expiry. Lost/replaced leases, deletion,
revocation, oversized frames and buffer/rate bounds close the connection. An
isolate restart cannot erase another channel's lease. Public demos last at most
90 seconds and use the separate rate policy documented in AUTH_BUDGET.md.

Transcript, interview progress and outbox intent commit in a single D1 batch.
A new raw answer clears its older compiled text. Compilation compares the exact
answer/version and current lease before writing; newer author edits survive a
slow provider. Manual compilation and Queue deliveries share the same durable
job lease. A paid request is marked before dispatch and its result/marker clear
commit atomically. Ambiguous provider outcomes or abandoned marked requests stop
in `failed` state; automatic retries cannot rebill them. Explicit authenticated
`POST /voice/compile` retries may make a new paid request. Quota-only failures
remain deferred without calling the provider. Raw answers stay available while
compilation is pending or failed; auxiliary compilation is not presented as a
completed manuscript.

## Scoped email conversations and onboarding

`GET /magic/:opaqueToken` atomically consumes a hashed email link and returns a
JWT scoped to `magic_link`, valid for at most two hours and never beyond the
link's expiry. It cannot read account-wide stories/profile/media or call other
full-account routes. Its allowed writes are `/magic/:token/session`,
`/magic/:token/transcript` and `/magic/:token/end-session`, bound to the exact
consumed link, stored chapter/question and per-link interview mapping. Logout
still revokes that credential immediately. The dedicated scoped DO ticket
checks the link and mapping on mint/connect/alarm, and forces the stored emailed
topic for session/response instructions. The browser cannot substitute a new
topic, tools or a full-account voice credential.

Talk keeps scoped credentials and received transcripts in tab storage under a
hashed link key, avoiding duplicate one-time exchanges during React mounts. It
saves raw text before ending the interview, retains a failed draft with retry
and download controls, and shows confirmation only after both HTTP operations
acknowledge success. An expired credential can still expose the local draft for
download. This port does not itself manufacture or send weekly email links;
notification generation/delivery must be configured separately.

`POST /onboarding/voice-session` aliases earliest-chapter ticket minting.
`POST /onboarding/context` validates a bounded conversation, reserves one writing
quota operation and extracts validated biographical JSON through the existing
provider helper. Profile/context writes share a transaction and compare both
timestamps and actual prior values; a newer manual edit or deleted account is
kept. Provider failures return an error rather than fake extracted data.

Native tests execute real workerd WebSockets/Durable Objects/D1, with only
provider transport replaced by fixtures. They cover cryptographic Google
validation, concurrency, rollback, revocation, account budgets, scoped prompt
fencing, cross-channel leases and uncertain-effect recovery. Web helper and
rendered Talk tests cover retained drafts and delayed success. No actual email,
provider call, telephone call or deployment was made by those tests.

References: [Google ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[Cloudflare WebSocket APIs](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
[D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).

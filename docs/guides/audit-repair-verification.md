# Audit repair verification

The 2 November 2026 repairs cover account isolation, recoverable drafts, canonical manuscript publishing, paid-job eligibility, authenticated voice/media, account deletion, database contracts and deployment checks. The current Node API and dedicated worker remain the supported production runtime. The native Cloudflare implementation remains a deliberately incomplete private staging slice; passing tests and dry runs do not authorize a data or DNS cutover.

## Run the checks

Use Node 22.12 or newer and install the locked root and mobile dependencies separately:

```sh
npm ci
npm ci --prefix apps/mobile
```

Create a disposable PostgreSQL database and set `TEST_DATABASE_URL` to it. The integration suites create and remove isolated schemas/databases; the test role needs database creation permissions. Put matching `psql` and `pg_dump` binaries on PATH. Never use a production connection for this variable.

```sh
TEST_DATABASE_URL=postgresql://test-user@127.0.0.1:5432/easy_memoir_test npm run verify
npm run test:e2e
npm test --prefix apps/mobile
npm run typecheck --prefix apps/mobile
cd apps/mobile
npx expo export --platform android --output-dir /tmp/easy-memoir-mobile-export
```

`verify` runs lint, configured security rules, formatting, backend/web tests, Cloudflare frontend/native tests, migration/readiness tests, Worker dry runs and the validated frontend build. Database-dependent suites are skipped unless `TEST_DATABASE_URL` is supplied. CI supplies an isolated PostgreSQL service and separately verifies the mobile dependency tree, types and Android bundle.

Browser business-flow tests isolate provider responses. They cover saving before immediate navigation, reopening saved text, polished-chapter/mobile editing, standalone-story CRUD, and downloading completed audiobook bytes. PostgreSQL tests cover quota and connection concurrency, replayed signed webhooks, account ownership/deletion, media-erasure retries, complete exports, schema drift, and actual backup restoration.

## Required operational settings

Apply migrations 006, 007 and 008 through the existing migration runner on API/worker startup. Deploy both the API and `npm run worker`; use `railway.worker.json` for a separate Railway service, or the two-service Render blueprint. Both services must share the PostgreSQL database, R2 bucket and relevant provider settings. Production media must use durable storage; instance-local uploads are disabled in the blueprint.

Telnyx webhook verification requires `TELNYX_PUBLIC_KEY`, the base64 Ed25519 public key from Mission Control. `TELNYX_STREAM_SECRET` may be a dedicated random secret of at least 32 characters; otherwise the validated JWT secret is used. Mobile file transcription uses the existing `GROK_API_KEY`. Mobile development uses `EXPO_PUBLIC_API_URL` rather than a hardcoded device localhost address.

See [backup restore verification](../backup-restore-verification.md) for snapshot manifests and the explicit empty restore database. No live provider charges, customer data changes or deployment are performed by the test suites.

## Dependency review

Both lockfiles were updated and checked with `npm audit`. There are no high or critical findings in the root or mobile trees at the completion of this repair. Audits still report 14 moderate root entries and 24 moderate plus one low mobile entry; these counts include repeated dependency-chain entries, not distinct confirmed exploits.

The remaining root chains involve minimatch/glob through ESLint, security lint plugins, Swagger annotation generation, the legacy migration CLI, and EJS/Jake through EPUB generation. Repository paths/templates are application-controlled, and no endpoint accepts a user-supplied glob pattern. Keep those interfaces bounded and update the upstream packages when compatible fixes are available. The mobile findings are largely Expo/React Native build/codegen/dev-tool chains. Npm's proposed fixes include downgrading Expo to SDK 51 or changing the React Native major; neither is a safe automatic patch to the current SDK 54 app. Those upgrades require a separate native compatibility review.

High/critical audits are mandatory in CI. Moderate/low findings remain visible; they are not suppressed or represented as resolved. Do not use `npm audit fix --force` to manufacture a green audit by downgrading the supported framework.

The secure image-size major needs the checked-in Metro compatibility patch documented in the mobile README. Its postinstall guard must fail if the expected Metro source changes; revalidate the patch when upgrading Expo/Metro.

## Live acceptance

Before releasing these changes, verify real provider credentials and webhooks in staging: register and verify an account, recover a failed interview save, purchase an entitlement with Stripe test mode, download EPUB/audio, approve print proofs, and confirm the worker completes the order. Use a test telephone number and a physical iOS/Android device for audio/microphone playback checks. A real printer proof and production data migration remain operational acceptance work, separate from local mocked-provider regression tests.

## Local verification result

The final checks passed: 402 backend tests (including isolated PostgreSQL and restore tests), 102 web tests, 20 browser tests, 12 Cloudflare frontend tests, 62 native Worker tests, 20 data-migration tests, 8 readiness tests, and 2 mobile Metro compatibility tests. Root and mobile clean lockfile installs passed. Formatting and all lint/security checks completed with no errors; legacy lint warnings remain visible. API/identity/frontend Worker dry runs, the production web build, mobile TypeScript, and Android/iOS Hermes exports passed.

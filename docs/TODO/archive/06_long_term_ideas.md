# Long-Term Ideas

**Priority:** FUTURE — Scaling, growth, and evolution
**Timeframe:** 1-6 months out
**Prerequisite:** Critical fixes and improvements complete

---

## 6.1 TypeScript Migration

The entire codebase is vanilla JavaScript. TypeScript would catch bugs at compile time, improve IDE experience, and make refactoring safer.

### Strategy: Incremental adoption (not a big bang rewrite)

- [x] **Phase 1 — Backend types** ✅
  - `services/api/tsconfig.json` added with `allowJs: true, checkJs: true, noEmit: true`
  - `apps/web/jsconfig.json` updated with `allowJs`, `lib`, `resolveJsonModule`, `esModuleInterop`
  - `services/api/types/index.js` created with all shared JSDoc typedefs (DbClient, UserProfile, UserAuth, Story, Photo, Payment, OnboardingStatus, OnboardingContext, VoiceModel, Audiobook, BookCover, GameState, StreakHistory, ApiError)
  - `@ts-check` + `@typedef` imports added to all 7 repositories + `middleware/auth.js` + `utils/errors.js`
  - Full `@param`/`@returns` JSDoc added to every repository method

- [ ] **Phase 2 — Frontend types** (2-3 days)
  - `apps/web/` already has `@types/react` installed
  - Add `tsconfig.json` with `allowJs: true`
  - Rename critical files to `.tsx`: contexts, hooks, config
  - Add prop types via TypeScript interfaces

- [ ] **Phase 3 — Shared package** (1 day)
  - Convert `packages/shared/` to TypeScript
  - Export type definitions for chapters, styles

- [ ] **Phase 4 — Full conversion** (ongoing)
  - Rename `.js` → `.ts`/`.tsx` file by file
  - Enable `strict: true` progressively

---

## 6.2 Background Job Queue

Replace synchronous API calls with a proper job queue for long-running tasks.

### Architecture

```
Client → API (enqueue job, return 202) → Job Queue → Worker (process)
Client ← API (poll /jobs/:id) ← Job Queue ← Worker (update status)
```

### Implementation

- [x] Chose `pg-boss` (PostgreSQL, zero new infra) — installed v12
- [x] Core infrastructure: `services/api/jobs/queue.js` (singleton), `jobNames.js` (JOB constants)
- [x] Audiobook generation (30+ seconds) → `POST /audiobook/generate` returns 202 + jobId; `GET /audiobook/jobs/:jobId` polls status; worker in `audiobookWorker.js`
- [x] Retry logic: `retryLimit: 2, retryDelay: 60s` on audiobook jobs
- [x] Worker process (`services/worker/index.js`) registers audiobook worker via `boss.work()`
- [x] API process starts boss on startup (for send capability only); graceful shutdown integrated
- [ ] EPUB generation (5-10 seconds) — deferred; EPUB is currently a synchronous GET
- [ ] AI chapter illustration (10-20 seconds) — deferred; already fires async in-process
- [ ] Book cover / blog image generation — deferred
- [ ] Email sending — deferred
- [ ] Job dashboard (`@pg-boss/dashboard`) for admin monitoring
- [ ] WebSocket events on job completion (instead of polling)

---

## 6.3 Real-Time Collaboration

Allow family members to contribute to the same memoir.

### Architecture

- [ ] Add `memoir_id` concept (currently implicit — one memoir per user)
- [ ] Add `memoir_collaborators` table with roles (owner, editor, viewer)
- [ ] WebSocket-based live editing with OT or CRDT
- [ ] Family member invite flow
- [ ] Activity feed showing who wrote what

### Prerequisites

- Repository pattern complete (4.1)
- Background job queue (6.2)

---

## 6.4 Multi-Language Support (i18n)

The senior demographic is global. Non-English speakers are a huge market.

- [ ] Install `react-i18next` for frontend
- [ ] Extract all user-facing strings to translation files
- [ ] Add language selector in settings
- [ ] Support AI responses in user's preferred language (Grok supports multilingual)
- [ ] Priority languages: English, Spanish, French, German, Mandarin
- [ ] Translate chapter prompts and writing tips

---

## 6.5 Offline-First PWA

Seniors may have unreliable internet. The app should work offline and sync when connected.

- [x] Register service worker (`apps/web/public/sw.js`) — PROD only via `main.jsx`
  - Cache-first for `/assets/*` and static files (Vite hashed bundles)
  - Network-first for navigation with offline fallback to cached shell
  - Never intercepts `/api/*` routes
  - Auto-cleans stale caches on activation; versioned via `CACHE_VERSION`
- [ ] Cache chapter data in IndexedDB — deferred (complex)
- [ ] Queue writes (story saves) in IndexedDB when offline — deferred (complex)
- [ ] Sync queued writes when connection restored — deferred
- [ ] Show offline indicator in UI — deferred (needs React component + context)

---

## 6.6 AI Voice Cloning Pipeline

Currently uses Fish.audio for TTS. Could offer personalized narration in the user's own voice.

- [ ] Record 30-second voice sample during onboarding (already partially built)
- [ ] Train voice model via Fish.audio or ElevenLabs API
- [ ] Generate audiobook chapters with cloned voice
- [ ] Add family voice option (children/grandchildren narrate)
- [ ] Privacy controls: voice data deletion, consent management

---

## 6.7 Print-on-Demand Enhancements

Lulu integration exists but could be richer.

- [ ] Add cover design customization (choose layout, colors, photos)
- [ ] Support hardcover and softcover options
- [ ] Add photo book layout (interleave photos with text)
- [ ] Bulk order discount for family reunions
- [ ] Gift wrapping/shipping to different address
- [ ] International shipping estimates

---

## 6.8 Analytics & Growth Dashboard

- [ ] Build admin analytics dashboard showing:
  - Daily/weekly active users
  - Conversion funnel (signup → onboarding → first story → export → payment)
  - Chapter completion rates
  - Voice vs. text preference distribution
  - Revenue metrics (MRR, ARPU, churn)
- [ ] Use PostHog (already integrated) for funnel analysis
- [ ] Add cohort analysis (retention by signup week)
- [ ] A/B testing framework for landing page variants

---

## 6.9 Mobile App Maturation

`apps/mobile/` is early-stage React Native/Expo.

- [ ] Share API client patterns with web (extract to `packages/api-client/`)
- [ ] Add push notification support (Expo Notifications)
- [ ] Add offline recording (record voice, sync later)
- [ ] Add photo capture from camera
- [ ] Add widget for daily prompt on home screen
- [ ] App Store / Play Store submission

---

## 6.10 Infrastructure Evolution

### Database

- [ ] Add read replica for admin dashboard queries (don't load production DB)
- [ ] Add connection pooling with PgBouncer (when > 50 concurrent connections)
- [ ] Add automated daily backups with point-in-time recovery
- [ ] Monitor slow queries with `pg_stat_statements`

### Caching

- [x] Response caching for public endpoints — `cachePublic()` and `cacheNone()` middleware in setup.js; sitemap (1h) and robots.txt (24h) already set Cache-Control inline
- [ ] Add CDN for static assets (Cloudflare, already use R2)
- [ ] Cache AI-generated content (avoid re-generating same prompts)

### Observability

- [ ] Add structured logging to a log aggregator (Axiom, Logtail, or Datadog)
- [ ] Add uptime monitoring (Uptime Robot, Better Stack)
- [ ] Add performance monitoring (response time percentiles)
- [ ] Add alerting for: error rate spikes, payment failures, API quota exhaustion

### Security

- [ ] Add WAF rules (Cloudflare, if using their CDN)
- [ ] Add DMARC/SPF/DKIM for email deliverability
- [x] Content Security Policy reporting endpoint — `POST /api/csp-report` (routes/cspReport.js)
  - `Reporting-Endpoints` header added in setup.js
  - Both `report-uri` (legacy) and `report-to` (modern) directives in Helmet CSP config
  - Violations logged via structured logger; wire to Sentry for alerting
- [ ] Annual penetration test
- [ ] SOC 2 compliance preparation (if targeting enterprise/care home customers)

---

## 6.11 Content & SEO Pipeline

- [ ] Auto-generate blog posts from common memoir themes (AI-written, human-edited)
- [ ] Add structured data (JSON-LD) for blog posts and FAQ
- [ ] Add canonical URLs for all pages
- [ ] Implement server-side rendering for landing pages (or enhance prerender script)
- [ ] Add Open Graph / Twitter card meta for social sharing
- [ ] Create "sample memoir" showcase page with real (anonymized) content

---

## 6.12 Revenue Diversification

- [ ] **Gift cards** — Buy a memoir subscription for a parent/grandparent
- [ ] **Care home partnerships** — Bulk licensing for assisted living facilities
- [ ] **Memoir coaching** — Human editors review and enhance AI-generated content
- [ ] **Legacy vault** — Encrypted storage for documents, photos, videos beyond the memoir
- [ ] **Family tree integration** — Connect memoir to ancestry data

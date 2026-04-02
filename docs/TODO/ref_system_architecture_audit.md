# System Architecture Audit

**Date:** 2026-04-02
**Project:** Easy Memoir (life-story)
**Auditor:** Principal Architecture Review
**Score:** 6.2 / 10 — Functional, feature-rich, needs structural hardening

---

## Executive Summary

Easy Memoir is a production-deployed, AI-powered memoir platform. It has a meaningful feature surface: voice interviews, writing assistance, gamification, print-on-demand, audiobooks, Stripe payments, and Telegram integration. The team has shipped real product and paid users exist.

Architecturally, the codebase is a **feature-first monolith** that has grown without a consistent layer model. The repository pattern is partially applied, a service layer exists in name only, and the route handlers carry far too much responsibility. The frontend has no server-state management layer. The database schema is initialized at runtime from application code. These are not cosmetic issues — they create real operational, security, and maintainability risk as the product scales.

The codebase demonstrates genuine engineering competence in many areas (middleware, error hierarchy, rate limiting, auth token handling, structured logging). The problem is not quality of individual files — it is the absence of a coherent architectural model enforced across the system.

**Verdict: Fix the layer model before adding features. The blast radius of the current issues grows with every new route.**

---

## Current Architecture Interpretation

### Runtime Shape

The system is a **modular monolith** deployed as a single Express process. The frontend is a separate Vite SPA that is served as static files by the same Express process in production. This is a sensible, pragmatic choice for this stage of product.

### Component Map

```
Browser
  └── React SPA (Vite, React Router 6)
        ├── AuthContext (global auth + token)
        ├── SettingsContext (user prefs)
        ├── 50+ page components
        └── 80+ UI components
              └── useApi hook → HTTP calls

Express API (Node 20, ES Modules)
  ├── Middleware pipeline
  │     ├── Helmet, CORS, compression
  │     ├── requestId, requestTiming
  │     ├── auth (JWT verify, scope check)
  │     ├── rateLimiters (brute-force, AI quota)
  │     └── errorHandler (centralized)
  ├── 24+ route files (flat, no domain grouping)
  │     ├── Direct DB calls in many routes
  │     ├── Repository calls in some routes
  │     └── Business logic distributed across routes + utils
  ├── Repositories (partial coverage)
  │     ├── userRepository, storyRepository, photoRepository
  │     ├── paymentRepository, memoryRepository, gameRepository
  │     └── coverRepository, audiobookRepository
  ├── Services (external integrations)
  │     ├── grokService (xAI Grok API)
  │     ├── emailService (Resend)
  │     ├── entityExtractionService
  │     └── audioConverter, transcriptService, telnyxCallBridge
  ├── Utils (mixed concerns)
  │     ├── logger, validateEnv, security, errors, cache
  │     ├── gameStateManager, promptSelector, memoryContext
  │     └── r2 (Cloudflare), redis, sentry, swagger
  ├── Cron (dailyTasks, weeklyTasks, weeklyTopicEmails)
  └── WebSocket (xAI voice session bridging)

PostgreSQL (Railway)
  └── 30+ tables, schema defined in db/index.js initDatabase()

External Services
  ├── xAI Grok API (AI completions + Realtime voice)
  ├── Stripe (payments, webhooks)
  ├── Fish.audio (TTS/audiobooks)
  ├── Telnyx (phone call interviews)
  ├── Replicate (image generation)
  ├── Lulu (print-on-demand)
  ├── Resend (transactional email)
  ├── Cloudflare R2 (photo/file storage)
  ├── Redis/Upstash (token blacklist, optional)
  └── Telegram Bot API
```

### Architectural Style Assessment

The system is a **monolith with a partial layered architecture**. It is not cleanly layered (routes call DB directly in several places), not properly domain-modeled (no domain objects — only raw query results), and not clearly bounded (utils/ contains both infrastructure helpers and business logic). The frontend is an SPA with thin global state management and no server-state library.

---

## Strengths

- Well-designed middleware pipeline (request ID, timing, auth, rate limiting, error handler)
- Custom error class hierarchy (`AppError`, `ValidationError`, `NotFoundError`, `ExternalServiceError`)
- Environment variable validation at startup (`validateEnv.js`)
- Rate limiting on auth and AI endpoints
- Structured logging with secret redaction
- JWT token blacklist system (revocation on logout/password reset)
- Scoped tokens for magic links (cannot access payments or account settings)
- Async handler wrapper eliminates try/catch boilerplate in routes
- Repository pattern started — provides a testable data access abstraction
- Input sanitization and prompt injection prevention for AI features
- Bcrypt with 12 rounds
- Honeypot and timestamp bot prevention on registration
- Vite config strips secrets from frontend build artifacts
- Graceful shutdown handling
- Stripe webhook signature verification
- Sentry error tracking integration
- Distributed cron lock mechanism (prevents duplicate job execution)

---

## Weaknesses

### Critical

1. **Schema initialized at runtime** — `db/index.js:initDatabase()` runs `CREATE TABLE IF NOT EXISTS` on every startup. Any schema drift from the baseline migration is silently invisible.
2. **In-memory token blacklist fallback** — If Redis is unavailable, revoked tokens survive server restart. Logout and password-reset security guarantees are conditional on Redis.
3. **No service layer** — Business logic is distributed across route handlers, utils, and repositories with no coherent domain model. Behavior cannot be tested independently of Express.
4. **No API versioning** — All clients (web, mobile, Telegram) consume the same unversioned endpoints. Any breaking change breaks all clients simultaneously.

### High

5. **App.jsx with 50+ routes** — Unmaintainable. Route config, lazy loading, auth guards, and redirect logic all in one 500+ line file.
6. **No server-state management** — The frontend has no React Query / SWR. Every component manages its own loading/error/stale state via manual `useEffect`+`useState` or the single `useApi` hook. Cache invalidation does not exist.
7. **chapters.js duplication** — Exists in `apps/web/src/data/chapters.js` AND `packages/shared/chapters.js`. The shared package exists to prevent this. The frontend duplicate will diverge.
8. **Direct DB calls in route handlers** — Several routes bypass repositories and call the DB pool directly, bypassing the data access abstraction.
9. **Admin route protection unclear** — Admin routes exist but the authorization model is not clearly enforced at the middleware level; it appears to rely on ad-hoc per-route checks.

### Medium

10. **Redis is "optional"** — Token blacklist, rate limiting, and caching have in-memory fallbacks that hide production misconfiguration.
11. **No pagination contract** — No standard `limit`/`offset`/`cursor` pattern enforced. As data grows, unguarded list endpoints will degrade.
12. **External service calls without timeout** — Routes calling Grok, Fish.audio, Replicate, Telnyx have no explicit timeout or circuit-breaker. One slow upstream stalls request threads.
13. **Three.js bundled in main app** — BookPreview component loads Three.js; this is not split out and inflates the initial bundle.
14. **Multiple landing page variants** — `Landing.jsx`, `LandingDesign1.jsx`, `FacebookLanding.jsx` — canonical page unclear; dead routes create confusion.
15. **blogPosts.js as frontend data** — Blog content hardcoded in a JS file. No CMS or DB-backed content system.

### Low

16. **Cron lock uses DB** — If DB is unavailable, cron fails silently or errors without meaningful alerting.
17. **`utils/` is a catch-all** — Contains infrastructure helpers, domain logic (`gameStateManager`, `promptSelector`), and external integrations. No cohesion.
18. **No idempotency keys on payments** — Stripe checkout creation has no idempotency key; double-click can create duplicate checkout sessions.
19. **Mobile app early-stage but included in monorepo** — React Native app exists but is sparse. It adds toolchain complexity without contributing to the deployed product.

---

## Major Architectural Risks

| Risk                                              | Probability | Impact   |
| ------------------------------------------------- | ----------- | -------- |
| Production schema drift (initDatabase)            | High        | Critical |
| Token revocation failure on Redis outage          | Medium      | Critical |
| Business logic untestable without HTTP            | High        | High     |
| Breaking API change affects all clients           | High        | High     |
| Unguarded list queries at scale                   | Medium      | High     |
| External service timeout causes cascading failure | Medium      | High     |
| chapters.js divergence between web and shared     | High        | Medium   |

---

## Target Architecture Summary

The target is a **clean layered monolith** with proper domain separation:

```
HTTP Layer        → Routes (thin controllers, no business logic)
Application Layer → Services (orchestrate business use cases)
Domain Layer      → Domain objects, validation, business rules
Infrastructure    → Repositories, external service clients, DB, cache
Cross-cutting     → Auth, logging, error handling, config
```

Frontend moves to a **data-first component model** with React Query for server state, a feature-based folder structure, and a typed API client layer.

Database moves to **migrations-only schema management** with no runtime schema creation.

See `03_target_architecture.md` for full specification.

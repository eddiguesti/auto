# Architecture Overview & Audit Summary

**Date:** 2026-04-02
**Auditor:** Staff Engineer Review
**Project:** Easy Memoir (life-story)
**Score:** 6.5/10 overall — solid foundation, needs hardening

---

## System Summary

Easy Memoir is an AI-powered autobiography platform that helps seniors preserve life stories through voice interviews, text input, and AI conversation — producing EPUB, audiobook, and print-on-demand books.

**Monorepo structure:**

```
life-story/
├── apps/web/          React 18 + Vite SPA (Tailwind, Framer Motion, Three.js)
├── apps/mobile/       React Native Expo (iOS/Android) — early stage
├── services/api/      Express 4 backend (Node 20, ES Modules)
├── services/worker/   Background job worker (placeholder)
├── packages/shared/   Shared data (chapters, style options)
├── tools/scripts/     Dev utilities (backup, validation, sitemap)
├── docs/              Business plans, specs, guides
└── e2e/               Playwright E2E tests (3 suites)
```

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, React Router 6, Framer Motion, Three.js |
| Mobile | React Native 0.81, Expo 54, TypeScript |
| Backend | Node.js 20, Express 4, ES Modules |
| Database | PostgreSQL (30+ tables, node-pg-migrate) |
| AI | xAI Grok (text/voice), Replicate (images), OpenAI SDK |
| Voice | Fish.audio (TTS), Telnyx (phone), xAI Realtime API (live voice) |
| Payments | Stripe (checkout, webhooks, subscriptions) |
| Print | Lulu API (print-on-demand) |
| Storage | Cloudflare R2 (S3-compatible) |
| Cache | Redis (Upstash) with in-memory fallback |
| Auth | JWT + Google OAuth + Magic Links |
| Monitoring | Sentry (errors), PostHog (analytics) |
| CI/CD | GitHub Actions (lint, test, build, E2E, security) |
| Deploy | Railway (primary), Render (alt config) |

---

## Key Strengths

1. **Security fundamentals are solid** — parameterized SQL everywhere, JWT blacklisting, bcrypt cost 12, Helmet + CORS + rate limiting, error sanitization with secret redaction
2. **Graceful degradation** — Redis, R2, Sentry, and all external services have fallbacks
3. **Clean frontend architecture** — lazy-loaded routes, memoized components, context-based state (appropriate for scale), debounced saves
4. **Comprehensive CI/CD** — lint, test, build, E2E, security audit, secret scanning, license check
5. **Good developer tooling** — Husky pre-commit, lint-staged, Prettier, ESLint, build validation
6. **Well-thought-out UX** — warm literary theme for senior audience, voice-first design, progressive onboarding

---

## Key Issues (Priority Order)

### CRITICAL

1. **Exposed secrets in .env** — Live API keys for xAI, Resend, Telnyx, R2, Redis committed to repo history (rotate immediately)
2. **Missing auth on cost-generating endpoints** — Blog image generation routes callable without authentication

### HIGH

3. **Test coverage is dangerously low** — 7 backend test files covering only middleware/utils, zero route tests, zero payment/webhook tests
4. **`SELECT *` across 62 queries** — Returns password_hash and other sensitive columns unnecessarily
5. **Repository pattern partially adopted** — 3 repository files exist but most routes write raw SQL inline
6. **Cron jobs not distributed** — node-cron runs on every instance in multi-instance deployment
7. **No CSRF protection** — Web forms unprotected against cross-site request forgery
8. **N+1 query patterns** — Story fetches don't use JOINs, leading to waterfall DB calls

### MEDIUM

9. **API index.js is 538 lines** — Route mounting, middleware config, and inline handlers all in one file
10. **External service errors leak details** — Not all routes wrap external errors in ExternalServiceError
11. **No API documentation** — 55 endpoints with no OpenAPI/Swagger spec
12. **Worker service is a placeholder** — `services/worker/` has only an entry point and empty package.json
13. **Validation schema coverage incomplete** — Some routes inline validation instead of using schemas
14. **Magic link scope enforcement could be clearer** — Scope checks spread across middleware

### LOW

15. **Some frontend code duplication** — Export handlers duplicated across Export.jsx and ExportModal.jsx
16. **Accessibility gaps** — Touch targets slightly under 44px, no focus trap in modals, no alt text on 3D book viewer
17. **Dead code suspected** — page-flip library imported but unused, some SettingsContext getters unused
18. **Mobile app early stage** — TypeScript setup but no tests, no shared API client with web

---

## Target Architecture Vision

The system is architecturally sound for its current scale (single-instance, < 10K users). The primary work is **hardening what exists**, not rebuilding:

1. **Complete the repository pattern** — All database access through repositories, not inline SQL in routes
2. **Extract route mounting** — Split index.js into app setup + route registry
3. **Explicit column selection** — Replace all `SELECT *` with named columns
4. **Background job system** — Replace node-cron with a proper queue (BullMQ or pg-boss) for distributed safety
5. **Test coverage to 60%+ backend, 40%+ frontend** — Focus on routes, webhooks, and payment flows
6. **API documentation** — Auto-generate OpenAPI spec from route definitions

The frontend needs only minor cleanup — it's already well-structured with lazy loading, memoization, and proper separation of concerns.

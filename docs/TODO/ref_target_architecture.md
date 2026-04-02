# Target Architecture

**Date:** 2026-04-02
**Project:** Easy Memoir

---

## Recommended Architectural Style

**Clean Layered Monolith** — structured, deployable as a single unit, with clear internal domain boundaries.

This is the correct choice because:

- The team is small; microservices would add coordination overhead without benefit
- The product is not at a scale that requires independent service scaling
- A well-structured monolith is easier to evolve, test, and operate
- Modular internal structure preserves the option to extract services later if warranted

Avoid: serverless, microservices, or event-sourcing until the domain model is stable and team size justifies it.

---

## Layer Model

```
┌─────────────────────────────────────────────────────────┐
│  HTTP Layer (routes/)                                    │
│  • Parse request, validate input, call service, respond  │
│  • No business logic                                     │
│  • No direct DB access                                   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Application/Service Layer (domain/)                     │
│  • Orchestrates business use cases                       │
│  • Coordinates repositories, external services, events  │
│  • Contains all business rules                           │
│  • No HTTP knowledge (no req/res)                        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────┬───────────▼────────────────────┐
│  Repositories│  External Service Clients       │
│  (data/)     │  (integrations/)                │
│  • SQL only  │  • Grok, Stripe, Fish.audio etc │
│  • No logic  │  • Wrapped in typed interfaces  │
└──────────────┴─────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Infrastructure                                          │
│  • PostgreSQL, Redis, Cloudflare R2                      │
│  • Logger, config, secrets                               │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Module Boundaries

### `services/api/routes/`

Thin HTTP controllers only. Accept request, call service, return response.

```
routes/
  auth.js         → AuthService
  stories.js      → StoryService
  ai.js           → AIService
  voice.js        → VoiceService
  game/           → GameService
  payments.js     → PaymentService
  export.js       → ExportService
  memory.js       → MemoryService
  audiobook.js    → AudiobookService
  admin.js        → AdminService
  ...
```

### `services/api/domain/`

All business logic. No Express imports. No DB imports.

```
domain/
  StoryService.js
  AuthService.js
  PaymentService.js
  GameService.js
  ExportService.js
  VoiceService.js
  MemoryService.js
  AudiobookService.js
  AdminService.js
  NotificationService.js
  PromptService.js        ← moves from utils/promptSelector.js
  EntityExtractionService.js
```

### `services/api/data/`

Repositories only. Pure data access — SQL queries, no business rules.

```
data/
  UserRepository.js
  StoryRepository.js
  PhotoRepository.js
  PaymentRepository.js
  GameRepository.js
  MemoryRepository.js
  CoverRepository.js
  AudiobookRepository.js
  OnboardingRepository.js
  PromptRepository.js
```

### `services/api/integrations/`

Thin wrappers around external APIs. Return typed results. Handle retries and timeouts.

```
integrations/
  GrokClient.js         ← from services/grokService.js
  StripeClient.js
  FishAudioClient.js
  TelnyxClient.js
  ReplicateClient.js
  LuluClient.js
  ResendClient.js
  R2Client.js           ← from utils/r2.js
```

### `services/api/infrastructure/`

Runtime infrastructure. Not domain logic.

```
infrastructure/
  db.js               ← connection pool
  redis.js
  tokenBlacklist.js
  logger.js
  config.js
  validateEnv.js
  sentry.js
```

### `services/api/middleware/`

Unchanged from current — already well-structured.

### `services/api/jobs/`

Background jobs and cron. Call domain services, not DB directly.

```
jobs/
  cron/
    dailyTasks.js
    weeklyTasks.js
    weeklyTopicEmails.js
  queue/
    storyProcessingQueue.js    ← async side effects after story save
    emailQueue.js
```

---

## Frontend Structure

Move from a route-count folder structure to a **feature-based structure**:

```
apps/web/src/
  features/
    auth/
      pages/        (Login, Register, ForgotPassword, etc.)
      components/   (auth-specific)
      hooks/        (useAuth)
    memoir/
      pages/        (Home, Chapter, ChapterReview, VoiceChat)
      components/   (QuestionCard, AIAssistant, MemoryTriggers)
      hooks/        (useStory, useChapter, useVoiceSession)
      queries/      (React Query query definitions)
    export/
      pages/        (Export, PreviewStyle)
      components/   (ExportModal, BookPreview, CoverEditor)
      hooks/        (useExport)
      queries/
    game/
      components/   (ProgressCard, StreakDisplay, Achievements)
      queries/
    payments/
      pages/        (Pricing)
      components/   (UpgradeModal)
      hooks/        (usePremium)
    admin/
      pages/        (Dashboard, Users, UserDetail, Payments)
    marketing/
      pages/        (LandingDesign1, HowItWorks, Pricing, Blog)
      components/   (HeroSection, FeatureSection, etc.)
  shared/
    components/     (ErrorBoundary, Toast, SEO, CookieConsent)
    hooks/          (useApi — base fetch primitive)
    ui/             (pure presentational components)
  routes/
    appRoutes.jsx
    adminRoutes.jsx
    marketingRoutes.jsx
    authRoutes.jsx
  lib/
    queryClient.js  (React Query setup)
    apiClient.js    (typed API client wrapper)
```

---

## Data Flow Model

### Write Flow (Story Save)

```
User input
  → QuestionCard component
  → useStory mutation (React Query)
  → POST /api/v1/stories
  → stories route (validate)
  → StoryService.saveAnswer(userId, storyData)
      → StoryRepository.upsert()
      → [async] storyProcessingQueue.enqueue({ storyId })
  → 200 response

[Background job]
storyProcessingQueue
  → EntityExtractionService.extract(storyId)
  → GameService.recordMemory(userId)
  → NotificationService.scheduleReminder(userId)
```

### Read Flow (Chapter Load)

```
Chapter page mounts
  → useChapter(chapterId) [React Query]
  → GET /api/v1/chapters/:id/stories
  → StoryService.getChapterStories(userId, chapterId)
      → StoryRepository.findByUserChapter()
  → Response cached in React Query (5 min stale time)
```

### Auth Flow

```
Login form
  → POST /api/v1/auth/login
  → AuthService.login(email, password)
      → UserRepository.findByEmail()
      → bcrypt.compare()
      → TokenService.issue(userId)  ← generates JWT with jti
  → JWT stored in memory (AuthContext)
  → Token sent in Authorization header on all requests

Logout
  → POST /api/v1/auth/logout
  → AuthService.logout(jti)
      → TokenBlacklist.revoke(jti)  ← durable Redis/DB entry
  → AuthContext cleared
```

---

## API Conventions

### Versioning

All endpoints prefixed `/api/v1/`

### Resource Naming

- Collections: plural nouns (`/stories`, `/chapters`, `/users`)
- Resources: `/:id` suffix (`/stories/:id`)
- Actions: sub-resources (`/stories/:id/enhance`, `/voice/sessions`)

### Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "requestId": "req_abc123",
    "pagination": { "total": 100, "limit": 20, "offset": 0, "hasMore": true }
  }
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Answer must be at least 10 characters",
    "field": "answer"
  },
  "meta": { "requestId": "req_abc123" }
}
```

### HTTP Status Codes

- `200` — Success (reads, updates)
- `201` — Created
- `204` — Deleted (no body)
- `400` — Validation error
- `401` — Unauthenticated
- `403` — Forbidden (authenticated but insufficient permission)
- `404` — Not found
- `409` — Conflict (duplicate)
- `422` — Unprocessable (business rule violation)
- `429` — Rate limited
- `503` — Upstream service unavailable

---

## State Management Approach

### Frontend

- **Server state:** React Query (`@tanstack/react-query`) — all API data
- **Auth state:** `AuthContext` — JWT token, user object (keep as-is)
- **UI state:** Component local state (`useState`) — forms, modals, toggles
- **Settings:** `SettingsContext` — user preferences (keep as-is)
- **No Redux.** The current app does not need global client state management beyond auth and settings.

### Backend

- **Request-scoped state:** `req.user`, `req.id` (already in place)
- **Shared mutable state:** Redis only (token blacklist, rate limits, ephemeral voice session tokens)
- **Persistent state:** PostgreSQL only

---

## Security Boundary Model

```
Internet
  │
  ├── Public endpoints (no auth required)
  │     /api/v1/auth/login, /register, /forgot-password
  │     /api/v1/support/chat (rate-limited)
  │     /api/v1/newsletter
  │     /api/v1/seo/*
  │
  ├── Authenticated endpoints (valid JWT required)
  │     /api/v1/stories/*, /chapters/*, /voice/*, etc.
  │     Token verified in middleware before route handler
  │
  ├── Scoped endpoints (magic link JWT, limited scope)
  │     /api/v1/talk/* (scope: magic_link)
  │     Only allows: story read/write for the linked chapter
  │     Cannot access: payments, account, admin
  │
  ├── Premium-gated endpoints (auth + payment check)
  │     /api/v1/export/*, /audiobook/*
  │     Service layer checks PaymentRepository.hasPaid(userId, product)
  │
  └── Admin endpoints (auth + role check)
        /api/v1/admin/*
        requireAdmin middleware applied at router mount
```

---

## Database Schema Management

### Target: Migrations-Only Model

```
services/api/db/
  migrations/
    001_baseline_schema.sql      ← full current schema as SQL
    002_add_cover_options.sql    ← each change as numbered migration
    003_...
  seeds/
    prompts.js
    achievements.js
  runner.js                     ← runs pending migrations on startup
  index.js                      ← connection pool only (NO DDL)
```

**Rules:**

1. `db/index.js` exports only the connection pool
2. `initDatabase()` is deleted
3. Migrations run in order via `runner.js` on startup
4. Each migration is idempotent or transactional
5. `schema_migrations` table tracks applied migrations

---

## Observability Baseline

| Signal          | Tool                   | Target                                                 |
| --------------- | ---------------------- | ------------------------------------------------------ |
| Errors          | Sentry                 | All unhandled exceptions, JS frontend errors           |
| Structured logs | Winston/pino           | Request ID, user ID, duration, status on every request |
| Metrics         | Custom + Sentry perf   | p50/p95 response time, AI call latency, queue depth    |
| Health check    | `/api/health`          | DB, Redis, external service ping status                |
| Alerting        | Sentry alerts          | Error rate spike, p95 > 5s, DB unavailable             |
| Tracing         | Request ID propagation | Already in place — extend to external service calls    |

---

## Deployment Architecture

```
Railway (or Render)
  ├── Web Service (Node.js)
  │     • Serves Express API + static frontend
  │     • ENV: all secrets via platform env vars
  │     • Health check: GET /api/health
  │     • Zero-downtime deploy: graceful shutdown (already implemented)
  │
  ├── PostgreSQL (Railway managed)
  │     • Daily automated backup
  │     • Connection pooling via pg Pool (already in place)
  │
  └── Redis (Upstash or Railway Redis)
        • REQUIRED (not optional) in production
        • Token blacklist, rate limiting
```

### Environment Separation

| Environment | Database           | Redis    | External Services |
| ----------- | ------------------ | -------- | ----------------- |
| local       | localhost:5432     | optional | sandbox keys      |
| staging     | Railway staging DB | required | sandbox keys      |
| production  | Railway prod DB    | required | live keys         |

---

## Architectural Principles to Enforce

See `ref_architecture_principles.md` for the full mandatory rule set.

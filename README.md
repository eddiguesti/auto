# Easy Memoir

AI-powered autobiography platform that helps seniors and families preserve life stories through voice interviews, text input, and AI conversation — producing beautifully formatted books (digital, audiobook, and print-on-demand).

**Live:** easymemoir.co.uk

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys
cp .env.example .env

# 3. Run both API server + web client
npm run dev
```

- API runs on `http://localhost:3001`
- Web app runs on `http://localhost:5173` (proxied to API)
- Mobile app: `cd apps/mobile && npx expo start`

---

## Project Structure

```
life-story/
├── apps/                        # Client applications
│   ├── web/                     # React + Vite web app
│   └── mobile/                  # React Native Expo app (iOS/Android)
│
├── services/
│   └── api/                     # Node.js Express backend
│
├── packages/
│   └── shared/                  # Shared data between web, mobile & API
│
├── tools/
│   └── scripts/                 # Dev utilities & build tools
│
├── docs/                        # All documentation
│   ├── business/                # Business plan & financials
│   ├── planning/                # Feature roadmaps & specs
│   ├── guides/                  # Deployment & QA checklists
│   └── archive/                 # Old completed task breakdowns
│
├── .env.example                 # All env vars documented (115 vars)
├── package.json                 # Monorepo root (npm workspaces)
├── railway.json                 # Railway deployment config
└── render.yaml                  # Render deployment config
```

---

## Backend — `services/api/`

Express.js API server. Entry point: `services/api/index.js`

### `routes/` — API Endpoints (24 files)

Each file is a self-contained Express router handling one feature area.

| File                | What it does                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth.js`           | Registration, login, Google OAuth, password reset. Public endpoint with rate limiting for brute-force protection.                 |
| `stories.js`        | CRUD for life story answers. Each story is tied to a chapter and question. Handles AI image generation for chapter illustrations. |
| `photos.js`         | Photo upload (multer) and retrieval. Authenticated file serving to prevent unauthorized access.                                   |
| `ai.js`             | AI-powered story enhancement, follow-up question generation, and conversational interview via Grok API.                           |
| `voice.js`          | Voice recording upload, transcription, and multi-question voice interview sessions.                                               |
| `memory.js`         | Memory graph — entities (people, places, events), relationships between entities, and mentions linking entities to stories.       |
| `audiobook.js`      | Audiobook generation via Fish.audio. Supports default TTS voices and custom voice cloning.                                        |
| `export.js`         | Story export to EPUB and PDF formats for download.                                                                                |
| `covers.js`         | Book cover design generation — users pick templates and customize.                                                                |
| `lulu.js`           | Print-on-demand book ordering through Lulu API. Hardcover, paperback, dust jacket options.                                        |
| `payments.js`       | Stripe payment processing. Creates checkout sessions, handles webhooks, manages premium subscriptions.                            |
| `style.js`          | Writing style preferences — tone, narrative voice, detail level. Stored per-user.                                                 |
| `seo.js`            | Server-rendered public landing pages for SEO (pre-renders meta tags for social sharing).                                          |
| `game.js`           | Gamification engine — daily streaks, achievements, collections, daily prompts. Drives engagement.                                 |
| `notifications.js`  | Push notification management and in-app notification delivery.                                                                    |
| `user.js`           | User profile, GDPR data export, account deletion.                                                                                 |
| `onboarding.js`     | Post-signup flow — captures preferences, triggers first prompt, sets up initial state.                                            |
| `support.js`        | AI-powered support chatbot. Public endpoint so users can get help even when logged out.                                           |
| `newsletter.js`     | Email newsletter subscription and unsubscribe management.                                                                         |
| `memos.js`          | Quick voice memos — free-form recordings that aren't tied to a specific chapter/question.                                         |
| `magicLink.js`      | Magic link authentication for no-password access via email (used in weekly topic emails).                                         |
| `telegram.js`       | Telegram bot integration — alternative input channel. Users can answer prompts via Telegram.                                      |
| `chapter-images.js` | AI-generated personalized chapter illustrations using Replicate image models.                                                     |
| `telnyxCall.js`     | Phone call interviews via Telnyx + xAI Realtime API. WebSocket streaming for live audio.                                          |

### `middleware/` — Request Processing Pipeline

| File               | What it does                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `auth.js`          | JWT token verification. Extracts user from token and attaches to `req.user`. Supports Google OAuth tokens.                           |
| `errorHandler.js`  | Centralized error handling. Catches all thrown errors, formats consistent error responses, prevents stack trace leaks in production. |
| `asyncHandler.js`  | Wraps async route handlers so thrown errors are properly caught (Express doesn't do this natively).                                  |
| `validate.js`      | Runs express-validator validation chains and returns 400 with details if validation fails.                                           |
| `requireDb.js`     | Returns 503 if database is unavailable, preventing routes from failing cryptically.                                                  |
| `requestId.js`     | Generates unique correlation IDs per request for log tracing.                                                                        |
| `requestTiming.js` | Measures and logs request duration for performance monitoring.                                                                       |

### `services/` — External Service Integrations

| File                         | What it does                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `grokService.js`             | Grok (xAI) API client. Handles AI completions for story enhancement, interview prompts, and image prompt generation. |
| `entityExtractionService.js` | NLP entity extraction — pulls people, places, dates, emotions from story text to build the memory graph.             |
| `transcriptService.js`       | Audio-to-text transcription. Converts voice recordings into text for story creation.                                 |
| `audioConverter.js`          | Audio format conversion between different codecs (e.g., WebM to WAV).                                                |
| `emailService.js`            | Email sending via Resend API. Contains HTML templates for weekly topics, password resets, achievements.              |
| `telnyxCallBridge.js`        | Bridges Telnyx phone calls with xAI Realtime API for live conversational interviews.                                 |

### `db/` — Database Layer

| File                    | What it does                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.js`              | PostgreSQL connection pool (pg), full schema initialization with 30+ tables, and migration support. This is the single source of truth for the database schema. |
| `seeds/achievements.js` | Seed data for gamification achievements (badges users can earn).                                                                                                |
| `seeds/collections.js`  | Seed data for achievement collection groupings.                                                                                                                 |
| `seeds/prompts.js`      | Master prompt library — 70+ life story prompts seeded into `prompt_library` table.                                                                              |
| `migrations/`           | SQL migration files for schema changes.                                                                                                                         |

### `utils/` — Shared Utilities

| File                  | What it does                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `logger.js`           | Structured logging with automatic secret redaction. Prevents API keys from leaking into logs.               |
| `errors.js`           | Custom error class hierarchy — `AppError`, `ValidationError`, `NotFoundError`, `ExternalServiceError`, etc. |
| `errorSanitizer.js`   | Strips sensitive data from error messages before sending to clients.                                        |
| `validateEnv.js`      | Validates all required environment variables at startup. Fails fast if critical config is missing.          |
| `security.js`         | Security helper utilities.                                                                                  |
| `metrics.js`          | Performance and error metrics collection for the health endpoint.                                           |
| `cache.js`            | Simple caching utility with key generation helpers.                                                         |
| `timedPool.js`        | Wraps database queries with timing so slow queries are logged.                                              |
| `storyRepository.js`  | Data access patterns for stories — encapsulates common query logic.                                         |
| `promptSelector.js`   | Intelligent daily prompt selection — avoids repeats, matches user's story gaps.                             |
| `promptUtils.js`      | Prompt formatting and manipulation helpers.                                                                 |
| `gameStateManager.js` | Gamification state machine — initializes and manages streak, shield, achievement state.                     |
| `grokClient.js`       | Grok API client initialization with API key from env.                                                       |
| `notifications.js`    | Notification scheduling and sending logic.                                                                  |
| `memoryContext.js`    | Extracts user's memory context (known entities, relationships) for AI personalization.                      |
| `inviteCode.js`       | Generates unique invite codes for family sharing.                                                           |
| `config.js`           | Centralized configuration management.                                                                       |

### `cron/` — Background Scheduled Jobs

| File                   | What it does                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `index.js`             | Initializes and schedules all cron jobs.                                                  |
| `dailyTasks.js`        | Runs at midnight — generates daily prompts, resets streaks, sends reminder notifications. |
| `weeklyTasks.js`       | Runs weekly — generates engagement summaries, tracks activity trends.                     |
| `weeklyTopicEmails.js` | Sends weekly themed email prompts with magic links for no-login story answering.          |

### `schemas/` — Input Validation

| File       | What it does                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `index.js` | Express-validator schemas for request body validation. Centralized so all routes validate consistently. |

### `tests/` — API Tests

| File                    | What it does                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| `auth.test.js`          | Tests authentication flows — registration, login, token validation, Google OAuth. |
| `permissions.test.js`   | Tests authorization — users can only access their own data, admin restrictions.   |
| `errorHandling.test.js` | Tests error handling — proper status codes, error message formats, no data leaks. |
| `integration.test.js`   | End-to-end tests — full request flows from auth to story creation to export.      |
| `validate.test.js`      | Tests input validation — malformed requests are rejected with clear messages.     |
| `testUtils.js`          | Test helper functions — mock users, tokens, database setup/teardown.              |

---

## Web App — `apps/web/`

React 18 + Vite SPA. Entry point: `apps/web/src/main.jsx`

### `pages/` — Route Pages (grouped by purpose)

#### `pages/auth/` — Authentication

| File                 | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `Login.jsx`          | Email/password and Google OAuth login form.                  |
| `Register.jsx`       | New account registration with email verification.            |
| `ForgotPassword.jsx` | Password reset request — sends reset email.                  |
| `ResetPassword.jsx`  | Password reset form — validates token and sets new password. |

#### `pages/marketing/` — Public Landing & Info Pages

| File                  | What it does                                                                    |
| --------------------- | ------------------------------------------------------------------------------- |
| `LandingDesign1.jsx`  | Main landing page (current homepage at `/`). Hero, features, testimonials, CTA. |
| `Landing.jsx`         | Original landing page design (kept at `/landing-original`).                     |
| `FacebookLanding.jsx` | Ad-specific landing page for Facebook/social campaigns (`/welcome`).            |
| `HowItWorks.jsx`      | Step-by-step guide explaining the memoir creation process.                      |
| `Pricing.jsx`         | Pricing tiers and feature comparison.                                           |
| `FAQ.jsx`             | Frequently asked questions with expandable answers.                             |
| `About.jsx`           | About the team and mission.                                                     |
| `Gift.jsx`            | Gift purchase flow — buy a memoir package for someone else.                     |
| `SampleMemoir.jsx`    | Example memoir preview so visitors can see what the output looks like.          |
| `Blog.jsx`            | Blog listing page with articles about life stories, memory preservation.        |
| `BlogPost.jsx`        | Individual blog post page (dynamic route `/blog/:slug`).                        |

#### `pages/legal/` — Legal & Compliance

| File          | What it does                     |
| ------------- | -------------------------------- |
| `Terms.jsx`   | Terms of service.                |
| `Privacy.jsx` | Privacy policy (GDPR-compliant). |
| `Cookies.jsx` | Cookie policy and preferences.   |

#### `pages/app/` — Core Product (Protected Routes)

| File               | What it does                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `Home.jsx`         | User dashboard — chapter progress, daily prompt, streak, quick actions. The main hub after login.       |
| `Chapter.jsx`      | Chapter view — shows questions for a life chapter, accepts text answers, AI assistant, memory triggers. |
| `Export.jsx`       | Book export wizard — format selection (digital/print/audiobook), cover design, order placement.         |
| `VoiceChat.jsx`    | Voice interview mode — real-time AI conversation that asks follow-up questions. Uses xAI Realtime API.  |
| `Settings.jsx`     | User settings — profile, speaking pace, voice preferences, account management.                          |
| `PreviewStyle.jsx` | Writing style preview — shows how different tones/styles transform the user's stories.                  |
| `Talk.jsx`         | Magic link conversation page — answer a weekly topic prompt without logging in (token-based auth).      |

### `components/` — Reusable UI Components

| File                              | What it does                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AIAssistant.jsx`                 | In-chapter AI chat — asks follow-up questions to enrich stories.                                                         |
| `AudioVisualizer/`                | Audio waveform visualization during voice recording (particles, config).                                                 |
| `BookOrder.jsx`                   | Print book order form — address, format, quantity.                                                                       |
| `BookOrderWizard.jsx`             | Multi-step book ordering flow — cover, format, shipping, payment.                                                        |
| `BookPreview.jsx`                 | Visual book mockup showing the user's memoir as a 3D book.                                                               |
| `ChapterIllustration.jsx`         | AI-generated chapter header image display with unlock animation.                                                         |
| `CompletionCertificate.jsx`       | Congratulations certificate when all chapters are complete.                                                              |
| `CookieConsent.jsx`               | GDPR cookie consent banner.                                                                                              |
| `CoverEditor.jsx`                 | Drag-and-drop book cover designer — title, photo, template selection.                                                    |
| `ExportModal.jsx`                 | Export format picker modal — EPUB, PDF, print options.                                                                   |
| `HelpChatbot.jsx`                 | Floating help chatbot in the corner — AI-powered support.                                                                |
| `HowItWorksCarousel.jsx`          | Animated carousel showing the memoir creation steps (used on landing pages).                                             |
| `ImageUnlockAnimation.jsx`        | Celebration animation when a chapter image is generated.                                                                 |
| `MemoryMap.jsx`                   | Visual graph of the user's memory entities and relationships.                                                            |
| `MemoryTriggers.jsx`              | Contextual prompts that help users remember more details while answering.                                                |
| `OnboardingModal.jsx`             | Post-signup onboarding flow — preferences, first prompt, getting started.                                                |
| `ProgressCard.jsx`                | Chapter progress card showing completion percentage and encouragement.                                                   |
| `PromptCompletionCelebration.jsx` | Confetti/animation when user completes a daily prompt.                                                                   |
| `ProtectedRoute.jsx`              | Route wrapper that redirects to login if user isn't authenticated.                                                       |
| `QuestionCard.jsx`                | Individual question card within a chapter — text input, voice record, AI help.                                           |
| `StylePreviewModal.jsx`           | Side-by-side comparison of writing styles applied to user's story.                                                       |
| `StyleSelector.jsx`               | Writing style picker — formal, warm, poetic, etc.                                                                        |
| `TelegramLinkModal.jsx`           | Modal to link user's Telegram account for answering prompts via Telegram.                                                |
| `TourOverlay.jsx`                 | First-time user guided tour highlighting key features.                                                                   |
| `UpgradeModal.jsx`                | Premium upgrade prompt — shows benefits and payment CTA.                                                                 |
| `onboarding/`                     | Onboarding sub-components: `OnboardingComplete`, `OnboardingTypeForm`, `OnboardingVoiceInterview`, `PreferenceSelector`. |

### `context/` — React Context Providers

| File                  | What it does                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `AuthContext.jsx`     | Global auth state — current user, login/logout functions, token management. Wraps the entire app. |
| `SettingsContext.jsx` | User preferences — speaking pace, voice selection, UI settings. Persists across sessions.         |

### `hooks/` — Custom React Hooks

| File            | What it does                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `useApi.js`     | Authenticated API caller — automatically attaches JWT token, handles 401 redirects, provides loading/error state. |
| `usePremium.js` | Returns whether the current user has an active premium subscription.                                              |

### `data/` — Static Data

| File                | What it does                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `chapters.js`       | Chapter definitions — IDs, titles, questions, descriptions. Defines the memoir structure. |
| `coverTemplates.js` | Book cover design templates — layouts, color schemes, typography options.                 |
| `styleOptions.js`   | Writing style definitions — tone, voice, example text for each style.                     |

---

## Mobile App — `apps/mobile/`

React Native Expo app (iOS/Android/Web). Entry point: `apps/mobile/App.tsx`

### `screens/` — App Screens

| File                          | What it does                                                       |
| ----------------------------- | ------------------------------------------------------------------ |
| `HomeScreen.tsx`              | Dashboard — daily prompt, streak, chapter progress, quick actions. |
| `LoginScreen.tsx`             | Authentication screen.                                             |
| `ChaptersDashboardScreen.tsx` | All chapters overview with completion status.                      |
| `ChapterScreen.tsx`           | Single chapter with its questions.                                 |
| `VoicePromptScreen.tsx`       | Voice recording interface with animated waveform.                  |
| `TextInputScreen.tsx`         | Text-based answer input for a question.                            |
| `QuickMemoScreen.tsx`         | Free-form voice memo recording (not tied to a question).           |
| `MemosListScreen.tsx`         | List of saved voice memos.                                         |
| `MemoReviewScreen.tsx`        | Memo playback, transcription review, and editing.                  |
| `AIAssistantScreen.tsx`       | AI chat for getting help with story ideas and follow-ups.          |
| `ReviewScreen.tsx`            | Story review and editing before finalizing.                        |
| `CelebrationScreen.tsx`       | Achievement unlock celebration with confetti.                      |
| `HistoryScreen.tsx`           | Timeline view of all completed stories.                            |
| `CollectionsScreen.tsx`       | Achievement collection browsing.                                   |
| `ProfileScreen.tsx`           | User settings, account management, data export.                    |

### `components/` — Mobile UI Components

| File                      | What it does                                           |
| ------------------------- | ------------------------------------------------------ |
| `AnimatedButton.tsx`      | Button with Lottie animation feedback.                 |
| `GlowingVoiceButton.tsx`  | Large animated record button with pulsing glow effect. |
| `ConfettiExplosion.tsx`   | Celebration confetti particle animation.               |
| `MemoryTriggersSheet.tsx` | Bottom sheet with contextual memory prompts.           |
| `StreakBadge.tsx`         | Streak count display with fire icon.                   |
| `SkeletonLoader.tsx`      | Skeleton loading placeholder states.                   |
| `Icons.tsx`               | Custom icon component library.                         |

### `context/` — State Management

| File              | What it does                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `AuthContext.tsx` | Authentication state, session persistence via AsyncStorage.      |
| `GameContext.tsx` | Gamification state — streaks, achievements, daily prompt status. |

### `hooks/` — Custom Hooks

| File                  | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `useVoiceRecorder.ts` | Expo AV voice recording with start/stop/pause, audio levels. |
| `useAIAssistant.ts`   | AI chat integration — sends messages, receives AI responses. |

---

## Shared Packages — `packages/shared/`

| File              | What it does                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `chapters.js`     | Chapter and question definitions shared between web, mobile, and API. Single source of truth. |
| `styleOptions.js` | Writing style options shared between web and mobile.                                          |

---

## Scripts — `tools/scripts/`

| File                  | What it does                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `validate-build.js`   | Post-build verification — checks dist exists, no secrets leaked into bundle, file sizes reasonable. |
| `check-secrets.sh`    | Scans codebase for accidentally committed secrets (API keys, passwords).                            |
| `create-test-user.js` | Creates a test user account in the database for development.                                        |

---

## Docs — `docs/`

| Folder           | What it contains                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `business/`      | Business plan, financial projections, market analysis.                                         |
| `planning/`      | Feature specs and roadmaps — mobile app, memory quest game, audio recording, refactoring plan. |
| `guides/`        | Operational guides — deployment checklist, QA testing procedures.                              |
| `archive/tasks/` | Old implementation task breakdowns (completed, kept for reference).                            |

---

## Tech Stack

| Layer            | Technology                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| **Web Frontend** | React 18, Vite, TailwindCSS, React Router 6                                 |
| **Mobile**       | React Native, Expo, TypeScript, React Navigation                            |
| **Backend**      | Node.js, Express 4, ES Modules                                              |
| **Database**     | PostgreSQL (Supabase/Neon cloud)                                            |
| **AI**           | Grok (xAI) for conversation & text, Replicate for images                    |
| **Voice**        | Fish.audio (TTS/audiobook), Telnyx (phone calls), xAI Realtime (live voice) |
| **Payments**     | Stripe (checkout, webhooks, subscriptions)                                  |
| **Print**        | Lulu API (print-on-demand books)                                            |
| **Email**        | Resend (transactional emails)                                               |
| **Auth**         | JWT + Google OAuth + Magic Links                                            |
| **Deploy**       | Railway or Render (Node.js + static hosting)                                |

---

## NPM Scripts

```bash
npm run dev              # Run API + web client together
npm run server           # API only (port 3001)
npm run client           # Web client only (port 5173)
npm run build            # Production build (web + validation)
npm run test             # Run all API tests
npm run test:auth        # Auth tests only
npm run test:integration # Integration tests only
npm run lint             # Lint server + client
npm run format           # Prettier format all files
```

---

## Known Issues & Improvement Notes

### Security

- **Rotate Google OAuth secret** — the client secret was previously exposed in a standalone JSON file at the project root. Rotate it in Google Cloud Console immediately.
- **CSRF protection** is not implemented for state-changing web form requests.
- **Email rate limiting** is missing — no cap on emails sent per user per hour in `emailService.js`.
- **File upload validation** in `routes/photos.js` should validate image dimensions and run virus scanning.

### Performance & Scalability

- **No Redis caching** — frequently accessed data (chapters, prompts, entities) is queried from PostgreSQL every time. Add Redis for high-traffic read paths.
- **AI calls are synchronous** — `grokService.js` blocks the request thread for 5+ seconds. Move to a background job queue (e.g., BullMQ) for image generation and long AI operations.
- **Database connection pool** is set to 20 max. For production scale, increase to 50-100 or add PgBouncer.
- **N+1 queries** in `storyRepository.js` — fetching stories with photos and entities makes sequential queries instead of JOINs.
- **No query timeouts** — slow queries can hang indefinitely. Set `statement_timeout` in PostgreSQL config.

### Reliability

- **No soft deletes** — `ON DELETE CASCADE` means deleted data is gone forever. Add `deleted_at` columns for recoverable deletion.
- **Game state race conditions** — `gameStateManager.js` doesn't wrap streak updates in database transactions. Concurrent requests could corrupt state.
- **No automated backups** — no documented backup/restore process for the PostgreSQL database.
- **Missing routes without auth middleware** — `routes/game.js`, `routes/notifications.js`, and `routes/user.js` are registered without `authenticateToken` middleware in `index.js` (lines 277-283). Verify these routes handle auth internally or add the middleware.

### Code Quality

- **Test email endpoint in production** — `index.js` line 182 has a `/api/test-email` endpoint that's only guarded by a `NODE_ENV` check. Remove for production builds.
- **Landing voice session endpoint** — `index.js` line 205 is an inline route handler that should be extracted to a proper route file.
- **Large route files** — `routes/ai.js` and `routes/stories.js` mix business logic with HTTP handling. Extract to service layer.
- **Magic strings** — model names like `'grok-3-mini-beta'` and chapter IDs like `'earliest-memories'` are scattered in code. Extract to a constants file.

### Missing Features for Scale

- **No API documentation** — add OpenAPI/Swagger spec for the 24 API endpoints.
- **No APM/monitoring** — integrate Sentry for error tracking and DataDog/New Relic for performance monitoring.
- **No offline support** — web app requires internet. Service Workers would enable offline story writing.
- **No database schema diagram** — visualize the 30+ table schema with dbdocs.io or Mermaid diagrams.

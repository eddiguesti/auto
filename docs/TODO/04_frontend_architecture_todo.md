# Frontend Architecture TODO

**Date:** 2026-04-02
**Project:** Easy Memoir

All tasks are concrete and actionable. File paths are exact.

---

## 1. Route Structure Cleanup

### Split App.jsx into feature-based route files

- [ ] Create `apps/web/src/routes/authRoutes.jsx` — contains Login, Register, ForgotPassword, ResetPassword, VerifyEmail routes
- [ ] Create `apps/web/src/routes/appRoutes.jsx` — contains all protected app routes (Home, Chapter, Export, VoiceChat, Settings, etc.)
- [ ] Create `apps/web/src/routes/adminRoutes.jsx` — contains Dashboard, Users, UserDetail, Payments admin routes; wraps in `<AdminRoute>`
- [ ] Create `apps/web/src/routes/marketingRoutes.jsx` — contains all public marketing pages (Landing, Pricing, Blog, About, FAQ, etc.)
- [ ] Refactor `apps/web/src/App.jsx` to compose the four route subtrees, retaining only the router shell and global providers
- [ ] Verify all existing route paths still resolve after split
- [ ] Verify `<ProtectedRoute>` is applied consistently across all app routes — not selectively per route

### Canonicalize Landing Pages

- [ ] Identify which landing page is the production route at `/` — document in a comment at the top of `marketingRoutes.jsx`
- [ ] Move `apps/web/src/pages/Landing.jsx` (older design) to `apps/web/src/pages/experiments/Landing_v1.jsx` or delete if unused
- [ ] Move `apps/web/src/pages/FacebookLanding.jsx` to `apps/web/src/pages/experiments/FacebookLanding.jsx`
- [ ] Remove dead routes from App.jsx that point to inactive landing page variants
- [ ] Schedule deletion of experiment pages after confirming they receive no traffic

---

## 2. Server-State Management (React Query)

### Install and configure React Query

- [ ] Add `@tanstack/react-query` and `@tanstack/react-query-devtools` to `apps/web/package.json`
- [ ] Create `apps/web/src/lib/queryClient.js` — configure `QueryClient` with defaults: `staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`, `retry: 1`
- [ ] Wrap `<App>` in `<QueryClientProvider>` in `apps/web/src/main.jsx`
- [ ] Add `<ReactQueryDevtools>` in development mode only

### Replace manual data fetching in key pages

- [ ] Refactor `apps/web/src/pages/Home.jsx`: replace `useEffect`+`useState` data fetching with `useQuery(['dashboard', userId], fetchDashboard)`
- [ ] Refactor `apps/web/src/pages/Chapter.jsx`: replace fetch logic with `useQuery(['chapter', chapterId, 'stories'], fetchChapterStories)`
- [ ] Refactor `apps/web/src/pages/Settings.jsx`: replace fetch logic with `useQuery(['user', userId], fetchUserProfile)`
- [ ] Create `apps/web/src/features/memoir/queries/storyQueries.js` — exports `useChapterStories`, `useStoryById` query hooks
- [ ] Create `apps/web/src/features/memoir/queries/storyMutations.js` — exports `useSaveStory`, `useDeleteStory` mutation hooks with cache invalidation
- [ ] Create `apps/web/src/features/game/queries/gameQueries.js` — exports `useGameState`, `useAchievements` query hooks
- [ ] Create `apps/web/src/features/payments/queries/paymentQueries.js` — exports `usePremiumStatus`, `usePaymentHistory`

### Define query key conventions

- [ ] Create `apps/web/src/lib/queryKeys.js` — export typed query key factory:
  ```js
  export const queryKeys = {
    stories: { all: ['stories'], chapter: id => ['stories', 'chapter', id] },
    game: { state: ['game', 'state'], achievements: ['game', 'achievements'] },
    user: { profile: id => ['user', id] },
    payments: { status: ['payments', 'status'] }
  }
  ```

---

## 3. Shared Package — Eliminate Data Duplication

- [ ] Delete `apps/web/src/data/chapters.js` — confirm `packages/shared/chapters.js` is the canonical version
- [ ] Delete `apps/web/src/data/styleOptions.js` if it duplicates `packages/shared/styleOptions.js`
- [ ] Delete `apps/web/src/data/voiceConfig.js` if it duplicates `packages/shared/voiceConfig.js`
- [ ] Update all imports in `apps/web/src/` that reference `../data/chapters` to use `@lifestory/shared`
- [ ] Add an ESLint rule (no-restricted-imports) that flags any import of `src/data/chapters`, `src/data/styleOptions`, `src/data/voiceConfig`
- [ ] Verify `packages/shared` is properly listed in `apps/web/package.json` workspace dependencies

---

## 4. Component Architecture

### Component boundary cleanup

- [ ] Audit `apps/web/src/pages/Chapter.jsx` for co-located business logic — extract AI interaction logic into `apps/web/src/features/memoir/hooks/useChapterAI.js`
- [ ] Audit `apps/web/src/pages/Export.jsx` — separate export orchestration logic from render; create `apps/web/src/features/export/hooks/useExportFlow.js`
- [ ] Audit `apps/web/src/pages/Home.jsx` — extract streak/gamification display into `apps/web/src/features/game/components/DashboardGamePanel.jsx`
- [ ] Ensure `apps/web/src/components/AIAssistant.jsx` has no direct API calls — all fetches via a hook

### Three.js / BookPreview code splitting

- [ ] Verify `apps/web/src/components/BookPreview.jsx` is imported via `React.lazy()` at its usage site in `apps/web/src/pages/Export.jsx`
- [ ] If not, convert the import: `const BookPreview = React.lazy(() => import('../components/BookPreview'))`
- [ ] Wrap usage in `<Suspense fallback={<BookPreviewSkeleton />}>`
- [ ] Run `vite build` and confirm Three.js is in a separate named chunk (check `dist/assets/`)
- [ ] Add `bundlesize` or `vite-bundle-visualizer` to CI to catch regressions

### Consolidate skeleton/loading states

- [ ] Audit all pages for inconsistent loading patterns (mix of `if (loading) return <Spinner>` and React Query `isLoading`)
- [ ] Standardize: all data-loading pages use React Query `isLoading`/`isFetching` states
- [ ] Ensure `apps/web/src/components/Skeletons/` has skeletons for Chapter, Home, and Settings pages

---

## 5. Form Handling

- [ ] Audit `apps/web/src/pages/Register.jsx` — ensure all validation is schema-based (Zod or yup) not ad-hoc `if` checks
- [ ] Audit `apps/web/src/pages/Login.jsx` — same
- [ ] Consider adopting `react-hook-form` for multi-field forms in Settings and BookOrder to reduce controlled-input boilerplate
- [ ] Ensure form validation error messages match backend validation error messages (consistent user experience)

---

## 6. API Client Layer

- [ ] Create `apps/web/src/lib/apiClient.js` — thin wrapper around `useApi` / `authFetch` that:
  - Accepts a base URL from config
  - Attaches Authorization header
  - Returns typed responses
  - Throws typed errors (not generic `Error`)
- [ ] Replace ad-hoc `fetch(API_URL + '/...')` calls in pages with `apiClient.get()` / `.post()` / `.patch()` / `.delete()`
- [ ] Export domain-specific client functions: `storiesApi.save(data)`, `storyApi.getChapter(id)`, etc.

---

## 7. Accessibility & SEO

- [ ] Audit `apps/web/src/components/OnboardingModal.jsx` — ensure `useFocusTrap` is applied and `aria-modal="true"` is set
- [ ] Audit all modals for consistent focus trap usage (`apps/web/src/hooks/useFocusTrap.js` exists — verify it's applied everywhere)
- [ ] Ensure `apps/web/src/components/SEO.jsx` sets canonical URL, og:image, and og:description on all marketing pages
- [ ] Verify React Router scroll restoration is configured (scroll to top on route change)

---

## 8. Dead Code and Maintenance

- [ ] Remove `apps/web/src/pages/Landing.jsx` if `LandingDesign1.jsx` is confirmed canonical
- [ ] Audit `apps/web/src/components/` for any components not referenced in any page — delete them
- [ ] Move `apps/web/src/data/blogPosts.js` content to markdown files in `apps/web/src/content/blog/` or to a DB-backed endpoint; remove JS file
- [ ] Review `apps/web/src/pages/Compare.jsx` — if this is a live page, ensure it's in the route config; if not, delete it

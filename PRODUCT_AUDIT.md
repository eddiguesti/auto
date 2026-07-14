# Easy Memoir — Holistic Product Audit

_Date: 14 July 2026. Scope: entire monorepo (web app, API, worker, mobile, shared, loose files)._
_State at audit: production build ✓, all 18 tests ✓, ESLint 0 errors ✓, no dead internal links ✓, full "Keepsake" redesign applied (uncommitted)._

---

## 1. The product, in one sentence

Seniors capture life memories by writing, talking, or receiving a phone call; the
AI (Clio) turns them into polished chapters; the family buys the printed book.

Every screen should serve one of those three jobs: **capture → polish → keepsake**.
The sections below are judged against that.

---

## 2. Section-by-section verdicts

### ✅ Core product (keep — this is the business)

| Section                              | Purpose                                    | Verdict                         |
| ------------------------------------ | ------------------------------------------ | ------------------------------- |
| `/home`                              | Daily hub: progress + capture actions      | Keep. Now the strongest screen. |
| `/chapter/:id` + review              | Guided writing + AI polish                 | Keep. Core loop.                |
| `/quick-story`                       | Freeform capture                           | Keep.                           |
| `/voice`, `/call-me`, `/talk/:token` | Voice capture modalities                   | Keep — key differentiator.      |
| `/photo`                             | Photo → memory prompts                     | Keep.                           |
| ExportModal (+ BookOrderWizard)      | Style / eBook / audiobook / print purchase | Keep — the monetization moment. |
| `/settings`                          | Account, preferences                       | Keep.                           |
| Auth pages                           | —                                          | Keep.                           |
| Admin (`/admin/*`)                   | Internal ops                               | Keep.                           |
| Legal pages                          | Compliance                                 | Keep.                           |
| `services/api`                       | Full backend (34 route modules)            | Keep.                           |
| `services/worker`                    | Background jobs (audiobook, EPUB, cron)    | Keep.                           |

### 🔴 Delete — verified dead code (no imports anywhere, static or lazy)

All pre-date the redesign; none are reachable from any screen:

1. **`src/components/BookPreview.jsx` + `BookPreview.styles.js` + `src/hooks/useBookRenderer.js` + `src/utils/bookRenderer/` (9 files) + the `three` dependency + the `three-vendor` chunk in `vite.config.js`** — an entire 3D book renderer nothing renders. Removing it drops a whole vendor bundle and ~115 kB of dependency surface.
2. **`src/components/BookOrder.jsx`** (500 lines) — superseded by `BookOrderWizard.jsx`, which is what ExportModal and the Export page actually use.
3. **`src/components/ProgressCard.jsx`** — old dashboard card, replaced by the Home progress ring.
4. **`src/components/MemoryMap.jsx`** — visualization never mounted.
5. **`src/components/TourOverlay.jsx`** (541 lines) — guided tour never triggered; onboarding modal covers this job.
6. **Root-level prototypes** (outside the repo, in `Steve Auto/`): `book-3d.html`, `book-alt.html`, `spine-test.html`, `flipbook-demo-3d.html`, `threejs-book-best-practices.md`, plus the stray root `package.json`/`package-lock.json`/`node_modules` (playwright only). These were experiments for the 3D book; the repo has its own Playwright setup.

### 🟠 Duplicates — pick one, delete the other

7. **Three landing pages.** `/` serves `LandingDesign1`, `/landing-original` preserves `Landing`, `/welcome` is the paid-ads variant (`FacebookLanding`).
   - Recommendation: keep **`Landing.jsx` and promote it to `/`** — it's modular (composes the 8 redesigned `marketing/` section components), 30% smaller than before, and easiest to maintain. Keep `/welcome` for ad campaigns. Delete `LandingDesign1.jsx` (841 self-contained lines duplicating the same message).
   - If conversion data says LandingDesign1 wins, do the reverse — but keep exactly one canonical landing.
8. **Two export surfaces.** The `/export` page is unreachable — no link or navigation anywhere points to it; Home's "Preview your book" opens `ExportModal`, which does everything the page does (style, eBook, audiobook, print via the same wizard).
   - Recommendation: delete `pages/app/Export.jsx` + its route + `useExport`'s `successPath: '/export'` remnant, or (if a full-page canvas is preferred for this payoff moment) re-link the page from Home and delete the modal. One surface, not two.
9. **Three copies of the memoir questions.** `apps/web/src/data/chapters.js` (230 questions, the real one) has fully diverged from `packages/shared/chapters.js` (stale skeleton), while mobile reads from shared. `styleOptions.js` already does this correctly (web re-exports from shared).
   - Recommendation: move the web version into `packages/shared/chapters.js`, make `src/data/chapters.js` a re-export, and let mobile consume the same source. Otherwise web and mobile will interview users with different questions.

### 🟡 Half-built features — wire them or remove them (decision needed)

10. **Gamification.** Backend `routes/game/` + `gameStateManager.js` + web `features/game/` (queries + a redesigned `DashboardGamePanel` showing streak/level) + mobile `GameProvider` — but the web panel is never rendered.
    - Cheapest win in the codebase: one import + one line in `Home.jsx` puts streaks on the dashboard. Otherwise delete the web `features/game/` folder. Recommendation: **wire it** — streaks measurably drive the daily-capture habit this product depends on.
11. **Telegram channel.** Onboarding's ChannelSelector offers Telegram, backend `telegram.js` exists, but `TelegramLinkModal` (the account-linking UI) is never shown anywhere — a user who picks Telegram has no way to complete the link from the web app.
    - Recommendation: either surface the link flow (Settings → Preferences row + after onboarding channel pick) or remove the Telegram option from ChannelSelector until the loop is closed. A visible dead-end in onboarding is the worst of both.
12. **Completion celebrations.** `CompletionCertificate.jsx` (print-ready certificate) and `ImageUnlockAnimation.jsx` are polished, redesigned… and never triggered.
    - Recommendation: trigger `CompletionCertificate` when the final chapter hits 100% — it's exactly the emotional payoff this product should have. Delete `ImageUnlockAnimation` (its unlock-reveal job overlaps with `ChapterIllustration`).
13. **Mobile app (`apps/mobile`).** A real Expo skeleton (navigation, auth + game contexts, chapter screens) — not dead, but far behind web and silently diverging (see item 9).
    - Recommendation: explicitly park it (README note, exclude from CI) or resource it. Half-maintained mobile is a liability, not an asset.

### 🔧 Small fixes worth doing regardless

14. **ESLint config gap**: the flat config lacks `react/jsx-uses-vars` (add `eslint-plugin-react`'s rule or preset). Today every JSX-used import is a false "unused" warning (~500 across the repo), which means _real_ unused imports are invisible.
15. **`/compare` has zero internal links** — it's SEO-only. Fine, but add it to the footer's link columns so it isn't an island.
16. **Commit the redesign.** The entire Keepsake redesign (~70 files) is sitting uncommitted on top of `8421f5a`. Commit it as a unit before touching anything above, so every deletion in this audit is independently revertable.

---

## 3. Recommended execution order

1. **Commit the redesign** (safety point).
2. **Zero-risk deletions** — items 1–6 (dead code + prototypes). No user-visible change; big dependency/bundle cleanup.
3. **Quick wires** — item 10 (game panel on Home), item 12 (certificate on completion), item 15 (footer link).
4. **Consolidations** — item 8 (one export surface), item 7 (one landing page), item 9 (one chapters source).
5. **Decisions needing product input** — item 11 (Telegram: finish or hide), item 13 (mobile: park or invest).
6. **Tooling** — item 14 (ESLint rule), then a lint sweep to catch genuinely unused imports.

Net effect if fully executed: ~4,500 lines and one heavyweight dependency removed,
zero dead ends in the user journey, every remaining screen mapped to
capture → polish → keepsake, and two currently-invisible delight/retention
features (streaks, certificate) actually reaching users.

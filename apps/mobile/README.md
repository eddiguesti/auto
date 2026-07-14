# Easy Memoir — Mobile App (PARKED)

> **Status: parked, not maintained.** (Decision recorded in `../../PRODUCT_AUDIT.md`,
> July 2026.) The web app is the product; this Expo skeleton is kept for a future
> native push but receives no updates and is excluded from day-to-day work.

Before resuming work here:

1. **Chapters data has moved.** The canonical chapter/question definitions now
   live in `packages/shared/chapters.js` (the web app re-exports them). This
   app's local copy at `src/data/chapters.ts` predates that and has diverged —
   replace it with an import from the shared package before shipping anything.
2. The web app's design system ("Keepsake") is documented in
   `apps/web/DESIGN.md` — mirror its tokens (ink/bronze/parchment palette,
   Boska/Lora/General Sans) for visual parity.
3. The "app" channel option was removed from web onboarding
   (`ChannelSelector.jsx`) until this app ships — re-add it when it does.

To run anyway: `npm install && npx expo start` from this directory.

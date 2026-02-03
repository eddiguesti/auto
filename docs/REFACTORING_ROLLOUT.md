# Refactoring Rollout Plan

## Overview
This refactoring improves code readability without changing user-visible behavior. All changes preserve existing API contracts and UI output.

---

## Phase 1: Verify Changes Locally

```bash
cd life-story/server
npm test  # Run existing tests
npm run lint  # Check for syntax errors
```

## Phase 2: Review Key Diffs

### New Services (no behavioral changes, just extraction)
- `server/services/grokService.js` - Grok API wrapper
- `server/services/entityExtractionService.js` - Entity extraction logic
- `server/utils/storyRepository.js` - Story query helpers

### Route Changes (middleware additions only)
- `server/routes/auth.js` - Added `requireDb` middleware (same 503 response)
- `server/routes/telegram.js` - Added `requireDb` middleware (same 503 response)

### Route Refactors (implementation swapped, same behavior)
- `server/routes/ai.js` - Uses grokService instead of direct client
- `server/routes/memory.js` - Uses entityExtractionService
- `server/routes/stories.js` - Uses entityExtractionService + storyRepository
- `server/routes/onboarding.js` - Uses grokService
- `server/routes/style.js` - Uses grokService
- `server/routes/export.js` - Uses storyRepository

---

## Phase 3: Staged Deployment

### Stage 1: Deploy to Staging
```bash
git add -A
git commit -m "Refactor: Extract services for Grok, entity extraction, and story queries

- Create grokService.js for centralized Grok API calls
- Create entityExtractionService.js with optimized batch operations
- Create storyRepository.js for common story+photos queries
- Add requireDb middleware consistently to auth and telegram routes
- No behavioral changes, all API contracts preserved

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### Stage 2: Smoke Tests on Staging
1. **Auth flows**: Register, login, Google OAuth, profile update
2. **AI features**: Interview mode, story writing
3. **Entity extraction**: Save a story, verify entities extracted
4. **Export**: Generate EPUB with photos
5. **Style transfer**: Preview and apply styles

### Stage 3: Production Deploy
- Deploy during low-traffic hours
- Monitor error rates for 30 minutes
- If errors spike, rollback immediately

---

## Verification Checklist

- [ ] All existing tests pass
- [ ] No new console errors in browser
- [ ] Auth endpoints return same responses
- [ ] AI interview/write flows work
- [ ] Entity extraction still populates memory graph
- [ ] EPUB export includes photos
- [ ] Style preview/apply works

---

## Rollback Plan

If issues arise:
```bash
git revert HEAD  # Revert the commit
git push origin main
```

All changes are additive (new files) or replacement (same interfaces), so rollback is clean.

---

## Future Work (Phase 5-6)

These phases can be done separately for reduced risk:

### Phase 5: File Decomposition
- Split `game.js` (1851 lines) into modular structure
- Split `CoverEditor.jsx` (1442 lines) into components
- Split `BookOrder.jsx` (1053 lines) into components
- Split `telegram.js` (753 lines) into modular structure

### Phase 6: Naming & JSDoc
- Improve variable names in `game.js`
- Add JSDoc types to `gameStateManager.js`, `validate.js`

These are lower priority and can be done incrementally.

# TODO 4: Performance & Bundle Optimization

**Priority:** HIGH - Do after todo3
**Agent type:** frontend / performance
**Estimated time:** 1-2 days
**Score impact:** Performance 5/10 -> 8/10
**Depends on:** todo3 (tests catch regressions)

## Context

Current state:

- Main bundle: 278KB (should be <150KB)
- Home chunk: 177KB (should be <80KB)
- chapters data: 61KB in one chunk
- CSS: 113KB (verify purge working)
- No image optimization
- No font-display strategy
- Missing useMemo/useCallback on expensive computations

Target audience is seniors, often on slower connections. Performance directly impacts conversion and trust.

## Tasks

### 4.1 Analyze Bundle Composition

**Action:**

1. Install bundle analyzer:

```bash
cd apps/web && npm install -D rollup-plugin-visualizer
```

2. Add to `vite.config.js`:

```javascript
import { visualizer } from 'rollup-plugin-visualizer'

// In plugins array (only in analyze mode):
...(process.env.ANALYZE ? [visualizer({ open: true, gzipSize: true })] : [])
```

3. Run analysis:

```bash
ANALYZE=true npm run build
```

4. Document what's in the 278KB main bundle. Likely culprits:
   - Three.js (150KB+) if not properly code-split
   - Framer Motion (50KB+)
   - Full @tabler/icons-react set instead of individual imports
   - Sentry

Record findings before optimizing.

### 4.2 Code-Split Three.js / BookPreview

**Files:** `apps/web/src/components/BookPreview.jsx`, `apps/web/src/App.jsx`

**Problem:** Three.js (~150KB) likely in the main bundle or Home chunk, loading for every user even if they never view book preview.

**Action:**

1. Ensure BookPreview is lazy-loaded (it should be via React.lazy, but verify it's not imported eagerly by Home.jsx or other components)
2. Add Three.js to a separate chunk in vite.config.js:

```javascript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['@react-oauth/google', '@tabler/icons-react'],
  'three-vendor': ['three']  // Add this
}
```

3. Verify BookPreview.jsx is only loaded when user navigates to export/preview
4. If Home.jsx eagerly imports BookPreview, change to lazy import with Suspense

**Verification:** `three` is in its own chunk. Main bundle reduced by 100KB+.

### 4.3 Optimize Icon Imports

**Problem:** `@tabler/icons-react` may be bundling all icons. Individual imports are much smaller.

**Action:**

1. Search for how icons are imported:

```bash
grep -r "from '@tabler/icons-react'" apps/web/src/ | head -20
```

2. If using barrel import (`import { IconX, IconY } from '@tabler/icons-react'`), check if tree-shaking works. If not, switch to individual imports:

```javascript
// Before
import { IconCheck, IconX } from '@tabler/icons-react'
// After (if tree-shaking fails)
import { IconCheck } from '@tabler/icons-react/dist/esm/icons/IconCheck'
import { IconX } from '@tabler/icons-react/dist/esm/icons/IconX'
```

3. If Tabler icons tree-shake properly, no change needed

**Verification:** Bundle size of ui-vendor chunk measured before and after.

### 4.4 Lazy-Load Heavy Components in Home Page

**File:** `apps/web/src/pages/app/Home.jsx` (177KB chunk)

**Problem:** Home page loads all modals and heavy components eagerly.

**Action:**

1. Identify components imported at the top of Home.jsx
2. Lazy-load these with React.lazy + Suspense:
   - ExportModal (27KB source)
   - UpgradeModal (10KB)
   - OnboardingModal (14KB)
   - TourOverlay (18KB)
   - BookPreview (45KB)
   - Any other heavy component only shown conditionally

```javascript
const ExportModal = lazy(() => import('../components/ExportModal'))
const UpgradeModal = lazy(() => import('../components/UpgradeModal'))
// etc.
```

3. Wrap in Suspense with minimal fallback (modals don't need loading indicators)

**Verification:** Home chunk drops below 80KB. Modals still work when triggered.

### 4.5 Split Chapters Data

**File:** `apps/web/src/data/chapters.js` (61KB in bundle)

**Problem:** All chapter/question definitions ship as a single 61KB chunk, loaded by many pages.

**Action:**
Option A (simpler): Keep the file but ensure it's in a shared chunk that's cached:

```javascript
// vite.config.js manualChunks
'app-data': ['./src/data/chapters', './src/data/styleOptions']
```

Option B (better): Fetch chapter data from the API on demand:

- The backend already has `/api/chapters` or similar
- Replace static import with `useFetch('/api/chapters')` on pages that need it
- Cache the response with a long TTL

Choose Option A for now (lower risk). Option B is for Phase 4 (architecture).

**Verification:** chapters data is in its own cached chunk or loaded on demand.

### 4.6 Add Font Loading Strategy

**File:** `apps/web/index.html` and/or `apps/web/src/index.css`

**Action:**

1. Add `font-display: swap` to all @font-face declarations
2. Add preconnect hints in index.html:

```html
<link rel="preconnect" href="https://api.fontshare.com" crossorigin />
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

3. Define fallback font stacks in tailwind.config.js:

```javascript
fontFamily: {
  display: ['Boska', 'Georgia', 'Times New Roman', 'serif'],
  body: ['Lora', 'Georgia', 'serif'],
  sans: ['General Sans', 'system-ui', '-apple-system', 'sans-serif']
}
```

**Verification:** No FOUT visible on slow 3G throttle (Chrome DevTools). Fonts swap in smoothly.

### 4.7 Add Performance Memoization

**Files:** Multiple frontend components

**Action:**

1. **BookPreview.jsx** - Memoize `buildPageContents()`:

```javascript
const pageContents = useMemo(() => buildPageContents(stories, cover), [stories, cover])
```

2. **BookOrder.jsx** - Wrap `calculateCost` in useCallback:

```javascript
const calculateCost = useCallback(async () => {
  // ...existing logic
}, [config, shipping.countryCode, options])
```

3. **BookOrder.jsx** - Fix stale useEffect deps (line 348):

```javascript
useEffect(() => {
  if (options) calculateCost()
}, [options, calculateCost]) // Add options, use calculateCost ref
```

4. **BookOrderWizard.jsx** - Memoize price calculation:

```javascript
const pricing = useMemo(
  () => calculatePricing(selectedFormat, selectedPackage, includeAudiobook),
  [selectedFormat, selectedPackage, includeAudiobook]
)
```

**Verification:** React DevTools Profiler shows fewer wasted renders on BookOrder and BookPreview pages.

### 4.8 Add Static Asset Caching Headers

**File:** `services/api/index.js`

**Action:** Verify cache headers are properly set:

1. Hashed assets (`/assets/xxx-hash.js`): `Cache-Control: max-age=31536000, immutable` (should already be set)
2. `index.html`: `Cache-Control: no-cache, must-revalidate` (should already be set)
3. Images, fonts: `Cache-Control: max-age=86400, stale-while-revalidate=604800`

Check that the middleware in index.js correctly distinguishes between hashed and unhashed assets.

**Verification:** DevTools Network tab shows correct cache headers. Repeat visits don't re-download hashed assets.

## Definition of Done

- [ ] Bundle analysis completed and documented
- [ ] Three.js in separate chunk, main bundle < 150KB
- [ ] Home page chunk < 80KB
- [ ] Heavy modals lazy-loaded
- [ ] Icon imports optimized
- [ ] Font loading strategy implemented
- [ ] Performance memoization added to heavy components
- [ ] No visual regressions (check BookPreview, BookOrder, Home)
- [ ] All tests still pass

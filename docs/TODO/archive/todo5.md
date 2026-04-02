# TODO 5: Frontend Refactoring

**Priority:** MEDIUM - Do after todo4
**Agent type:** code-reviewer / frontend
**Estimated time:** 2-3 days
**Score impact:** Code Quality 5/10 -> 7/10
**Depends on:** todo3 (tests catch regressions), todo4 (bundle already optimized)

## Context

Multiple frontend components exceed 800 lines and contain 50+ line functions.
VoiceChat.jsx has race conditions. BookPreview.jsx has a 358-line function.
This phase refactors the highest-risk components while maintaining functionality.

**Rule:** No file over 500 lines after this phase. No function over 50 lines.

## Tasks

### 5.1 Refactor VoiceChat.jsx - Extract useVoiceSession Hook

**File:** `apps/web/src/pages/app/VoiceChat.jsx` (858 lines)

**Problem:** 15 useRef hooks, WebSocket race conditions, memory leaks, 196-line `connect()` function, 8-level nesting in `ws.onmessage`.

**Action:**

1. Create `apps/web/src/hooks/useVoiceSession.js` containing:
   - WebSocket connection management
   - Audio queue management (replace mutable array.shift() with immutable queue)
   - Recording start/stop
   - Session state machine
   - Cleanup via AbortController

```javascript
// Hook signature:
export function useVoiceSession({ chapterId, questionId, onTranscript, onAiResponse, onError }) {
  // Returns:
  return {
    status, // 'idle' | 'connecting' | 'active' | 'speaking' | 'error'
    connect,
    disconnect,
    startRecording,
    stopRecording,
    isSpeaking,
    isRecording,
    transcript
  }
}
```

2. Extract constants to `apps/web/src/config/voice.js`:

```javascript
export const VOICE_CONFIG = {
  WS_URL: import.meta.env.VITE_VOICE_WS_URL || 'wss://api.x.ai/v1/realtime',
  SAMPLE_RATE: 24000,
  TRANSITION_PHRASES: ['moving on', 'next question', ...],
  GREETING_DELAY_MS: 500
}
```

3. Extract `buildInstructions()` (76 lines) to `apps/web/src/utils/voiceInstructions.js`

4. Extract audio utility functions (`base64ToArrayBuffer`, `arrayBufferToBase64`) to `apps/web/src/utils/audio.js`

5. Reduce VoiceChat.jsx to a presentational component that uses the hook

**Target:** VoiceChat.jsx under 300 lines. useVoiceSession.js under 400 lines.

**Verification:**

- Voice interview starts and plays audio
- Transitions between questions work
- Component unmount doesn't leak WebSocket connections
- Session recovery on page refresh works

### 5.2 Refactor BookPreview.jsx - Split buildBook

**File:** `apps/web/src/components/BookPreview.jsx` (1,421 lines)

**Action:**

1. Extract Three.js scene management to `apps/web/src/utils/bookRenderer/`:
   - `createScene.js` - renderer, camera, lighting setup (~60 lines)
   - `createTextures.js` - `createCoverTexture`, `createBackCoverTexture`, `createPageTexture` (~300 lines)
   - `createMeshes.js` - mesh creation, sheet building (~100 lines)
   - `setupInteraction.js` - mouse/touch/device orientation handlers (~80 lines)
   - `animationLoop.js` - requestAnimationFrame loop, deformation (~100 lines)
   - `index.js` - orchestrator that ties them together

2. Create `apps/web/src/hooks/useBookRenderer.js`:

```javascript
export function useBookRenderer(containerRef, { stories, cover }) {
  // Returns:
  return {
    loading,
    error,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    resetView
  }
}
```

3. Reduce BookPreview.jsx to a thin wrapper:

```jsx
function BookPreview({ stories, cover, onClose }) {
  const containerRef = useRef(null)
  const book = useBookRenderer(containerRef, { stories, cover })
  // Render container + controls only (~100 lines)
}
```

**Target:** BookPreview.jsx under 150 lines. Each utility file under 300 lines.

**Verification:**

- Book renders correctly with cover, pages, back cover
- Page flipping works (click, keyboard)
- 3D tilt effect works
- No visual regressions

### 5.3 Refactor BookOrder.jsx - Extract Sub-components

**File:** `apps/web/src/components/BookOrder.jsx` (1,053 lines)

**Action:**

1. Extract `BookMockup` (already a sub-component at line 12, but move to own file):
   - `apps/web/src/components/book-order/BookMockup.jsx`

2. Extract color/format selectors:
   - `apps/web/src/components/book-order/FormatSelector.jsx`
   - `apps/web/src/components/book-order/ColorSelector.jsx`
   - `apps/web/src/components/book-order/QuantitySelector.jsx`

3. Extract shared constants:
   - `apps/web/src/constants/bookColors.js` (deduplicate the two color maps)

4. Group 11 useState hooks into useReducer or object state:

```javascript
const [orderState, dispatch] = useReducer(orderReducer, {
  step: 1,
  loading: true,
  calculating: false,
  options: null,
  error: null,
  cost: null,
  config: { format: 'hardcover', color: 'black', quantity: 1 },
  shipping: { name: '', address: '', city: '', postcode: '', countryCode: 'US' }
})
```

**Target:** BookOrder.jsx under 400 lines with 4 sub-component files.

**Verification:**

- Book ordering flow works end-to-end
- Format/color/quantity selection works
- Cost calculation updates correctly

### 5.4 Refactor ExportModal.jsx

**File:** `apps/web/src/components/ExportModal.jsx` (683 lines)

**Action:**

1. Combine `isVisible` + `isClosing` into single state:

```javascript
const [visibility, setVisibility] = useState('hidden') // 'hidden' | 'visible' | 'closing'
```

2. Extract voice recording logic to `apps/web/src/hooks/useVoiceRecording.js`:

```javascript
export function useVoiceRecording({ maxDuration = 30000, onRecordingComplete }) {
  return { startRecording, stopRecording, isRecording, recordedAudio, error }
}
```

3. Extract export option cards to `apps/web/src/components/export/ExportOptionCard.jsx`

4. Fix FileReader race condition (onloadend after unmount):

```javascript
useEffect(() => {
  return () => {
    mountedRef.current = false
  }
}, [])
```

**Target:** ExportModal.jsx under 400 lines.

### 5.5 Extract BlogPost Content from JSX

**File:** `apps/web/src/pages/marketing/BlogPost.jsx` (1,339 lines)

**Action:**

1. Move blog post data to `apps/web/src/data/blogPosts.js`:

```javascript
export const blogPosts = [
  {
    slug: 'how-to-write-memoir',
    title: 'How to Write a Memoir',
    date: '2025-01-15',
    category: 'Guide',
    content: `...markdown content...`
  }
  // ...
]
```

2. BlogPost.jsx becomes a renderer that looks up by slug and renders markdown
3. Install a lightweight markdown renderer if needed: `npm install react-markdown`

**Target:** BlogPost.jsx under 200 lines. blogPosts.js as data file (can be large, it's data not logic).

**Verification:**

- All blog posts render correctly
- Blog post navigation works
- SEO meta tags still work
- Prerendering still works

### 5.6 Clean Up Landing Pages

**Files:** `apps/web/src/pages/marketing/Landing.jsx` (1,201 lines), `LandingDesign1.jsx` (54KB)

**Action:**

1. Extract shared marketing components:
   - `apps/web/src/components/marketing/HeroSection.jsx`
   - `apps/web/src/components/marketing/TestimonialSection.jsx`
   - `apps/web/src/components/marketing/PricingSection.jsx`
   - `apps/web/src/components/marketing/CTASection.jsx`

2. Both landing pages should compose from shared components
3. If Landing.jsx (original) is not linked anywhere, remove it entirely

**Target:** Each landing page under 400 lines, sharing components.

## Definition of Done

- [ ] No frontend file exceeds 500 lines
- [ ] No function exceeds 50 lines
- [ ] VoiceChat refactored with useVoiceSession hook
- [ ] BookPreview refactored with useBookRenderer hook
- [ ] BookOrder split into sub-components
- [ ] BlogPost content extracted to data file
- [ ] All tests pass (unit + E2E)
- [ ] No visual regressions on key pages
- [ ] Voice interview works end-to-end
- [ ] Book preview renders correctly

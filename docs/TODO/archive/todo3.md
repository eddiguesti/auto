# TODO 3: Testing Foundation

**Priority:** HIGH - Do after todo2
**Agent type:** tdd-guide / full-stack
**Estimated time:** 2 days
**Score impact:** Testing 3/10 -> 7/10
**Depends on:** todo1, todo2

## Context

Currently: 6 backend test files using a custom runner, zero frontend tests, zero E2E tests.
Target: Vitest for unit/component tests, Playwright for E2E, proper CI integration.

This is about establishing the testing infrastructure and writing the highest-value tests.
Not about 100% coverage - about protecting the flows that generate revenue and trust.

## Tasks

### 3.1 Set Up Vitest for Frontend

**Directory:** `apps/web/`

**Action:**

1. Install Vitest and testing libraries:

```bash
cd apps/web
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom happy-dom
```

2. Add Vitest config to `vite.config.js`:

```javascript
// Add to vite.config.js
export default defineConfig({
  // ...existing config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
})
```

3. Create `apps/web/src/test/setup.js`:

```javascript
import '@testing-library/jest-dom'
```

4. Add scripts to `apps/web/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

5. Add to root `package.json` scripts:

```json
"test:web": "cd apps/web && npm test",
"test:all": "npm test && npm run test:web"
```

**Verification:** `cd apps/web && npx vitest run` exits 0 (even with no tests yet).

### 3.2 Write Core Frontend Unit Tests

**Priority tests** - these protect the highest-value code:

**3.2.1 AuthContext tests** (`src/context/__tests__/AuthContext.test.jsx`):

- login() stores token in sessionStorage and sets user state
- logout() clears token and user state
- authFetch() adds Authorization header
- authFetch() redirects to login on 401
- loading state is true while fetching user

**3.2.2 useApi hook tests** (`src/hooks/__tests__/useApi.test.js`):

- request() returns data on success
- request() sets error on failure
- loading state toggles correctly
- clearError() resets error state

**3.2.3 usePremium hook tests** (`src/hooks/__tests__/usePremium.test.js`):

- returns true when user has active premium
- returns false when premium expired
- returns false when no user

**3.2.4 ProtectedRoute tests** (`src/components/__tests__/ProtectedRoute.test.jsx`):

- renders children when authenticated
- redirects to /login when not authenticated
- shows loading state while checking auth

**3.2.5 config.js tests** (`src/__tests__/config.test.js`):

- API_URL defaults correctly
- GOOGLE_CLIENT_ID reads from env

Write each test file. Mock fetch and sessionStorage where needed.

**Verification:** `npm run test:web` passes with 10+ tests. Coverage report shows contexts/hooks covered.

### 3.3 Migrate Backend Tests to Vitest

**Directory:** `services/api/tests/`

**Problem:** Tests use a custom Node.js runner. No coverage reports, no watch mode, no CI integration.

**Action:**

1. Install Vitest in root:

```bash
npm install -D vitest
```

2. Add vitest config for backend in root `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['services/api/tests/**/*.test.js'],
    globals: true
  }
})
```

3. Migrate each test file:
   - Replace custom assertions with Vitest's `expect()`
   - Replace custom `describe/it` with Vitest's
   - Keep the mock DB and test utilities, just adapt the interface
   - Ensure all 6 test files run under Vitest

4. Update root `package.json`:

```json
"test": "vitest run --config vitest.config.js",
"test:watch": "vitest --config vitest.config.js"
```

**Verification:** All existing tests pass under Vitest. `npm test` shows results with coverage.

### 3.4 Write Critical Backend Tests

Add these high-value tests:

**3.4.1 Token blacklisting tests** (after todo2):

- Blacklisted token returns 401
- Non-blacklisted token passes
- Expired blacklist entries are cleaned up

**3.4.2 Input validation tests:**

- Each new validation schema rejects invalid input
- Each schema allows valid input through

**3.4.3 Webhook security tests:**

- Telnyx webhook rejects unsigned requests
- Blog-images POST rejects unauthenticated requests
- Stripe webhook rejects invalid signatures

**Verification:** 20+ backend tests pass. Coverage > 40% on middleware and auth.

### 3.5 Set Up Playwright for E2E Tests

**Directory:** Root project

**Action:**

1. Install Playwright:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

2. Create `playwright.config.js`:

```javascript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true
  }
})
```

3. Create `e2e/` directory with these test files:

**3.5.1 `e2e/auth.spec.js`** - Authentication flow:

- Landing page loads
- Navigate to login page
- Login form renders with email/password fields
- Google OAuth button present
- Navigate to register page
- Register form validates input

**3.5.2 `e2e/navigation.spec.js`** - Public navigation:

- Landing page has CTA buttons
- Can navigate to /how-it-works
- Can navigate to /pricing
- Can navigate to /faq
- Can navigate to /about
- Footer links work

**3.5.3 `e2e/marketing.spec.js`** - Marketing pages:

- Pricing page shows plans
- FAQ page shows questions
- About page renders

4. Add scripts:

```json
"test:e2e": "npx playwright test",
"test:e2e:headed": "npx playwright test --headed"
```

**Verification:** `npm run test:e2e` passes 10+ E2E tests against the dev server.

### 3.6 Add Testing to CI Pipeline

**File:** `.github/workflows/ci.yml`

**Action:**

1. Add test job that runs after lint:

```yaml
test:
  runs-on: ubuntu-latest
  needs: lint
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: cd apps/web && npm ci
    - run: npm test
    - run: cd apps/web && npm test
```

2. Add E2E job (can run in parallel with unit tests):

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci && cd apps/web && npm ci
    - run: npx playwright install chromium
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

**Verification:** CI pipeline runs tests on push. Failing tests block the build.

## Definition of Done

- [ ] Vitest set up for frontend with coverage
- [ ] 10+ frontend unit tests for AuthContext, hooks, ProtectedRoute
- [ ] Backend tests migrated to Vitest
- [ ] 20+ backend tests total
- [ ] Playwright installed with 3 E2E test files
- [ ] 10+ E2E tests for public pages and auth flow
- [ ] CI pipeline runs all tests
- [ ] Test commands work: `npm test`, `npm run test:web`, `npm run test:e2e`

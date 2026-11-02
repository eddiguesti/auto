import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT || 5187)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid PLAYWRIGHT_PORT')
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
      : {})
  },
  webServer: {
    // Provider contracts are isolated in browser tests; database/provider flows
    // have separate PostgreSQL and HTTP suites. Never reuse another project's UI.
    command: `npm run dev --workspace apps/web -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false
  }
})

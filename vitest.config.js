import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['services/api/tests/**/*.test.js'],
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['services/api/**/*.js'],
      exclude: [
        'services/api/tests/**',
        'services/api/db/migrations/**',
        'services/api/db/seeds/**'
      ]
    }
  }
})

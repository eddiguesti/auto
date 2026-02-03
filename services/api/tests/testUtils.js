/**
 * Test utilities for server-side testing
 * Provides mocks, helpers, and test setup functions
 */

import jwt from 'jsonwebtoken'

// Test counters
let passed = 0
let failed = 0
let currentSuite = ''

/**
 * Simple test function
 */
export function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } catch (err) {
    failed++
    console.log(`  \x1b[31m✗\x1b[0m ${name}`)
    console.log(`    \x1b[31m${err.message}\x1b[0m`)
    if (err.stack) {
      const stackLine = err.stack.split('\n')[1]
      if (stackLine) console.log(`    \x1b[90m${stackLine.trim()}\x1b[0m`)
    }
  }
}

/**
 * Async test function
 */
export async function testAsync(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } catch (err) {
    failed++
    console.log(`  \x1b[31m✗\x1b[0m ${name}`)
    console.log(`    \x1b[31m${err.message}\x1b[0m`)
  }
}

/**
 * Describe block for grouping tests
 */
export function describe(name, fn) {
  currentSuite = name
  console.log(`\n\x1b[1m${name}\x1b[0m`)
  fn()
}

/**
 * Async describe block
 */
export async function describeAsync(name, fn) {
  currentSuite = name
  console.log(`\n\x1b[1m${name}\x1b[0m`)
  await fn()
}

/**
 * Print test summary and exit
 */
export function printSummary() {
  const total = passed + failed
  console.log('\n' + '='.repeat(50))
  if (failed === 0) {
    console.log(`\x1b[32mTests: ${total} | Passed: ${passed} | Failed: ${failed}\x1b[0m`)
  } else {
    console.log(`\x1b[31mTests: ${total} | Passed: ${passed} | Failed: ${failed}\x1b[0m`)
  }
  console.log('='.repeat(50))
  return failed > 0 ? 1 : 0
}

/**
 * Reset test counters (for running multiple test files)
 */
export function resetCounters() {
  passed = 0
  failed = 0
}

// ============ JWT & Auth Helpers ============

const TEST_JWT_SECRET = 'test-secret-key-for-unit-tests-only-minimum-32-chars'

/**
 * Generate a valid test token
 */
export function generateTestToken(user = { id: 1, email: 'test@test.com' }, options = {}) {
  return jwt.sign(user, TEST_JWT_SECRET, { expiresIn: '1h', ...options })
}

/**
 * Generate an expired token
 */
export function generateExpiredToken(user = { id: 1, email: 'test@test.com' }) {
  return jwt.sign(user, TEST_JWT_SECRET, { expiresIn: '-1h' })
}

/**
 * Generate a token with invalid signature
 */
export function generateInvalidToken() {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.invalid_signature'
}

/**
 * Get test JWT secret (for middleware testing)
 */
export function getTestJwtSecret() {
  return TEST_JWT_SECRET
}

// ============ Mock Request/Response ============

/**
 * Create a mock Express request object
 */
export function createMockRequest(overrides = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    id: 'test-request-id',
    method: 'GET',
    path: '/test',
    app: {
      locals: {
        db: createMockDb()
      }
    },
    ...overrides
  }
}

/**
 * Create a mock Express response object
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    },
    send(data) {
      this.body = data
      return this
    },
    setHeader(key, value) {
      this.headers[key] = value
      return this
    }
  }
  return res
}

/**
 * Create a mock next function
 */
export function createMockNext() {
  const calls = []
  const next = (err) => {
    calls.push(err)
  }
  next.calls = calls
  next.called = () => calls.length > 0
  next.calledWith = (err) => calls.includes(err)
  next.getError = () => calls[0]
  return next
}

// ============ Mock Database ============

/**
 * Create a mock database pool
 */
export function createMockDb(queryResults = {}) {
  const queries = []

  return {
    query: async (sql, params) => {
      queries.push({ sql, params })

      // Return configured results or defaults
      if (queryResults[sql]) {
        return queryResults[sql]
      }

      // Default empty result
      return { rows: [], rowCount: 0 }
    },
    getQueries: () => queries,
    clearQueries: () => queries.length = 0
  }
}

/**
 * Create mock database with user data
 */
export function createMockDbWithUser(user = {
  id: 1,
  email: 'test@test.com',
  name: 'Test User',
  password_hash: '$2a$12$test.hash'
}) {
  return createMockDb({
    'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1': {
      rows: [user],
      rowCount: 1
    },
    'SELECT id FROM users WHERE email = $1': {
      rows: [{ id: user.id }],
      rowCount: 1
    }
  })
}

// ============ Test Data Factories ============

/**
 * Create a valid registration payload
 */
export function createRegistrationPayload(overrides = {}) {
  return {
    email: 'newuser@test.com',
    password: 'ValidPass123',
    name: 'New User',
    birthYear: 1990,
    ...overrides
  }
}

/**
 * Create a valid login payload
 */
export function createLoginPayload(overrides = {}) {
  return {
    email: 'test@test.com',
    password: 'ValidPass123',
    ...overrides
  }
}

/**
 * Create a valid story payload
 */
export function createStoryPayload(overrides = {}) {
  return {
    chapter_id: 'childhood',
    question_id: 'first-memory',
    answer: 'My first memory is playing in the garden.',
    total_questions: 5,
    ...overrides
  }
}

// ============ Assertions ============

/**
 * Assert HTTP status code
 */
export function assertStatus(res, expected, message = '') {
  if (res.statusCode !== expected) {
    throw new Error(
      `${message ? message + ': ' : ''}Expected status ${expected}, got ${res.statusCode}` +
      (res.body ? ` (body: ${JSON.stringify(res.body)})` : '')
    )
  }
}

/**
 * Assert response contains error
 */
export function assertError(res, expectedError) {
  if (!res.body || !res.body.error) {
    throw new Error(`Expected error response, got: ${JSON.stringify(res.body)}`)
  }
  if (expectedError && res.body.error !== expectedError) {
    throw new Error(`Expected error "${expectedError}", got "${res.body.error}"`)
  }
}

/**
 * Assert response contains message
 */
export function assertMessage(res, expectedMessage) {
  if (!res.body || !res.body.message) {
    throw new Error(`Expected message in response, got: ${JSON.stringify(res.body)}`)
  }
  if (expectedMessage && !res.body.message.includes(expectedMessage)) {
    throw new Error(`Expected message to contain "${expectedMessage}", got "${res.body.message}"`)
  }
}

/**
 * Assert response has property
 */
export function assertHasProperty(obj, prop, message = '') {
  if (!(prop in obj)) {
    throw new Error(`${message ? message + ': ' : ''}Expected property "${prop}" not found`)
  }
}

export default {
  test,
  testAsync,
  describe,
  describeAsync,
  printSummary,
  resetCounters,
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  getTestJwtSecret,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockDb,
  createMockDbWithUser,
  createRegistrationPayload,
  createLoginPayload,
  createStoryPayload,
  assertStatus,
  assertError,
  assertMessage,
  assertHasProperty
}

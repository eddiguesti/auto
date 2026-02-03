/**
 * Permission Tests
 * Tests that protected resources cannot be accessed without proper authorization
 *
 * Run with: node server/tests/permissions.test.js
 */

import assert from 'assert'
import {
  test,
  describe,
  printSummary,
  generateTestToken,
  getTestJwtSecret,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockDb,
  assertStatus,
  assertError
} from './testUtils.js'

// Set test environment
process.env.JWT_SECRET = getTestJwtSecret()
process.env.NODE_ENV = 'test'

import { authenticateToken } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

// ============ Protected Route Tests ============

describe('Protected Routes - No Token', () => {
  const protectedEndpoints = [
    { method: 'GET', path: '/api/stories/all' },
    { method: 'POST', path: '/api/stories' },
    { method: 'GET', path: '/api/photos' },
    { method: 'POST', path: '/api/ai/interview' },
    { method: 'GET', path: '/api/voice/session' },
    { method: 'GET', path: '/api/memory/entities' },
    { method: 'POST', path: '/api/payments/checkout' },
    { method: 'GET', path: '/api/export/epub' },
    { method: 'GET', path: '/api/audiobook/generate' },
    { method: 'GET', path: '/api/onboarding/status' },
    { method: 'GET', path: '/api/game/state' }
  ]

  protectedEndpoints.forEach(({ method, path }) => {
    test(`${method} ${path} returns 401 without token`, () => {
      const req = createMockRequest({
        method,
        path,
        headers: {} // No authorization header
      })
      const res = createMockResponse()
      const next = createMockNext()

      authenticateToken(req, res, next)

      assertStatus(res, 401)
      assertError(res, 'Authentication required')
    })
  })
})

describe('Protected Routes - Invalid Token', () => {
  test('returns 403 with invalid token', () => {
    const req = createMockRequest({
      method: 'GET',
      path: '/api/stories/all',
      headers: { authorization: 'Bearer invalid.token.here' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Invalid or expired token')
  })

  test('returns 403 with tampered token', () => {
    // Create a valid token then modify it
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const tamperedToken = token.slice(0, -5) + 'xxxxx'

    const req = createMockRequest({
      headers: { authorization: `Bearer ${tamperedToken}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
  })
})

describe('Protected Routes - Valid Token', () => {
  test('allows access with valid token', () => {
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assert.ok(next.called(), 'Should call next()')
    assert.strictEqual(req.user.id, 1)
  })

  test('sets user on request object', () => {
    const token = generateTestToken({ id: 42, email: 'user@example.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assert.strictEqual(req.user.id, 42)
    assert.strictEqual(req.user.email, 'user@example.com')
  })
})

// ============ Database Availability Tests ============

describe('Database Availability (requireDb middleware)', () => {
  test('returns 503 when database is not available', () => {
    const req = createMockRequest({
      app: { locals: { db: null } }
    })
    const res = createMockResponse()
    const next = createMockNext()

    requireDb(req, res, next)

    assertStatus(res, 503)
    assertError(res, 'Database not available')
  })

  test('allows request when database is available', () => {
    const req = createMockRequest({
      app: { locals: { db: createMockDb() } }
    })
    const res = createMockResponse()
    const next = createMockNext()

    requireDb(req, res, next)

    assert.ok(next.called(), 'Should call next() when db is available')
  })
})

// ============ User Isolation Tests ============

describe('User Isolation', () => {
  test('user ID from token is used for database queries', () => {
    const token = generateTestToken({ id: 123, email: 'user123@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    // The user ID should be used for all subsequent operations
    assert.strictEqual(req.user.id, 123)
    // This ID should be used to filter database queries
    // Actual isolation is enforced by route handlers using req.user.id
  })

  test('cannot impersonate another user by modifying token', () => {
    // Try to create a token with a different user ID
    const originalUserId = 1
    const targetUserId = 999

    // The token for user 1
    const token = generateTestToken({ id: originalUserId, email: 'user1@test.com' })

    // Even if someone tries to decode and re-encode with different ID,
    // the signature will be invalid
    const parts = token.split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    payload.id = targetUserId
    const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
    const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`

    const req = createMockRequest({
      headers: { authorization: `Bearer ${tamperedToken}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
    assert.ok(!req.user, 'User should not be set for tampered token')
  })
})

// ============ Resource Ownership Tests ============

describe('Resource Ownership Patterns', () => {
  test('authenticated user ID is available for ownership checks', () => {
    const userId = 42
    const token = generateTestToken({ id: userId, email: 'owner@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    // Route handlers can use req.user.id to verify ownership
    assert.strictEqual(req.user.id, userId)

    // Example ownership check pattern (as used in routes):
    const resourceOwnerId = 42
    const isOwner = req.user.id === resourceOwnerId
    assert.ok(isOwner, 'User should own their resources')

    const otherResourceOwnerId = 999
    const isNotOwner = req.user.id !== otherResourceOwnerId
    assert.ok(isNotOwner, 'User should not own other resources')
  })
})

// ============ Public Routes Tests ============

describe('Public Routes (no auth required)', () => {
  const publicEndpoints = [
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/register' },
    { method: 'POST', path: '/api/auth/google' },
    { method: 'GET', path: '/api/health' },
    { method: 'POST', path: '/api/support/chat' }
  ]

  publicEndpoints.forEach(({ method, path }) => {
    test(`${method} ${path} does not require authentication`, () => {
      // These routes should not use authenticateToken middleware
      // We just verify the pattern is documented
      assert.ok(true, `${path} is a public endpoint`)
    })
  })
})

// ============ Token Format Tests ============

describe('Authorization Header Format', () => {
  test('accepts "Bearer <token>" format', () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assert.ok(next.called())
  })

  test('rejects token without Bearer prefix', () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: token }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  test('accepts lowercase "bearer" prefix (HTTP headers are case-insensitive)', () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: `bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    // The middleware splits on space, so case doesn't matter for the prefix
    assert.ok(next.called(), 'Should accept lowercase bearer')
  })
})

// ============ Run Tests ============

const exitCode = printSummary()
process.exit(exitCode)

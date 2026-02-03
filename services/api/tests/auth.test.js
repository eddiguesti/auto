/**
 * Authentication Tests
 * Tests for login, logout, session expiry, and token validation
 *
 * Run with: node server/tests/auth.test.js
 */

import assert from 'assert'
import jwt from 'jsonwebtoken'
import {
  test,
  describe,
  printSummary,
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  getTestJwtSecret,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockDb,
  createMockDbWithUser,
  assertStatus,
  assertError
} from './testUtils.js'

// Set test environment
process.env.JWT_SECRET = getTestJwtSecret()
process.env.NODE_ENV = 'test'

// Import after setting env vars
import { authenticateToken, generateToken } from '../middleware/auth.js'

// ============ Token Generation Tests ============

describe('Token Generation', () => {
  test('generates valid JWT token for user', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)

    assert.ok(token, 'Token should be generated')
    assert.strictEqual(typeof token, 'string')

    const decoded = jwt.verify(token, getTestJwtSecret())
    assert.strictEqual(decoded.id, user.id)
    assert.strictEqual(decoded.email, user.email)
  })

  test('generated token contains expiration', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)
    const decoded = jwt.decode(token)

    assert.ok(decoded.exp, 'Token should have expiration')
    assert.ok(decoded.exp > Date.now() / 1000, 'Expiration should be in the future')
  })

  test('throws error when JWT_SECRET is not configured', () => {
    const originalSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'short'

    try {
      generateToken({ id: 1, email: 'test@test.com' })
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.ok(err.message.includes('not properly configured'))
    } finally {
      process.env.JWT_SECRET = originalSecret
    }
  })
})

// ============ Token Validation Tests ============

describe('Token Validation (authenticateToken middleware)', () => {
  test('allows request with valid token', () => {
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assert.ok(next.called(), 'next() should be called')
    assert.ok(!next.getError(), 'next() should not be called with error')
    assert.strictEqual(req.user.id, 1)
    assert.strictEqual(req.user.email, 'test@test.com')
  })

  test('rejects request without authorization header', () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)
    assertError(res, 'Authentication required')
    assert.ok(!next.called(), 'next() should not be called')
  })

  test('rejects request with malformed authorization header', () => {
    const req = createMockRequest({
      headers: { authorization: 'InvalidFormat' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  test('rejects request with empty Bearer token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer ' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  test('rejects expired token', () => {
    const token = generateExpiredToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Invalid or expired token')
  })

  test('rejects token with invalid signature', () => {
    const token = generateInvalidToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Invalid or expired token')
  })

  test('rejects completely invalid token string', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer not.a.valid.jwt.token' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 403)
  })
})

// ============ Session Expiry Tests ============

describe('Session Expiry', () => {
  test('token expires after configured time', () => {
    // Create a token that expires in 1 second
    const user = { id: 1, email: 'test@test.com' }
    const token = jwt.sign(user, getTestJwtSecret(), { expiresIn: '1s' })

    // Verify it's valid now
    const decoded = jwt.verify(token, getTestJwtSecret())
    assert.strictEqual(decoded.id, 1)

    // Note: We can't easily test actual expiry without waiting
    // but we can verify the exp claim is set correctly
    assert.ok(decoded.exp - decoded.iat <= 1, 'Token should expire in ~1 second')
  })

  test('token expiration is properly set in payload', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)
    const decoded = jwt.decode(token)

    // Default expiration should be 7 days
    const expectedExpiry = 7 * 24 * 60 * 60 // 7 days in seconds
    const actualExpiry = decoded.exp - decoded.iat

    // Allow some tolerance for timing
    assert.ok(
      Math.abs(actualExpiry - expectedExpiry) < 60,
      `Token expiry should be ~7 days, got ${actualExpiry / (24 * 60 * 60)} days`
    )
  })
})

// ============ Dev Bypass Tests ============

describe('Development Bypass', () => {
  test('does NOT bypass auth in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    const originalBypass = process.env.DEV_BYPASS

    process.env.NODE_ENV = 'production'
    process.env.DEV_BYPASS = 'true'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)
    assert.ok(!req.user, 'User should not be set in production')

    process.env.NODE_ENV = originalEnv
    process.env.DEV_BYPASS = originalBypass
  })

  test('does NOT bypass when DEV_BYPASS is not "true"', () => {
    const originalEnv = process.env.NODE_ENV
    const originalBypass = process.env.DEV_BYPASS

    process.env.NODE_ENV = 'development'
    process.env.DEV_BYPASS = 'false'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 401)

    process.env.NODE_ENV = originalEnv
    process.env.DEV_BYPASS = originalBypass
  })

  test('bypasses auth in development with DEV_BYPASS=true', () => {
    const originalEnv = process.env.NODE_ENV
    const originalBypass = process.env.DEV_BYPASS

    process.env.NODE_ENV = 'development'
    process.env.DEV_BYPASS = 'true'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assert.ok(next.called(), 'next() should be called in dev bypass')
    assert.ok(req.user, 'User should be set in dev bypass')
    assert.strictEqual(req.user.email, 'dev@test.com')

    process.env.NODE_ENV = originalEnv
    process.env.DEV_BYPASS = originalBypass
  })
})

// ============ JWT Secret Configuration Tests ============

describe('JWT Secret Configuration', () => {
  test('rejects weak JWT secret (too short)', () => {
    const originalSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'short'

    const req = createMockRequest({
      headers: { authorization: 'Bearer sometoken' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 500)
    assertError(res, 'Server configuration error')

    process.env.JWT_SECRET = originalSecret
  })

  test('rejects JWT secret containing CHANGE_ME', () => {
    const originalSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'CHANGE_ME_to_something_secure_at_least_32_chars'

    const req = createMockRequest({
      headers: { authorization: 'Bearer sometoken' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    authenticateToken(req, res, next)

    assertStatus(res, 500)

    process.env.JWT_SECRET = originalSecret
  })
})

// ============ Run Tests ============

const exitCode = printSummary()
process.exit(exitCode)

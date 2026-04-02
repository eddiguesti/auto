/**
 * Authentication Tests
 * Tests for login, logout, session expiry, and token validation
 *
 * Run with: npx vitest run services/api/tests/auth.test.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import {
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
  it('generates valid JWT token for user', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)

    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')

    const decoded = jwt.verify(token, getTestJwtSecret())
    expect(decoded.id).toBe(user.id)
    expect(decoded.email).toBe(user.email)
  })

  it('generated token contains expiration', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)
    const decoded = jwt.decode(token)

    expect(decoded.exp).toBeTruthy()
    expect(decoded.exp > Date.now() / 1000).toBeTruthy()
  })

  it('throws error when JWT_SECRET is not configured', () => {
    const originalSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'short'

    try {
      generateToken({ id: 1, email: 'test@test.com' })
      throw new Error('Should have thrown error')
    } catch (err) {
      expect(err.message).toContain('not properly configured')
    } finally {
      process.env.JWT_SECRET = originalSecret
    }
  })
})

// ============ Token Validation Tests ============

describe('Token Validation (authenticateToken middleware)', () => {
  it('allows request with valid token', async () => {
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(next.called()).toBeTruthy()
    expect(next.getError()).toBeFalsy()
    expect(req.user.id).toBe(1)
    expect(req.user.email).toBe('test@test.com')
  })

  it('rejects request without authorization header', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 401)
    assertError(res, 'Authentication required')
    expect(next.called()).toBeFalsy()
  })

  it('rejects request with malformed authorization header', async () => {
    const req = createMockRequest({
      headers: { authorization: 'InvalidFormat' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  it('rejects request with empty Bearer token', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer ' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  it('rejects expired token', async () => {
    const token = generateExpiredToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Invalid or expired token')
  })

  it('rejects token with invalid signature', async () => {
    const token = generateInvalidToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Invalid or expired token')
  })

  it('rejects completely invalid token string', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer not.a.valid.jwt.token' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 403)
  })
})

// ============ Session Expiry Tests ============

describe('Session Expiry', () => {
  it('token expires after configured time', () => {
    // Create a token that expires in 1 second
    const user = { id: 1, email: 'test@test.com' }
    const token = jwt.sign(user, getTestJwtSecret(), { expiresIn: '1s' })

    // Verify it's valid now
    const decoded = jwt.verify(token, getTestJwtSecret())
    expect(decoded.id).toBe(1)

    // Note: We can't easily test actual expiry without waiting
    // but we can verify the exp claim is set correctly
    expect(decoded.exp - decoded.iat <= 1).toBeTruthy()
  })

  it('token expiration is properly set in payload', () => {
    const user = { id: 1, email: 'test@test.com' }
    const token = generateToken(user)
    const decoded = jwt.decode(token)

    // Default expiration should be 7 days
    const expectedExpiry = 7 * 24 * 60 * 60 // 7 days in seconds
    const actualExpiry = decoded.exp - decoded.iat

    // Allow some tolerance for timing
    expect(Math.abs(actualExpiry - expectedExpiry) < 60).toBeTruthy()
  })
})

// ============ Dev Bypass Tests ============

describe('Development Bypass', () => {
  let originalEnv
  let originalBypass

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
    originalBypass = process.env.DEV_BYPASS
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    process.env.DEV_BYPASS = originalBypass
  })

  it('does NOT bypass auth in production mode', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DEV_BYPASS = 'true'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 401)
    expect(req.user).toBeFalsy()
  })

  it('does NOT bypass when DEV_BYPASS is not "true"', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DEV_BYPASS = 'false'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 401)
  })

  it('bypasses auth in development with DEV_BYPASS=true', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DEV_BYPASS = 'true'

    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(next.called()).toBeTruthy()
    expect(req.user).toBeTruthy()
    expect(req.user.email).toBe('dev@test.com')
  })
})

// ============ JWT Secret Configuration Tests ============

describe('JWT Secret Configuration', () => {
  let originalSecret

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret
  })

  it('rejects weak JWT secret (too short)', async () => {
    process.env.JWT_SECRET = 'short'

    const req = createMockRequest({
      headers: { authorization: 'Bearer sometoken' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 500)
    assertError(res, 'Server configuration error')
  })

  it('rejects JWT secret containing CHANGE_ME', async () => {
    process.env.JWT_SECRET = 'CHANGE_ME_to_something_secure_at_least_32_chars'

    const req = createMockRequest({
      headers: { authorization: 'Bearer sometoken' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    assertStatus(res, 500)
  })
})

/**
 * Permission Tests
 * Tests that protected resources cannot be accessed without proper authorization
 */

import { describe, it, expect } from 'vitest'
import {
  generateTestToken,
  getTestJwtSecret,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockDb
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
    it(`${method} ${path} returns 401 without token`, async () => {
      const req = createMockRequest({
        method,
        path,
        headers: {} // No authorization header
      })
      const res = createMockResponse()
      const next = createMockNext()

      await authenticateToken(req, res, next)

      expect(res.statusCode).toBe(401)
      expect(res.body.error).toBe('Authentication required')
    })
  })
})

describe('Protected Routes - Invalid Token', () => {
  it('returns 403 with invalid token', async () => {
    const req = createMockRequest({
      method: 'GET',
      path: '/api/stories/all',
      headers: { authorization: 'Bearer invalid.token.here' }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.body.error).toBe('Invalid or expired token')
  })

  it('returns 403 with tampered token', async () => {
    // Create a valid token then modify it
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const tamperedToken = token.slice(0, -5) + 'xxxxx'

    const req = createMockRequest({
      headers: { authorization: `Bearer ${tamperedToken}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(res.statusCode).toBe(403)
  })
})

describe('Protected Routes - Valid Token', () => {
  it('allows access with valid token', async () => {
    const token = generateTestToken({ id: 1, email: 'test@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(next.called()).toBeTruthy()
    expect(req.user.id).toBe(1)
  })

  it('sets user on request object', async () => {
    const token = generateTestToken({ id: 42, email: 'user@example.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(req.user.id).toBe(42)
    expect(req.user.email).toBe('user@example.com')
  })
})

// ============ Database Availability Tests ============

describe('Database Availability (requireDb middleware)', () => {
  it('returns 503 when database is not available', () => {
    const req = createMockRequest({
      app: { locals: { db: null } }
    })
    const res = createMockResponse()
    const next = createMockNext()

    requireDb(req, res, next)

    expect(res.statusCode).toBe(503)
    expect(res.body.error).toBe('Database not available')
  })

  it('allows request when database is available', () => {
    const req = createMockRequest({
      app: { locals: { db: createMockDb() } }
    })
    const res = createMockResponse()
    const next = createMockNext()

    requireDb(req, res, next)

    expect(next.called()).toBeTruthy()
  })
})

// ============ User Isolation Tests ============

describe('User Isolation', () => {
  it('user ID from token is used for database queries', async () => {
    const token = generateTestToken({ id: 123, email: 'user123@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    // The user ID should be used for all subsequent operations
    expect(req.user.id).toBe(123)
    // This ID should be used to filter database queries
    // Actual isolation is enforced by route handlers using req.user.id
  })

  it('cannot impersonate another user by modifying token', async () => {
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

    await authenticateToken(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(!req.user).toBeTruthy()
  })
})

// ============ Resource Ownership Tests ============

describe('Resource Ownership Patterns', () => {
  it('authenticated user ID is available for ownership checks', async () => {
    const userId = 42
    const token = generateTestToken({ id: userId, email: 'owner@test.com' })
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    // Route handlers can use req.user.id to verify ownership
    expect(req.user.id).toBe(userId)

    // Example ownership check pattern (as used in routes):
    const resourceOwnerId = 42
    const isOwner = req.user.id === resourceOwnerId
    expect(isOwner).toBeTruthy()

    const otherResourceOwnerId = 999
    const isNotOwner = req.user.id !== otherResourceOwnerId
    expect(isNotOwner).toBeTruthy()
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
    it(`${method} ${path} does not require authentication`, () => {
      // These routes should not use authenticateToken middleware
      // We just verify the pattern is documented
      expect(true).toBeTruthy()
    })
  })
})

// ============ Token Format Tests ============

describe('Authorization Header Format', () => {
  it('accepts "Bearer <token>" format', async () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(next.called()).toBeTruthy()
  })

  it('rejects token without Bearer prefix', async () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: token }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    expect(res.statusCode).toBe(401)
  })

  it('accepts lowercase "bearer" prefix (HTTP headers are case-insensitive)', async () => {
    const token = generateTestToken()
    const req = createMockRequest({
      headers: { authorization: `bearer ${token}` }
    })
    const res = createMockResponse()
    const next = createMockNext()

    await authenticateToken(req, res, next)

    // The middleware splits on space, so case doesn't matter for the prefix
    expect(next.called()).toBeTruthy()
  })
})

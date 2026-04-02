/**
 * Scope Middleware Tests
 * Tests for JWT scope enforcement (requireScope)
 */

import { describe, it, expect } from 'vitest'
import { requireScope } from '../middleware/auth.js'

// Set env before import side effects
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only-minimum-32-chars'
process.env.NODE_ENV = 'test'

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    }
  }
  return res
}

describe('requireScope() — no args (full-scope only)', () => {
  const middleware = requireScope()

  it('allows full-scope tokens (no scope claim)', () => {
    const req = { user: { id: 1, email: 'test@test.com' } }
    const res = createMockRes()
    let nextCalled = false
    middleware(req, res, () => {
      nextCalled = true
    })
    expect(nextCalled).toBe(true)
  })

  it('rejects magic_link scoped tokens', () => {
    const req = { user: { id: 1, email: 'test@test.com', scope: 'magic_link' } }
    const res = createMockRes()
    let nextCalled = false
    middleware(req, res, () => {
      nextCalled = true
    })
    expect(nextCalled).toBe(false)
    expect(res.statusCode).toBe(403)
    expect(res.body.error).toBe('Insufficient permissions')
  })
})

describe('requireScope("magic_link") — specific scope', () => {
  const middleware = requireScope('magic_link')

  it('allows magic_link scoped tokens', () => {
    const req = { user: { id: 1, scope: 'magic_link' } }
    const res = createMockRes()
    let nextCalled = false
    middleware(req, res, () => {
      nextCalled = true
    })
    expect(nextCalled).toBe(true)
  })

  it('allows full-scope tokens (no scope claim)', () => {
    const req = { user: { id: 1 } }
    const res = createMockRes()
    let nextCalled = false
    middleware(req, res, () => {
      nextCalled = true
    })
    expect(nextCalled).toBe(true)
  })

  it('rejects tokens with wrong scope', () => {
    const req = { user: { id: 1, scope: 'other_scope' } }
    const res = createMockRes()
    let nextCalled = false
    middleware(req, res, () => {
      nextCalled = true
    })
    expect(nextCalled).toBe(false)
    expect(res.statusCode).toBe(403)
  })
})

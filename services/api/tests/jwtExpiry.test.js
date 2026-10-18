import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateToken } from '../middleware/auth.js'

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'jwt-expiry-test-secret-at-least-32-characters')
})
afterEach(() => vi.unstubAllEnvs())

describe('configured JWT expiration', () => {
  it.each(['3600', '"3600"', ' 3600 '])('interprets bare %s as seconds', value => {
    vi.stubEnv('JWT_EXPIRES_IN', value)
    const decoded = jwt.decode(generateToken({ id: 1, email: 'user@example.com' }))
    expect(decoded.exp - decoded.iat).toBe(3600)
  })

  it('retains unit-based expiration', () => {
    vi.stubEnv('JWT_EXPIRES_IN', '24h')
    const decoded = jwt.decode(generateToken({ id: 1, email: 'user@example.com' }))
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60)
  })

  it.each(['', 'invalid', '0', '-1', '9007199254740993'])(
    'uses the seven-day default for unavailable or invalid %j',
    value => {
      vi.stubEnv('JWT_EXPIRES_IN', value)
      const decoded = jwt.decode(generateToken({ id: 1, email: 'user@example.com' }))
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60)
    }
  )
})

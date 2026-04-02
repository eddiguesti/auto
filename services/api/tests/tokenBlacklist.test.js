/**
 * Token Blacklisting Tests
 * Tests for JWT revocation via PostgreSQL token_blacklist table.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pool from db/index.js before importing tokenBlacklist
vi.mock('../db/index.js', () => {
  const pool = { query: vi.fn() }
  return { default: pool }
})

import pool from '../db/index.js'
import {
  blacklistToken,
  isTokenBlacklisted,
  blacklistAllUserTokens,
  isUserTokenBlacklisted,
  cleanupExpiredBlacklist
} from '../utils/tokenBlacklist.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Token Blacklisting', () => {
  it('inserts into token_blacklist for a valid token', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    const decoded = {
      jti: 'abc123',
      id: 1,
      exp: Math.floor(Date.now() / 1000) + 3600
    }

    const result = await blacklistToken(decoded)

    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO token_blacklist'),
      expect.arrayContaining(['abc123', 1])
    )
  })

  it('returns false for tokens without JTI', async () => {
    const decoded = { exp: Math.floor(Date.now() / 1000) + 3600, id: 1 }
    const result = await blacklistToken(decoded)
    expect(result).toBe(false)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('returns false for already-expired tokens', async () => {
    const decoded = {
      jti: 'expired',
      id: 1,
      exp: Math.floor(Date.now() / 1000) - 100
    }
    const result = await blacklistToken(decoded)
    expect(result).toBe(false)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('returns false for non-blacklisted token', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    const result = await isTokenBlacklisted('not-blacklisted')
    expect(result).toBe(false)
  })

  it('returns true for a blacklisted token', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 })
    const result = await isTokenBlacklisted('blacklisted-jti')
    expect(result).toBe(true)
  })

  it('returns false on DB error (fail open rather than block all users)', async () => {
    pool.query.mockRejectedValue(new Error('DB error'))
    const result = await isTokenBlacklisted('some-jti')
    expect(result).toBe(false)
  })
})

describe('User-Level Token Blacklisting', () => {
  it('upserts into user_token_invalidation for a user', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 1 })
    const result = await blacklistAllUserTokens(42)
    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('user_token_invalidation'),
      [42]
    )
  })

  it('returns false for users without any invalidation record', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    const result = await isUserTokenBlacklisted(999, Math.floor(Date.now() / 1000))
    expect(result).toBe(false)
  })

  it('returns true if token was issued before invalidation time', async () => {
    const invalidatedAt = new Date()
    pool.query.mockResolvedValue({ rows: [{ invalidated_at: invalidatedAt }], rowCount: 1 })
    const issuedAt = Math.floor(invalidatedAt.getTime() / 1000) - 10
    const result = await isUserTokenBlacklisted(42, issuedAt)
    expect(result).toBe(true)
  })

  it('returns false if token was issued after invalidation time', async () => {
    const invalidatedAt = new Date(Date.now() - 5000)
    pool.query.mockResolvedValue({ rows: [{ invalidated_at: invalidatedAt }], rowCount: 1 })
    const issuedAt = Math.floor(Date.now() / 1000)
    const result = await isUserTokenBlacklisted(42, issuedAt)
    expect(result).toBe(false)
  })
})

describe('Blacklist Cleanup', () => {
  it('deletes expired entries', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    await cleanupExpiredBlacklist()
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM token_blacklist WHERE expires_at < NOW()')
    )
  })
})

describe('Token revocation integration (logout → same token → rejected)', () => {
  it('token is rejected after being blacklisted', async () => {
    const jti = 'logout-test-jti'
    const exp = Math.floor(Date.now() / 1000) + 3600

    // Step 1: blacklist the token (logout)
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await blacklistToken({ jti, id: 1, exp })

    // Step 2: check token is now blacklisted (same token reused)
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
    const rejected = await isTokenBlacklisted(jti)
    expect(rejected).toBe(true)
  })
})

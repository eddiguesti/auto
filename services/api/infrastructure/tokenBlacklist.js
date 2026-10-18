/**
 * JWT token blacklisting via PostgreSQL.
 * Tokens are blacklisted on logout, password reset, and account deletion.
 * Entries are cleaned up daily by the cron job once expired.
 */

import pool from '../db/index.js'
import { createHash } from 'node:crypto'
import { ServiceUnavailableError } from '../utils/errors.js'

export class RevocationUnavailableError extends ServiceUnavailableError {
  constructor() {
    super('Token revocation service')
    this.code = 'REVOCATION_UNAVAILABLE'
  }
}

// Reject alternative pad-bit encodings before hashing a legacy JWT. Different
// text for the same signature must never produce a different revocation key.
export function assertCanonicalToken(token) {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (
    parts.length !== 3 ||
    token.length > 16384 ||
    parts.some(
      part =>
        !/^[A-Za-z0-9_-]+$/.test(part) ||
        Buffer.from(part, 'base64url').toString('base64url') !== part
    )
  )
    throw new Error('Invalid JWT encoding')
}

export function tokenRevocationKey(decoded, rawToken) {
  if (decoded.jti) return decoded.jti
  if (!rawToken) return null
  assertCanonicalToken(rawToken)
  return `sha256:${createHash('sha256').update(rawToken).digest('hex')}`
}

/**
 * Blacklist a single token by its JTI claim.
 */
export async function blacklistToken(decoded, rawToken, database = pool) {
  const key = tokenRevocationKey(decoded, rawToken)
  if (!key || !decoded.exp) return false
  const expiresAt = new Date(decoded.exp * 1000)
  if (expiresAt <= new Date()) return false

  try {
    if (!database) throw new Error('Database unavailable')
    await database.query(
      `INSERT INTO token_blacklist (jti, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (jti) DO NOTHING`,
      [key, decoded.id, expiresAt]
    )
    return true
  } catch {
    throw new RevocationUnavailableError()
  }
}

/**
 * Check if a token's JTI has been blacklisted.
 */
export async function isTokenBlacklisted(jti, database = pool) {
  try {
    if (!database) throw new Error('Database unavailable')
    const result = await database.query(
      `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW()`,
      [jti]
    )
    return result.rows.length > 0
  } catch {
    throw new RevocationUnavailableError()
  }
}

/**
 * Blacklist all tokens for a user (used on password reset).
 * Any token issued before this timestamp will be rejected.
 */
export async function blacklistAllUserTokens(userId) {
  try {
    if (!pool) throw new Error('Database unavailable')
    await pool.query(
      `INSERT INTO user_token_invalidation (user_id, invalidated_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET invalidated_at = GREATEST(user_token_invalidation.invalidated_at, NOW())`,
      [userId]
    )
    return true
  } catch {
    throw new RevocationUnavailableError()
  }
}

/**
 * Check if all tokens for a user have been blacklisted (password reset scenario).
 * Returns true if the token was issued before the user-level invalidation timestamp.
 */
export async function isUserTokenBlacklisted(userId, tokenIssuedAt, database = pool) {
  try {
    if (!database) throw new Error('Database unavailable')
    const result = await database.query(
      `SELECT invalidated_at FROM user_token_invalidation WHERE user_id = $1`,
      [userId]
    )
    if (result.rows.length === 0) return false
    const invalidatedAt = Math.floor(new Date(result.rows[0].invalidated_at).getTime() / 1000)
    if (!Number.isFinite(invalidatedAt)) throw new Error('Invalid invalidation timestamp')
    return tokenIssuedAt <= invalidatedAt
  } catch {
    throw new RevocationUnavailableError()
  }
}

/**
 * Delete expired blacklist entries — call from the daily cron job.
 */
export async function cleanupExpiredBlacklist() {
  if (!pool) return
  await pool.query(`DELETE FROM token_blacklist WHERE expires_at < NOW()`)
}

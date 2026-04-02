/**
 * JWT token blacklisting via PostgreSQL.
 * Tokens are blacklisted on logout, password reset, and account deletion.
 * Entries are cleaned up daily by the cron job once expired.
 */

import pool from '../db/index.js'

/**
 * Blacklist a single token by its JTI claim.
 */
export async function blacklistToken(decoded) {
  if (!decoded.jti || !decoded.exp || !pool) return false
  const expiresAt = new Date(decoded.exp * 1000)
  if (expiresAt <= new Date()) return false

  try {
    await pool.query(
      `INSERT INTO token_blacklist (jti, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (jti) DO NOTHING`,
      [decoded.jti, decoded.id, expiresAt]
    )
    return true
  } catch {
    return false
  }
}

/**
 * Check if a token's JTI has been blacklisted.
 */
export async function isTokenBlacklisted(jti) {
  if (!pool) return false
  try {
    const result = await pool.query(
      `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW()`,
      [jti]
    )
    return result.rows.length > 0
  } catch {
    return false
  }
}

/**
 * Blacklist all tokens for a user (used on password reset).
 * Any token issued before this timestamp will be rejected.
 */
export async function blacklistAllUserTokens(userId) {
  if (!pool) return false
  try {
    await pool.query(
      `INSERT INTO user_token_invalidation (user_id, invalidated_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET invalidated_at = NOW()`,
      [userId]
    )
    return true
  } catch {
    return false
  }
}

/**
 * Check if all tokens for a user have been blacklisted (password reset scenario).
 * Returns true if the token was issued before the user-level invalidation timestamp.
 */
export async function isUserTokenBlacklisted(userId, tokenIssuedAt) {
  if (!pool) return false
  try {
    const result = await pool.query(
      `SELECT invalidated_at FROM user_token_invalidation WHERE user_id = $1`,
      [userId]
    )
    if (result.rows.length === 0) return false
    const invalidatedAt = Math.floor(new Date(result.rows[0].invalidated_at).getTime() / 1000)
    return tokenIssuedAt <= invalidatedAt
  } catch {
    return false
  }
}

/**
 * Delete expired blacklist entries — call from the daily cron job.
 */
export async function cleanupExpiredBlacklist() {
  if (!pool) return
  await pool.query(`DELETE FROM token_blacklist WHERE expires_at < NOW()`)
}

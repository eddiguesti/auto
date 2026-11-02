import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { ApiError } from './errors.js'

const instantSql = column =>
  `CASE WHEN substr(${column}, -3) = '+00' THEN substr(${column}, 1, length(${column}) - 3) || 'Z' ELSE ${column} END`

export function createAuthRepository(db, { wallClockTimeZone }) {
  const codec = createMappedCodec('users', { wallClockTimeZone })
  return {
    async findByEmail(email) {
      return db
        .prepare(
          'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = ? AND deleted_at IS NULL'
        )
        .bind(email)
        .first()
    },
    async findById(id) {
      return db
        .prepare(
          'SELECT id,email,name,email_verified,google_id FROM users WHERE id=? AND deleted_at IS NULL'
        )
        .bind(id)
        .first()
    },
    async createRecoveryToken(userId, hash, now, kind) {
      const verification = kind === 'verification'
      const table = verification ? 'email_verification_tokens' : 'password_reset_tokens'
      const timestamp = timestampForStorage(new Date(now), 'timestamp')
      const expiry = timestampForStorage(
        new Date(now + (verification ? 24 : 1) * 3600000),
        'timestamp'
      )
      const window = new Date(now - (verification ? 5 : 15) * 60000).toISOString()
      const maximum = verification ? 2 : 3
      // The conditional INSERT serializes concurrent send limits in D1. Only a
      // successful insertion invalidates earlier tokens, in the same transaction.
      const result = await db.batch([
        db
          .prepare(
            `INSERT INTO ${table}(user_id,token_hash,expires_at,created_at)
          SELECT id,?,?,? FROM users WHERE id=? AND deleted_at IS NULL
          AND ${verification ? 'email_verified=0 AND google_id IS NULL' : 'password_hash IS NOT NULL'}
          AND (SELECT COUNT(*) FROM ${table} WHERE user_id=? AND julianday(${instantSql('created_at')}) > julianday(?)) < ?
          RETURNING id`
          )
          .bind(hash, expiry, timestamp, userId, userId, window, maximum),
        db
          .prepare(
            `UPDATE ${table} SET used_at=?
          WHERE changes()=1 AND user_id=? AND token_hash<>? AND used_at IS NULL`
          )
          .bind(timestamp, userId, hash)
      ])
      return result[0].results.length > 0
    },
    async findResetToken(hash, now) {
      return db
        .prepare(
          `SELECT t.id,t.user_id FROM password_reset_tokens t
        JOIN users u ON u.id=t.user_id AND u.deleted_at IS NULL AND u.password_hash IS NOT NULL
        WHERE t.token_hash=? AND t.used_at IS NULL
        AND julianday(${instantSql('t.expires_at')}) > julianday(?) ORDER BY t.id LIMIT 1`
        )
        .bind(hash, new Date(now).toISOString())
        .first()
    },
    async resetPassword({ tokenId, userId, hash, passwordHash, now }) {
      const wall = timestampForStorage(new Date(now), 'timestamp')
      const instant = timestampForStorage(new Date(now), 'instant')
      const result = await db.batch([
        db
          .prepare(
            `UPDATE password_reset_tokens SET used_at=?
          WHERE id=? AND user_id=? AND token_hash=? AND used_at IS NULL
          AND julianday(${instantSql('expires_at')}) > julianday(?)
          AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL AND password_hash IS NOT NULL)
          RETURNING user_id`
          )
          .bind(wall, tokenId, userId, hash, new Date(now).toISOString(), userId),
        db
          .prepare(
            `UPDATE users SET password_hash=?,updated_at=?
          WHERE changes()=1 AND id=? AND deleted_at IS NULL RETURNING id`
          )
          .bind(passwordHash, wall, userId),
        db
          .prepare(
            `INSERT INTO user_token_invalidation(user_id,invalidated_at)
          SELECT id,? FROM users WHERE changes()=1 AND id=? AND deleted_at IS NULL
          ON CONFLICT(user_id) DO UPDATE SET invalidated_at=CASE
            WHEN julianday(${instantSql('excluded.invalidated_at')})>julianday(${instantSql('user_token_invalidation.invalidated_at')})
            THEN excluded.invalidated_at ELSE user_token_invalidation.invalidated_at END`
          )
          .bind(instant, userId),
        db
          .prepare(
            `UPDATE password_reset_tokens SET used_at=? WHERE changes()=1 AND user_id=? AND used_at IS NULL`
          )
          .bind(wall, userId)
      ])
      // changes() guards are essential: another request may consume this token
      // at the same millisecond. A timestamp marker alone cannot serialize it.
      return result[0].results.length === 1 && result[1].results.length === 1
    },
    async register({ email, passwordHash, name, birthYear, verificationHash, now }) {
      const timestamp = timestampForStorage(new Date(now), 'timestamp')
      const expiry = timestampForStorage(new Date(now + 24 * 3600000), 'instant')
      let result
      try {
        result = await db.batch([
          db
            .prepare(
              `INSERT INTO users (email, password_hash, name, birth_year, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id, email, name, birth_year, avatar_url`
            )
            .bind(email, passwordHash, name, birthYear ?? null, timestamp, timestamp),
          db
            .prepare(
              `INSERT INTO user_game_state (user_id, game_mode_enabled, created_at, updated_at)
            SELECT id, 0, ?, ? FROM users WHERE email = ?`
            )
            .bind(timestamp, timestamp, email),
          db
            .prepare(
              `INSERT INTO user_collection_progress (user_id, collection_id)
            SELECT u.id, c.id FROM users u CROSS JOIN collections c WHERE u.email = ? AND c.is_active = 1`
            )
            .bind(email),
          db
            .prepare(
              `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, created_at)
            SELECT id, ?, ?, ? FROM users WHERE email = ?`
            )
            .bind(verificationHash, expiry, timestamp, email)
        ])
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed: users.email'))
          throw new ApiError(400, {
            error: 'Registration failed. Please try again or use a different email.'
          })
        throw error
      }
      return codec.decodeRow(result[0].results[0])
    },
    async verifyEmail(hash, now) {
      const timestamp = timestampForStorage(new Date(now), 'instant')
      const wall = timestampForStorage(new Date(now), 'timestamp')
      const result = await db.batch([
        db
          .prepare(
            `UPDATE email_verification_tokens SET used_at = ?
          WHERE token_hash = ? AND used_at IS NULL AND julianday(${instantSql('expires_at')}) > julianday(?)
          AND EXISTS(SELECT 1 FROM users WHERE id = email_verification_tokens.user_id AND deleted_at IS NULL)
          RETURNING user_id`
          )
          .bind(timestamp, hash, new Date(now).toISOString()),
        db
          .prepare(
            `UPDATE users SET email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?
          WHERE changes() = 1 AND deleted_at IS NULL AND id IN (SELECT user_id FROM email_verification_tokens WHERE token_hash = ? AND used_at = ?)`
          )
          .bind(wall, wall, hash, timestamp)
      ])
      return result[0].results.length > 0
    }
  }
}

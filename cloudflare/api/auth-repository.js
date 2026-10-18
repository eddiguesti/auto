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
          WHERE deleted_at IS NULL AND id IN (SELECT user_id FROM email_verification_tokens WHERE token_hash = ? AND used_at = ?)`
          )
          .bind(wall, wall, hash, timestamp)
      ])
      return result[0].results.length > 0
    }
  }
}

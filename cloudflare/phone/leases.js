import { timestampForStorage } from '../api/value-codecs.js'

const valid = (userId, leaseId) =>
  Number.isSafeInteger(userId) &&
  userId > 0 &&
  userId <= 2147483647 &&
  typeof leaseId === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(leaseId)

// Browser and telephone DOs share one authoritative D1 lease per account.
// Individual coordinators never clear another channel's lease on restart/close.
export async function reserveUserVoiceLease(db, userId, leaseId, expiresAt, now = Date.now()) {
  if (
    !valid(userId, leaseId) ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + 30 * 60_000
  )
    return false
  const row = await db
    .prepare(
      `INSERT INTO voice_connection_leases(user_id,lease_id,expires_at)
    SELECT id,?,? FROM users WHERE id = ? AND deleted_at IS NULL
    ON CONFLICT(user_id) DO UPDATE SET lease_id = excluded.lease_id,expires_at = excluded.expires_at
    WHERE voice_connection_leases.lease_id = excluded.lease_id OR julianday(replace(voice_connection_leases.expires_at,'+00','Z')) <= julianday(?) RETURNING user_id`
    )
    .bind(leaseId, timestampForStorage(expiresAt, 'instant'), userId, new Date(now).toISOString())
    .first()
  return Boolean(row)
}

export async function assertUserVoiceLease(db, userId, leaseId, now = Date.now()) {
  if (!valid(userId, leaseId) || !Number.isSafeInteger(now)) return false
  return Boolean(
    await db
      .prepare(
        `SELECT l.user_id FROM voice_connection_leases l JOIN users u ON u.id = l.user_id
    WHERE l.user_id = ? AND l.lease_id = ? AND u.deleted_at IS NULL AND julianday(replace(l.expires_at,'+00','Z')) > julianday(?)`
      )
      .bind(userId, leaseId, new Date(now).toISOString())
      .first()
  )
}

export async function releaseUserVoiceLease(db, userId, leaseId) {
  if (!valid(userId, leaseId)) return false
  return Boolean(
    await db
      .prepare(
        'DELETE FROM voice_connection_leases WHERE user_id = ? AND lease_id = ? RETURNING user_id'
      )
      .bind(userId, leaseId)
      .first()
  )
}

import { ApiError } from './errors.js'
import { timestampForStorage, timestampToApi } from './value-codecs.js'

export async function reserveAIUsage(db, userId, now) {
  const user = await db
    .prepare('SELECT premium_until FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userId)
    .first()
  if (!user) throw new ApiError(401, { error: 'Account unavailable' })
  if (
    user.premium_until &&
    new Date(timestampToApi(user.premium_until, 'timestamp', 'UTC')).getTime() > now
  )
    return
  const saved = await db
    .prepare(
      `INSERT INTO ai_usage (user_id, date, request_count, updated_at)
    SELECT id, ?, 1, ? FROM users WHERE id = ? AND deleted_at IS NULL
    ON CONFLICT (user_id, date) DO UPDATE SET request_count = ai_usage.request_count + 1, updated_at = excluded.updated_at
    WHERE ai_usage.request_count < 10 RETURNING request_count`
    )
    .bind(new Date(now).toISOString().slice(0, 10), timestampForStorage(now), userId)
    .first()
  if (!saved)
    throw new ApiError(403, {
      error: 'Daily AI limit reached. Upgrade to premium for unlimited access.',
      code: 'UPGRADE_REQUIRED'
    })
}

/** Per-user chargeable AI operations; ordinary reads and transcript saves are never metered. */
import { asyncHandler } from './asyncHandler.js'
import { AppError, ServiceUnavailableError, UnauthorizedError } from '../utils/errors.js'

const FREE_DAILY_AI_LIMIT = 10

export async function reserveAIUsage(db, userId) {
  if (!db) throw new ServiceUnavailableError('AI usage service')
  const userResult = await db.query(
    'SELECT premium_until FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  )
  const user = userResult.rows[0]
  if (!user) throw new UnauthorizedError('Account unavailable')
  if (user.premium_until && new Date(user.premium_until) > new Date()) return { isPremium: true }
  // At the limit, do not keep incrementing the counter on rejected requests.
  const result = await db.query(
    `INSERT INTO ai_usage (user_id, date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET request_count = ai_usage.request_count + 1, updated_at = NOW()
     WHERE ai_usage.request_count < $2
     RETURNING request_count`,
    [userId, FREE_DAILY_AI_LIMIT]
  )
  if (!result.rows[0]) {
    const error = new AppError(
      'Daily AI limit reached. Upgrade to premium for unlimited access.',
      403,
      'UPGRADE_REQUIRED'
    )
    throw error
  }
  return { aiUsageToday: result.rows[0].request_count }
}

export const checkAIQuota = asyncHandler(async (req, res, next) => {
  try {
    Object.assign(req, await reserveAIUsage(req.app.locals.db, req.user?.id))
    next()
  } catch (error) {
    if (error.code !== 'UPGRADE_REQUIRED') throw error
    res.status(403).json({ error: error.message, code: error.code, limit: FREE_DAILY_AI_LIMIT })
  }
})

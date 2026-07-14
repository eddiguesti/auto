/**
 * AI quota enforcement middleware.
 * Tracks per-user daily AI usage in Postgres (survives restarts and multi-instance).
 * Free users: limited daily requests. Premium users: unlimited (still rate-limited per-minute).
 */

import { asyncHandler } from './asyncHandler.js'

const FREE_DAILY_AI_LIMIT = 10

export async function consumeAIQuota(db, userId) {
  const userResult = await db.query(
    'SELECT premium_until FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  )
  if (userResult.rows.length === 0) return { allowed: false, reason: 'unauthorized' }

  const premiumUntil = userResult.rows[0].premium_until
  const isPremium = premiumUntil && new Date(premiumUntil) > new Date()
  if (isPremium) return { allowed: true, isPremium: true }

  const result = await db.query(
    `INSERT INTO ai_usage (user_id, date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET request_count = ai_usage.request_count + 1, updated_at = NOW()
     RETURNING request_count`,
    [userId]
  )
  const count = result.rows[0].request_count
  return { allowed: count <= FREE_DAILY_AI_LIMIT, isPremium: false, count }
}

export const checkAIQuota = asyncHandler(async (req, res, next) => {
  const db = req.app.locals.db
  const userId = req.user?.id

  if (!userId || !db) {
    return next()
  }

  const result = await consumeAIQuota(db, userId)
  if (result.isPremium) {
    req.isPremium = true
    return next()
  }
  if (!result.allowed) {
    return res.status(403).json({
      error:
        result.reason === 'unauthorized'
          ? 'Authentication required.'
          : 'Daily AI limit reached. Upgrade to premium for unlimited access.',
      code: result.reason === 'unauthorized' ? 'UNAUTHORIZED' : 'UPGRADE_REQUIRED',
      limit: FREE_DAILY_AI_LIMIT,
      used: result.count
    })
  }

  req.aiUsageToday = result.count
  next()
})

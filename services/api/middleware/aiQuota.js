/**
 * AI quota enforcement middleware.
 * Tracks per-user daily AI usage in Postgres (survives restarts and multi-instance).
 * Free users: limited daily requests. Premium users: unlimited (still rate-limited per-minute).
 */

import { asyncHandler } from './asyncHandler.js'

const FREE_DAILY_AI_LIMIT = 10

export const checkAIQuota = asyncHandler(async (req, res, next) => {
  const db = req.app.locals.db
  const userId = req.user?.id

  if (!userId || !db) {
    return next()
  }

  // Check premium status
  const userResult = await db.query('SELECT premium_until FROM users WHERE id = $1', [userId])

  const premiumUntil = userResult.rows[0]?.premium_until
  const isPremium = premiumUntil && new Date(premiumUntil) > new Date()

  if (isPremium) {
    req.isPremium = true
    return next()
  }

  // Atomic increment for free user — upsert avoids race conditions
  const result = await db.query(
    `INSERT INTO ai_usage (user_id, date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET request_count = ai_usage.request_count + 1, updated_at = NOW()
     RETURNING request_count`,
    [userId]
  )

  const count = result.rows[0].request_count

  if (count > FREE_DAILY_AI_LIMIT) {
    return res.status(403).json({
      error: 'Daily AI limit reached. Upgrade to premium for unlimited access.',
      code: 'UPGRADE_REQUIRED',
      limit: FREE_DAILY_AI_LIMIT,
      used: count
    })
  }

  req.aiUsageToday = count
  next()
})

// /life-story/services/api/routes/game/streaks.js

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { gameRepository } from '../../repositories/gameRepository.js'

const router = Router()

/**
 * POST /api/game/streak/use-shield
 * Use a streak shield to protect streak after missing a day
 */
router.post(
  '/streak/use-shield',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const db = req.app.locals.db

    const updated = await gameRepository.useStreakShield(db, userId)

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'No streak shields available'
      })
    }

    const { streak_shields_available, current_streak } = updated

    // Record in history
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    await gameRepository.recordStreakHistory(db, userId, yesterdayStr, {
      hadActivity: false,
      streak: current_streak,
      shieldUsed: true
    })

    res.json({
      success: true,
      message: 'Streak shield activated',
      shieldsRemaining: streak_shields_available
    })
  })
)

/**
 * GET /api/game/streak/history
 * Get streak history for visualization
 */
router.get(
  '/streak/history',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const db = req.app.locals.db

    // Validate and sanitize days parameter (between 1 and 365)
    const rawDays = parseInt(req.query.days) || 30
    const days = Math.min(Math.max(rawDays, 1), 365)

    const history = await gameRepository.getStreakHistory(db, userId, days)

    res.json({
      success: true,
      data: history
    })
  })
)

export default router

// /life-story/services/api/routes/game/index.js

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import stateRouter from './state.js'
import streaksRouter from './streaks.js'
import achievementsRouter from './achievements.js'
import challengesRouter from './challenges.js'
import collectionsRouter from './collections.js'
import circlesRouter from './circles.js'
import circlePromptsRouter from './circlePrompts.js'

const router = Router()

// Mount all sub-routers (authentication is applied at the mount point in services/api/index.js)
router.use(stateRouter)
router.use(streaksRouter)
router.use(achievementsRouter)
router.use(challengesRouter)
router.use(collectionsRouter)
router.use(circlesRouter)
router.use(circlePromptsRouter)

// ============== Admin/Dev Endpoints ==============

/**
 * POST /api/game/admin/trigger-daily
 * Manually trigger daily tasks (for testing)
 */
router.post(
  '/admin/trigger-daily',
  asyncHandler(async (req, res) => {
    // TODO: Add proper admin role check
    // For now, just allow authenticated users to trigger in dev
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Admin only' })
    }

    const { runDailyTasks } = await import('../../cron/dailyTasks.js')
    await runDailyTasks()
    res.json({ success: true, message: 'Daily tasks triggered' })
  })
)

/**
 * POST /api/game/admin/trigger-weekly
 * Manually trigger weekly tasks (for testing)
 */
router.post(
  '/admin/trigger-weekly',
  asyncHandler(async (req, res) => {
    // TODO: Add proper admin role check
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Admin only' })
    }

    const { runWeeklyTasks } = await import('../../cron/weeklyTasks.js')
    await runWeeklyTasks()
    res.json({ success: true, message: 'Weekly tasks triggered' })
  })
)

// Re-export getOrCreateGameState for backward compatibility
export { getOrCreateGameState } from '../../services/gameService.js'

export default router

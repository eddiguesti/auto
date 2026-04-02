// /life-story/services/api/routes/game/state.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { invalidateUserCache } from '../../utils/cache.js'
import { getOrCreateGameState } from '../../services/gameService.js'
import { gameRepository } from '../../repositories/gameRepository.js'

const router = Router()

/**
 * GET /api/game/state
 * Get user's complete game state including streak, stats, and settings
 */
router.get(
  '/state',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const today = new Date().toISOString().split('T')[0]

    // OPTIMIZED: Run all queries in parallel instead of sequentially
    const [
      gameState,
      todayPrompt,
      recentAchievements,
      memoryCounts,
      entityCounts,
      collectionProgress,
      familyCircle,
      pendingFamilyPrompts
    ] = await Promise.all([
      // Get or create game state
      getOrCreateGameState(userId),

      // Get today's prompt status
      pool.query(
        `SELECT id, prompt_text, prompt_hint, prompt_type, prompt_category, status
       FROM daily_prompts
       WHERE user_id = $1 AND prompt_date = $2`,
        [userId, today]
      ),

      // Get recent achievements (unseen)
      pool.query(
        `SELECT achievement_key, achievement_name, achievement_description, achievement_icon, earned_at
       FROM achievements
       WHERE user_id = $1 AND seen_by_user = false
       ORDER BY earned_at DESC
       LIMIT 5`,
        [userId]
      ),

      // Get memory counts
      pool.query(
        `SELECT
         COUNT(*) as total_stories,
         COUNT(DISTINCT chapter_id) as chapters_started
       FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
        [userId]
      ),

      // Get people and places from memory graph
      pool.query(
        `SELECT entity_type, COUNT(*) as count
       FROM memory_entities
       WHERE user_id = $1
       GROUP BY entity_type`,
        [userId]
      ),

      // Get collection progress summary
      pool.query(
        `SELECT
         c.collection_key,
         c.collection_name,
         c.collection_icon,
         c.required_items,
         COALESCE(ucp.items_completed, 0) as items_completed,
         COALESCE(ucp.is_complete, false) as is_complete
       FROM collections c
       LEFT JOIN user_collection_progress ucp ON c.id = ucp.collection_id AND ucp.user_id = $1
       WHERE c.is_active = true
       ORDER BY c.display_order`,
        [userId]
      ),

      // Get family circle info if exists
      pool.query(
        `SELECT mc.id, mc.circle_name,
         (SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = mc.id) as member_count
       FROM memory_circles mc
       WHERE mc.owner_user_id = $1
       UNION
       SELECT mc.id, mc.circle_name,
         (SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = mc.id) as member_count
       FROM memory_circle_members mcm
       JOIN memory_circles mc ON mcm.circle_id = mc.id
       WHERE mcm.user_id = $1`,
        [userId]
      ),

      // Get pending family prompts
      pool.query(
        `SELECT COUNT(*) as count
       FROM family_prompts
       WHERE for_user_id = $1 AND status = 'pending'`,
        [userId]
      )
    ])

    const entities = {}
    entityCounts.rows.forEach(row => {
      entities[row.entity_type] = parseInt(row.count)
    })

    res.json({
      success: true,
      data: {
        gameMode: {
          enabled: gameState.game_mode_enabled,
          canSwitch: true
        },
        streak: {
          current: gameState.current_streak,
          longest: gameState.longest_streak,
          lastActivity: gameState.last_activity_date,
          shieldsAvailable: gameState.streak_shields_available,
          shieldsUsedThisWeek: gameState.streak_shields_used_this_week
        },
        todaysPrompt: todayPrompt.rows[0] || null,
        stats: {
          totalMemories: parseInt(memoryCounts.rows[0]?.total_stories || 0),
          chaptersStarted: parseInt(memoryCounts.rows[0]?.chapters_started || 0),
          peopleCount: entities.person || 0,
          placesCount: entities.place || 0,
          promptsCompletedThisWeek: gameState.prompts_completed_this_week
        },
        collections: collectionProgress.rows,
        recentAchievements: recentAchievements.rows,
        familyCircle: familyCircle.rows[0] || null,
        pendingFamilyPrompts: parseInt(pendingFamilyPrompts.rows[0]?.count || 0),
        settings: {
          notificationPreferences: gameState.notification_preferences,
          preferredPromptTime: gameState.preferred_prompt_time,
          timezone: gameState.timezone
        }
      }
    })
  })
)

/**
 * POST /api/game/enable
 * Enable game mode for user
 */
router.post(
  '/enable',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const db = req.app.locals.db

    await gameRepository.setGameMode(db, userId, true)

    invalidateUserCache(userId)
    res.json({ success: true, message: 'Memory Quest mode enabled' })
  })
)

/**
 * POST /api/game/disable
 * Disable game mode (return to classic mode)
 */
router.post(
  '/disable',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const db = req.app.locals.db

    await gameRepository.setGameMode(db, userId, false)

    invalidateUserCache(userId)
    res.json({ success: true, message: 'Returned to Classic mode' })
  })
)

/**
 * PUT /api/game/settings
 * Update game settings
 */
router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const db = req.app.locals.db
    const { notificationPreferences, preferredPromptTime, timezone } = req.body

    await gameRepository.updateSettings(db, userId, {
      notificationPreferences,
      preferredPromptTime,
      timezone
    })

    invalidateUserCache(userId)
    res.json({ success: true, message: 'Settings updated' })
  })
)

export default router

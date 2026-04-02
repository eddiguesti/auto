// /life-story/services/api/routes/game/challenges.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import validate from '../../middleware/validate.js'
import { gameSchemas } from '../../schemas/index.js'
import { createDailyPrompt } from '../../utils/promptSelector.js'
import { recordActivity, syncMemoryCounts } from '../../utils/gameStateManager.js'
import { invalidateUserCache } from '../../utils/cache.js'
import { checkAndAwardAchievements, updateCollectionProgress } from '../../services/gameService.js'

const router = Router()

/**
 * GET /api/game/prompt/today
 * Get today's prompt (creates one if doesn't exist)
 */
router.get(
  '/prompt/today',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Get or create today's prompt
    const prompt = await createDailyPrompt(userId)

    res.json({
      success: true,
      data: {
        id: prompt.id,
        date: prompt.prompt_date,
        type: prompt.prompt_type,
        category: prompt.prompt_category,
        text: prompt.prompt_text,
        hint: prompt.prompt_hint,
        linkedChapter: prompt.linked_chapter_id,
        linkedQuestion: prompt.linked_question_id,
        status: prompt.status,
        estimatedMinutes:
          prompt.prompt_type === 'quick' ? 2 : prompt.prompt_type === 'story' ? 7 : 12
      }
    })
  })
)

/**
 * POST /api/game/prompt/:promptId/complete
 * Complete a daily prompt with an answer
 */
router.post(
  '/prompt/:promptId/complete',
  validate(gameSchemas.completePrompt),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.validatedParams
    const { answer } = req.validatedBody

    // Get the prompt
    const prompt = await pool.query(
      `SELECT id, user_id, prompt_date, prompt_text, prompt_type, chapter_id, question_id, is_completed, completed_at, xp_awarded, created_at
       FROM daily_prompts WHERE id = $1 AND user_id = $2`,
      [promptId, userId]
    )

    if (prompt.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      })
    }

    const promptData = prompt.rows[0]

    if (promptData.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Prompt already completed'
      })
    }

    const startTime = promptData.created_at
    const endTime = new Date()
    const timeToComplete = Math.round((endTime - new Date(startTime)) / 1000)
    const wordCount = answer.trim().split(/\s+/).length

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Save the answer to stories table if linked to a question
      let storyId = null
      if (promptData.linked_chapter_id && promptData.linked_question_id) {
        const storyResult = await client.query(
          `INSERT INTO stories (user_id, chapter_id, question_id, answer)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, chapter_id, question_id)
         DO UPDATE SET answer = EXCLUDED.answer, updated_at = NOW()
         RETURNING id`,
          [userId, promptData.linked_chapter_id, promptData.linked_question_id, answer]
        )
        storyId = storyResult.rows[0].id
      } else {
        // Save as a standalone story entry
        const storyResult = await client.query(
          `INSERT INTO stories (user_id, chapter_id, question_id, answer)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
          [userId, 'daily-prompts', `prompt-${promptId}`, answer]
        )
        storyId = storyResult.rows[0].id
      }

      // Update the prompt status
      await client.query(
        `UPDATE daily_prompts
       SET status = 'completed',
           answered_at = NOW(),
           answer_story_id = $1,
           time_to_complete_seconds = $2,
           word_count = $3
       WHERE id = $4`,
        [storyId, timeToComplete, wordCount, promptId]
      )

      await client.query('COMMIT')

      // Invalidate cache since game state changed
      invalidateUserCache(userId)

      // Record activity and update streak (outside transaction)
      const streakResult = await recordActivity(userId)

      // Sync memory counts
      await syncMemoryCounts(userId)

      // Check for new achievements
      const newAchievements = await checkAndAwardAchievements(userId, {
        type: 'prompt_completed',
        streak: streakResult.currentStreak,
        wordCount
      })

      // Check collection progress
      if (promptData.linked_question_id) {
        await updateCollectionProgress(
          userId,
          promptData.linked_chapter_id,
          promptData.linked_question_id
        )
      }

      res.json({
        success: true,
        data: {
          storyId,
          streak: {
            current: streakResult.currentStreak,
            isNewRecord: streakResult.isNewRecord
          },
          stats: {
            timeToComplete,
            wordCount
          },
          newAchievements,
          celebration: {
            type: streakResult.isNewRecord ? 'new_record' : 'memory_saved',
            message: streakResult.isNewRecord
              ? `New record! ${streakResult.currentStreak} days in a row!`
              : 'Memory preserved forever.'
          }
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })
)

/**
 * POST /api/game/prompt/:promptId/skip
 * Skip today's prompt (preserves streak for grace period)
 */
router.post(
  '/prompt/:promptId/skip',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.params
    const { reason } = req.body

    // Update prompt status
    await pool.query(
      `UPDATE daily_prompts
     SET status = 'skipped',
         skipped_at = NOW(),
         skip_reason = $1
     WHERE id = $2 AND user_id = $3`,
      [reason || 'user_skipped', promptId, userId]
    )

    res.json({
      success: true,
      message: 'Prompt skipped. Complete tomorrow to maintain your streak!',
      streakAtRisk: true
    })
  })
)

/**
 * GET /api/game/prompts/history
 * Get history of past prompts
 */
router.get(
  '/prompts/history',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Validate and sanitize pagination parameters
    const rawLimit = parseInt(req.query.limit) || 20
    const rawOffset = parseInt(req.query.offset) || 0
    const limit = Math.min(Math.max(rawLimit, 1), 100) // Max 100 items
    const offset = Math.max(rawOffset, 0)

    const prompts = await pool.query(
      `SELECT
       dp.id, dp.prompt_date, dp.prompt_type, dp.prompt_category,
       dp.prompt_text, dp.status, dp.answered_at, dp.word_count,
       s.answer
     FROM daily_prompts dp
     LEFT JOIN stories s ON dp.answer_story_id = s.id
     WHERE dp.user_id = $1
     ORDER BY dp.prompt_date DESC
     LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const total = await pool.query(`SELECT COUNT(*) FROM daily_prompts WHERE user_id = $1`, [
      userId
    ])

    res.json({
      success: true,
      data: {
        prompts: prompts.rows,
        total: parseInt(total.rows[0].count),
        limit,
        offset
      }
    })
  })
)

export default router

// /life-story/services/api/routes/game/circlePrompts.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import validate from '../../middleware/validate.js'
import { circlePromptSchemas } from '../../schemas/index.js'
import { recordActivity } from '../../utils/gameStateManager.js'
import { awardAchievement } from '../../services/gameService.js'

const router = Router()

// ============================================
// FAMILY PROMPTS ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/prompt
 * Send a prompt to another family member
 */
router.post(
  '/circle/prompt',
  validate(circlePromptSchemas.send),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { forUserId, promptText, promptNote } = req.validatedBody

    // Check both users are in the same circle
    const membership = await pool.query(
      `SELECT mcm1.circle_id
     FROM memory_circle_members mcm1
     JOIN memory_circle_members mcm2 ON mcm1.circle_id = mcm2.circle_id
     WHERE mcm1.user_id = $1 AND mcm2.user_id = $2`,
      [userId, forUserId]
    )

    if (membership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only send prompts to members of your circle'
      })
    }

    const circleId = membership.rows[0].circle_id

    // Create the prompt
    const prompt = await pool.query(
      `INSERT INTO family_prompts (circle_id, from_user_id, for_user_id, prompt_text, prompt_note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
      [circleId, userId, forUserId, promptText, promptNote || null]
    )

    res.json({
      success: true,
      data: prompt.rows[0]
    })
  })
)

/**
 * GET /api/game/circle/prompts
 * Get prompts sent to and from user
 */
router.get(
  '/circle/prompts',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Prompts received
    const received = await pool.query(
      `SELECT fp.*, u.name as from_user_name, u.avatar_url as from_user_avatar
     FROM family_prompts fp
     JOIN users u ON fp.from_user_id = u.id
     WHERE fp.for_user_id = $1
     ORDER BY fp.created_at DESC
     LIMIT 20`,
      [userId]
    )

    // Prompts sent
    const sent = await pool.query(
      `SELECT fp.*, u.name as for_user_name, u.avatar_url as for_user_avatar
     FROM family_prompts fp
     JOIN users u ON fp.for_user_id = u.id
     WHERE fp.from_user_id = $1
     ORDER BY fp.created_at DESC
     LIMIT 20`,
      [userId]
    )

    res.json({
      success: true,
      data: {
        received: received.rows,
        sent: sent.rows
      }
    })
  })
)

/**
 * POST /api/game/circle/prompt/:promptId/answer
 * Answer a family prompt
 */
router.post(
  '/circle/prompt/:promptId/answer',
  validate(circlePromptSchemas.answer),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.validatedParams
    const { answer } = req.validatedBody

    // Get the prompt
    const prompt = await pool.query(
      'SELECT id, for_user_id, from_member_id, prompt_text, answer, is_completed, created_at, updated_at FROM family_prompts WHERE id = $1 AND for_user_id = $2',
      [promptId, userId]
    )

    if (prompt.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      })
    }

    if (prompt.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Prompt already answered or declined'
      })
    }

    // Save as a story
    const story = await pool.query(
      `INSERT INTO stories (user_id, chapter_id, question_id, answer)
     VALUES ($1, 'family-prompts', $2, $3)
     RETURNING id`,
      [userId, `family-${promptId}`, answer]
    )

    // Update prompt status
    await pool.query(
      `UPDATE family_prompts
     SET status = 'answered', answered_story_id = $1, answered_at = NOW()
     WHERE id = $2`,
      [story.rows[0].id, promptId]
    )

    // Record activity
    await recordActivity(userId)

    // Award achievement
    await awardAchievement(userId, 'family_prompt')

    res.json({
      success: true,
      data: {
        storyId: story.rows[0].id
      }
    })
  })
)

/**
 * POST /api/game/circle/prompt/:promptId/decline
 * Decline a family prompt
 */
router.post(
  '/circle/prompt/:promptId/decline',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.params

    await pool.query(
      `UPDATE family_prompts
     SET status = 'declined', declined_at = NOW()
     WHERE id = $1 AND for_user_id = $2 AND status = 'pending'`,
      [promptId, userId]
    )

    res.json({ success: true })
  })
)

// ============================================
// ENCOURAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/encourage
 * Send encouragement to a family member
 */
router.post(
  '/circle/encourage',
  validate(circlePromptSchemas.encourage),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { forUserId, type = 'heart', message, relatedStoryId } = req.validatedBody

    // Check in same circle
    const membership = await pool.query(
      `SELECT mcm1.circle_id
     FROM memory_circle_members mcm1
     JOIN memory_circle_members mcm2 ON mcm1.circle_id = mcm2.circle_id
     WHERE mcm1.user_id = $1 AND mcm2.user_id = $2`,
      [userId, forUserId]
    )

    if (membership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only encourage members of your circle'
      })
    }

    await pool.query(
      `INSERT INTO family_encouragements (circle_id, from_user_id, for_user_id, encouragement_type, message, related_story_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
      [membership.rows[0].circle_id, userId, forUserId, type, message, relatedStoryId]
    )

    res.json({ success: true })
  })
)

/**
 * GET /api/game/circle/encouragements
 * Get encouragements received
 */
router.get(
  '/circle/encouragements',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { unreadOnly = false } = req.query

    let query
    let params

    if (unreadOnly === 'true') {
      query = `
      SELECT fe.*, u.name as from_user_name, u.avatar_url as from_user_avatar
      FROM family_encouragements fe
      JOIN users u ON fe.from_user_id = u.id
      WHERE fe.for_user_id = $1 AND fe.seen_by_recipient = $2
      ORDER BY fe.created_at DESC LIMIT 50
    `
      params = [userId, false]
    } else {
      query = `
      SELECT fe.*, u.name as from_user_name, u.avatar_url as from_user_avatar
      FROM family_encouragements fe
      JOIN users u ON fe.from_user_id = u.id
      WHERE fe.for_user_id = $1
      ORDER BY fe.created_at DESC LIMIT 50
    `
      params = [userId]
    }

    const encouragements = await pool.query(query, params)

    res.json({
      success: true,
      data: encouragements.rows
    })
  })
)

/**
 * POST /api/game/circle/encouragements/mark-seen
 * Mark encouragements as seen
 */
router.post(
  '/circle/encouragements/mark-seen',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    await pool.query(
      `UPDATE family_encouragements
     SET seen_by_recipient = true
     WHERE for_user_id = $1 AND seen_by_recipient = false`,
      [userId]
    )

    res.json({ success: true })
  })
)

export default router

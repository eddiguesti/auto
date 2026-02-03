import { Router } from 'express'
import { sanitizeForPrompt, checkRateLimit } from '../utils/security.js'
import { grokChat } from '../services/grokService.js'
import { buildStylePrompt } from '@easy-memoir/shared/style'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('style')

// GET /api/style/preferences - Get saved style preferences
router.get('/preferences', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  const result = await db.query(
    'SELECT * FROM user_style_preferences WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    return res.json({
      tones: [],
      narrative: null,
      authorStyle: null,
      appliedAt: null
    })
  }

  const prefs = result.rows[0]
  res.json({
    tones: prefs.tones || [],
    narrative: prefs.narrative,
    authorStyle: prefs.author_style,
    appliedAt: prefs.applied_at
  })
}))

// POST /api/style/preferences - Save style preferences
router.post('/preferences', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { tones, narrative, authorStyle } = req.body

  // Upsert preferences
  await db.query(`
    INSERT INTO user_style_preferences (user_id, tones, narrative, author_style, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id)
    DO UPDATE SET tones = $2, narrative = $3, author_style = $4, updated_at = CURRENT_TIMESTAMP
  `, [userId, tones || [], narrative, authorStyle])

  res.json({ success: true })
}))

// POST /api/style/preview - Preview a single story in selected style
router.post('/preview', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { storyId, tones, narrative, authorStyle } = req.body

  // Rate limiting
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  // Get the story
  const storyResult = await db.query(
    'SELECT * FROM stories WHERE id = $1 AND user_id = $2',
    [storyId, userId]
  )

  if (storyResult.rows.length === 0) {
    return res.status(404).json({ error: 'Story not found' })
  }

  const story = storyResult.rows[0]
  const originalText = story.original_answer || story.answer

  if (!originalText || !originalText.trim()) {
    return res.status(400).json({ error: 'Story has no content to transform' })
  }

  // Build the prompt and transform
  const stylePrompt = buildStylePrompt(tones, narrative, authorStyle)
  const safeText = sanitizeForPrompt(originalText, 5000)

  const result = await grokChat({
    systemPrompt: stylePrompt,
    userPrompt: safeText,
    maxTokens: 1500,
    temperature: 0.7
  })

  const transformedText = result.content || originalText

  res.json({
    original: originalText,
    transformed: transformedText,
    storyId: story.id
  })
}))

// POST /api/style/apply-all - Apply style to all stories permanently
router.post('/apply-all', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { tones, narrative, authorStyle } = req.body

  // Rate limiting (stricter for batch operations)
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  // Get all stories with content
  const storiesResult = await db.query(
    "SELECT * FROM stories WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''",
    [userId]
  )

    const stories = storiesResult.rows
    if (stories.length === 0) {
      return res.status(400).json({ error: 'No stories to transform' })
    }

    const stylePrompt = buildStylePrompt(tones, narrative, authorStyle)
    const styleDescription = [
      ...(tones || []),
      narrative,
      authorStyle
    ].filter(Boolean).join(', ')

    let transformedCount = 0
    const errors = []

    // Transform each story
    for (const story of stories) {
      try {
        // Use original_answer if it exists (for re-styling), otherwise use current answer
        const originalText = story.original_answer || story.answer

        if (!originalText || !originalText.trim()) continue

        const safeText = sanitizeForPrompt(originalText, 5000)

        const result = await grokChat({
          systemPrompt: stylePrompt,
          userPrompt: safeText,
          maxTokens: 1500,
          temperature: 0.7
        })

        const transformedText = result.content

        if (transformedText && transformedText.trim()) {
          // Save original (only if not already saved) and update with transformed
          await db.query(`
            UPDATE stories
            SET original_answer = COALESCE(original_answer, answer),
                answer = $1,
                style_applied = $2,
                style_applied_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [transformedText, styleDescription, story.id])

          transformedCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (storyErr) {
        logger.error('Error transforming story', { storyId: story.id, error: storyErr.message, requestId: req.id })
        errors.push({ storyId: story.id, error: storyErr.message })
      }
    }

    // Update preferences with applied timestamp
    await db.query(`
      INSERT INTO user_style_preferences (user_id, tones, narrative, author_style, applied_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET tones = $2, narrative = $3, author_style = $4, applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    `, [userId, tones || [], narrative, authorStyle])

  res.json({
    success: true,
    transformedCount,
    totalStories: stories.length,
    errors: errors.length > 0 ? errors : undefined
  })
}))

// POST /api/style/revert - Revert all stories to original
router.post('/revert', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Revert all stories that have original_answer saved
  const result = await db.query(`
    UPDATE stories
    SET answer = original_answer,
        style_applied = NULL,
        style_applied_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND original_answer IS NOT NULL
    RETURNING id
  `, [userId])

  // Clear applied_at from preferences
  await db.query(`
    UPDATE user_style_preferences
    SET applied_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
  `, [userId])

  res.json({
    success: true,
    revertedCount: result.rows.length
  })
}))

export default router

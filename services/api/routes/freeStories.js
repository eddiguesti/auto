import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { freeStorySchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('free-stories')

const router = Router()

// Get all free stories for user
router.get(
  '/',
  requireDb,
  validate(freeStorySchemas.list),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { limit, offset } = req.validatedQuery

    const result = await db.query(
      `SELECT id, title, content, created_at, updated_at
       FROM free_stories
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    res.json({ success: true, data: result.rows })
  })
)

// Get single free story
router.get(
  '/:id',
  requireDb,
  validate(freeStorySchemas.byId),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = req.validatedParams.id

    const result = await db.query(
      `SELECT id, title, content, created_at, updated_at
       FROM free_stories
       WHERE id = $1 AND user_id = $2`,
      [storyId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Story not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  })
)

// Create new free story
router.post(
  '/',
  requireDb,
  validate(freeStorySchemas.create),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { title, content } = req.validatedBody

    const result = await db.query(
      `INSERT INTO free_stories (user_id, title, content, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, content, created_at, updated_at`,
      [userId, title || null, content]
    )

    logger.info('Created free story', { userId, storyId: result.rows[0].id })

    res.status(201).json({ success: true, data: result.rows[0] })
  })
)

// Update free story
router.put(
  '/:id',
  requireDb,
  validate(freeStorySchemas.update),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = req.validatedParams.id
    const { title, content } = req.validatedBody

    // Check ownership
    const check = await db.query('SELECT id FROM free_stories WHERE id = $1 AND user_id = $2', [
      storyId,
      userId
    ])
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Story not found' })
    }

    const updates = []
    const values = []
    let paramIdx = 1

    if (title !== undefined) {
      updates.push(`title = $${paramIdx++}`)
      values.push(title || null)
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIdx++}`)
      values.push(content)
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    values.push(storyId, userId)

    const result = await db.query(
      `UPDATE free_stories
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx++} AND user_id = $${paramIdx}
       RETURNING id, title, content, created_at, updated_at`,
      values
    )

    logger.info('Updated free story', { userId, storyId })

    res.json({ success: true, data: result.rows[0] })
  })
)

// Delete free story
router.delete(
  '/:id',
  requireDb,
  validate(freeStorySchemas.byId),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = req.validatedParams.id

    const check = await db.query('SELECT id FROM free_stories WHERE id = $1 AND user_id = $2', [
      storyId,
      userId
    ])
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Story not found' })
    }

    await db.query('DELETE FROM free_stories WHERE id = $1 AND user_id = $2', [storyId, userId])

    logger.info('Deleted free story', { userId, storyId })

    res.json({ success: true })
  })
)

export default router

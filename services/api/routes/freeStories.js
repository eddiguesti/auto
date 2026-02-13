import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('free-stories')

const router = Router()

// Get all free stories for user
router.get(
  '/',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)

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
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = parseInt(req.params.id)

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
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { title, content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' })
    }

    if (content.length > 100000) {
      return res
        .status(400)
        .json({ success: false, error: 'Content too long (max 100,000 characters)' })
    }

    if (title && title.length > 200) {
      return res.status(400).json({ success: false, error: 'Title too long (max 200 characters)' })
    }

    const result = await db.query(
      `INSERT INTO free_stories (user_id, title, content, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, content, created_at, updated_at`,
      [userId, title?.trim() || null, content.trim()]
    )

    logger.info('Created free story', { userId, storyId: result.rows[0].id })

    res.status(201).json({ success: true, data: result.rows[0] })
  })
)

// Update free story
router.put(
  '/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = parseInt(req.params.id)
    const { title, content } = req.body

    // Check ownership
    const check = await db.query('SELECT id FROM free_stories WHERE id = $1 AND user_id = $2', [
      storyId,
      userId
    ])
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Story not found' })
    }

    if (content !== undefined && (!content || !content.trim())) {
      return res.status(400).json({ success: false, error: 'Content cannot be empty' })
    }

    if (content && content.length > 100000) {
      return res
        .status(400)
        .json({ success: false, error: 'Content too long (max 100,000 characters)' })
    }

    const updates = []
    const values = []
    let paramIdx = 1

    if (title !== undefined) {
      updates.push(`title = $${paramIdx++}`)
      values.push(title?.trim() || null)
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIdx++}`)
      values.push(content.trim())
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
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const storyId = parseInt(req.params.id)

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

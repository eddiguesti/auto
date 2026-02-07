import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('memos')

const router = Router()

// Get all memos for user
router.get(
  '/',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const result = await db.query(
      `
      SELECT id, title, audio_url, transcript, duration, created_at, updated_at
      FROM memos
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset]
    )

    res.json({ success: true, data: result.rows })
  })
)

// Get single memo
router.get(
  '/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const memoId = parseInt(req.params.id)

    const result = await db.query(
      `
      SELECT id, title, audio_url, transcript, duration, created_at, updated_at
      FROM memos
      WHERE id = $1 AND user_id = $2
    `,
      [memoId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Memo not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  })
)

// Create new memo
router.post(
  '/',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { title, audio_url, transcript, duration } = req.body

    if (!audio_url) {
      return res.status(400).json({ success: false, error: 'audio_url is required' })
    }

    const result = await db.query(
      `
      INSERT INTO memos (user_id, title, audio_url, transcript, duration, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, title, audio_url, transcript, duration, created_at, updated_at
    `,
      [userId, title || null, audio_url, transcript || null, duration || null]
    )

    logger.info('Created memo', { userId, memoId: result.rows[0].id })

    res.status(201).json({ success: true, data: result.rows[0] })
  })
)

// Update memo (title only for now)
router.put(
  '/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const memoId = parseInt(req.params.id)
    const { title } = req.body

    // Check ownership
    const check = await db.query('SELECT id FROM memos WHERE id = $1 AND user_id = $2', [
      memoId,
      userId
    ])
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Memo not found' })
    }

    const result = await db.query(
      `
      UPDATE memos
      SET title = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING id, title, audio_url, transcript, duration, created_at, updated_at
    `,
      [title, memoId, userId]
    )

    logger.info('Updated memo', { userId, memoId })

    res.json({ success: true, data: result.rows[0] })
  })
)

// Delete memo
router.delete(
  '/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const memoId = parseInt(req.params.id)

    // Check ownership
    const check = await db.query('SELECT id FROM memos WHERE id = $1 AND user_id = $2', [
      memoId,
      userId
    ])
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Memo not found' })
    }

    await db.query('DELETE FROM memos WHERE id = $1 AND user_id = $2', [memoId, userId])

    logger.info('Deleted memo', { userId, memoId })

    res.json({ success: true })
  })
)

export default router

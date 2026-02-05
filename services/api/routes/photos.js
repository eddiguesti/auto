import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, unlinkSync, mkdirSync } from 'fs'
import crypto from 'crypto'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { authenticateToken } from '../middleware/auth.js'
import { createLogger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()
const logger = createLogger('photos')

// Ensure uploads directory exists (root/uploads from services/api/routes/)
const uploadsDir = join(__dirname, '..', '..', '..', 'uploads')
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
  logger.info('Created uploads directory', { path: uploadsDir })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex')
    cb(null, `${Date.now()}-${uniqueSuffix}${extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'), false)
    }
  }
})

// Upload a photo
router.post('/', upload.single('photo'), async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { story_id, caption } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  if (!db) {
    if (req.file) unlinkSync(req.file.path)
    return res.status(503).json({ error: 'Database not available' })
  }

  if (!story_id) {
    if (req.file) unlinkSync(req.file.path)
    return res.status(400).json({ error: 'Missing story_id' })
  }

  try {
    // Verify user owns this story
    const storyCheck = await db.query('SELECT id FROM stories WHERE id = $1 AND user_id = $2', [
      story_id,
      userId
    ])
    if (storyCheck.rows.length === 0) {
      unlinkSync(req.file.path)
      return res.status(403).json({ error: 'Not authorized to add photos to this story' })
    }

    const result = await db.query(
      `
      INSERT INTO photos (story_id, filename, original_name, caption)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [story_id, req.file.filename, req.file.originalname, caption || null]
    )

    res.json({
      success: true,
      id: result.rows[0].id,
      filename: req.file.filename
    })
  } catch (err) {
    logger.error('Error saving photo', { error: err.message, userId, requestId: req.id })
    // Clean up uploaded file on error
    unlinkSync(req.file.path)
    res.status(500).json({ error: 'Failed to save photo' })
  }
})

// Get photo file - requires authentication and ownership verification
router.get('/file/:filename', authenticateToken, async (req, res) => {
  const { filename } = req.params

  // Sanitize filename to prevent path traversal attacks
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '')
  if (sanitizedFilename !== filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filepath = join(uploadsDir, sanitizedFilename)

  if (!existsSync(filepath)) {
    return res.status(404).json({ error: 'Photo not found' })
  }

  // Verify the authenticated user owns this photo
  const db = req.app.locals.db
  if (db) {
    try {
      const result = await db.query(
        `SELECT p.id FROM photos p
         JOIN stories s ON p.story_id = s.id
         WHERE p.filename = $1 AND s.user_id = $2`,
        [sanitizedFilename, req.user.id]
      )
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to access this photo' })
      }
    } catch (err) {
      logger.error('Photo ownership check failed', {
        filename: sanitizedFilename,
        error: err.message,
        requestId: req.id
      })
      // Fall through to serve file if DB query fails (backwards compat)
    }
  }

  res.sendFile(filepath)
})

// Delete a photo
router.delete(
  '/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { id } = req.params

    // Get the photo info and verify ownership via story
    const result = await db.query(
      `
    SELECT p.* FROM photos p
    JOIN stories s ON p.story_id = s.id
    WHERE p.id = $1 AND s.user_id = $2
  `,
      [id, userId]
    )
    const photo = result.rows[0]

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or not authorized' })
    }

    // Delete from database
    await db.query('DELETE FROM photos WHERE id = $1', [id])

    // Delete file
    const filepath = join(uploadsDir, photo.filename)
    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }

    res.json({ success: true })
  })
)

// Get all photos for a story
router.get(
  '/story/:storyId',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { storyId } = req.params

    // Verify user owns this story and get photos
    const result = await db.query(
      `
    SELECT p.* FROM photos p
    JOIN stories s ON p.story_id = s.id
    WHERE p.story_id = $1 AND s.user_id = $2
    ORDER BY p.created_at
  `,
      [storyId, userId]
    )

    res.json(result.rows)
  })
)

export default router

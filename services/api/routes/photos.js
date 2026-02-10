import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs'
import crypto from 'crypto'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { authenticateToken } from '../middleware/auth.js'
import { createLogger } from '../utils/logger.js'
import { r2Upload, r2Get, r2Delete, isR2Available } from '../utils/r2.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()
const logger = createLogger('photos')

// Local uploads directory (fallback when R2 is not configured)
const uploadsDir = join(__dirname, '..', '..', '..', 'uploads')
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
  logger.info('Created uploads directory', { path: uploadsDir })
}

// Use memory storage so we can upload to R2 or save locally
const upload = multer({
  storage: multer.memoryStorage(),
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

// Magic byte signatures for allowed image types
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')] // RIFF header (WebP starts with RIFF....WEBP)
}

/**
 * Verify uploaded file content matches declared MIME type
 */
function verifyMagicBytes(buffer, mimetype) {
  const signatures = MAGIC_BYTES[mimetype]
  if (!signatures) return false
  return signatures.some(sig => {
    if (buffer.length < sig.length) return false
    return buffer.subarray(0, sig.length).equals(sig)
  })
}

function generateFilename(originalname) {
  const uniqueSuffix = crypto.randomBytes(8).toString('hex')
  return `${Date.now()}-${uniqueSuffix}${extname(originalname)}`
}

// Upload a photo
router.post(
  '/',
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { story_id, caption } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Verify file content matches declared MIME type (prevents disguised uploads)
    if (!verifyMagicBytes(req.file.buffer, req.file.mimetype)) {
      logger.warn('File magic bytes mismatch', {
        declared: req.file.mimetype,
        originalname: req.file.originalname,
        userId,
        requestId: req.id
      })
      return res.status(400).json({ error: 'File content does not match declared type' })
    }

    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    if (!story_id) {
      return res.status(400).json({ error: 'Missing story_id' })
    }

    try {
      // Verify user owns this story
      const storyCheck = await db.query('SELECT id FROM stories WHERE id = $1 AND user_id = $2', [
        story_id,
        userId
      ])
      if (storyCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to add photos to this story' })
      }

      const filename = generateFilename(req.file.originalname)

      // Try R2 first, fall back to local disk
      const uploadedToR2 = await r2Upload(filename, req.file.buffer, req.file.mimetype)
      if (!uploadedToR2) {
        writeFileSync(join(uploadsDir, filename), req.file.buffer)
        logger.info('Photo saved to local disk (R2 unavailable)', { filename })
      }

      const result = await db.query(
        `INSERT INTO photos (story_id, filename, original_name, caption)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
        [story_id, filename, req.file.originalname, caption || null]
      )

      res.json({
        success: true,
        id: result.rows[0].id,
        filename
      })
    } catch (err) {
      logger.error('Error saving photo', { error: err.message, userId, requestId: req.id })
      res.status(500).json({ error: 'Failed to save photo' })
    }
  })
)

// Get photo file - requires authentication and ownership verification
router.get(
  '/file/:filename',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { filename } = req.params

    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '')
    if (sanitizedFilename !== filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' })
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
        return res.status(500).json({ error: 'Unable to verify photo access' })
      }
    } else {
      return res.status(503).json({ error: 'Database not available' })
    }

    // Try R2 first
    const r2File = await r2Get(sanitizedFilename)
    if (r2File) {
      res.set('Content-Type', r2File.contentType)
      r2File.body.on('error', err => {
        logger.error('R2 stream error', {
          filename: sanitizedFilename,
          error: err.message,
          requestId: req.id
        })
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream photo' })
        }
      })
      r2File.body.pipe(res)
      return
    }

    // Fall back to local file
    const filepath = join(uploadsDir, sanitizedFilename)
    if (existsSync(filepath)) {
      return res.sendFile(filepath)
    }

    res.status(404).json({ error: 'Photo not found' })
  })
)

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
      `SELECT p.* FROM photos p
       JOIN stories s ON p.story_id = s.id
       WHERE p.id = $1 AND s.user_id = $2`,
      [id, userId]
    )
    const photo = result.rows[0]

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or not authorized' })
    }

    // Delete from database
    await db.query('DELETE FROM photos WHERE id = $1', [id])

    // Delete from R2
    await r2Delete(photo.filename)

    // Also clean up local file if it exists
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
      `SELECT p.* FROM photos p
       JOIN stories s ON p.story_id = s.id
       WHERE p.story_id = $1 AND s.user_id = $2
       ORDER BY p.created_at`,
      [storyId, userId]
    )

    res.json(result.rows)
  })
)

export default router

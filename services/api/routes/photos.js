import { Router } from 'express'
import multer from 'multer'
import { pipeline } from 'node:stream/promises'
import crypto from 'crypto'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { authenticateToken } from '../middleware/auth.js'
import { createLogger } from '../utils/logger.js'
import { objectStorage } from '../utils/objectStorage.js'
import { photoRepository } from '../repositories/photoRepository.js'

const router = Router()
const logger = createLogger('photos')

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
  if (mimetype === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    )
  }
  const signatures = MAGIC_BYTES[mimetype]
  if (!signatures) return false
  return signatures.some(sig => {
    if (buffer.length < sig.length) return false
    return buffer.subarray(0, sig.length).equals(sig)
  })
}

function generateFilename(mimetype) {
  const uniqueSuffix = crypto.randomBytes(8).toString('hex')
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
  }
  return `${Date.now()}-${uniqueSuffix}${extensions[mimetype]}`
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

    const ownsStory = await photoRepository.verifyStoryOwnership(db, story_id, userId)
    if (!ownsStory) {
      return res.status(403).json({ error: 'Not authorized to add photos to this story' })
    }

    const filename = generateFilename(req.file.mimetype)
    await objectStorage.put(filename, req.file.buffer, req.file.mimetype)

    const photo = await photoRepository.create(db, {
      storyId: story_id,
      filename,
      originalName: req.file.originalname,
      caption
    })

    res.json({ success: true, id: photo.id, filename })
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
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const ownedPhoto = await photoRepository.findByFilenameForUser(
      db,
      sanitizedFilename,
      req.user.id
    )
    if (!ownedPhoto) {
      return res.status(403).json({ error: 'Not authorized to access this photo' })
    }

    const photoFile = await objectStorage.get(sanitizedFilename)
    if (photoFile) {
      if (photoFile.contentType) res.type(photoFile.contentType)
      else res.type(sanitizedFilename)
      res.set('Cache-Control', 'private, no-store')
      await pipeline(photoFile.body, res)
      return
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

    const photo = await photoRepository.findByIdForUser(db, id, userId)
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or not authorized' })
    }

    // Keep ownership/reference metadata if durable deletion fails, so it can be retried.
    await objectStorage.delete(photo.filename)
    await photoRepository.deleteById(db, id)

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

    const photos = await photoRepository.findByStoryForUser(db, storyId, userId)
    res.json(photos)
  })
)

// Upload and analyse a photo for memoir interview prompts
// Returns AI-generated description, era, and interview questions
router.post(
  '/analyze',
  upload.single('photo'),
  requireDb,
  asyncHandler(async (req, res) => {
    const { analyzePhoto } = await import('../services/photoAnalysisService.js')
    const db = req.app.locals.db
    const userId = req.user.id
    const { chapter_id } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    if (!verifyMagicBytes(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'File content does not match declared type' })
    }

    // Save photo to storage
    const filename = generateFilename(req.file.mimetype)
    await objectStorage.put(filename, req.file.buffer, req.file.mimetype)

    // Analyse with Grok vision
    const analysis = await analyzePhoto(req.file.buffer, req.file.mimetype)

    // Save photo record with analysis (no story_id yet — linked after voice interview)
    const result = await db.query(
      `INSERT INTO photos (user_id, chapter_id, filename, original_name, caption, ai_description, ai_era, ai_questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, ai_description, ai_era, ai_questions`,
      [
        userId,
        chapter_id || null,
        filename,
        req.file.originalname,
        null,
        analysis.description,
        analysis.era,
        JSON.stringify(analysis.questions)
      ]
    )

    const photo = result.rows[0]

    res.json({
      id: photo.id,
      filename: photo.filename,
      description: analysis.description,
      era: analysis.era,
      people_count: analysis.people_count,
      setting: analysis.setting,
      questions: analysis.questions
    })
  })
)

// Get a user's analysed photos (for photo prompt gallery)
router.get(
  '/my-photos',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `SELECT id, filename, chapter_id, caption, ai_description, ai_era, ai_questions, created_at
       FROM photos
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    )

    res.json(result.rows)
  })
)

export default router

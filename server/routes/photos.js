import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, unlinkSync } from 'fs'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads'),
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
  const { story_id, caption } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    const result = await db.query(`
      INSERT INTO photos (story_id, filename, original_name, caption)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [story_id, req.file.filename, req.file.originalname, caption || null])

    res.json({
      success: true,
      id: result.rows[0].id,
      filename: req.file.filename
    })
  } catch (err) {
    console.error('Error saving photo:', err)
    // Clean up uploaded file on error
    unlinkSync(req.file.path)
    res.status(500).json({ error: 'Failed to save photo' })
  }
})

// Get photo file
router.get('/file/:filename', (req, res) => {
  const { filename } = req.params
  const filepath = join(__dirname, '..', '..', 'uploads', filename)

  if (!existsSync(filepath)) {
    return res.status(404).json({ error: 'Photo not found' })
  }

  res.sendFile(filepath)
})

// Delete a photo
router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db
  const { id } = req.params

  try {
    // Get the photo info first
    const result = await db.query('SELECT * FROM photos WHERE id = $1', [id])
    const photo = result.rows[0]

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' })
    }

    // Delete from database
    await db.query('DELETE FROM photos WHERE id = $1', [id])

    // Delete file
    const filepath = join(__dirname, '..', '..', 'uploads', photo.filename)
    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting photo:', err)
    res.status(500).json({ error: 'Failed to delete photo' })
  }
})

// Get all photos for a story
router.get('/story/:storyId', async (req, res) => {
  const db = req.app.locals.db
  const { storyId } = req.params

  try {
    const result = await db.query(`
      SELECT * FROM photos WHERE story_id = $1 ORDER BY created_at
    `, [storyId])

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching photos:', err)
    res.status(500).json({ error: 'Failed to fetch photos' })
  }
})

export default router

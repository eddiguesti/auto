import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, unlinkSync, readFileSync } from 'fs'
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
router.post('/', upload.single('photo'), (req, res) => {
  const db = req.app.locals.db
  const { story_id, caption } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    const result = db.prepare(`
      INSERT INTO photos (story_id, filename, original_name, caption)
      VALUES (?, ?, ?, ?)
    `).run(story_id, req.file.filename, req.file.originalname, caption || null)

    res.json({
      success: true,
      id: result.lastInsertRowid,
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
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db
  const { id } = req.params

  try {
    // Get the photo info first
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id)
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' })
    }

    // Delete from database
    db.prepare('DELETE FROM photos WHERE id = ?').run(id)

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
router.get('/story/:storyId', (req, res) => {
  const db = req.app.locals.db
  const { storyId } = req.params

  try {
    const photos = db.prepare(`
      SELECT * FROM photos WHERE story_id = ? ORDER BY created_at
    `).all(storyId)

    res.json(photos)
  } catch (err) {
    console.error('Error fetching photos:', err)
    res.status(500).json({ error: 'Failed to fetch photos' })
  }
})

export default router

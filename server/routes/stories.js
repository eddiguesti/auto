import { Router } from 'express'

const router = Router()

// Get all stories (must be before /:chapterId to avoid conflicts)
router.get('/all', async (req, res) => {
  const db = req.app.locals.db

  try {
    const result = await db.query(`
      SELECT s.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as photos
      FROM stories s
      LEFT JOIN photos p ON p.story_id = s.id
      GROUP BY s.id
    `)

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching all stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Get progress (count of answered questions per chapter)
router.get('/progress', async (req, res) => {
  const db = req.app.locals.db

  try {
    const result = await db.query(`
      SELECT chapter_id, COUNT(*) as count
      FROM stories
      WHERE answer IS NOT NULL AND answer != ''
      GROUP BY chapter_id
    `)

    const progress = {}
    result.rows.forEach(p => {
      progress[p.chapter_id] = parseInt(p.count)
    })

    res.json(progress)
  } catch (err) {
    console.error('Error fetching progress:', err)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// Get settings
router.get('/settings', async (req, res) => {
  const db = req.app.locals.db

  try {
    const result = await db.query('SELECT * FROM settings WHERE id = 1')
    res.json(result.rows[0] || {})
  } catch (err) {
    console.error('Error fetching settings:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Save settings
router.post('/settings', async (req, res) => {
  const db = req.app.locals.db
  const { name } = req.body

  try {
    await db.query(`
      INSERT INTO settings (id, name, updated_at)
      VALUES (1, $1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET name = $1, updated_at = CURRENT_TIMESTAMP
    `, [name])

    res.json({ success: true })
  } catch (err) {
    console.error('Error saving settings:', err)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Get all stories for a chapter
router.get('/:chapterId', async (req, res) => {
  const db = req.app.locals.db
  const { chapterId } = req.params

  try {
    const result = await db.query(`
      SELECT s.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as photos
      FROM stories s
      LEFT JOIN photos p ON p.story_id = s.id
      WHERE s.chapter_id = $1
      GROUP BY s.id
    `, [chapterId])

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Save/update a story
router.post('/', async (req, res) => {
  const db = req.app.locals.db
  const { chapter_id, question_id, answer } = req.body

  try {
    await db.query(`
      INSERT INTO stories (chapter_id, question_id, answer, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (chapter_id, question_id)
      DO UPDATE SET answer = $3, updated_at = CURRENT_TIMESTAMP
    `, [chapter_id, question_id, answer])

    // Get the story ID
    const result = await db.query(`
      SELECT id FROM stories WHERE chapter_id = $1 AND question_id = $2
    `, [chapter_id, question_id])

    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    console.error('Error saving story:', err)
    res.status(500).json({ error: 'Failed to save story' })
  }
})

export default router

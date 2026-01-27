import { Router } from 'express'

const router = Router()

// Get all stories for a chapter
router.get('/:chapterId', (req, res) => {
  const db = req.app.locals.db
  const { chapterId } = req.params

  try {
    const stories = db.prepare(`
      SELECT s.*,
        json_group_array(
          CASE WHEN p.id IS NOT NULL
          THEN json_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
          ELSE NULL END
        ) as photos
      FROM stories s
      LEFT JOIN photos p ON p.story_id = s.id
      WHERE s.chapter_id = ?
      GROUP BY s.id
    `).all(chapterId)

    // Parse photos JSON
    const result = stories.map(s => ({
      ...s,
      photos: JSON.parse(s.photos).filter(p => p !== null)
    }))

    res.json(result)
  } catch (err) {
    console.error('Error fetching stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Get all stories
router.get('/all', (req, res) => {
  const db = req.app.locals.db

  try {
    const stories = db.prepare(`
      SELECT s.*,
        json_group_array(
          CASE WHEN p.id IS NOT NULL
          THEN json_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
          ELSE NULL END
        ) as photos
      FROM stories s
      LEFT JOIN photos p ON p.story_id = s.id
      GROUP BY s.id
    `).all()

    const result = stories.map(s => ({
      ...s,
      photos: JSON.parse(s.photos).filter(p => p !== null)
    }))

    res.json(result)
  } catch (err) {
    console.error('Error fetching all stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Save/update a story
router.post('/', (req, res) => {
  const db = req.app.locals.db
  const { chapter_id, question_id, answer } = req.body

  try {
    const result = db.prepare(`
      INSERT INTO stories (chapter_id, question_id, answer, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(chapter_id, question_id)
      DO UPDATE SET answer = excluded.answer, updated_at = datetime('now')
    `).run(chapter_id, question_id, answer)

    // Get the story ID (either new or existing)
    const story = db.prepare(`
      SELECT id FROM stories WHERE chapter_id = ? AND question_id = ?
    `).get(chapter_id, question_id)

    res.json({ success: true, id: story.id })
  } catch (err) {
    console.error('Error saving story:', err)
    res.status(500).json({ error: 'Failed to save story' })
  }
})

// Get progress (count of answered questions per chapter)
router.get('/progress', (req, res) => {
  const db = req.app.locals.db

  try {
    const progress = db.prepare(`
      SELECT chapter_id, COUNT(*) as count
      FROM stories
      WHERE answer IS NOT NULL AND answer != ''
      GROUP BY chapter_id
    `).all()

    const result = {}
    progress.forEach(p => {
      result[p.chapter_id] = p.count
    })

    res.json(result)
  } catch (err) {
    console.error('Error fetching progress:', err)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// Get settings
router.get('/settings', (req, res) => {
  const db = req.app.locals.db

  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get()
    res.json(settings || {})
  } catch (err) {
    console.error('Error fetching settings:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Save settings
router.post('/settings', (req, res) => {
  const db = req.app.locals.db
  const { name } = req.body

  try {
    db.prepare(`
      INSERT INTO settings (id, name, updated_at)
      VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
    `).run(name)

    res.json({ success: true })
  } catch (err) {
    console.error('Error saving settings:', err)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

export default router

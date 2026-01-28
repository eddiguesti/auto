import { Router } from 'express'
import OpenAI from 'openai'

const router = Router()

// Extract entities asynchronously after saving
async function extractEntitiesAsync(db, userId, text, chapterId, questionId, storyId) {
  if (!text || text.length < 20) return // Skip very short answers

  try {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) return

    const client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' })

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages: [
        {
          role: 'system',
          content: `Extract entities from autobiography text. Return JSON only:
{
  "people": [{"name": "...", "context": "...", "sentiment": "positive/negative/neutral"}],
  "places": [{"name": "...", "context": "...", "sentiment": "..."}],
  "events": [{"name": "...", "context": "...", "sentiment": "..."}],
  "time_periods": [{"name": "...", "context": "...", "sentiment": "..."}],
  "emotions": [{"name": "...", "context": "...", "sentiment": "..."}],
  "relationships": [{"entity1": "...", "entity2": "...", "type": "...", "description": "..."}]
}
Normalize names (Dad/Father -> Father). Be concise.`
        },
        { role: 'user', content: `Extract from: "${text}"` }
      ],
      max_tokens: 800,
      temperature: 0.3
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const entities = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    // Store entities
    for (const type of ['people', 'places', 'events', 'time_periods', 'emotions']) {
      for (const item of (entities[type] || [])) {
        if (!item.name) continue
        const dbType = type.replace('_', ' ').replace(/s$/, '')

        const entityResult = await db.query(`
          INSERT INTO memory_entities (user_id, entity_type, name, description, first_mentioned_chapter, first_mentioned_question)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, entity_type, name)
          DO UPDATE SET mention_count = memory_entities.mention_count + 1, updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [userId, dbType, item.name, item.context, chapterId, questionId])

        await db.query(`
          INSERT INTO memory_mentions (entity_id, story_id, context, sentiment)
          VALUES ($1, $2, $3, $4)
        `, [entityResult.rows[0].id, storyId, item.context, item.sentiment || 'neutral'])
      }
    }

    // Store relationships
    for (const rel of (entities.relationships || [])) {
      if (!rel.entity1 || !rel.entity2) continue
      const e1 = await db.query('SELECT id FROM memory_entities WHERE user_id = $1 AND name = $2', [userId, rel.entity1])
      const e2 = await db.query('SELECT id FROM memory_entities WHERE user_id = $1 AND name = $2', [userId, rel.entity2])
      if (e1.rows[0] && e2.rows[0]) {
        await db.query(`
          INSERT INTO memory_relationships (entity1_id, entity2_id, relationship_type, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (entity1_id, entity2_id, relationship_type) DO NOTHING
        `, [e1.rows[0].id, e2.rows[0].id, rel.type, rel.description])
      }
    }

    console.log('Extracted entities for story', storyId)
  } catch (err) {
    console.error('Entity extraction error:', err.message)
  }
}

// Get all stories (must be before /:chapterId to avoid conflicts)
router.get('/all', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

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
      WHERE s.user_id = $1
      GROUP BY s.id
    `, [userId])

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching all stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Get progress (count of answered questions per chapter)
router.get('/progress', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  try {
    const result = await db.query(`
      SELECT chapter_id, COUNT(*) as count
      FROM stories
      WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
      GROUP BY chapter_id
    `, [userId])

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
  const userId = req.user.id

  try {
    const result = await db.query('SELECT * FROM settings WHERE user_id = $1', [userId])
    res.json(result.rows[0] || {})
  } catch (err) {
    console.error('Error fetching settings:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Save settings
router.post('/settings', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { name } = req.body

  try {
    await db.query(`
      INSERT INTO settings (user_id, name, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET name = $2, updated_at = CURRENT_TIMESTAMP
    `, [userId, name])

    res.json({ success: true })
  } catch (err) {
    console.error('Error saving settings:', err)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Get all stories for a chapter
router.get('/:chapterId', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
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
      WHERE s.user_id = $1 AND s.chapter_id = $2
      GROUP BY s.id
    `, [userId, chapterId])

    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching stories:', err)
    res.status(500).json({ error: 'Failed to fetch stories' })
  }
})

// Save/update a story
router.post('/', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { chapter_id, question_id, answer } = req.body

  try {
    await db.query(`
      INSERT INTO stories (user_id, chapter_id, question_id, answer, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, chapter_id, question_id)
      DO UPDATE SET answer = $4, updated_at = CURRENT_TIMESTAMP
    `, [userId, chapter_id, question_id, answer])

    // Get the story ID
    const result = await db.query(`
      SELECT id FROM stories WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
    `, [userId, chapter_id, question_id])

    const storyId = result.rows[0].id

    // Extract entities asynchronously (don't wait for it)
    extractEntitiesAsync(db, userId, answer, chapter_id, question_id, storyId)

    res.json({ success: true, id: storyId })
  } catch (err) {
    console.error('Error saving story:', err)
    res.status(500).json({ error: 'Failed to save story' })
  }
})

export default router

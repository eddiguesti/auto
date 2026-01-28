import { Router } from 'express'
import OpenAI from 'openai'

const router = Router()

// Initialize Grok client
const getClient = () => {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new Error('GROK_API_KEY not set')
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  })
}

// Extract entities from text using Grok
router.post('/extract', async (req, res) => {
  const { text, chapterId, questionId, storyId } = req.body
  const pool = req.app.locals.db
  const userId = req.user.id

  if (!text || !pool) {
    return res.json({ entities: [], message: 'No text or database' })
  }

  try {
    const client = getClient()

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages: [
        {
          role: 'system',
          content: `You are an entity extraction assistant for an autobiography project. Extract key entities from the text and return them as JSON.

Extract these types:
- **people**: Names of people mentioned (family, friends, colleagues, etc.)
- **places**: Locations, cities, countries, addresses, buildings
- **events**: Significant life events (weddings, graduations, moves, jobs, etc.)
- **time_periods**: Years, decades, ages, life stages ("when I was 10", "the 1980s", "my teenage years")
- **emotions**: Emotional states or feelings associated with the memory

For each entity, provide:
- name: The entity name (normalize names - "Dad" and "my father" should both be "Father")
- context: A brief phrase showing how it was mentioned
- sentiment: positive, negative, neutral, or mixed
- relationships: Any relationships to other entities mentioned (e.g., "Father" -> "worked at" -> "Ford Factory")

Return ONLY valid JSON in this format:
{
  "people": [{"name": "...", "context": "...", "sentiment": "..."}],
  "places": [{"name": "...", "context": "...", "sentiment": "..."}],
  "events": [{"name": "...", "context": "...", "sentiment": "..."}],
  "time_periods": [{"name": "...", "context": "...", "sentiment": "..."}],
  "emotions": [{"name": "...", "context": "...", "sentiment": "..."}],
  "relationships": [{"entity1": "...", "entity2": "...", "type": "...", "description": "..."}]
}`
        },
        {
          role: 'user',
          content: `Extract entities from this autobiography text:\n\n"${text}"`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    // Parse the JSON response
    let entities
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      entities = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch (parseErr) {
      console.error('Failed to parse entities:', parseErr)
      entities = {}
    }

    // Store entities in database
    const storedEntities = []

    for (const type of ['people', 'places', 'events', 'time_periods', 'emotions']) {
      const items = entities[type] || []
      for (const item of items) {
        if (!item.name) continue

        try {
          // Upsert entity with user_id
          const entityResult = await pool.query(`
            INSERT INTO memory_entities (user_id, entity_type, name, description, first_mentioned_chapter, first_mentioned_question)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, entity_type, name)
            DO UPDATE SET
              mention_count = memory_entities.mention_count + 1,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `, [userId, type.replace('_', ' ').replace(/s$/, ''), item.name, item.context, chapterId, questionId])

          const entityId = entityResult.rows[0].id

          // Store mention
          if (storyId) {
            await pool.query(`
              INSERT INTO memory_mentions (entity_id, story_id, context, sentiment)
              VALUES ($1, $2, $3, $4)
            `, [entityId, storyId, item.context, item.sentiment || 'neutral'])
          }

          storedEntities.push({
            id: entityId,
            type: type.replace('_', ' ').replace(/s$/, ''),
            name: item.name,
            context: item.context,
            sentiment: item.sentiment
          })
        } catch (dbErr) {
          console.error('Failed to store entity:', dbErr.message)
        }
      }
    }

    // Store relationships
    const relationships = entities.relationships || []
    for (const rel of relationships) {
      if (!rel.entity1 || !rel.entity2) continue

      try {
        // Find entity IDs for this user
        const e1 = await pool.query('SELECT id FROM memory_entities WHERE user_id = $1 AND name = $2', [userId, rel.entity1])
        const e2 = await pool.query('SELECT id FROM memory_entities WHERE user_id = $1 AND name = $2', [userId, rel.entity2])

        if (e1.rows[0] && e2.rows[0]) {
          await pool.query(`
            INSERT INTO memory_relationships (entity1_id, entity2_id, relationship_type, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entity1_id, entity2_id, relationship_type) DO NOTHING
          `, [e1.rows[0].id, e2.rows[0].id, rel.type, rel.description])
        }
      } catch (relErr) {
        console.error('Failed to store relationship:', relErr.message)
      }
    }

    res.json({
      entities: storedEntities,
      relationships: relationships.length,
      raw: entities
    })
  } catch (err) {
    console.error('Entity extraction error:', err.message)
    res.status(500).json({ error: 'Extraction failed', message: err.message })
  }
})

// Get all entities (for the memory graph)
router.get('/entities', async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  if (!pool) return res.json({ entities: [] })

  try {
    const result = await pool.query(`
      SELECT id, entity_type, name, description, mention_count, first_mentioned_chapter
      FROM memory_entities
      WHERE user_id = $1
      ORDER BY mention_count DESC, name ASC
    `, [userId])
    res.json({ entities: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get entities by type
router.get('/entities/:type', async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  const { type } = req.params
  if (!pool) return res.json({ entities: [] })

  try {
    const result = await pool.query(`
      SELECT id, name, description, mention_count, first_mentioned_chapter
      FROM memory_entities
      WHERE user_id = $1 AND entity_type = $2
      ORDER BY mention_count DESC, name ASC
    `, [userId, type])
    res.json({ entities: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get context for AI prompts - returns a summary of known entities
router.get('/context', async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  if (!pool) return res.json({ context: '' })

  try {
    // Get top mentioned people
    const people = await pool.query(`
      SELECT name, mention_count FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'person'
      ORDER BY mention_count DESC LIMIT 10
    `, [userId])

    // Get top mentioned places
    const places = await pool.query(`
      SELECT name, mention_count FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'place'
      ORDER BY mention_count DESC LIMIT 10
    `, [userId])

    // Get events
    const events = await pool.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'event'
      ORDER BY created_at DESC LIMIT 10
    `, [userId])

    // Get time periods
    const timePeriods = await pool.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'time period'
      ORDER BY created_at DESC LIMIT 10
    `, [userId])

    // Get relationships
    const relationships = await pool.query(`
      SELECT e1.name as entity1, e2.name as entity2, r.relationship_type, r.description
      FROM memory_relationships r
      JOIN memory_entities e1 ON r.entity1_id = e1.id
      JOIN memory_entities e2 ON r.entity2_id = e2.id
      WHERE e1.user_id = $1
      LIMIT 20
    `, [userId])

    // Build context string for AI
    let context = ''

    if (people.rows.length > 0) {
      context += `\n**People mentioned in this autobiography:**\n`
      context += people.rows.map(p => `- ${p.name} (mentioned ${p.mention_count} times)`).join('\n')
    }

    if (places.rows.length > 0) {
      context += `\n\n**Places mentioned:**\n`
      context += places.rows.map(p => `- ${p.name}`).join('\n')
    }

    if (events.rows.length > 0) {
      context += `\n\n**Life events mentioned:**\n`
      context += events.rows.map(e => `- ${e.name}`).join('\n')
    }

    if (timePeriods.rows.length > 0) {
      context += `\n\n**Time periods mentioned:**\n`
      context += timePeriods.rows.map(t => `- ${t.name}`).join('\n')
    }

    if (relationships.rows.length > 0) {
      context += `\n\n**Known relationships:**\n`
      context += relationships.rows.map(r =>
        `- ${r.entity1} ${r.relationship_type} ${r.entity2}${r.description ? ` (${r.description})` : ''}`
      ).join('\n')
    }

    res.json({
      context,
      stats: {
        people: people.rows.length,
        places: places.rows.length,
        events: events.rows.length,
        timePeriods: timePeriods.rows.length,
        relationships: relationships.rows.length
      }
    })
  } catch (err) {
    console.error('Context error:', err)
    res.status(500).json({ error: err.message, context: '' })
  }
})

// Search for connections - find entities related to a given name/topic
router.get('/connections/:name', async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  const { name } = req.params
  if (!pool) return res.json({ connections: [] })

  try {
    // Find the entity for this user
    const entity = await pool.query(
      'SELECT id, entity_type, name FROM memory_entities WHERE user_id = $1 AND name ILIKE $2',
      [userId, `%${name}%`]
    )

    if (entity.rows.length === 0) {
      return res.json({ connections: [], message: 'Entity not found' })
    }

    const entityId = entity.rows[0].id

    // Find all relationships
    const connections = await pool.query(`
      SELECT
        CASE WHEN r.entity1_id = $1 THEN e2.name ELSE e1.name END as connected_to,
        CASE WHEN r.entity1_id = $1 THEN e2.entity_type ELSE e1.entity_type END as connected_type,
        r.relationship_type,
        r.description
      FROM memory_relationships r
      JOIN memory_entities e1 ON r.entity1_id = e1.id
      JOIN memory_entities e2 ON r.entity2_id = e2.id
      WHERE r.entity1_id = $1 OR r.entity2_id = $1
    `, [entityId])

    // Find mentions
    const mentions = await pool.query(`
      SELECT m.context, m.sentiment, s.chapter_id, s.question_id
      FROM memory_mentions m
      JOIN stories s ON m.story_id = s.id
      WHERE m.entity_id = $1
      ORDER BY m.created_at DESC
      LIMIT 5
    `, [entityId])

    res.json({
      entity: entity.rows[0],
      connections: connections.rows,
      mentions: mentions.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

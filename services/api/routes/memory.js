import { Router } from 'express'
import { extractAndStoreEntities } from '../services/entityExtractionService.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import cache, { cacheKeys } from '../utils/cache.js'

const router = Router()

// Extract entities from text using Grok
router.post('/extract', requireDb, asyncHandler(async (req, res) => {
  const { text, chapterId, questionId, storyId } = req.body
  const db = req.app.locals.db
  const userId = req.user.id

  if (!text) {
    return res.json({ entities: [], message: 'No text provided' })
  }

  const result = await extractAndStoreEntities({
    db,
    userId,
    text,
    chapterId,
    questionId,
    storyId
  })

  res.json({
    entities: result.entities,
    relationships: result.relationshipCount,
    raw: result.raw
  })
}))

// Get all entities (for the memory graph)
router.get('/entities', requireDb, asyncHandler(async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id

  const result = await pool.query(`
    SELECT id, entity_type, name, description, mention_count, first_mentioned_chapter
    FROM memory_entities
    WHERE user_id = $1
    ORDER BY mention_count DESC, name ASC
  `, [userId])
  res.json({ entities: result.rows })
}))

// Get entities by type
router.get('/entities/:type', requireDb, asyncHandler(async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  const { type } = req.params

  const result = await pool.query(`
    SELECT id, name, description, mention_count, first_mentioned_chapter
    FROM memory_entities
    WHERE user_id = $1 AND entity_type = $2
    ORDER BY mention_count DESC, name ASC
  `, [userId, type])
  res.json({ entities: result.rows })
}))

// Get context for AI prompts - returns a summary of known entities (cached 2 minutes)
router.get('/context', requireDb, asyncHandler(async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id

  const result = await cache.getOrSet(
    cacheKeys.userMemoryContext(userId),
    async () => {
      // OPTIMIZED: Run all queries in parallel instead of sequentially
      const [people, places, events, timePeriods, relationships] = await Promise.all([
        pool.query(`
          SELECT name, mention_count FROM memory_entities
          WHERE user_id = $1 AND entity_type = 'person'
          ORDER BY mention_count DESC LIMIT 10
        `, [userId]),

        pool.query(`
          SELECT name, mention_count FROM memory_entities
          WHERE user_id = $1 AND entity_type = 'place'
          ORDER BY mention_count DESC LIMIT 10
        `, [userId]),

        pool.query(`
          SELECT name FROM memory_entities
          WHERE user_id = $1 AND entity_type = 'event'
          ORDER BY created_at DESC LIMIT 10
        `, [userId]),

        pool.query(`
          SELECT name FROM memory_entities
          WHERE user_id = $1 AND entity_type = 'time period'
          ORDER BY created_at DESC LIMIT 10
        `, [userId]),

        pool.query(`
          SELECT e1.name as entity1, e2.name as entity2, r.relationship_type, r.description
          FROM memory_relationships r
          JOIN memory_entities e1 ON r.entity1_id = e1.id
          JOIN memory_entities e2 ON r.entity2_id = e2.id
          WHERE e1.user_id = $1
          LIMIT 20
        `, [userId])
      ])

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

      return {
        context,
        stats: {
          people: people.rows.length,
          places: places.rows.length,
          events: events.rows.length,
          timePeriods: timePeriods.rows.length,
          relationships: relationships.rows.length
        }
      }
    },
    120 // 2 minute TTL
  )

  res.json(result)
}))

// Search for connections - find entities related to a given name/topic
router.get('/connections/:name', requireDb, asyncHandler(async (req, res) => {
  const pool = req.app.locals.db
  const userId = req.user.id
  const { name } = req.params

  // Find the entity for this user
  const entity = await pool.query(
    'SELECT id, entity_type, name FROM memory_entities WHERE user_id = $1 AND name ILIKE $2',
    [userId, `%${name}%`]
  )

  if (entity.rows.length === 0) {
    return res.json({ connections: [], message: 'Entity not found' })
  }

  const entityId = entity.rows[0].id

  // OPTIMIZED: Run connections and mentions queries in parallel
  const [connections, mentions] = await Promise.all([
    pool.query(`
      SELECT
        CASE WHEN r.entity1_id = $1 THEN e2.name ELSE e1.name END as connected_to,
        CASE WHEN r.entity1_id = $1 THEN e2.entity_type ELSE e1.entity_type END as connected_type,
        r.relationship_type,
        r.description
      FROM memory_relationships r
      JOIN memory_entities e1 ON r.entity1_id = e1.id
      JOIN memory_entities e2 ON r.entity2_id = e2.id
      WHERE r.entity1_id = $1 OR r.entity2_id = $1
    `, [entityId]),

    pool.query(`
      SELECT m.context, m.sentiment, s.chapter_id, s.question_id
      FROM memory_mentions m
      JOIN stories s ON m.story_id = s.id
      WHERE m.entity_id = $1
      ORDER BY m.created_at DESC
      LIMIT 5
    `, [entityId])
  ])

  res.json({
    entity: entity.rows[0],
    connections: connections.rows,
    mentions: mentions.rows
  })
}))

export default router

import { grokChat, parseGrokJson, isGrokConfigured } from './grokService.js'
import { sanitizeForPrompt } from '../utils/security.js'

const ENTITY_EXTRACTION_PROMPT = `You are an entity extraction assistant for an autobiography project. Extract key entities from the text and return them as JSON.

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

const ENTITY_TYPES = ['people', 'places', 'events', 'time_periods', 'emotions']
const BATCH_SIZE = 10

/**
 * @typedef {Object} EntityExtractionOptions
 * @property {import('pg').Pool} db - Database pool
 * @property {number} userId - User ID
 * @property {string} text - Text to extract entities from
 * @property {string} [chapterId] - Chapter ID for first mention tracking
 * @property {string} [questionId] - Question ID for first mention tracking
 * @property {number} [storyId] - Story ID for mention linking
 */

/**
 * @typedef {Object} EntityExtractionResult
 * @property {Array} entities - Stored entities with IDs
 * @property {number} relationshipCount - Number of relationships stored
 * @property {Object} raw - Raw parsed entities from Grok
 */

/**
 * Extract entities from text using Grok AI
 * @param {string} text - Text to extract entities from
 * @returns {Promise<Object>} Parsed entities
 */
export async function extractEntitiesFromText(text) {
  const result = await grokChat({
    systemPrompt: ENTITY_EXTRACTION_PROMPT,
    userPrompt: `Extract entities from this autobiography text:\n\n"${text}"`,
    maxTokens: 1000,
    temperature: 0.3
  })

  return parseGrokJson(result.content)
}

/**
 * Convert entity type key to database format
 * @param {string} type - Entity type key (e.g., 'time_periods')
 * @returns {string} Database format (e.g., 'time period')
 */
function normalizeEntityType(type) {
  return type.replace('_', ' ').replace(/s$/, '')
}

/**
 * Extract and store entities from autobiography text (optimized batch operations)
 * @param {EntityExtractionOptions} options
 * @returns {Promise<EntityExtractionResult>}
 */
export async function extractAndStoreEntities({ db, userId, text, chapterId, questionId, storyId }) {
  if (!text || text.length < 20) {
    return { entities: [], relationshipCount: 0, raw: {} }
  }

  if (!isGrokConfigured()) {
    return { entities: [], relationshipCount: 0, raw: {}, error: 'Grok not configured' }
  }

  const safeText = sanitizeForPrompt(text, 3000)
  const entities = await extractEntitiesFromText(safeText)

  const storedEntities = []
  const entityIdMap = new Map()

  // Collect all entities to insert
  const entityInserts = []
  for (const type of ENTITY_TYPES) {
    const items = entities[type] || []
    for (const item of items) {
      if (!item.name) continue
      entityInserts.push({
        type: normalizeEntityType(type),
        name: item.name,
        context: item.context,
        sentiment: item.sentiment
      })
    }
  }

  // Batch upsert all entities in parallel
  for (let i = 0; i < entityInserts.length; i += BATCH_SIZE) {
    const batch = entityInserts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(async (item) => {
      try {
        const entityResult = await db.query(`
          INSERT INTO memory_entities (user_id, entity_type, name, description, first_mentioned_chapter, first_mentioned_question)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, entity_type, name)
          DO UPDATE SET
            mention_count = memory_entities.mention_count + 1,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [userId, item.type, item.name, item.context, chapterId, questionId])
        return { ...item, id: entityResult.rows[0].id }
      } catch (dbErr) {
        console.error('Failed to store entity:', dbErr.message)
        return null
      }
    }))

    for (const result of results) {
      if (result) {
        entityIdMap.set(result.name, result.id)
        storedEntities.push(result)
      }
    }
  }

  // Batch insert mentions if we have a storyId
  if (storyId && storedEntities.length > 0) {
    const validEntities = storedEntities.filter(e => e.id)
    if (validEntities.length > 0) {
      const mentionValues = validEntities
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(', ')

      const mentionParams = validEntities
        .flatMap(e => [e.id, storyId, e.context, e.sentiment || 'neutral'])

      try {
        await db.query(`
          INSERT INTO memory_mentions (entity_id, story_id, context, sentiment)
          VALUES ${mentionValues}
          ON CONFLICT DO NOTHING
        `, mentionParams)
      } catch (err) {
        console.error('Failed to batch insert mentions:', err.message)
      }
    }
  }

  // Store relationships
  const relationships = entities.relationships || []
  if (relationships.length > 0) {
    // Fetch missing entity IDs
    const relEntityNames = new Set()
    for (const rel of relationships) {
      if (rel.entity1) relEntityNames.add(rel.entity1)
      if (rel.entity2) relEntityNames.add(rel.entity2)
    }

    const missingNames = [...relEntityNames].filter(name => !entityIdMap.has(name))
    if (missingNames.length > 0) {
      const placeholders = missingNames.map((_, i) => `$${i + 2}`).join(', ')
      const existingEntities = await db.query(
        `SELECT id, name FROM memory_entities WHERE user_id = $1 AND name IN (${placeholders})`,
        [userId, ...missingNames]
      )
      for (const row of existingEntities.rows) {
        entityIdMap.set(row.name, row.id)
      }
    }

    // Insert relationships
    for (const rel of relationships) {
      if (!rel.entity1 || !rel.entity2) continue
      const id1 = entityIdMap.get(rel.entity1)
      const id2 = entityIdMap.get(rel.entity2)

      if (id1 && id2) {
        try {
          await db.query(`
            INSERT INTO memory_relationships (entity1_id, entity2_id, relationship_type, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entity1_id, entity2_id, relationship_type) DO NOTHING
          `, [id1, id2, rel.type, rel.description])
        } catch (relErr) {
          console.error('Failed to store relationship:', relErr.message)
        }
      }
    }
  }

  return {
    entities: storedEntities,
    relationshipCount: relationships.length,
    raw: entities
  }
}

export { isGrokConfigured }

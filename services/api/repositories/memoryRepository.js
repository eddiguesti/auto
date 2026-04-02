/**
 * Memory entity data access — consolidates queries from routes/memory.js
 */

export const memoryRepository = {
  async getEntities(db, userId) {
    const result = await db.query(
      `SELECT id, entity_type, name, description, mention_count, first_mentioned_chapter
       FROM memory_entities
       WHERE user_id = $1
       ORDER BY mention_count DESC, name ASC
       LIMIT 500`,
      [userId]
    )
    return result.rows
  },

  async getEntitiesByType(db, userId, type) {
    const result = await db.query(
      `SELECT id, name, description, mention_count, first_mentioned_chapter
       FROM memory_entities
       WHERE user_id = $1 AND entity_type = $2
       ORDER BY mention_count DESC, name ASC
       LIMIT 500`,
      [userId, type]
    )
    return result.rows
  },

  async getEntityById(db, userId, entityId) {
    const result = await db.query(
      'SELECT id, user_id, entity_type, name, description, first_mentioned_chapter, first_mentioned_question, mention_count, created_at, updated_at FROM memory_entities WHERE id = $1 AND user_id = $2',
      [entityId, userId]
    )
    return result.rows[0] || null
  },

  async searchByName(db, userId, name) {
    const result = await db.query(
      'SELECT id, entity_type, name FROM memory_entities WHERE user_id = $1 AND name ILIKE $2',
      [userId, `%${name}%`]
    )
    return result.rows
  },

  async getRelationships(db, userId, entityId) {
    const result = await db.query(
      `SELECT e1.name as entity1, e2.name as entity2, r.relationship_type, r.description
       FROM memory_relationships r
       JOIN memory_entities e1 ON r.entity1_id = e1.id
       JOIN memory_entities e2 ON r.entity2_id = e2.id
       WHERE e1.user_id = $1 AND (r.entity1_id = $2 OR r.entity2_id = $2)
       LIMIT 100`,
      [userId, entityId]
    )
    return result.rows
  },

  async getMentions(db, userId, entityId) {
    const result = await db.query(
      `SELECT m.context, m.sentiment, s.chapter_id, s.question_id
       FROM memory_mentions m
       JOIN stories s ON m.story_id = s.id
       WHERE m.entity_id = $1 AND s.user_id = $2
       ORDER BY s.created_at DESC
       LIMIT 100`,
      [userId, entityId]
    )
    return result.rows
  }
}

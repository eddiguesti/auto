/**
 * Fetch memory context for AI prompts
 * Returns a string summarizing known people, places, and relationships
 * for use in AI conversation context
 *
 * @param {import('pg').Pool} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<string>} Context string for AI prompts
 */
export async function getMemoryContext(db, userId) {
  if (!db || !userId) return ''

  try {
    // Get top mentioned people
    const people = await db.query(`
      SELECT name, mention_count FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'person'
      ORDER BY mention_count DESC LIMIT 8
    `, [userId])

    // Get top mentioned places
    const places = await db.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'place'
      ORDER BY mention_count DESC LIMIT 8
    `, [userId])

    // Get key relationships
    const relationships = await db.query(`
      SELECT e1.name as person1, e2.name as person2, r.relationship_type
      FROM memory_relationships r
      JOIN memory_entities e1 ON r.entity1_id = e1.id
      JOIN memory_entities e2 ON r.entity2_id = e2.id
      WHERE e1.user_id = $1 AND (e1.entity_type = 'person' OR e2.entity_type = 'person')
      LIMIT 10
    `, [userId])

    let context = ''

    if (people.rows.length > 0) {
      context += `\nPeople in their story: ${people.rows.map(p => p.name).join(', ')}`
    }

    if (places.rows.length > 0) {
      context += `\nPlaces mentioned: ${places.rows.map(p => p.name).join(', ')}`
    }

    if (relationships.rows.length > 0) {
      context += `\nRelationships: ${relationships.rows.map(r =>
        `${r.person1} - ${r.relationship_type} - ${r.person2}`
      ).join('; ')}`
    }

    return context
  } catch (err) {
    console.error('Error fetching memory context:', err.message)
    return ''
  }
}

/**
 * Get a compact memory context string for voice prompts
 * Similar to getMemoryContext but formatted differently
 *
 * @param {import('pg').Pool} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<string>} Compact context string
 */
export async function getCompactMemoryContext(db, userId) {
  if (!db || !userId) return ''

  try {
    const people = await db.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'person'
      ORDER BY mention_count DESC LIMIT 8
    `, [userId])

    const places = await db.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'place'
      ORDER BY mention_count DESC LIMIT 6
    `, [userId])

    let context = ''
    if (people.rows.length > 0) {
      context += `People in their story: ${people.rows.map(p => p.name).join(', ')}. `
    }
    if (places.rows.length > 0) {
      context += `Places mentioned: ${places.rows.map(p => p.name).join(', ')}.`
    }
    return context
  } catch (err) {
    return ''
  }
}

/**
 * Story repository with common query patterns
 */

/**
 * Base query for stories with photos aggregation
 */
const STORIES_WITH_PHOTOS_BASE = `
  SELECT s.*,
    COALESCE(
      json_agg(
        json_build_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'
    ) as photos
  FROM stories s
  LEFT JOIN photos p ON p.story_id = s.id
`

/**
 * @typedef {Object} StoryWithPhotos
 * @property {number} id
 * @property {number} user_id
 * @property {string} chapter_id
 * @property {string} question_id
 * @property {string} answer
 * @property {string} original_answer
 * @property {Array<{id: number, filename: string, caption: string}>} photos
 */

/**
 * Get all stories with photos for a user
 * @param {import('pg').Pool} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<StoryWithPhotos[]>}
 */
export async function getStoriesWithPhotos(db, userId) {
  const result = await db.query(`
    ${STORIES_WITH_PHOTOS_BASE}
    WHERE s.user_id = $1
    GROUP BY s.id
  `, [userId])

  return result.rows
}

/**
 * Get stories with photos for a specific chapter
 * @param {import('pg').Pool} db - Database pool
 * @param {number} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<StoryWithPhotos[]>}
 */
export async function getChapterStoriesWithPhotos(db, userId, chapterId) {
  const result = await db.query(`
    ${STORIES_WITH_PHOTOS_BASE}
    WHERE s.user_id = $1 AND s.chapter_id = $2
    GROUP BY s.id
  `, [userId, chapterId])

  return result.rows
}

/**
 * Get stories with photos for export (ordered by chapter and question)
 * @param {import('pg').Pool} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<StoryWithPhotos[]>}
 */
export async function getStoriesForExport(db, userId) {
  const result = await db.query(`
    ${STORIES_WITH_PHOTOS_BASE}
    WHERE s.user_id = $1
    GROUP BY s.id
    ORDER BY s.chapter_id, s.question_id
  `, [userId])

  return result.rows
}

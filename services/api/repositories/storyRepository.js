// @ts-check
/**
 * Story data access — consolidates story queries from routes/stories.js, routes/ai.js, routes/export.js
 * @typedef {import('../types/index.js').Story} Story
 * @typedef {import('../types/index.js').StoryWithPhotos} StoryWithPhotos
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { STORY } from '../db/columns.js'

// ─── Stories with photos (LEFT JOIN aggregation) ──────────────────────────────

const STORIES_WITH_PHOTOS_BASE = `
  SELECT s.id, s.user_id, s.chapter_id, s.question_id, s.answer, s.original_answer,
         s.style_applied, s.style_applied_at, s.created_at, s.updated_at,
    COALESCE(
      json_agg(
        json_build_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'
    ) as photos
  FROM stories s
  LEFT JOIN photos p ON p.story_id = s.id
`

export const storyRepository = {
  /**
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<Story[]>}
   */
  async findByUserAndChapter(db, userId, chapterId) {
    const result = await db.query(
      `SELECT ${STORY} FROM stories WHERE user_id = $1 AND chapter_id = $2 ORDER BY question_id`,
      [userId, chapterId]
    )
    return result.rows
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<Story[]>}
   */
  async findAllByUser(db, userId) {
    const result = await db.query(
      `SELECT ${STORY} FROM stories WHERE user_id = $1 ORDER BY chapter_id, question_id LIMIT 10000`,
      [userId]
    )
    return result.rows
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<Array<{id: number, chapter_id: string, question_id: string, answer: string}>>}
   */
  async findWithContent(db, userId) {
    const result = await db.query(
      `SELECT id, chapter_id, question_id, answer
       FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
       ORDER BY chapter_id, question_id`,
      [userId]
    )
    return result.rows
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @param {{ chapterId: string, questionId: string, answer: string }} data
   * @returns {Promise<Story>}
   */
  async upsert(db, userId, { chapterId, questionId, answer }) {
    const result = await db.query(
      `INSERT INTO stories (user_id, chapter_id, question_id, answer)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chapter_id, question_id)
       DO UPDATE SET answer = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, chapterId, questionId, answer]
    )
    return result.rows[0]
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<Array<{chapter_id: string, answered: string}>>}
   */
  async getProgress(db, userId) {
    const result = await db.query(
      `SELECT chapter_id, COUNT(*) as answered
       FROM stories WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
       GROUP BY chapter_id`,
      [userId]
    )
    return result.rows
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<{total: string, chapters: string}>}
   */
  async countByUser(db, userId) {
    const result = await db.query(
      `SELECT COUNT(*) as total,
              COUNT(DISTINCT chapter_id) as chapters
       FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
      [userId]
    )
    return result.rows[0]
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<number>}
   */
  async countAnsweredInChapter(db, userId, chapterId) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM stories
       WHERE user_id = $1 AND chapter_id = $2 AND answer IS NOT NULL AND answer != ''`,
      [userId, chapterId]
    )
    return parseInt(result.rows[0].count)
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<string[]>}
   */
  async getAnswersByChapter(db, userId, chapterId) {
    const result = await db.query(
      `SELECT answer FROM stories
       WHERE user_id = $1 AND chapter_id = $2 AND answer IS NOT NULL
       ORDER BY question_id`,
      [userId, chapterId]
    )
    return result.rows.map(r => r.answer)
  },

  // ─── Settings ──────────────────────────────────────────────────────────────

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<{id: number, user_id: number, name: string, created_at: Date, updated_at: Date}|null>}
   */
  async getSettings(db, userId) {
    const result = await db.query(
      'SELECT id, user_id, name, created_at, updated_at FROM settings WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  },

  /**
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} name
   * @returns {Promise<void>}
   */
  async saveSettings(db, userId, name) {
    await db.query(
      `INSERT INTO settings (user_id, name, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET name = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, name]
    )
  },

  // ─── Stories with photos (photo thumbnails aggregated per story) ────────────

  /**
   * All stories with aggregated photo thumbnails for a user.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<StoryWithPhotos[]>}
   */
  async findWithPhotos(db, userId) {
    const result = await db.query(
      `${STORIES_WITH_PHOTOS_BASE} WHERE s.user_id = $1 GROUP BY s.id`,
      [userId]
    )
    return result.rows
  },

  /**
   * Stories with photos for a specific chapter.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<StoryWithPhotos[]>}
   */
  async findWithPhotosByChapter(db, userId, chapterId) {
    const result = await db.query(
      `${STORIES_WITH_PHOTOS_BASE} WHERE s.user_id = $1 AND s.chapter_id = $2 GROUP BY s.id`,
      [userId, chapterId]
    )
    return result.rows
  },

  /**
   * All stories with photos ordered by chapter then question — for EPUB export.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<StoryWithPhotos[]>}
   */
  async findWithPhotosForExport(db, userId) {
    const result = await db.query(
      `${STORIES_WITH_PHOTOS_BASE} WHERE s.user_id = $1 GROUP BY s.id ORDER BY s.chapter_id, s.question_id`,
      [userId]
    )
    return result.rows
  }
}

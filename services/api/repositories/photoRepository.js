// @ts-check
/**
 * Photo repository — encapsulates all database access for the photos table.
 * All queries verify user ownership via the stories JOIN to prevent unauthorized access.
 * @typedef {import('../types/index.js').Photo} Photo
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { PHOTO } from '../db/columns.js'
const PHOTO_COLUMNS = PHOTO

export const photoRepository = {
  /**
   * Verify that a story belongs to the given user.
   * Used before creating a photo to confirm ownership.
   * @param {DbClient} db
   * @param {number} storyId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async verifyStoryOwnership(db, storyId, userId) {
    const result = await db.query('SELECT id FROM stories WHERE id = $1 AND user_id = $2', [
      storyId,
      userId
    ])
    return result.rows.length > 0
  },

  /**
   * Create a photo record for a story.
   * Returns the new photo's id and filename.
   * @param {DbClient} db
   * @param {{ storyId: number, filename: string, originalName: string, caption?: string }} data
   * @returns {Promise<{id: number, filename: string}>}
   */
  async create(db, { storyId, filename, originalName, caption }) {
    const result = await db.query(
      `INSERT INTO photos (story_id, filename, original_name, caption)
       VALUES ($1, $2, $3, $4)
       RETURNING id, filename`,
      [storyId, filename, originalName, caption || null]
    )
    return result.rows[0]
  },

  /**
   * Find a photo by filename, verifying it belongs to the given user.
   * Returns null if not found or not authorized.
   * @param {DbClient} db
   * @param {string} filename
   * @param {number} userId
   * @returns {Promise<Photo|null>}
   */
  async findByFilenameForUser(db, filename, userId) {
    const result = await db.query(
      `SELECT ${PHOTO_COLUMNS}
       FROM photos p
       JOIN stories s ON p.story_id = s.id
       WHERE p.filename = $1 AND s.user_id = $2`,
      [filename, userId]
    )
    return result.rows[0] || null
  },

  /**
   * Find a photo by id, verifying it belongs to the given user.
   * Returns null if not found or not authorized.
   * @param {DbClient} db
   * @param {number} photoId
   * @param {number} userId
   * @returns {Promise<Photo|null>}
   */
  async findByIdForUser(db, photoId, userId) {
    const result = await db.query(
      `SELECT ${PHOTO_COLUMNS}
       FROM photos p
       JOIN stories s ON p.story_id = s.id
       WHERE p.id = $1 AND s.user_id = $2`,
      [photoId, userId]
    )
    return result.rows[0] || null
  },

  /**
   * Get all photos for a story, verifying the story belongs to the given user.
   * @param {DbClient} db
   * @param {number} storyId
   * @param {number} userId
   * @returns {Promise<Photo[]>}
   */
  async findByStoryForUser(db, storyId, userId) {
    const result = await db.query(
      `SELECT ${PHOTO_COLUMNS}
       FROM photos p
       JOIN stories s ON p.story_id = s.id
       WHERE p.story_id = $1 AND s.user_id = $2
       ORDER BY p.created_at`,
      [storyId, userId]
    )
    return result.rows
  },

  /**
   * Delete a photo by id.
   * @param {DbClient} db
   * @param {number} photoId
   * @returns {Promise<void>}
   */
  async deleteById(db, photoId) {
    await db.query('DELETE FROM photos WHERE id = $1', [photoId])
  }
}

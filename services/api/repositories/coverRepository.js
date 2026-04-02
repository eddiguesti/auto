// @ts-check
/**
 * Cover repository — encapsulates all database access for the book_covers table.
 * @typedef {import('../types/index.js').BookCover} BookCover
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { BOOK_COVER } from '../db/columns.js'

export const coverRepository = {
  /**
   * Get the saved book cover for a user.
   * Returns the cover row or null.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<BookCover|null>}
   */
  async findByUser(db, userId) {
    const result = await db.query(`SELECT ${BOOK_COVER} FROM book_covers WHERE user_id = $1`, [
      userId
    ])
    return result.rows[0] || null
  },

  /**
   * Upsert a user's book cover metadata.
   * Returns the saved cover row.
   * @param {DbClient} db
   * @param {number} userId
   * @param {{ templateId?: string, title: string, author: string, spineText?: string, colorScheme?: object, customSettings?: object }} data
   * @returns {Promise<BookCover>}
   */
  async upsert(db, userId, { templateId, title, author, spineText, colorScheme, customSettings }) {
    const result = await db.query(
      `INSERT INTO book_covers (
         user_id, template_id, title, author,
         spine_text, color_scheme, custom_settings, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         template_id = EXCLUDED.template_id,
         title = EXCLUDED.title,
         author = EXCLUDED.author,
         spine_text = EXCLUDED.spine_text,
         color_scheme = EXCLUDED.color_scheme,
         custom_settings = EXCLUDED.custom_settings,
         updated_at = CURRENT_TIMESTAMP
       RETURNING ${BOOK_COVER}`,
      [
        userId,
        templateId || 'default',
        title,
        author,
        spineText,
        JSON.stringify(colorScheme || {}),
        JSON.stringify(customSettings || {})
      ]
    )
    return result.rows[0]
  }
}

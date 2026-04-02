// @ts-check
/**
 * Audiobook repository — encapsulates all database access for voice_models
 * and audiobooks tables used by the audiobook generation flow.
 * @typedef {import('../types/index.js').VoiceModel} VoiceModel
 * @typedef {import('../types/index.js').Audiobook} Audiobook
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

export const audiobookRepository = {
  /**
   * Upsert a voice sample reference for a user.
   * filename is the local file path (not a Fish.audio model ID).
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} filename
   * @param {boolean} consentGiven
   * @returns {Promise<void>}
   */
  async saveVoiceSample(db, userId, filename, consentGiven) {
    await db.query(
      `INSERT INTO voice_models (user_id, fish_model_id, consent_given, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         fish_model_id = $2,
         consent_given = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, filename, consentGiven]
    )
  },

  /**
   * Find a user's voice sample.
   * Returns { fish_model_id, consent_given, created_at } or null.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<VoiceModel|null>}
   */
  async findVoiceSample(db, userId) {
    const result = await db.query(
      'SELECT fish_model_id, consent_given, created_at FROM voice_models WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  },

  /**
   * Find a user's voice sample only if consent was given (for generation).
   * Returns { fish_model_id } or null.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<{fish_model_id: string}|null>}
   */
  async findVoiceSampleWithConsent(db, userId) {
    const result = await db.query(
      'SELECT fish_model_id FROM voice_models WHERE user_id = $1 AND consent_given = true',
      [userId]
    )
    return result.rows[0] || null
  },

  /**
   * Delete a user's voice model record.
   * Returns the fish_model_id (filename) so the caller can delete the file.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<string|null>}
   */
  async deleteVoiceSample(db, userId) {
    const existing = await db.query('SELECT fish_model_id FROM voice_models WHERE user_id = $1', [
      userId
    ])
    const filename = existing.rows[0]?.fish_model_id || null
    await db.query('DELETE FROM voice_models WHERE user_id = $1', [userId])
    return filename
  },

  /**
   * Record an audiobook generation.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} filename
   * @param {string} voiceType
   * @returns {Promise<void>}
   */
  async saveAudiobook(db, userId, filename, voiceType) {
    await db.query(
      `INSERT INTO audiobooks (user_id, filename, voice_type, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [userId, filename, voiceType]
    )
  },

  /**
   * Get recent audiobooks for a user.
   * @param {DbClient} db
   * @param {number} userId
   * @param {number} [limit=5]
   * @returns {Promise<Audiobook[]>}
   */
  async findRecentByUser(db, userId, limit = 5) {
    const result = await db.query(
      `SELECT filename, voice_type, created_at
       FROM audiobooks
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows
  },

  /**
   * Verify that an audiobook filename belongs to the given user.
   * Returns the row or null if not found / not owned.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} filename
   * @returns {Promise<{filename: string}|null>}
   */
  async findByFilenameForUser(db, userId, filename) {
    const result = await db.query(
      'SELECT filename FROM audiobooks WHERE user_id = $1 AND filename = $2',
      [userId, filename]
    )
    return result.rows[0] || null
  }
}

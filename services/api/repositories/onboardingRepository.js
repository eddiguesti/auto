// @ts-check
/**
 * Onboarding repository — encapsulates all database access for the
 * user_onboarding and chapter_images tables.
 * @typedef {import('../types/index.js').OnboardingStatus} OnboardingStatus
 * @typedef {import('../types/index.js').OnboardingContext} OnboardingContext
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

export const onboardingRepository = {
  /**
   * Get the onboarding status row for a user.
   * Returns the row or null if no record exists yet.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<OnboardingStatus|null>}
   */
  async findByUser(db, userId) {
    const result = await db.query(
      `SELECT onboarding_completed, input_preference, birth_place, birth_country, birth_year
       FROM user_onboarding
       WHERE user_id = $1`,
      [userId]
    )
    return result.rows[0] || null
  },

  /**
   * Get the full context row (birth info + additional_context) for a user.
   * Returns the row or null.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<OnboardingContext|null>}
   */
  async findContext(db, userId) {
    const result = await db.query(
      `SELECT birth_place, birth_country, birth_year, additional_context
       FROM user_onboarding
       WHERE user_id = $1`,
      [userId]
    )
    return result.rows[0] || null
  },

  /**
   * Upsert the user's input preference (voice / type).
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} preference
   * @returns {Promise<void>}
   */
  async upsertPreference(db, userId, preference) {
    await db.query(
      `INSERT INTO user_onboarding (user_id, input_preference, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         input_preference = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, preference]
    )
  },

  /**
   * Upsert biographical context (birth place / country / year).
   * Uses COALESCE so existing values are preserved when null is passed.
   * @param {DbClient} db
   * @param {number} userId
   * @param {{ birthPlace?: string, birthCountry?: string, birthYear?: number, additionalContext?: string }} data
   * @returns {Promise<void>}
   */
  async upsertContext(db, userId, { birthPlace, birthCountry, birthYear, additionalContext }) {
    await db.query(
      `INSERT INTO user_onboarding (user_id, birth_place, birth_country, birth_year, additional_context, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         birth_place = COALESCE($2, user_onboarding.birth_place),
         birth_country = COALESCE($3, user_onboarding.birth_country),
         birth_year = COALESCE($4, user_onboarding.birth_year),
         additional_context = COALESCE($5, user_onboarding.additional_context),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        birthPlace || null,
        birthCountry || null,
        birthYear || null,
        additionalContext || null
      ]
    )
  },

  /**
   * Save channel preferences (overwrites existing).
   * @param {DbClient} db
   * @param {number} userId
   * @param {object} channels
   * @returns {Promise<void>}
   */
  async upsertChannelPreferences(db, userId, channels) {
    await db.query(
      `UPDATE user_onboarding
       SET channel_preferences = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [JSON.stringify(channels), userId]
    )
  },

  /**
   * Mark onboarding as complete.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async markComplete(db, userId) {
    await db.query(
      `UPDATE user_onboarding
       SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    )
  },

  /**
   * Delete all onboarding data for a user (used by reset endpoint).
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async deleteByUser(db, userId) {
    await db.query('DELETE FROM user_onboarding WHERE user_id = $1', [userId])
  },

  // ─── Chapter images ───────────────────────────────────────────────────────

  /**
   * Insert a chapter_images row with status 'generating'.
   * ON CONFLICT DO NOTHING — returns false if another process already started.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<boolean>}
   */
  async startChapterImageGeneration(db, userId, chapterId) {
    const result = await db.query(
      `INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
       VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, chapter_id) DO NOTHING`,
      [userId, chapterId]
    )
    return result.rowCount > 0
  },

  /**
   * Mark a chapter image as generating (upsert — used by onboarding complete flow).
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<void>}
   */
  async upsertChapterImageGenerating(db, userId, chapterId) {
    await db.query(
      `INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
       VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, chapter_id) DO UPDATE SET
         generation_status = 'generating',
         updated_at = CURRENT_TIMESTAMP`,
      [userId, chapterId]
    )
  },

  /**
   * Mark a chapter image generation as completed with the resulting URL.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @param {string} imageUrl
   * @param {string} promptUsed
   * @returns {Promise<void>}
   */
  async completeChapterImage(db, userId, chapterId, imageUrl, promptUsed) {
    await db.query(
      `UPDATE chapter_images
       SET image_url = $1, prompt_used = $2, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3 AND chapter_id = $4`,
      [imageUrl, promptUsed, userId, chapterId]
    )
  },

  /**
   * Mark a chapter image generation as failed.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} chapterId
   * @returns {Promise<void>}
   */
  async failChapterImage(db, userId, chapterId) {
    await db.query(
      `UPDATE chapter_images
       SET generation_status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND chapter_id = $2`,
      [userId, chapterId]
    )
  },

  /**
   * Delete all chapter images for a user (used by reset endpoint).
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async deleteChapterImages(db, userId) {
    await db.query('DELETE FROM chapter_images WHERE user_id = $1', [userId])
  }
}

// @ts-check
/**
 * Game repository — encapsulates database access for the game-layer tables:
 * user_game_state and streak_history.
 *
 * Higher-level game logic (achievement awarding, XP, etc.) lives in
 * services/gameService.js. This repository handles raw data access only.
 * @typedef {import('../types/index.js').StreakHistory} StreakHistory
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

export const gameRepository = {
  // ─── Game state ──────────────────────────────────────────────────────────

  /**
   * Enable or disable game mode for a user.
   * @param {DbClient} db
   * @param {number} userId
   * @param {boolean} enabled
   * @returns {Promise<void>}
   */
  async setGameMode(db, userId, enabled) {
    await db.query(
      `UPDATE user_game_state
       SET game_mode_enabled = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [enabled, userId]
    )
  },

  /**
   * Update game notification/scheduling settings.
   * Only updates fields that are provided (not undefined).
   * @param {DbClient} db
   * @param {number} userId
   * @param {{ notificationPreferences?: object, preferredPromptTime?: string, timezone?: string }} data
   * @returns {Promise<void>}
   */
  async updateSettings(db, userId, { notificationPreferences, preferredPromptTime, timezone }) {
    const updates = []
    const values = [userId]
    let i = 2

    if (notificationPreferences !== undefined) {
      updates.push(`notification_preferences = $${i++}`)
      values.push(JSON.stringify(notificationPreferences))
    }
    if (preferredPromptTime !== undefined) {
      updates.push(`preferred_prompt_time = $${i++}`)
      values.push(preferredPromptTime)
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${i++}`)
      values.push(timezone)
    }

    if (updates.length === 0) return

    updates.push('updated_at = NOW()')
    await db.query(`UPDATE user_game_state SET ${updates.join(', ')} WHERE user_id = $1`, values)
  },

  /**
   * Atomically consume one streak shield.
   * Returns { streak_shields_available, current_streak } or null if no shields remain.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<{streak_shields_available: number, current_streak: number}|null>}
   */
  async useStreakShield(db, userId) {
    const result = await db.query(
      `UPDATE user_game_state
       SET streak_shields_available = streak_shields_available - 1,
           streak_shields_used_this_week = streak_shields_used_this_week + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND streak_shields_available > 0
       RETURNING streak_shields_available, current_streak`,
      [userId]
    )
    return result.rows[0] || null
  },

  // ─── Streak history ───────────────────────────────────────────────────────

  /**
   * Upsert a streak history entry for a given date.
   * shieldUsed = true marks the date as covered by a shield.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @param {{ hadActivity: boolean, streak: number, shieldUsed?: boolean }} data
   * @returns {Promise<void>}
   */
  async recordStreakHistory(db, userId, date, { hadActivity, streak, shieldUsed = false }) {
    await db.query(
      `INSERT INTO streak_history (user_id, date, had_activity, streak_on_this_day, shield_used)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date) DO UPDATE SET shield_used = $5`,
      [userId, date, hadActivity, streak, shieldUsed]
    )
  },

  /**
   * Get streak history entries for a user (most recent first).
   * days is validated by the caller (1–365).
   * @param {DbClient} db
   * @param {number} userId
   * @param {number} days
   * @returns {Promise<StreakHistory[]>}
   */
  async getStreakHistory(db, userId, days) {
    const result = await db.query(
      `SELECT date, had_activity, streak_on_this_day, shield_used, prompt_completed
       FROM streak_history
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [userId, days]
    )
    return result.rows
  }
}

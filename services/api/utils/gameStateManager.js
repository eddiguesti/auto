// /life-story/server/utils/gameStateManager.js

import pool from '../db/index.js';

/**
 * Initialize game state for a new user
 */
export async function initializeGameState(userId) {
  try {
    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM user_game_state WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new state
    const result = await pool.query(
      `INSERT INTO user_game_state (user_id, game_mode_enabled)
       VALUES ($1, false)
       RETURNING *`,
      [userId]
    );

    // Initialize collection progress for all collections
    const collections = await pool.query('SELECT id FROM collections WHERE is_active = true');

    for (const collection of collections.rows) {
      await pool.query(
        `INSERT INTO user_collection_progress (user_id, collection_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, collection_id) DO NOTHING`,
        [userId, collection.id]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error initializing game state:', error);
    throw error;
  }
}

/**
 * Record daily activity and update streak
 */
export async function recordActivity(userId) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get current state
    const state = await pool.query(
      `SELECT current_streak, longest_streak, last_activity_date
       FROM user_game_state
       WHERE user_id = $1`,
      [userId]
    );

    if (state.rows.length === 0) {
      await initializeGameState(userId);
      return recordActivity(userId);
    }

    const { current_streak, longest_streak, last_activity_date } = state.rows[0];
    const lastDate = last_activity_date ? new Date(last_activity_date).toISOString().split('T')[0] : null;

    // Already recorded today
    if (lastDate === today) {
      return { streakUpdated: false, currentStreak: current_streak };
    }

    let newStreak = current_streak;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak = current_streak + 1;
    } else if (lastDate === null) {
      // First activity ever
      newStreak = 1;
    } else {
      // Check if shield was used yesterday
      const shieldUsed = await pool.query(
        `SELECT shield_used FROM streak_history
         WHERE user_id = $1 AND date = $2 AND shield_used = true`,
        [userId, yesterdayStr]
      );

      if (shieldUsed.rows.length > 0) {
        // Shield protected the streak
        newStreak = current_streak + 1;
      } else {
        // Streak broken - start fresh
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, longest_streak);

    // Update game state
    await pool.query(
      `UPDATE user_game_state
       SET current_streak = $1,
           longest_streak = $2,
           last_activity_date = $3,
           daily_prompt_completed_today = true,
           prompts_completed_this_week = prompts_completed_this_week + 1,
           total_memories = total_memories + 1,
           updated_at = NOW()
       WHERE user_id = $4`,
      [newStreak, newLongest, today, userId]
    );

    // Record in history
    await pool.query(
      `INSERT INTO streak_history (user_id, date, had_activity, streak_on_this_day, prompt_completed)
       VALUES ($1, $2, true, $3, true)
       ON CONFLICT (user_id, date) DO UPDATE SET
         had_activity = true,
         streak_on_this_day = $3,
         prompt_completed = true`,
      [userId, today, newStreak]
    );

    return {
      streakUpdated: true,
      currentStreak: newStreak,
      longestStreak: newLongest,
      isNewRecord: newStreak > longest_streak
    };
  } catch (error) {
    console.error('Error recording activity:', error);
    throw error;
  }
}

/**
 * Reset daily flags (called by cron at midnight)
 */
export async function resetDailyFlags() {
  try {
    await pool.query(
      `UPDATE user_game_state
       SET daily_prompt_completed_today = false,
           updated_at = NOW()`
    );

    console.log('Daily flags reset');
  } catch (error) {
    console.error('Error resetting daily flags:', error);
    throw error;
  }
}

/**
 * Reset weekly flags (called by cron on Monday)
 */
export async function resetWeeklyFlags() {
  try {
    await pool.query(
      `UPDATE user_game_state
       SET prompts_completed_this_week = 0,
           streak_shields_used_this_week = 0,
           streak_shields_available = LEAST(streak_shields_available + 1, 3),
           last_shield_reset = CURRENT_DATE,
           updated_at = NOW()`
    );

    console.log('Weekly flags reset, shields restored');
  } catch (error) {
    console.error('Error resetting weekly flags:', error);
    throw error;
  }
}

/**
 * Update memory counts from actual data
 */
export async function syncMemoryCounts(userId) {
  try {
    // Count stories
    const stories = await pool.query(
      `SELECT COUNT(*) as count FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
      [userId]
    );

    // Count people
    const people = await pool.query(
      `SELECT COUNT(*) as count FROM memory_entities
       WHERE user_id = $1 AND entity_type = 'person'`,
      [userId]
    );

    // Count places
    const places = await pool.query(
      `SELECT COUNT(*) as count FROM memory_entities
       WHERE user_id = $1 AND entity_type = 'place'`,
      [userId]
    );

    await pool.query(
      `UPDATE user_game_state
       SET total_memories = $1,
           total_people_mentioned = $2,
           total_places_mentioned = $3,
           updated_at = NOW()
       WHERE user_id = $4`,
      [
        parseInt(stories.rows[0].count),
        parseInt(people.rows[0].count),
        parseInt(places.rows[0].count),
        userId
      ]
    );
  } catch (error) {
    console.error('Error syncing memory counts:', error);
    throw error;
  }
}

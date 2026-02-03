// /life-story/server/cron/weeklyTasks.js

import pool from '../db/index.js';
import { scheduleWeeklyDigest } from '../utils/notifications.js';

/**
 * Run Monday morning - Reset weekly flags, send digests
 */
export async function runWeeklyTasks() {
  console.log('Starting weekly tasks...');

  // 1. Reset weekly shields (give everyone 1 shield, max 3)
  await pool.query(`
    UPDATE user_game_state
    SET streak_shields_available = LEAST(streak_shields_available + 1, 3),
        streak_shields_used_this_week = 0,
        prompts_completed_this_week = 0,
        last_shield_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE game_mode_enabled = true
  `);
  console.log('Reset weekly shields');

  // 2. Send weekly digest emails
  const activeUsers = await pool.query(`
    SELECT ugs.user_id
    FROM user_game_state ugs
    WHERE ugs.game_mode_enabled = true
      AND ugs.notification_preferences->>'weekly_digest' != 'false'
      AND (ugs.last_activity_date > NOW() - INTERVAL '30 days' OR ugs.current_streak > 0)
  `);

  let digests = 0;
  for (const user of activeUsers.rows) {
    try {
      await scheduleWeeklyDigest(user.user_id);
      digests++;
    } catch (err) {
      console.error(`Failed to schedule digest for user ${user.user_id}:`, err.message);
    }
  }
  console.log(`Scheduled ${digests} weekly digests`);

  // 3. Clean up old notification queue entries (older than 7 days)
  await pool.query(`
    DELETE FROM notification_queue
    WHERE created_at < NOW() - INTERVAL '7 days'
  `);
  console.log('Cleaned up old notifications');

  console.log('Weekly tasks complete');
}

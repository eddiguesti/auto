// /life-story/server/cron/dailyTasks.js

import pool from '../db/index.js';
import { createDailyPrompt } from '../utils/promptSelector.js';
import { scheduleDailyReminder, scheduleStreakWarning } from '../utils/notifications.js';

/**
 * Run at midnight - Reset daily flags, prepare new prompts
 */
export async function runDailyTasks() {
  console.log('Starting daily tasks...');

  // 1. Reset daily_prompt_completed_today for all users
  await pool.query(`
    UPDATE user_game_state
    SET daily_prompt_completed_today = false,
        updated_at = NOW()
    WHERE game_mode_enabled = true
  `);
  console.log('Reset daily completion flags');

  // 2. Pre-generate today's prompts for active users
  const activeUsers = await pool.query(`
    SELECT user_id FROM user_game_state
    WHERE game_mode_enabled = true
      AND (last_activity_date > NOW() - INTERVAL '14 days' OR current_streak > 0)
  `);

  let promptsGenerated = 0;
  for (const row of activeUsers.rows) {
    try {
      await createDailyPrompt(row.user_id);
      promptsGenerated++;
    } catch (err) {
      console.error(`Failed to create prompt for user ${row.user_id}:`, err.message);
    }
  }
  console.log(`Generated ${promptsGenerated} daily prompts`);

  // 3. Process broken streaks from yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Find users who didn't complete yesterday and didn't use a shield
  const brokenStreaks = await pool.query(`
    UPDATE user_game_state
    SET current_streak = 0,
        updated_at = NOW()
    WHERE game_mode_enabled = true
      AND current_streak > 0
      AND last_activity_date < $1
      AND user_id NOT IN (
        SELECT user_id FROM streak_history
        WHERE date = $1 AND shield_used = true
      )
    RETURNING user_id, current_streak as old_streak
  `, [yesterdayStr]);

  if (brokenStreaks.rows.length > 0) {
    console.log(`Reset ${brokenStreaks.rows.length} broken streaks`);
  }

  console.log('Daily tasks complete');
}

/**
 * Run at 6pm - Send reminders to users who haven't completed today
 */
export async function runEveningReminders() {
  console.log('Sending evening reminders...');

  // Get users who haven't completed today's prompt
  const users = await pool.query(`
    SELECT ugs.user_id, ugs.current_streak, u.email, u.name
    FROM user_game_state ugs
    JOIN users u ON ugs.user_id = u.id
    WHERE ugs.game_mode_enabled = true
      AND ugs.daily_prompt_completed_today = false
      AND ugs.notification_preferences->>'daily_reminder' != 'false'
      AND (ugs.last_activity_date > NOW() - INTERVAL '7 days' OR ugs.current_streak > 0)
  `);

  let sent = 0;
  for (const user of users.rows) {
    try {
      await scheduleDailyReminder(user.user_id);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder to user ${user.user_id}:`, err.message);
    }
  }

  console.log(`Scheduled ${sent} evening reminders`);
}

/**
 * Run at 11pm - Send streak warnings to users at risk
 */
export async function runStreakCheck() {
  console.log('Checking streaks at risk...');

  // Users with streaks > 7 days who haven't completed today
  const atRisk = await pool.query(`
    SELECT ugs.user_id, ugs.current_streak
    FROM user_game_state ugs
    WHERE ugs.game_mode_enabled = true
      AND ugs.current_streak >= 7
      AND ugs.daily_prompt_completed_today = false
      AND ugs.notification_preferences->>'streak_warning' != 'false'
  `);

  let warnings = 0;
  for (const user of atRisk.rows) {
    try {
      await scheduleStreakWarning(user.user_id);
      warnings++;
    } catch (err) {
      console.error(`Failed to send streak warning to user ${user.user_id}:`, err.message);
    }
  }

  console.log(`Sent ${warnings} streak warnings`);
}

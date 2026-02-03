// /life-story/server/utils/notifications.js

import pool from '../db/index.js';

/**
 * Notification types and their templates
 */
export const NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'daily_reminder',
  STREAK_WARNING: 'streak_warning',
  STREAK_CELEBRATION: 'streak_celebration',
  ACHIEVEMENT_EARNED: 'achievement_earned',
  FAMILY_ACTIVITY: 'family_activity',
  FAMILY_PROMPT: 'family_prompt',
  WEEKLY_DIGEST: 'weekly_digest',
  COLLECTION_COMPLETE: 'collection_complete'
};

/**
 * Schedule a notification for a user
 */
export async function scheduleNotification({
  userId,
  type,
  channel = 'email',
  subject,
  body,
  data = {},
  scheduledFor
}) {
  try {
    // Check user preferences
    const prefs = await pool.query(
      `SELECT notification_preferences FROM user_game_state WHERE user_id = $1`,
      [userId]
    );

    const preferences = prefs.rows[0]?.notification_preferences || {};

    // Check if this type is enabled
    const typeKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (preferences[typeKey] === false) {
      console.log(`Notification type ${type} disabled for user ${userId}`);
      return null;
    }

    // Schedule the notification
    const result = await pool.query(
      `INSERT INTO notification_queue
       (user_id, notification_type, channel, subject, body, data, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, type, channel, subject, body, JSON.stringify(data), scheduledFor || new Date()]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Schedule daily reminder for a user
 */
export async function scheduleDailyReminder(userId) {
  // Get user's preferred time and timezone
  const state = await pool.query(
    `SELECT ugs.preferred_prompt_time, ugs.timezone, ugs.current_streak,
            u.name, u.email
     FROM user_game_state ugs
     JOIN users u ON ugs.user_id = u.id
     WHERE ugs.user_id = $1`,
    [userId]
  );

  if (state.rows.length === 0) return;

  const { preferred_prompt_time, timezone, current_streak, name, email } = state.rows[0];

  // Calculate send time (6pm in user's timezone, or 6 hours after preferred time)
  const now = new Date();
  const sendTime = new Date();
  sendTime.setHours(18, 0, 0, 0); // Default 6pm

  if (sendTime <= now) {
    return; // Already past send time
  }

  const subject = current_streak > 0
    ? `Day ${current_streak + 1} awaits! Your memory is waiting.`
    : `Your memory is waiting, ${name || 'friend'}`;

  const body = generateReminderEmail(name, current_streak);

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.DAILY_REMINDER,
    channel: 'email',
    subject,
    body,
    data: { streak: current_streak, email },
    scheduledFor: sendTime
  });
}

/**
 * Schedule streak warning notification
 */
export async function scheduleStreakWarning(userId) {
  const state = await pool.query(
    `SELECT ugs.current_streak, u.name, u.email
     FROM user_game_state ugs
     JOIN users u ON ugs.user_id = u.id
     WHERE ugs.user_id = $1`,
    [userId]
  );

  if (state.rows.length === 0 || state.rows[0].current_streak < 3) return;

  const { current_streak, name, email } = state.rows[0];

  const sendTime = new Date();
  sendTime.setHours(20, 0, 0, 0); // 8pm

  const subject = `Your ${current_streak}-day streak needs you!`;
  const body = generateStreakWarningEmail(name, current_streak);

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.STREAK_WARNING,
    channel: 'email',
    subject,
    body,
    data: { streak: current_streak, email },
    scheduledFor: sendTime
  });
}

/**
 * Send achievement notification immediately
 */
export async function notifyAchievement(userId, achievement) {
  const user = await pool.query(
    'SELECT name, email FROM users WHERE id = $1',
    [userId]
  );

  if (user.rows.length === 0) return;

  const { name, email } = user.rows[0];

  const subject = `Achievement Unlocked: ${achievement.achievement_name}!`;
  const body = generateAchievementEmail(name, achievement);

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.ACHIEVEMENT_EARNED,
    channel: 'email',
    subject,
    body,
    data: { achievement, email },
    scheduledFor: new Date() // Send immediately
  });
}

/**
 * Send family prompt notification
 */
export async function notifyFamilyPrompt(forUserId, fromUser, promptText) {
  const user = await pool.query(
    'SELECT name, email FROM users WHERE id = $1',
    [forUserId]
  );

  if (user.rows.length === 0) return;

  const { name, email } = user.rows[0];

  const subject = `${fromUser.name} asked you a question!`;
  const body = generateFamilyPromptEmail(name, fromUser.name, promptText);

  return scheduleNotification({
    userId: forUserId,
    type: NOTIFICATION_TYPES.FAMILY_PROMPT,
    channel: 'email',
    subject,
    body,
    data: { fromUser, promptText, email },
    scheduledFor: new Date()
  });
}

/**
 * Generate weekly digest for a user
 */
export async function scheduleWeeklyDigest(userId) {
  const user = await pool.query(
    `SELECT u.name, u.email, ugs.current_streak, ugs.total_memories
     FROM users u
     JOIN user_game_state ugs ON u.id = ugs.user_id
     WHERE u.id = $1`,
    [userId]
  );

  if (user.rows.length === 0) return;

  const { name, email, current_streak, total_memories } = user.rows[0];

  // Get this week's memories
  const weeklyMemories = await pool.query(
    `SELECT chapter_id, LEFT(answer, 100) as preview
     FROM stories
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
       AND answer IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  // Send Sunday at 10am
  const sendTime = new Date();
  const daysUntilSunday = (7 - sendTime.getDay()) % 7 || 7;
  sendTime.setDate(sendTime.getDate() + daysUntilSunday);
  sendTime.setHours(10, 0, 0, 0);

  const subject = `Your Week in Memories`;
  const body = generateWeeklyDigestEmail(name, {
    streak: current_streak,
    totalMemories: total_memories,
    weeklyMemories: weeklyMemories.rows
  });

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.WEEKLY_DIGEST,
    channel: 'email',
    subject,
    body,
    data: { email, weeklyCount: weeklyMemories.rows.length },
    scheduledFor: sendTime
  });
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateReminderEmail(name, streak) {
  return `
Hi ${name || 'there'},

Your memory is waiting! Today's prompt is ready for you.

${streak > 0 ? `You're on a ${streak}-day streak. Keep it going!` : 'Start your streak today.'}

Just 2-3 minutes could preserve a precious memory forever.

[Answer Today's Prompt]

---
Easy Memoir - Preserving your story, one memory at a time.
  `.trim();
}

function generateStreakWarningEmail(name, streak) {
  return `
Hi ${name || 'there'},

Your ${streak}-day streak is at risk!

Don't let it slip away - just one quick memory will keep your streak alive.

[Save Your Streak Now]

---
Easy Memoir
  `.trim();
}

function generateAchievementEmail(name, achievement) {
  return `
Congratulations ${name || 'there'}!

You've earned a new achievement:

${achievement.achievement_name}
${achievement.achievement_description}

Keep capturing memories - more achievements await!

[See Your Achievements]

---
Easy Memoir
  `.trim();
}

function generateFamilyPromptEmail(name, fromName, promptText) {
  return `
Hi ${name || 'there'},

${fromName} has a question for your memoir:

"${promptText}"

They'd love to hear your story!

[Answer This Prompt]

---
Easy Memoir
  `.trim();
}

function generateWeeklyDigestEmail(name, data) {
  const memoryList = data.weeklyMemories
    .map(m => `- ${m.preview}...`)
    .join('\n');

  return `
Hi ${name || 'there'},

Here's your week in memories:

${data.weeklyMemories.length > 0 ? memoryList : 'No new memories this week - let\'s change that!'}

Your Stats:
- Current streak: ${data.streak} days
- Total memories: ${data.totalMemories}

[Continue Your Story]

---
Easy Memoir
  `.trim();
}

export default {
  NOTIFICATION_TYPES,
  scheduleNotification,
  scheduleDailyReminder,
  scheduleStreakWarning,
  notifyAchievement,
  notifyFamilyPrompt,
  scheduleWeeklyDigest
};

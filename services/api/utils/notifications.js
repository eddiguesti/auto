// /life-story/server/utils/notifications.js

import pool from '../db/index.js'

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
  COLLECTION_COMPLETE: 'collection_complete',
  UPGRADE_REMINDER_1: 'upgrade_reminder_1',
  UPGRADE_REMINDER_2: 'upgrade_reminder_2',
  UPGRADE_REMINDER_3: 'upgrade_reminder_3',
  UPGRADE_REMINDER_4: 'upgrade_reminder_4'
}

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
    )

    const preferences = prefs.rows[0]?.notification_preferences || {}

    // Check if this type is enabled
    const typeKey = type.replace(/_([a-z])/g, g => g[1].toUpperCase())
    if (preferences[typeKey] === false) {
      console.log(`Notification type ${type} disabled for user ${userId}`)
      return null
    }

    // Schedule the notification
    const result = await pool.query(
      `INSERT INTO notification_queue
       (user_id, notification_type, channel, subject, body, data, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, type, channel, subject, body, JSON.stringify(data), scheduledFor || new Date()]
    )

    return result.rows[0].id
  } catch (error) {
    console.error('Error scheduling notification:', error)
    throw error
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
  )

  if (state.rows.length === 0) return

  const { preferred_prompt_time, timezone, current_streak, name, email } = state.rows[0]

  // Calculate send time (6pm in user's timezone, or 6 hours after preferred time)
  const now = new Date()
  const sendTime = new Date()
  sendTime.setHours(18, 0, 0, 0) // Default 6pm

  if (sendTime <= now) {
    return // Already past send time
  }

  const subject =
    current_streak > 0
      ? `Day ${current_streak + 1} awaits! Your memory is waiting.`
      : `Your memory is waiting, ${name || 'friend'}`

  const body = generateReminderEmail(name, current_streak)

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.DAILY_REMINDER,
    channel: 'email',
    subject,
    body,
    data: { streak: current_streak, email },
    scheduledFor: sendTime
  })
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
  )

  if (state.rows.length === 0 || state.rows[0].current_streak < 3) return

  const { current_streak, name, email } = state.rows[0]

  const sendTime = new Date()
  sendTime.setHours(20, 0, 0, 0) // 8pm

  const subject = `Your ${current_streak}-day streak needs you!`
  const body = generateStreakWarningEmail(name, current_streak)

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.STREAK_WARNING,
    channel: 'email',
    subject,
    body,
    data: { streak: current_streak, email },
    scheduledFor: sendTime
  })
}

/**
 * Send achievement notification immediately
 */
export async function notifyAchievement(userId, achievement) {
  const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId])

  if (user.rows.length === 0) return

  const { name, email } = user.rows[0]

  const subject = `Achievement Unlocked: ${achievement.achievement_name}!`
  const body = generateAchievementEmail(name, achievement)

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.ACHIEVEMENT_EARNED,
    channel: 'email',
    subject,
    body,
    data: { achievement, email },
    scheduledFor: new Date() // Send immediately
  })
}

/**
 * Send family prompt notification
 */
export async function notifyFamilyPrompt(forUserId, fromUser, promptText) {
  const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [forUserId])

  if (user.rows.length === 0) return

  const { name, email } = user.rows[0]

  const subject = `${fromUser.name} asked you a question!`
  const body = generateFamilyPromptEmail(name, fromUser.name, promptText)

  return scheduleNotification({
    userId: forUserId,
    type: NOTIFICATION_TYPES.FAMILY_PROMPT,
    channel: 'email',
    subject,
    body,
    data: { fromUser, promptText, email },
    scheduledFor: new Date()
  })
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
  )

  if (user.rows.length === 0) return

  const { name, email, current_streak, total_memories } = user.rows[0]

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
  )

  // Send Sunday at 10am
  const sendTime = new Date()
  const daysUntilSunday = (7 - sendTime.getDay()) % 7 || 7
  sendTime.setDate(sendTime.getDate() + daysUntilSunday)
  sendTime.setHours(10, 0, 0, 0)

  const subject = `Your Week in Memories`
  const body = generateWeeklyDigestEmail(name, {
    streak: current_streak,
    totalMemories: total_memories,
    weeklyMemories: weeklyMemories.rows
  })

  return scheduleNotification({
    userId,
    type: NOTIFICATION_TYPES.WEEKLY_DIGEST,
    channel: 'email',
    subject,
    body,
    data: { email, weeklyCount: weeklyMemories.rows.length },
    scheduledFor: sendTime
  })
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
  `.trim()
}

function generateStreakWarningEmail(name, streak) {
  return `
Hi ${name || 'there'},

Your ${streak}-day streak is at risk!

Don't let it slip away - just one quick memory will keep your streak alive.

[Save Your Streak Now]

---
Easy Memoir
  `.trim()
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
  `.trim()
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
  `.trim()
}

function generateWeeklyDigestEmail(name, data) {
  const memoryList = data.weeklyMemories.map(m => `- ${m.preview}...`).join('\n')

  return `
Hi ${name || 'there'},

Here's your week in memories:

${data.weeklyMemories.length > 0 ? memoryList : "No new memories this week - let's change that!"}

Your Stats:
- Current streak: ${data.streak} days
- Total memories: ${data.totalMemories}

[Continue Your Story]

---
Easy Memoir
  `.trim()
}

/**
 * Schedule the 4-email upgrade drip sequence after Chapter 1 completion
 * Only schedules if user is not premium and hasn't received the sequence before
 */
export async function scheduleUpgradeDrip(userId) {
  try {
    // Check if user is already premium
    const userResult = await pool.query('SELECT name, premium_until FROM users WHERE id = $1', [
      userId
    ])
    if (userResult.rows.length === 0) return
    const { name, premium_until } = userResult.rows[0]
    if (premium_until && new Date(premium_until) > new Date()) return

    // Check if drip sequence already scheduled
    const existing = await pool.query(
      `SELECT id FROM notification_queue
       WHERE user_id = $1 AND notification_type LIKE 'upgrade_reminder_%'
       LIMIT 1`,
      [userId]
    )
    if (existing.rows.length > 0) return

    const firstName = name?.split(' ')[0] || 'there'
    const now = new Date()

    // Email 1: Day 1 (24 hours after completion)
    const day1 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    await scheduleNotification({
      userId,
      type: NOTIFICATION_TYPES.UPGRADE_REMINDER_1,
      channel: 'email',
      subject: `${firstName}, your first chapter is wonderful`,
      body: generateUpgradeEmail1(firstName),
      scheduledFor: day1
    })

    // Email 2: Day 4
    const day4 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
    await scheduleNotification({
      userId,
      type: NOTIFICATION_TYPES.UPGRADE_REMINDER_2,
      channel: 'email',
      subject: `The memories your family doesn't know yet`,
      body: generateUpgradeEmail2(firstName),
      scheduledFor: day4
    })

    // Email 3: Day 8
    const day8 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)
    await scheduleNotification({
      userId,
      type: NOTIFICATION_TYPES.UPGRADE_REMINDER_3,
      channel: 'email',
      subject: `How Robert, 72, wrote his entire life story`,
      body: generateUpgradeEmail3(firstName),
      scheduledFor: day8
    })

    // Email 4: Day 14
    const day14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    await scheduleNotification({
      userId,
      type: NOTIFICATION_TYPES.UPGRADE_REMINDER_4,
      channel: 'email',
      subject: `Your story is waiting, ${firstName}`,
      body: generateUpgradeEmail4(firstName),
      scheduledFor: day14
    })

    console.log(`Scheduled upgrade drip sequence for user ${userId}`)
  } catch (error) {
    console.error('Error scheduling upgrade drip:', error)
  }
}

// ============================================
// UPGRADE EMAIL TEMPLATES
// ============================================

function generateUpgradeEmail1(name) {
  const appUrl = process.env.APP_URL || 'https://easymemoir.com'
  return `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3c3022;">
  <p>Hi ${name},</p>
  <p>We just wanted to say — your first chapter is wonderful.</p>
  <p>The memories you've captured in <em>Earliest Memories</em> are the kind of stories that families treasure for generations. Your family is going to love reading them.</p>
  <p>When you're ready, there are nine more chapters of your story waiting to be written — from your school days and the people who shaped you, all the way through to the wisdom you want to pass on.</p>
  <p>No rush. Your story will be here whenever you are.</p>
  <p style="margin-top: 24px;">
    <a href="${appUrl}/home" style="display: inline-block; padding: 12px 28px; background: #6b5c4c; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">Continue Your Story</a>
  </p>
  <p style="color: #9c8b7a; font-size: 14px; margin-top: 32px;">— The Easy Memoir Team</p>
</div>`.trim()
}

function generateUpgradeEmail2(name) {
  const appUrl = process.env.APP_URL || 'https://easymemoir.com'
  return `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3c3022;">
  <p>Hi ${name},</p>
  <p>You've told the story of your earliest years. But there's so much more your family doesn't know yet.</p>
  <p>Your school days. The friends who shaped you. Falling in love. Raising a family. The moments that changed everything.</p>
  <p>These are the stories your grandchildren will one day read to their children. They deserve to be written down — in your own words, in your own voice.</p>
  <p>The complete memoir package includes all 10 chapters, an AI writing companion to help you find the right words, and a beautiful printed hardcover book delivered to your door.</p>
  <p style="margin-top: 24px;">
    <a href="${appUrl}/home" style="display: inline-block; padding: 12px 28px; background: #6b5c4c; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">See What's Next</a>
  </p>
  <p style="color: #9c8b7a; font-size: 14px; margin-top: 32px;">— The Easy Memoir Team</p>
</div>`.trim()
}

function generateUpgradeEmail3(name) {
  const appUrl = process.env.APP_URL || 'https://easymemoir.com'
  return `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3c3022;">
  <p>Hi ${name},</p>
  <p><em>"I thought I'd have nothing interesting to say. But the questions kept drawing out memories I'd forgotten. Suddenly I'd written 40 pages. My grandchildren were amazed."</em></p>
  <p style="color: #9c8b7a;">— Robert M., 72, Surrey</p>
  <p>Robert's story is one of thousands. Most people are surprised by how much they have to share once someone asks the right questions.</p>
  <p>The complete memoir package is <strong>£149 this month</strong> (usually £300) — that includes all 10 chapters and a professionally printed, full-colour hardcover book. The perfect family heirloom.</p>
  <p style="margin-top: 24px;">
    <a href="${appUrl}/home" style="display: inline-block; padding: 12px 28px; background: #6b5c4c; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">Start Your Full Memoir</a>
  </p>
  <p style="color: #9c8b7a; font-size: 14px; margin-top: 32px;">— The Easy Memoir Team</p>
</div>`.trim()
}

function generateUpgradeEmail4(name) {
  const appUrl = process.env.APP_URL || 'https://easymemoir.com'
  return `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3c3022;">
  <p>Hi ${name},</p>
  <p>Just a gentle note to say — your first chapter is saved and ready whenever you are.</p>
  <p>Memories fade a little more each day. But the ones you've already written down are preserved forever. There are nine more chapters whenever you'd like to continue.</p>
  <p style="margin-top: 24px;">
    <a href="${appUrl}/home" style="display: inline-block; padding: 12px 28px; background: #6b5c4c; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">Pick Up Where You Left Off</a>
  </p>
  <p>If Easy Memoir isn't for you, no worries at all. We're glad you gave it a try.</p>
  <p style="color: #9c8b7a; font-size: 14px; margin-top: 32px;">— The Easy Memoir Team</p>
</div>`.trim()
}

export default {
  NOTIFICATION_TYPES,
  scheduleNotification,
  scheduleDailyReminder,
  scheduleStreakWarning,
  notifyAchievement,
  notifyFamilyPrompt,
  scheduleWeeklyDigest,
  scheduleUpgradeDrip
}

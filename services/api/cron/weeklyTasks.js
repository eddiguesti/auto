import pool from '../db/index.js'
import { scheduleWeeklyDigest } from '../utils/notifications.js'
import { sendWeeklyTopicEmails } from './weeklyTopicEmails.js'
import { sendInactiveUserReminders } from './inactiveReminders.js'
import { captureException } from '../utils/sentry.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('cron:weekly')

async function markCronAttempt(jobName) {
  try {
    await pool.query(
      `INSERT INTO cron_health (job_name, last_attempt)
       VALUES ($1, NOW())
       ON CONFLICT (job_name) DO UPDATE SET last_attempt = NOW()`,
      [jobName]
    )
  } catch {
    /* non-critical */
  }
}

async function markCronSuccess(jobName) {
  try {
    await pool.query(
      `INSERT INTO cron_health (job_name, last_success, last_attempt)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (job_name) DO UPDATE SET last_success = NOW(), last_attempt = NOW()`,
      [jobName]
    )
  } catch {
    /* non-critical */
  }
}

/**
 * Run Monday morning - Reset weekly flags, send digests
 */
export async function runWeeklyTasks() {
  const jobName = 'weeklyTasks'
  const startedAt = Date.now()
  await markCronAttempt(jobName)
  logger.info('Starting weekly tasks')

  try {
    // 1. Reset weekly shields (give everyone 1 shield, max 3)
    await pool.query(`
      UPDATE user_game_state
      SET streak_shields_available = LEAST(streak_shields_available + 1, 3),
          streak_shields_used_this_week = 0,
          prompts_completed_this_week = 0,
          last_shield_reset = CURRENT_DATE,
          updated_at = NOW()
      WHERE game_mode_enabled = true
    `)
    logger.info('Reset weekly shields')

    // 2. Send weekly digest emails
    const activeUsers = await pool.query(`
      SELECT ugs.user_id
      FROM user_game_state ugs
      WHERE ugs.game_mode_enabled = true
        AND ugs.notification_preferences->>'weekly_digest' != 'false'
        AND (ugs.last_activity_date > NOW() - INTERVAL '30 days' OR ugs.current_streak > 0)
    `)

    let digests = 0
    for (const user of activeUsers.rows) {
      try {
        await scheduleWeeklyDigest(user.user_id)
        digests++
      } catch (err) {
        logger.error('Failed to schedule weekly digest', {
          userId: user.user_id,
          error: err.message
        })
        captureException(err, { userId: user.user_id })
      }
    }
    logger.info(`Scheduled ${digests} weekly digests`)

    // 3. Send weekly conversation topic emails with magic links
    let topicsSent = 0
    try {
      topicsSent = await sendWeeklyTopicEmails()
      logger.info(`Sent ${topicsSent} weekly topic emails`)
    } catch (err) {
      logger.error('Weekly topic emails failed', { error: err.message })
      captureException(err, { route: 'cron:weeklyTopicEmails' })
    }

    // 4. Clean up old notification queue entries (older than 7 days)
    await pool.query(`
      DELETE FROM notification_queue
      WHERE created_at < NOW() - INTERVAL '7 days'
    `)
    logger.info('Cleaned up old notifications')

    // 5. Send re-engagement reminders to inactive users
    let remindersSent = 0
    try {
      remindersSent = await sendInactiveUserReminders()
      logger.info(`Sent ${remindersSent} inactive user reminders`)
    } catch (err) {
      logger.error('Inactive user reminders failed', { error: err.message })
      captureException(err, { route: 'cron:inactiveReminders' })
    }

    const duration = Date.now() - startedAt
    logger.info('Weekly tasks complete', {
      job: jobName,
      status: 'success',
      durationMs: duration,
      digests,
      topicsSent,
      remindersSent
    })
    await markCronSuccess(jobName)
  } catch (err) {
    logger.error('Weekly tasks failed', { job: jobName, error: err.message })
    captureException(err, { route: 'cron:weeklyTasks' })
    throw err
  }
}

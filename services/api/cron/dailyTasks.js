import pool from '../db/index.js'
import { createDailyPrompt } from '../utils/promptSelector.js'
import { scheduleDailyReminder, scheduleStreakWarning } from '../utils/notifications.js'
import { captureException } from '../utils/sentry.js'
import { createLogger } from '../utils/logger.js'
import { cleanupExpiredBlacklist } from '../utils/tokenBlacklist.js'

const logger = createLogger('cron:daily')

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
 * Run at midnight - Reset daily flags, prepare new prompts, clean up expired tokens
 */
export async function runDailyTasks() {
  const jobName = 'dailyTasks'
  const startedAt = Date.now()
  await markCronAttempt(jobName)
  logger.info('Starting daily tasks')

  try {
    // 1. Reset daily_prompt_completed_today for all users
    await pool.query(`
      UPDATE user_game_state
      SET daily_prompt_completed_today = false,
          updated_at = NOW()
      WHERE game_mode_enabled = true
    `)
    logger.info('Reset daily completion flags')

    // 2. Pre-generate today's prompts for active users
    const activeUsers = await pool.query(`
      SELECT user_id FROM user_game_state
      WHERE game_mode_enabled = true
        AND (last_activity_date > NOW() - INTERVAL '14 days' OR current_streak > 0)
    `)

    let promptsGenerated = 0
    for (const row of activeUsers.rows) {
      try {
        await createDailyPrompt(row.user_id)
        promptsGenerated++
      } catch (err) {
        logger.error('Failed to create daily prompt', { userId: row.user_id, error: err.message })
        captureException(err, { userId: row.user_id })
      }
    }
    logger.info(`Generated ${promptsGenerated} daily prompts`)

    // 3. Process broken streaks from yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const brokenStreaks = await pool.query(
      `
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
    `,
      [yesterdayStr]
    )

    if (brokenStreaks.rows.length > 0) {
      logger.info(`Reset ${brokenStreaks.rows.length} broken streaks`)
    }

    // 4. Clean up expired JWT blacklist entries and auth tokens
    await cleanupExpiredBlacklist()
    await pool.query(`DELETE FROM email_verification_tokens WHERE expires_at < NOW()`)
    await pool.query(`DELETE FROM password_reset_tokens WHERE expires_at < NOW()`)
    logger.info('Cleaned up expired tokens')

    const duration = Date.now() - startedAt
    logger.info('Daily tasks complete', {
      job: jobName,
      status: 'success',
      durationMs: duration,
      promptsGenerated,
      brokenStreaks: brokenStreaks.rows.length
    })
    await markCronSuccess(jobName)
  } catch (err) {
    logger.error('Daily tasks failed', { job: jobName, error: err.message })
    captureException(err, { route: 'cron:dailyTasks' })
    throw err
  }
}

/**
 * Run at 6pm - Send reminders to users who haven't completed today
 */
export async function runEveningReminders() {
  const jobName = 'eveningReminders'
  const startedAt = Date.now()
  await markCronAttempt(jobName)
  logger.info('Sending evening reminders')

  try {
    const users = await pool.query(`
      SELECT ugs.user_id, ugs.current_streak, u.email, u.name
      FROM user_game_state ugs
      JOIN users u ON ugs.user_id = u.id
      WHERE ugs.game_mode_enabled = true
        AND ugs.daily_prompt_completed_today = false
        AND ugs.notification_preferences->>'daily_reminder' != 'false'
        AND (ugs.last_activity_date > NOW() - INTERVAL '7 days' OR ugs.current_streak > 0)
    `)

    let sent = 0
    for (const user of users.rows) {
      try {
        await scheduleDailyReminder(user.user_id)
        sent++
      } catch (err) {
        logger.error('Failed to send evening reminder', {
          userId: user.user_id,
          error: err.message
        })
        captureException(err, { userId: user.user_id })
      }
    }

    const duration = Date.now() - startedAt
    logger.info('Evening reminders complete', {
      job: jobName,
      status: 'success',
      durationMs: duration,
      sent
    })
    await markCronSuccess(jobName)
  } catch (err) {
    logger.error('Evening reminders failed', { job: jobName, error: err.message })
    captureException(err, { route: 'cron:eveningReminders' })
    throw err
  }
}

/**
 * Run at 11pm - Send streak warnings to users at risk
 */
export async function runStreakCheck() {
  const jobName = 'streakCheck'
  const startedAt = Date.now()
  await markCronAttempt(jobName)
  logger.info('Checking streaks at risk')

  try {
    const atRisk = await pool.query(`
      SELECT ugs.user_id, ugs.current_streak
      FROM user_game_state ugs
      WHERE ugs.game_mode_enabled = true
        AND ugs.current_streak >= 7
        AND ugs.daily_prompt_completed_today = false
        AND ugs.notification_preferences->>'streak_warning' != 'false'
    `)

    let warnings = 0
    for (const user of atRisk.rows) {
      try {
        await scheduleStreakWarning(user.user_id)
        warnings++
      } catch (err) {
        logger.error('Failed to send streak warning', { userId: user.user_id, error: err.message })
        captureException(err, { userId: user.user_id })
      }
    }

    const duration = Date.now() - startedAt
    logger.info('Streak check complete', {
      job: jobName,
      status: 'success',
      durationMs: duration,
      warnings
    })
    await markCronSuccess(jobName)
  } catch (err) {
    logger.error('Streak check failed', { job: jobName, error: err.message })
    captureException(err, { route: 'cron:streakCheck' })
    throw err
  }
}

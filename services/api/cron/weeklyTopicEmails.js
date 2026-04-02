import crypto from 'crypto'
import pool from '../db/index.js'
import { sendEmail, weeklyTopicEmailTemplate } from '../services/emailService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('weekly-topics')

/**
 * Send weekly conversation topics via email and/or phone call
 * Called by the Monday morning cron job
 *
 * Flow:
 * 1. Find all users with weekly_digest enabled who've been active in last 60 days
 * 2. Pick a prompt from the prompt library they haven't seen recently
 * 3. Based on contact_preference: send email, initiate phone call, or both
 * 4. For emails: generate magic link token, send via Resend
 * 5. For calls: initiate outbound call via Telnyx
 */
export async function sendWeeklyTopicEmails() {
  logger.info('Starting weekly topic outreach...')

  // Find eligible users (include phone fields)
  const users = await pool.query(`
    SELECT u.id, u.email, u.name,
           u.phone_number, u.phone_call_consent, u.contact_preference,
           ugs.notification_preferences
    FROM users u
    LEFT JOIN user_game_state ugs ON ugs.user_id = u.id
    WHERE (
      ugs.notification_preferences->>'weekly_digest' != 'false'
      OR ugs.notification_preferences IS NULL
    )
    AND (
      ugs.last_activity_date > NOW() - INTERVAL '60 days'
      OR ugs.last_activity_date IS NULL
    )
    AND (u.email IS NOT NULL OR (u.phone_number IS NOT NULL AND u.phone_call_consent = true))
  `)

  if (users.rows.length === 0) {
    logger.info('No eligible users for weekly topics')
    return { emails: 0, calls: 0 }
  }

  logger.info(`Found ${users.rows.length} eligible users`)

  const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
  let emailsSent = 0
  let callsInitiated = 0

  for (const user of users.rows) {
    try {
      // Pick a prompt they haven't received recently
      const prompt = await pickPromptForUser(user.id)
      if (!prompt) {
        logger.info(`No available prompts for user ${user.id}, skipping`)
        continue
      }

      const preference = user.contact_preference || 'email'
      const canEmail = user.email
      const canCall = user.phone_number && user.phone_call_consent

      // Send email if preference is 'email' or 'both', or if phone isn't available
      if (canEmail && (preference === 'email' || preference === 'both' || !canCall)) {
        const sent = await sendTopicEmail(user, prompt, appUrl)
        if (sent) emailsSent++
      }

      // Initiate phone call if preference is 'phone' or 'both'
      if (canCall && (preference === 'phone' || preference === 'both')) {
        const called = await initiateTopicCall(user, prompt, appUrl)
        if (called) callsInitiated++

        // Stagger calls by 5 seconds to avoid rate limits
        if (callsInitiated > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }

      // Track prompt usage
      await pool.query(
        `UPDATE prompt_library SET times_used = COALESCE(times_used, 0) + 1 WHERE id = $1`,
        [prompt.id]
      )
    } catch (err) {
      logger.error(`Failed weekly topic for user ${user.id}:`, { error: err.message })
    }
  }

  // Clean up expired tokens older than 14 days
  await pool.query(`
    DELETE FROM email_session_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
  `)

  logger.info(
    `Weekly topics complete: ${emailsSent} emails, ${callsInitiated} calls (${users.rows.length} users)`
  )
  return { emails: emailsSent, calls: callsInitiated }
}

/**
 * Send a weekly topic email with magic link
 */
async function sendTopicEmail(user, prompt, appUrl) {
  // Generate crypto-random token
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  // Store hashed token with 7-day expiry
  await pool.query(
    `INSERT INTO email_session_tokens
     (user_id, token_hash, prompt_text, prompt_chapter_id, prompt_question_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
    [user.id, tokenHash, prompt.prompt_text, prompt.linked_chapter_id, prompt.linked_question_id]
  )

  // Build the magic link URL
  const magicLinkUrl = `${appUrl}/talk/${rawToken}`

  // Send the email
  const html = weeklyTopicEmailTemplate({
    name: user.name,
    promptText: prompt.prompt_text,
    magicLinkUrl
  })

  await sendEmail({
    to: user.email,
    from: 'Easy Memoir Weekly <stories@easymemoir.co.uk>',
    subject: `This week's topic: "${prompt.prompt_text.substring(0, 50)}${prompt.prompt_text.length > 50 ? '...' : ''}"`,
    html
  })

  logger.info(`Sent weekly email to user ${user.id} (${user.email})`)
  return true
}

/**
 * Initiate a phone call for a weekly topic via internal API
 */
async function initiateTopicCall(user, prompt, appUrl) {
  const internalSecret = process.env.INTERNAL_CRON_SECRET
  if (!internalSecret) {
    logger.warn('INTERNAL_CRON_SECRET not set, skipping phone calls')
    return false
  }

  const response = await fetch(`${appUrl}/api/telnyx/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret
    },
    body: JSON.stringify({
      userId: user.id,
      phoneNumber: user.phone_number,
      prompt: {
        text: prompt.prompt_text,
        chapter_id: prompt.linked_chapter_id,
        question_id: prompt.linked_question_id
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error(`Failed to initiate call for user ${user.id}:`, { error })
    return false
  }

  logger.info(`Initiated call to user ${user.id} (${user.phone_number.substring(0, 6)}...)`)
  return true
}

/**
 * Pick a prompt the user hasn't received recently
 * Prioritises prompts they haven't seen, then least-used ones
 */
async function pickPromptForUser(userId) {
  // Get prompts the user has already received in the last 30 days
  const recentTokens = await pool.query(
    `SELECT prompt_text FROM email_session_tokens
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [userId]
  )
  const recentPrompts = recentTokens.rows.map(r => r.prompt_text)

  // Pick a prompt from the library they haven't seen recently
  let result
  if (recentPrompts.length > 0) {
    result = await pool.query(
      `SELECT id, prompt_text, prompt_type, chapter_hint, question_hint, is_active, times_used, min_streak_days, tags, personality_tags, created_at FROM prompt_library
       WHERE is_active = true
         AND prompt_text NOT IN (SELECT unnest($2::text[]))
       ORDER BY COALESCE(times_used, 0) ASC, RANDOM()
       LIMIT 1`,
      [userId, recentPrompts]
    )
  } else {
    result = await pool.query(
      `SELECT id, prompt_text, prompt_type, chapter_hint, question_hint, is_active, times_used, min_streak_days, tags, personality_tags, created_at FROM prompt_library
       WHERE is_active = true
       ORDER BY COALESCE(times_used, 0) ASC, RANDOM()
       LIMIT 1`
    )
  }

  // Fallback: if all prompts used recently, just pick a random one
  if (result.rows.length === 0) {
    result = await pool.query(
      `SELECT id, prompt_text, prompt_type, chapter_hint, question_hint, is_active, times_used, min_streak_days, tags, personality_tags, created_at FROM prompt_library
       WHERE is_active = true
       ORDER BY RANDOM()
       LIMIT 1`
    )
  }

  return result.rows[0] || null
}

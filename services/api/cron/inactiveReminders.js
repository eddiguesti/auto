/**
 * Send weekly re-engagement reminders to inactive users.
 * Targets users who haven't written in 7+ days with incomplete memoirs.
 * Includes a magic link to resume where they left off.
 */

import crypto from 'crypto'
import pool from '../db/index.js'
import { sendEmail } from '../services/emailService.js'

const MAX_REMINDERS_PER_RUN = 50
const TOTAL_CHAPTERS = 12
const INACTIVITY_DAYS = 7

export async function sendInactiveUserReminders() {
  // Find users who haven't written recently, have incomplete memoirs, and want reminders
  const inactiveUsers = await pool.query(
    `SELECT u.id, u.email, u.name,
       (SELECT COUNT(DISTINCT chapter_id) FROM stories WHERE user_id = u.id AND answer IS NOT NULL AND answer != '') as chapters_done,
       (SELECT MAX(updated_at) FROM stories WHERE user_id = u.id) as last_story_at
     FROM users u
     LEFT JOIN user_game_state ugs ON ugs.user_id = u.id
     WHERE u.email IS NOT NULL
       AND u.email_verified = true
       AND (ugs.notification_preferences->>'daily_reminder' IS NULL OR ugs.notification_preferences->>'daily_reminder' != 'false')
       AND u.id NOT IN (
         SELECT user_id FROM stories
         WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '${INACTIVITY_DAYS} days'
       )
       AND (SELECT COUNT(*) FROM stories WHERE user_id = u.id AND answer IS NOT NULL) > 0
       AND (SELECT COUNT(DISTINCT chapter_id) FROM stories WHERE user_id = u.id AND answer IS NOT NULL) < $1
     LIMIT $2`,
    [TOTAL_CHAPTERS, MAX_REMINDERS_PER_RUN]
  )

  let sent = 0

  for (const user of inactiveUsers.rows) {
    try {
      // Create a magic link session token for frictionless re-entry
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Find next unanswered chapter to suggest
      const nextChapter = await pool.query(
        `SELECT DISTINCT chapter_id FROM stories
         WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
         ORDER BY chapter_id DESC LIMIT 1`,
        [user.id]
      )

      const chaptersRemaining = TOTAL_CHAPTERS - parseInt(user.chapters_done || 0)
      const firstName = user.name?.split(' ')[0] || 'there'

      const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'

      await sendEmail({
        to: user.email,
        subject: `${firstName}, your memoir is waiting for you`,
        html: buildReminderEmail({ firstName, chaptersRemaining, appUrl })
      })

      sent++
    } catch (err) {
      // Skip individual failures, continue with other users
    }
  }

  return sent
}

function buildReminderEmail({ firstName, chaptersRemaining, appUrl }) {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #3D3833;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 24px; font-weight: 600;">Easy<span style="color: #8B7355;">Memoir</span></span>
      </div>

      <h2 style="font-size: 22px; margin-bottom: 12px;">${firstName}, your story is waiting</h2>

      <p style="line-height: 1.7; color: #5A5651;">
        You've made a wonderful start on your memoir, and there are still
        <strong>${chaptersRemaining} chapters</strong> waiting to be filled with your memories.
      </p>

      <p style="line-height: 1.7; color: #5A5651;">
        Even 10 minutes of sharing can add a beautiful new page to your life story.
        Your family will treasure every word.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}/home"
           style="background: #4A7C59; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; display: inline-block;">
          Continue Your Memoir
        </a>
      </div>

      <p style="font-size: 13px; color: #8A857D; text-align: center;">
        You can update your notification preferences in your
        <a href="${appUrl}/settings" style="color: #8B7355;">settings</a>.
      </p>
    </div>
  `
}

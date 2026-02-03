// /life-story/server/services/emailService.js

import pool from '../db/index.js';

/**
 * Process pending notifications from the queue
 * Called by cron job
 */
export async function processNotificationQueue() {
  try {
    // Get pending notifications that are due
    const pending = await pool.query(
      `SELECT nq.*, u.email
       FROM notification_queue nq
       JOIN users u ON nq.user_id = u.id
       WHERE nq.sent_at IS NULL
         AND nq.failed_at IS NULL
         AND nq.scheduled_for <= NOW()
       ORDER BY nq.scheduled_for
       LIMIT 50`
    );

    console.log(`Processing ${pending.rows.length} notifications`);

    for (const notification of pending.rows) {
      try {
        if (notification.channel === 'email') {
          await sendEmail({
            to: notification.email,
            subject: notification.subject,
            body: notification.body
          });
        }

        // Mark as sent
        await pool.query(
          `UPDATE notification_queue SET sent_at = NOW() WHERE id = $1`,
          [notification.id]
        );

        console.log(`Sent notification ${notification.id} to ${notification.email}`);
      } catch (error) {
        // Mark as failed
        await pool.query(
          `UPDATE notification_queue
           SET failed_at = NOW(), failure_reason = $1
           WHERE id = $2`,
          [error.message, notification.id]
        );

        console.error(`Failed notification ${notification.id}:`, error.message);
      }
    }

    return pending.rows.length;
  } catch (error) {
    console.error('Error processing notification queue:', error);
    throw error;
  }
}

/**
 * Send email (placeholder - implement with your email provider)
 */
async function sendEmail({ to, subject, body }) {
  // TODO: Implement with your email provider (SendGrid, SES, etc.)
  // For now, just log
  console.log('EMAIL:', { to, subject, bodyLength: body.length });

  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to,
  //   from: 'noreply@easymemoir.com',
  //   subject,
  //   text: body,
  //   html: body.replace(/\n/g, '<br>')
  // });

  return true;
}

export default {
  processNotificationQueue,
  sendEmail
};

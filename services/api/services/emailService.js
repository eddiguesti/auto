import pool from '../db/index.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('email')

// Brand colors matching the website
const BRAND = {
  cream: '#faf8f5',
  sepia: '#8b7355',
  ink: '#2c2c2c',
  warmgray: '#6b6b6b',
  amber: '#f59e0b',
  amberDark: '#d97706'
}

/**
 * Generate base email template with Easy Memoir branding
 */
function baseEmailTemplate({ title, preheader, content, footerText }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Georgia, serif !important;}
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.cream}; font-family: Georgia, 'Times New Roman', serif;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader || ''}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.cream};">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main content container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">

          <!-- Logo Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: ${BRAND.ink}; letter-spacing: 1px;">
                Easy<span style="color: ${BRAND.sepia};">Memoir</span>
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${BRAND.warmgray}; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px;">
                Preserve Your Legacy
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(139, 115, 85, 0.1);">
                <tr>
                  <td style="padding: 40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 32px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.warmgray}; margin: 0 0 8px 0;">
                ${footerText || 'You received this email because you have an account with Easy Memoir.'}
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #999; margin: 0;">
                &copy; ${new Date().getFullYear()} Easy Memoir Ltd. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Password reset email template
 */
export function passwordResetEmailTemplate({ name, resetUrl }) {
  const content = `
    <!-- Decorative flourish -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 24px; color: ${BRAND.sepia}; opacity: 0.4;">&#10087;</span>
    </div>

    <!-- Greeting -->
    <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: ${BRAND.ink}; text-align: center; margin: 0 0 24px 0; font-weight: 500;">
      Reset Your Password
    </h1>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
      Hello${name ? ` ${name}` : ''},
    </p>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 28px 0; text-align: center;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="text-align: center; padding: 8px 0 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.amberDark} 100%); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p style="font-family: Georgia, serif; font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
      This link will expire in 1 hour for your security.
    </p>

    <!-- Divider -->
    <div style="border-top: 1px solid #eee; margin: 24px 0;"></div>

    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #999; line-height: 1.6; margin: 0; text-align: center;">
      If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <!-- Alternative link -->
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #bbb; line-height: 1.6; margin: 20px 0 0 0; text-align: center; word-break: break-all;">
      Or copy this link: ${resetUrl}
    </p>
  `

  return baseEmailTemplate({
    title: 'Reset Your Password - Easy Memoir',
    preheader: 'Reset your Easy Memoir password',
    content,
    footerText: 'You received this email because a password reset was requested for your account.'
  })
}

/**
 * Welcome email template (for new registrations)
 */
export function welcomeEmailTemplate({ name }) {
  const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
  const content = `
    <!-- Decorative flourish -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 24px; color: ${BRAND.sepia}; opacity: 0.4;">&#10087;</span>
    </div>

    <!-- Greeting -->
    <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: ${BRAND.ink}; text-align: center; margin: 0 0 24px 0; font-weight: 500;">
      Welcome to Easy Memoir
    </h1>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
      Hello ${name || 'there'},
    </p>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 28px 0; text-align: center;">
      Thank you for joining Easy Memoir. We're honored to help you preserve your life story for generations to come.
    </p>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 28px 0; text-align: center;">
      Your memories are precious. Let's make sure they're never forgotten.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="text-align: center; padding: 8px 0 28px 0;">
          <a href="${appUrl}/home" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.amberDark} 100%); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
            Start Your Memoir
          </a>
        </td>
      </tr>
    </table>

    <!-- Tips -->
    <div style="background-color: ${BRAND.cream}; border-radius: 12px; padding: 20px; margin-top: 8px;">
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: ${BRAND.ink}; margin: 0 0 12px 0;">
        Quick tips to get started:
      </p>
      <ul style="font-family: Georgia, serif; font-size: 14px; color: ${BRAND.warmgray}; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Use voice mode to simply talk about your memories</li>
        <li>Start with your earliest childhood memory</li>
        <li>Don't worry about order - we'll help organize everything</li>
      </ul>
    </div>
  `

  return baseEmailTemplate({
    title: 'Welcome to Easy Memoir',
    preheader: `Welcome ${name}! Start preserving your life story today.`,
    content
  })
}

/**
 * Newsletter subscription confirmation template
 */
export function newsletterWelcomeTemplate({ email }) {
  const content = `
    <!-- Decorative flourish -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 24px; color: ${BRAND.sepia}; opacity: 0.4;">&#10087;</span>
    </div>

    <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: ${BRAND.ink}; text-align: center; margin: 0 0 24px 0; font-weight: 500;">
      Welcome to The Chronicle
    </h1>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
      Thank you for subscribing to our newsletter!
    </p>

    <p style="font-family: Georgia, serif; font-size: 16px; color: ${BRAND.warmgray}; line-height: 1.7; margin: 0 0 28px 0; text-align: center;">
      You'll receive weekly tips on memoir writing, inspiring stories, and exclusive content to help you preserve your memories.
    </p>

    <!-- Quote -->
    <div style="border-left: 3px solid ${BRAND.sepia}; padding-left: 20px; margin: 28px 0;">
      <p style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: ${BRAND.ink}; line-height: 1.6; margin: 0;">
        "Everyone has a story worth telling. The tragedy is when stories are never told."
      </p>
    </div>
  `

  return baseEmailTemplate({
    title: 'Welcome to The Chronicle - Easy Memoir',
    preheader: "Welcome! You're now subscribed to The Chronicle newsletter.",
    content,
    footerText: `You're receiving this because ${email} was subscribed to our newsletter.`
  })
}

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
    )

    if (pending.rows.length === 0) return 0

    logger.info(`Processing ${pending.rows.length} notifications`)

    for (const notification of pending.rows) {
      try {
        if (notification.channel === 'email') {
          await sendEmail({
            to: notification.email,
            subject: notification.subject,
            html: notification.body
          })
        }

        // Mark as sent
        await pool.query(`UPDATE notification_queue SET sent_at = NOW() WHERE id = $1`, [
          notification.id
        ])

        logger.info(`Sent notification ${notification.id} to ${notification.email}`)
      } catch (error) {
        // Mark as failed
        await pool.query(
          `UPDATE notification_queue
           SET failed_at = NOW(), failure_reason = $1
           WHERE id = $2`,
          [error.message, notification.id]
        )

        logger.error(`Failed notification ${notification.id}:`, { error: error.message })
      }
    }

    return pending.rows.length
  } catch (error) {
    logger.error('Error processing notification queue:', { error: error.message })
    throw error
  }
}

/**
 * Send email via Resend (or log in development)
 */
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'Easy Memoir <hello@easymemoir.co.uk>'

  if (!apiKey) {
    // Log in development when no API key configured
    logger.info('EMAIL (dev mode):', { to, subject, htmlLength: html?.length })
    console.log('\n========== EMAIL PREVIEW ==========')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('====================================\n')
    return true
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${response.status} - ${error}`)
  }

  logger.info('Email sent successfully', { to, subject })
  return true
}

export default {
  processNotificationQueue,
  sendEmail,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
  newsletterWelcomeTemplate
}

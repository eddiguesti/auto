import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('newsletter')

// Strict rate limiting for newsletter subscriptions
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscription attempts, please try again later' }
})

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /subscribe
 * Subscribe to the newsletter with bot protection
 */
router.post(
  '/subscribe',
  newsletterLimiter,
  requireDb,
  asyncHandler(async (req, res) => {
    const { email, _hp, _ts } = req.body
    const db = req.app.locals.db

    // Bot protection: reject if honeypot field is filled
    if (_hp && _hp.length > 0) {
      logger.warn('Newsletter subscription rejected - honeypot filled', { requestId: req.id })
      return res.status(400).json({ error: 'Subscription failed' })
    }

    // Bot protection: reject if form submitted too quickly (< 2 seconds)
    if (_ts) {
      const timeOnPage = Date.now() - _ts
      if (timeOnPage < 2000) {
        logger.warn('Newsletter subscription rejected - too fast', {
          timeOnPage,
          requestId: req.id
        })
        return res.status(400).json({ error: 'Please take your time filling out the form' })
      }
      // Also reject if timestamp is from the future or too old (> 1 hour)
      if (timeOnPage < 0 || timeOnPage > 3600000) {
        logger.warn('Newsletter subscription rejected - invalid timestamp', {
          timeOnPage,
          requestId: req.id
        })
        return res.status(400).json({ error: 'Subscription failed' })
      }
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    // Check length
    if (trimmedEmail.length > 255) {
      return res.status(400).json({ error: 'Email is too long' })
    }

    try {
      // Check if already subscribed
      const existing = await db.query(
        'SELECT id, unsubscribed_at FROM newsletter_subscribers WHERE email = $1',
        [trimmedEmail]
      )

      if (existing.rows.length > 0) {
        const subscriber = existing.rows[0]
        if (!subscriber.unsubscribed_at) {
          // Already subscribed and active
          return res.json({ success: true, message: 'You are already subscribed!' })
        }
        // Re-subscribe
        await db.query(
          'UPDATE newsletter_subscribers SET unsubscribed_at = NULL, subscribed_at = CURRENT_TIMESTAMP WHERE id = $1',
          [subscriber.id]
        )
        logger.info('Newsletter re-subscription', { email: trimmedEmail, requestId: req.id })
        return res.json({ success: true, message: 'Welcome back! You have been re-subscribed.' })
      }

      // New subscriber
      await db.query(
        `INSERT INTO newsletter_subscribers (email, source, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [
          trimmedEmail,
          'blog',
          req.ip || req.connection?.remoteAddress,
          req.get('User-Agent')?.substring(0, 500)
        ]
      )

      logger.info('New newsletter subscription', { email: trimmedEmail, requestId: req.id })
      res.json({ success: true, message: 'Thank you for subscribing!' })
    } catch (err) {
      logger.error('Newsletter subscription error', { error: err.message, requestId: req.id })
      res.status(500).json({ error: 'Subscription failed. Please try again.' })
    }
  })
)

export default router

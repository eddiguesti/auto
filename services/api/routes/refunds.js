import { Router } from 'express'
import Stripe from 'stripe'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { refundSchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('refunds')

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(key)
}

// Total chapters available in the app
const TOTAL_CHAPTERS = 12

// Usage thresholds that void the 30-day money-back guarantee
const GUARANTEE_THRESHOLDS = {
  chaptersWithContent: 3, // More than 3 of 12 chapters = >25%
  voiceSessions: 3, // More than 3 AI voice sessions
  exportsGenerated: 0, // Any export generated voids it
  photosUploaded: 10 // More than 10 photos
}

// Calculate user's usage for guarantee eligibility
router.get(
  '/usage',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    // Count chapters with content
    const chaptersResult = await db.query(
      `SELECT COUNT(DISTINCT chapter_id) as count FROM stories
       WHERE user_id = $1 AND content IS NOT NULL AND TRIM(content) != ''`,
      [userId]
    )

    // Count voice sessions
    const voiceResult = await db.query(
      `SELECT COUNT(*) as count FROM stories
       WHERE user_id = $1 AND source = 'voice'`,
      [userId]
    )

    // Count exports generated
    const exportsResult = await db.query(
      `SELECT COUNT(*) as count FROM payments
       WHERE user_id = $1 AND product_type IN ('export', 'audiobook') AND status = 'completed'`,
      [userId]
    )

    // Count photos uploaded
    const photosResult = await db.query(`SELECT COUNT(*) as count FROM photos WHERE user_id = $1`, [
      userId
    ])

    // Get latest payment for guarantee period check
    const paymentResult = await db.query(
      `SELECT created_at, product_id, product_type FROM payments
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )

    // Check if a previous guarantee refund was claimed
    const previousRefundResult = await db.query(
      `SELECT COUNT(*) as count FROM refund_requests
       WHERE user_id = $1 AND status = 'approved' AND type = 'guarantee'`,
      [userId]
    )

    const chaptersUsed = parseInt(chaptersResult.rows[0]?.count || 0)
    const voiceSessions = parseInt(voiceResult.rows[0]?.count || 0)
    const exportsGenerated = parseInt(exportsResult.rows[0]?.count || 0)
    const photosUploaded = parseInt(photosResult.rows[0]?.count || 0)
    const previousGuaranteeUsed = parseInt(previousRefundResult.rows[0]?.count || 0) > 0

    const latestPayment = paymentResult.rows[0] || null
    const daysSincePurchase = latestPayment
      ? Math.floor(
          (Date.now() - new Date(latestPayment.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    // Determine overall usage percentage
    const usagePercentage = Math.round((chaptersUsed / TOTAL_CHAPTERS) * 100)

    // Check each threshold
    const thresholdBreaches = []
    if (chaptersUsed > GUARANTEE_THRESHOLDS.chaptersWithContent) {
      thresholdBreaches.push(
        `Chapters with content: ${chaptersUsed} of ${TOTAL_CHAPTERS} (limit: ${GUARANTEE_THRESHOLDS.chaptersWithContent})`
      )
    }
    if (voiceSessions > GUARANTEE_THRESHOLDS.voiceSessions) {
      thresholdBreaches.push(
        `Voice sessions: ${voiceSessions} (limit: ${GUARANTEE_THRESHOLDS.voiceSessions})`
      )
    }
    if (exportsGenerated > GUARANTEE_THRESHOLDS.exportsGenerated) {
      thresholdBreaches.push(`Exports generated: ${exportsGenerated} (any export voids guarantee)`)
    }
    if (photosUploaded > GUARANTEE_THRESHOLDS.photosUploaded) {
      thresholdBreaches.push(
        `Photos uploaded: ${photosUploaded} (limit: ${GUARANTEE_THRESHOLDS.photosUploaded})`
      )
    }

    const guaranteeVoided = thresholdBreaches.length > 0
    const withinGuaranteePeriod = daysSincePurchase !== null && daysSincePurchase <= 30
    const guaranteeEligible = !guaranteeVoided && withinGuaranteePeriod && !previousGuaranteeUsed

    res.json({
      usage: {
        chaptersUsed,
        totalChapters: TOTAL_CHAPTERS,
        voiceSessions,
        exportsGenerated,
        photosUploaded,
        usagePercentage
      },
      guarantee: {
        eligible: guaranteeEligible,
        withinPeriod: withinGuaranteePeriod,
        daysSincePurchase,
        daysRemaining: daysSincePurchase !== null ? Math.max(0, 30 - daysSincePurchase) : null,
        thresholdBreaches,
        previousGuaranteeUsed
      },
      thresholds: GUARANTEE_THRESHOLDS
    })
  })
)

// Submit a refund request
router.post(
  '/request',
  requireDb,
  validate(refundSchemas.request),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const userEmail = req.user.email
    const { paymentId, reason, type } = req.validatedBody

    // Get the payment record
    let payment
    if (paymentId) {
      const paymentResult = await db.query(
        `SELECT id, user_id, stripe_session_id, stripe_subscription_id, product_id, product_type, amount, currency, status, created_at
         FROM payments WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
        [paymentId, userId]
      )
      payment = paymentResult.rows[0]
    } else {
      // Use most recent payment
      const paymentResult = await db.query(
        `SELECT id, user_id, stripe_session_id, stripe_subscription_id, product_id, product_type, amount, currency, status, created_at
         FROM payments WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      )
      payment = paymentResult.rows[0]
    }

    if (!payment) {
      return res.status(404).json({ error: 'No eligible payment found' })
    }

    // Check for existing pending refund request
    const existingRequest = await db.query(
      `SELECT id FROM refund_requests WHERE user_id = $1 AND payment_id = $2 AND status = 'pending'`,
      [userId, payment.id]
    )
    if (existingRequest.rows.length > 0) {
      return res.status(409).json({ error: 'A refund request for this payment is already pending' })
    }

    // Insert refund request
    const result = await db.query(
      `INSERT INTO refund_requests (user_id, payment_id, type, reason, amount, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
       RETURNING id, created_at`,
      [userId, payment.id, type, reason || '', payment.amount]
    )

    const refundRequest = result.rows[0]

    logger.info('Refund request submitted', {
      userId,
      paymentId: payment.id,
      refundRequestId: refundRequest.id,
      type,
      amount: payment.amount
    })

    // Send confirmation email
    try {
      const { sendEmail } = await import('../services/emailService.js')
      await sendEmail({
        to: userEmail,
        subject: 'Refund Request Received — Easy Memoir',
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #5C4033;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Refund Request Received</h1>
            <p>Dear Customer,</p>
            <p>We have received your refund request (Reference: <strong>RF-${refundRequest.id}</strong>).</p>
            <p><strong>Type:</strong> ${type === 'guarantee' ? '30-Day Money-Back Guarantee' : type === 'cooling_off' ? '14-Day Cooling-Off Period' : type === 'faulty' ? 'Faulty Product' : 'Other'}</p>
            <p><strong>Amount:</strong> £${(payment.amount / 100).toFixed(2)}</p>
            <p>We will review your request and respond within <strong>5 working days</strong>.</p>
            <p>If you have any questions, please reply to this email or contact us at <a href="mailto:refunds@easymemoir.co.uk">refunds@easymemoir.co.uk</a>.</p>
            <p style="margin-top: 24px;">Kind regards,<br>Easy Memoir Team</p>
          </div>
        `
      })
    } catch (emailErr) {
      logger.warn('Failed to send refund confirmation email', { error: emailErr.message })
    }

    // Notify team via email
    try {
      const { sendEmail } = await import('../services/emailService.js')
      await sendEmail({
        to: 'refunds@easymemoir.co.uk',
        subject: `New Refund Request RF-${refundRequest.id} — ${type}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Refund Request</h2>
            <p><strong>Reference:</strong> RF-${refundRequest.id}</p>
            <p><strong>User:</strong> ${userEmail} (ID: ${userId})</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Amount:</strong> £${(payment.amount / 100).toFixed(2)}</p>
            <p><strong>Product:</strong> ${payment.product_id}</p>
            <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.created_at).toLocaleDateString('en-GB')}</p>
          </div>
        `
      })
    } catch (emailErr) {
      logger.warn('Failed to send team refund notification', { error: emailErr.message })
    }

    res.status(201).json({
      id: refundRequest.id,
      reference: `RF-${refundRequest.id}`,
      status: 'pending',
      amount: payment.amount,
      displayAmount: `£${(payment.amount / 100).toFixed(2)}`,
      createdAt: refundRequest.created_at,
      message: 'Your refund request has been submitted. We will review it within 5 working days.'
    })
  })
)

// Get user's refund request history
router.get(
  '/history',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `SELECT rr.*, p.product_id, p.product_type
       FROM refund_requests rr
       JOIN payments p ON rr.payment_id = p.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC`,
      [userId]
    )

    res.json(
      result.rows.map(row => ({
        id: row.id,
        reference: `RF-${row.id}`,
        type: row.type,
        status: row.status,
        amount: row.amount,
        displayAmount: `£${(row.amount / 100).toFixed(2)}`,
        reason: row.reason,
        productId: row.product_id,
        productType: row.product_type,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at
      }))
    )
  })
)

export default router

import { Router } from 'express'
import crypto from 'crypto'
import Stripe from 'stripe'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'
import { paymentRepository } from '../repositories/paymentRepository.js'
import { PRODUCTS } from '@easy-memoir/shared/products'

const router = Router()
const logger = createLogger('payments')

// Initialize Stripe
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(key)
}

/**
 * @swagger
 * /payments/create-checkout:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Stripe Checkout session
 *     description: |
 *       Initiates a Stripe-hosted checkout flow for one of the available products.
 *       Redirect URLs are restricted to the app domain to prevent open-redirect attacks.
 *       Requires full-scope JWT (not magic link tokens).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 enum: [export_style, export_ebook, export_audiobook, printed_book, premium_monthly, premium_yearly]
 *               successUrl: { type: string, format: uri, description: "Must start with APP_URL" }
 *               cancelUrl: { type: string, format: uri, description: "Must start with APP_URL" }
 *     responses:
 *       200:
 *         description: Stripe Checkout URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, format: uri, description: "Stripe-hosted checkout page" }
 *       400:
 *         description: Invalid product ID
 */
// Create checkout session
router.post(
  '/create-checkout',
  asyncHandler(async (req, res) => {
    const { productId, successUrl, cancelUrl } = req.body
    const userId = req.user.id
    const userEmail = req.user.email

    if (!productId || !PRODUCTS[productId]) {
      return res.status(400).json({ error: 'Invalid product' })
    }

    const stripe = getStripe()
    const product = PRODUCTS[productId]

    // Only allow redirect URLs on our own domain to prevent open redirect
    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const safeSuccessUrl =
      successUrl && successUrl.startsWith(appUrl) ? successUrl : `${appUrl}/export?success=true`
    const safeCancelUrl =
      cancelUrl && cancelUrl.startsWith(appUrl) ? cancelUrl : `${appUrl}/export?cancelled=true`

    const sessionConfig = {
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        productId,
        productType: product.type
      },
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl
    }

    if (product.type === 'subscription') {
      sessionConfig.mode = 'subscription'
      sessionConfig.line_items = [
        {
          price_data: {
            currency: product.currency || 'gbp',
            product_data: {
              name: product.name,
              description: product.description
            },
            unit_amount: product.price,
            recurring: { interval: product.interval }
          },
          quantity: 1
        }
      ]
    } else {
      sessionConfig.mode = 'payment'
      sessionConfig.line_items = [
        {
          price_data: {
            currency: product.currency || 'gbp',
            product_data: {
              name: product.name,
              description: product.description
            },
            unit_amount: product.price
          },
          quantity: 1
        }
      ]
    }

    // Idempotency key scoped to user + product + 1-minute window so retries
    // within that window reuse the same Stripe session rather than creating duplicates.
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`checkout:${userId}:${productId}:${Math.floor(Date.now() / 60000)}`)
      .digest('hex')

    const session = await stripe.checkout.sessions.create(sessionConfig, {
      idempotencyKey
    })
    res.json({ url: session.url, sessionId: session.id })
  })
)

// Stripe webhook handler (call this from main express app without auth)
export async function handleStripeWebhook(req, res, db) {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig) return res.status(400).json({ error: 'Missing Stripe signature' })
  if (!webhookSecret) return res.status(503).json({ error: 'Stripe webhook is not configured' })

  const stripe = getStripe()
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message })
    return res.status(400).json({ error: 'Invalid Stripe webhook signature' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const claim = await client.query(
      `INSERT INTO stripe_webhook_events (event_id, event_type)
       VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, event.type]
    )
    if (claim.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, productId, productType } = session.metadata

        const user = await paymentRepository.findUserById(client, userId)
        if (!user) {
          logger.error('Webhook userId not found in database', { userId, eventId: event.id })
          break
        }

        // Verify Stripe customer email matches our user (detect metadata tampering)
        if (session.customer_email && session.customer_email !== user.email) {
          logger.error('Webhook email mismatch — possible metadata tampering', {
            stripeEmail: session.customer_email,
            dbEmail: user.email,
            userId,
            eventId: event.id
          })
        }

        await paymentRepository.recordPayment(client, {
          userId,
          stripeSessionId: session.id,
          productId,
          productType,
          amount: session.amount_total
        })

        if (productType === 'premium_bundle') {
          await paymentRepository.activatePremiumById(client, userId)
          logger.info('Premium activated', { userId, productId })
        }

        await paymentRepository.recordAuditEvent(client, {
          userId,
          eventType: event.type,
          stripeEventId: event.id,
          amount: session.amount_total,
          productId
        })

        logger.info('Payment completed', { userId, productId, stripeEventId: event.id })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customer = await stripe.customers.retrieve(subscription.customer)
        const customerEmail = customer.email

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const periodEnd = new Date(subscription.current_period_end * 1000)
          await paymentRepository.activatePremiumByEmail(client, customerEmail, periodEnd)
          logger.info('Premium activated via subscription', {
            subscriptionId: subscription.id,
            customerEmail,
            status: subscription.status,
            periodEnd
          })
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          logger.warn('Subscription payment issue', {
            subscriptionId: subscription.id,
            customerEmail,
            status: subscription.status
          })
        } else if (
          subscription.status === 'canceled' ||
          subscription.status === 'incomplete_expired'
        ) {
          const gracePeriod = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          await paymentRepository.expirePremiumByEmail(client, customerEmail, gracePeriod)
          logger.info('Premium set to expire (subscription status change)', {
            subscriptionId: subscription.id,
            customerEmail,
            expiresAt: gracePeriod
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customer = await stripe.customers.retrieve(subscription.customer)
        const customerEmail = customer.email

        const gracePeriod = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        await paymentRepository.expirePremiumByEmail(client, customerEmail, gracePeriod)
        logger.info('Premium revoked (subscription cancelled)', {
          subscriptionId: subscription.id,
          customerEmail,
          expiresAt: gracePeriod
        })
        break
      }

      default:
        logger.debug('Unhandled event type', { eventType: event.type })
    }

    await client.query('COMMIT')
    return res.json({ received: true })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    logger.error('Stripe webhook transaction failed', { eventId: event.id, error: error.message })
    return res.status(500).json({ error: 'Failed to process payment event' })
  } finally {
    client.release()
  }
}

/**
 * @swagger
 * /payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get the current user's payment history
 *     responses:
 *       200:
 *         description: Array of payment records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   product_id: { type: string }
 *                   product_type: { type: string }
 *                   amount: { type: integer, description: "Amount in pence" }
 *                   currency: { type: string, example: gbp }
 *                   status: { type: string, enum: [completed, refunded, pending] }
 *                   created_at: { type: string, format: date-time }
 */
// Get payment history
router.get(
  '/history',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const payments = await paymentRepository.findByUserId(db, userId)
    res.json(payments)
  })
)

/**
 * @swagger
 * /payments/products:
 *   get:
 *     tags: [Payments]
 *     summary: List available products and their prices
 *     responses:
 *       200:
 *         description: Array of products with GBP prices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   description: { type: string }
 *                   price: { type: integer, description: "Price in pence" }
 *                   displayPrice: { type: string, example: "7.99" }
 *                   currency: { type: string, example: gbp }
 *                   type: { type: string }
 */
// Get available products/prices
router.get('/products', (req, res) => {
  const products = Object.entries(PRODUCTS).map(([id, product]) => ({
    id,
    ...product,
    displayPrice: (product.price / 100).toFixed(2)
  }))

  res.json(products)
})

export default router

import { Router } from 'express'
import crypto from 'crypto'
import Stripe from 'stripe'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'
import { paymentRepository } from '../repositories/paymentRepository.js'
import { checkoutRedirectUrl } from '../utils/checkoutRedirect.js'
import {
  PRODUCTS,
  getPublicProducts,
  PRINT_PACKAGE,
  isPrintProduct
} from '../../../packages/shared/payment-catalog.js'
import { printConfigurationReady } from '../services/bookvault.js'

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
 *               successUrl: { type: string, format: uri, description: "Must use the APP_URL origin" }
 *               cancelUrl: { type: string, format: uri, description: "Must use the APP_URL origin" }
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
  requireDb,
  asyncHandler(async (req, res) => {
    const { productId, successUrl, cancelUrl } = req.body
    const userId = req.user.id
    const userEmail = req.user.email

    if (!productId || !PRODUCTS[productId]) {
      return res.status(400).json({ error: 'Invalid product' })
    }

    // Subscription ownership/renewal/cancellation require a durable lifecycle
    // before accepting new recurring charges. Keep historical catalog IDs intact.
    if (PRODUCTS[productId].type === 'subscription') {
      return res.status(503).json({
        error: 'Subscriptions are temporarily unavailable',
        code: 'SUBSCRIPTIONS_UNAVAILABLE'
      })
    }

    if (isPrintProduct(productId) && !printConfigurationReady()) {
      return res.status(503).json({
        error: 'Book printing is not available yet. Please try again later.',
        code: 'PRINT_UNAVAILABLE'
      })
    }

    const stripe = getStripe()
    const product = PRODUCTS[productId]

    // Only allow redirect URLs on our own domain to prevent open redirect
    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const safeSuccessUrl = checkoutRedirectUrl(successUrl, appUrl, '/export?success=true')
    const safeCancelUrl = checkoutRedirectUrl(cancelUrl, appUrl, '/export?cancelled=true')

    const sessionConfig = {
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        productId,
        productType: product.type,
        ...(isPrintProduct(productId)
          ? {
              printPackageVersion: PRINT_PACKAGE.version,
              printQuantity: String(PRINT_PACKAGE.quantity)
            }
          : {})
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
  const stripe = getStripe()
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message })
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      try {
        const session = event.data.object
        // Checkout can complete before a delayed payment clears.
        if (session.payment_status !== 'paid') break
        const { userId, productId, productType } = session.metadata
        if (
          session.metadata.printPackageVersion === PRINT_PACKAGE.version &&
          (!isPrintProduct(productId) ||
            session.amount_total !== PRINT_PACKAGE.price ||
            session.currency !== PRINT_PACKAGE.currency ||
            session.metadata.printQuantity !== '10')
        ) {
          logger.error('Print package payment does not match purchased terms', {
            eventId: event.id
          })
          return res.status(400).json({ error: 'Invalid print package payment' })
        }

        // Verify the userId exists in our database before granting anything
        const user = await paymentRepository.findUserById(db, userId)
        if (!user) {
          logger.error('Webhook userId not found in database', { userId, eventId: event.id })
          return res.status(200).json({ received: true }) // Acknowledge but don't retry
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

        // Record the payment (idempotent - ignore duplicates)
        await paymentRepository.recordPayment(db, {
          userId,
          stripeSessionId: session.id,
          productId,
          productType,
          amount: session.amount_total
        })

        // New purchased terms only; never reinterpret historical four-book payments.
        if (
          session.metadata.printPackageVersion === PRINT_PACKAGE.version &&
          isPrintProduct(productId)
        ) {
          await db.query(
            `INSERT INTO print_entitlements (id,user_id,stripe_session_id,package_version,quantity)
            VALUES ($1,$2,$3,$4,$5) ON CONFLICT (stripe_session_id) DO NOTHING`,
            [crypto.randomUUID(), userId, session.id, PRINT_PACKAGE.version, PRINT_PACKAGE.quantity]
          )
        }

        // Activate premium access for premium_bundle purchases (idempotent - only set if not already active)
        if (productType === 'premium_bundle') {
          await paymentRepository.activatePremiumById(db, userId)
          logger.info('Premium activated', { userId, productId })
        }

        // Immutable audit trail — append even if payment was a duplicate
        await paymentRepository.recordAuditEvent(db, {
          userId,
          eventType: event.type,
          stripeEventId: event.id,
          amount: session.amount_total,
          productId
        })

        logger.info('Payment completed', { userId, productId, stripeEventId: event.id })
      } catch (err) {
        logger.error('Failed to record payment', { error: err.message, eventId: event.id })
        return res.status(500).json({ error: 'Failed to process payment' })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      try {
        const subscription = event.data.object
        const customerId = subscription.customer
        const customer = await stripe.customers.retrieve(customerId)
        const customerEmail = customer.email

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const periodEnd = new Date(subscription.current_period_end * 1000)
          await paymentRepository.activatePremiumByEmail(db, customerEmail, periodEnd)
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
          await paymentRepository.expirePremiumByEmail(db, customerEmail, gracePeriod)
          logger.info('Premium set to expire (subscription status change)', {
            subscriptionId: subscription.id,
            customerEmail,
            expiresAt: gracePeriod
          })
        }
      } catch (err) {
        logger.error('Failed to process subscription event', {
          error: err.message,
          eventId: event.id
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      try {
        const subscription = event.data.object
        const customerId = subscription.customer
        const customer = await stripe.customers.retrieve(customerId)
        const customerEmail = customer.email

        const gracePeriod = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        await paymentRepository.expirePremiumByEmail(db, customerEmail, gracePeriod)
        logger.info('Premium revoked (subscription cancelled)', {
          subscriptionId: subscription.id,
          customerEmail,
          expiresAt: gracePeriod
        })
      } catch (err) {
        logger.error('Failed to revoke premium on cancellation', {
          error: err.message,
          eventId: event.id
        })
      }
      break
    }

    default:
      logger.debug('Unhandled event type', { eventType: event.type })
  }

  res.json({ received: true })
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
// One catalog for public discovery and authenticated checkout prices.
export function listProducts(_req, res) {
  res.json(
    getPublicProducts().map(product =>
      isPrintProduct(product.id)
        ? { ...product, checkoutAvailable: printConfigurationReady() }
        : product
    )
  )
}

router.get('/products', listProducts)

export default router

import { Router } from 'express'
import Stripe from 'stripe'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { createLogger } from '../utils/logger.js'

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

// Product prices (in pence for Stripe GBP)
const PRODUCTS = {
  export_style: {
    name: 'Style Your Memoir',
    description: 'Transform your writing in the style of famous authors',
    price: 499, // £4.99
    currency: 'gbp',
    type: 'style'
  },
  export_ebook: {
    name: 'eBook Export',
    description: 'Download your memoir as an EPUB eBook',
    price: 799, // £7.99
    currency: 'gbp',
    type: 'export'
  },
  export_audiobook: {
    name: 'Audiobook Export',
    description: 'Download your memoir as an MP3 audiobook',
    price: 1499, // £14.99
    currency: 'gbp',
    type: 'audiobook'
  },
  printed_book: {
    name: 'Printed Book',
    description: 'Beautiful hardcover book delivered to your door',
    price: 9900, // £99
    currency: 'gbp',
    type: 'book'
  },
  premium_monthly: {
    name: 'Premium Monthly',
    description: 'Unlimited AI interviews, priority support',
    price: 999, // £9.99/month
    currency: 'gbp',
    type: 'subscription',
    interval: 'month'
  },
  premium_yearly: {
    name: 'Premium Yearly',
    description: 'Unlimited AI interviews, priority support (2 months free)',
    price: 9999, // £99.99/year
    currency: 'gbp',
    type: 'subscription',
    interval: 'year'
  }
}

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

    const sessionConfig = {
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        productId,
        productType: product.type
      },
      success_url: successUrl || `${process.env.APP_URL}/export?success=true`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/export?cancelled=true`
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

    const session = await stripe.checkout.sessions.create(sessionConfig)
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
    case 'checkout.session.completed': {
      try {
        const session = event.data.object
        const { userId, productId, productType } = session.metadata

        // Record the payment (idempotent - ignore duplicates)
        await db.query(
          `
          INSERT INTO payments (user_id, stripe_session_id, product_id, product_type, amount, status, created_at)
          VALUES ($1, $2, $3, $4, $5, 'completed', CURRENT_TIMESTAMP)
          ON CONFLICT (stripe_session_id) DO NOTHING
        `,
          [userId, session.id, productId, productType, session.amount_total]
        )

        logger.info('Payment completed', { userId, productId })
      } catch (err) {
        logger.error('Failed to record payment', { error: err.message, eventId: event.id })
        return res.status(500).json({ error: 'Failed to process payment' })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      // Handle subscription updates
      logger.info('Subscription event', { eventType: event.type, subscriptionId: subscription.id })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      // Handle subscription cancellation
      logger.info('Subscription cancelled', { subscriptionId: subscription.id })
      break
    }

    default:
      logger.debug('Unhandled event type', { eventType: event.type })
  }

  res.json({ received: true })
}

// Get payment history
router.get(
  '/history',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `
    SELECT * FROM payments
    WHERE user_id = $1
    ORDER BY created_at DESC
  `,
      [userId]
    )

    res.json(result.rows)
  })
)

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

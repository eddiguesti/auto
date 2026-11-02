import Stripe from 'stripe'
import {
  PRODUCTS,
  PRINT_PACKAGE,
  isPrintProduct,
  getPublicProducts
} from '../../packages/shared/payment-catalog.js'
import { printConfigurationReady } from './print-provider.js'
import { checkoutRedirectUrl } from '../../services/api/utils/checkoutRedirect.js'
import { ApiError, json } from './errors.js'
import { readJson } from './request.js'
import { requireFullScope } from './auth.js'
import { sha256 } from './auth-rate-limit.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'

const PAYMENT_COLUMNS = 'id, product_id, product_type, amount, currency, status, created_at'
export function getNativePublicProducts(env) {
  return getPublicProducts().map(product => ({
    ...product,
    checkoutAvailable: Boolean(
      product.checkoutAvailable &&
      env.PUBLISHING_ENABLED === 'true' &&
      env.STRIPE_SECRET_KEY &&
      (!isPrintProduct(product.id) || printConfigurationReady(env))
    )
  }))
}
export function stripeClient(env) {
  return new Stripe(env.STRIPE_SECRET_KEY || 'webhook-verification-only', {
    httpClient: Stripe.createFetchHttpClient((input, init) =>
      env.STRIPE_FETCH
        ? env.STRIPE_FETCH.fetch(input, { ...init, redirect: 'manual' })
        : fetch(input, { ...init, redirect: 'manual' })
    ),
    timeout: 20000,
    maxNetworkRetries: 0
  })
}

async function checkout({ request, env, db, user, now }) {
  const { productId, successUrl, cancelUrl } = await readJson(request)
  const product =
    typeof productId === 'string' && Object.hasOwn(PRODUCTS, productId) ? PRODUCTS[productId] : null
  if (!product) throw new ApiError(400, { error: 'Invalid product' })
  if (product.type === 'subscription')
    throw new ApiError(503, {
      error: 'Subscriptions are temporarily unavailable',
      code: 'SUBSCRIPTIONS_UNAVAILABLE'
    })
  // Deployment acceptance enables paid fulfilment explicitly, after its providers
  // and owner download flow work. A configured Stripe key alone is insufficient.
  if (env.PUBLISHING_ENABLED !== 'true')
    throw new ApiError(503, {
      error: 'Publishing is not available yet',
      code: 'PUBLISHING_UNAVAILABLE'
    })
  if (isPrintProduct(productId) && !printConfigurationReady(env))
    throw new ApiError(503, {
      error: 'Book printing is not available yet. Please try again later.',
      code: 'PRINT_UNAVAILABLE'
    })
  if (!env.STRIPE_SECRET_KEY || !env.APP_URL)
    throw new ApiError(503, { error: 'Payments are not configured' })
  let success, cancel
  try {
    if (new URL(env.APP_URL).protocol !== 'https:') throw new Error('HTTPS required')
    success = checkoutRedirectUrl(successUrl, env.APP_URL, '/export?success=true')
    cancel = checkoutRedirectUrl(cancelUrl, env.APP_URL, '/export?cancelled=true')
  } catch {
    throw new ApiError(503, { error: 'Payments are not configured' })
  }
  const idempotencyKey = await sha256(`checkout:${user.id}:${productId}:${Math.floor(now / 60000)}`)
  let session
  try {
    session = await stripeClient(env).checkout.sessions.create(
      {
        customer_email: user.email,
        mode: 'payment',
        success_url: success,
        cancel_url: cancel,
        metadata: {
          userId: String(user.id),
          productId,
          productType: product.type,
          ...(isPrintProduct(productId)
            ? {
                printPackageVersion: PRINT_PACKAGE.version,
                printQuantity: String(PRINT_PACKAGE.quantity)
              }
            : {})
        },
        line_items: [
          {
            price_data: {
              currency: product.currency,
              unit_amount: product.price,
              product_data: { name: product.name, description: product.description }
            },
            quantity: 1
          }
        ]
      },
      { idempotencyKey }
    )
    const url = new URL(session.url)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'checkout.stripe.com' ||
      url.username ||
      url.password ||
      typeof session.id !== 'string' ||
      !/^cs_[A-Za-z0-9_]{1,240}$/.test(session.id)
    )
      throw new Error('Invalid checkout response')
  } catch {
    throw new ApiError(502, { error: 'Payment checkout temporarily unavailable' })
  }
  const saved = await db
    .prepare(
      `INSERT INTO native_checkouts
    (stripe_session_id,user_id,product_id,product_type,amount,currency,created_at)
    SELECT ?,id,?,?,?,?,? FROM users WHERE id = ? AND deleted_at IS NULL
    ON CONFLICT (stripe_session_id) DO UPDATE SET stripe_session_id = excluded.stripe_session_id
    WHERE native_checkouts.user_id = excluded.user_id AND native_checkouts.product_id = excluded.product_id
    AND native_checkouts.amount = excluded.amount AND native_checkouts.currency = excluded.currency RETURNING stripe_session_id`
    )
    .bind(
      session.id,
      productId,
      product.type,
      product.price,
      product.currency,
      timestampForStorage(now),
      user.id
    )
    .first()
  if (!saved) throw new ApiError(503, { error: 'Checkout could not be recorded' })
  return json({ url: session.url, sessionId: session.id })
}

async function webhookBody(request) {
  if (!request.body) throw new ApiError(400, { error: 'Invalid Stripe webhook' })
  let bytes = 0
  const stream = request.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        bytes += chunk.byteLength
        if (bytes > 512 * 1024) throw new Error('Webhook too large')
        controller.enqueue(chunk)
      }
    })
  )
  try {
    return await new Response(stream).text()
  } catch {
    throw new ApiError(400, { error: 'Invalid Stripe webhook' })
  }
}

export async function handleStripeWebhook({ request, env, db, now }) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, { error: 'Payments are not configured' })
  const payload = await webhookBody(request)
  let event
  try {
    event = await stripeClient(env).webhooks.constructEventAsync(
      payload,
      request.headers.get('stripe-signature'),
      env.STRIPE_WEBHOOK_SECRET,
      300,
      Stripe.createSubtleCryptoProvider()
    )
  } catch {
    throw new ApiError(400, { error: 'Invalid Stripe webhook' })
  }
  if (typeof event.id !== 'string' || !/^evt_[A-Za-z0-9_]{1,240}$/.test(event.id))
    throw new ApiError(400, { error: 'Invalid Stripe webhook' })
  if (
    !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
  )
    return json({ received: true })
  const session = event.data?.object
  if (session?.payment_status !== 'paid') return json({ received: true })
  const record =
    typeof session.id === 'string' &&
    (await db
      .prepare(
        `SELECT c.*, u.deleted_at FROM native_checkouts c LEFT JOIN users u ON c.user_id = u.id WHERE c.stripe_session_id = ?`
      )
      .bind(session.id)
      .first())
  // This fresh deployment grants only server-created checkouts. Historical Stripe
  // events from the previous installation cannot grant a new account entitlements.
  if (!record?.user_id || record.deleted_at) return json({ received: true })
  const product = PRODUCTS[record.product_id]
  if (
    !product ||
    product.type === 'subscription' ||
    record.product_type !== product.type ||
    record.amount !== product.price ||
    record.currency !== product.currency ||
    session.metadata?.userId !== String(record.user_id) ||
    session.metadata?.productId !== record.product_id ||
    session.metadata?.productType !== record.product_type ||
    session.amount_total !== record.amount ||
    session.currency !== record.currency ||
    (isPrintProduct(record.product_id) &&
      (session.metadata.printPackageVersion !== PRINT_PACKAGE.version ||
        session.metadata.printQuantity !== String(PRINT_PACKAGE.quantity)))
  )
    throw new ApiError(400, { error: 'Payment does not match checkout' })
  const payloadHash = await sha256(payload)
  const existing = await db
    .prepare('SELECT payload_hash FROM stripe_events WHERE event_id = ?')
    .bind(event.id)
    .first()
  if (existing && existing.payload_hash !== payloadHash)
    throw new ApiError(400, { error: 'Stripe event content differs' })
  const attempt = crypto.randomUUID(),
    stamp = timestampForStorage(now)
  const guard = `EXISTS (SELECT 1 FROM stripe_events WHERE event_id = ? AND processing_token = ? AND state = 'processing')`
  const purchased = `EXISTS (SELECT 1 FROM native_checkouts WHERE stripe_session_id = ? AND user_id = ? AND state = 'created')`
  const writes = [
    db
      .prepare(
        `INSERT INTO stripe_events (event_id,payload_hash,processing_token,state,created_at) VALUES (?,?,?,'processing',?) ON CONFLICT(event_id) DO NOTHING`
      )
      .bind(event.id, payloadHash, attempt, stamp),
    db
      .prepare(
        `INSERT INTO payments (user_id,stripe_session_id,product_id,product_type,amount,currency,status,created_at)
      SELECT ?,?,?,?,?,?,'completed',? WHERE ${guard} AND ${purchased} ON CONFLICT(stripe_session_id) DO NOTHING`
      )
      .bind(
        record.user_id,
        session.id,
        record.product_id,
        record.product_type,
        record.amount,
        record.currency,
        stamp,
        event.id,
        attempt,
        session.id,
        record.user_id
      )
  ]
  if (isPrintProduct(record.product_id))
    writes.push(
      db
        .prepare(
          `INSERT INTO print_entitlements (id,user_id,stripe_session_id,package_version,quantity)
    SELECT ?,?,?,?,? WHERE ${guard} AND ${purchased} ON CONFLICT(stripe_session_id) DO NOTHING`
        )
        .bind(
          crypto.randomUUID(),
          record.user_id,
          session.id,
          PRINT_PACKAGE.version,
          PRINT_PACKAGE.quantity,
          event.id,
          attempt,
          session.id,
          record.user_id
        )
    )
  if (product.type === 'premium_bundle') {
    const date = new Date(now),
      lastDay = new Date(
        Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth() + 1, 0)
      ).getUTCDate()
    date.setUTCDate(Math.min(date.getUTCDate(), lastDay))
    date.setUTCFullYear(date.getUTCFullYear() + 1)
    writes.push(
      db
        .prepare(
          `UPDATE users SET premium_until = ?, premium_activated_at = COALESCE(premium_activated_at,?), updated_at = ? WHERE id = ? AND deleted_at IS NULL
      AND (premium_until IS NULL OR julianday(premium_until) < julianday(?)) AND ${guard} AND ${purchased}`
        )
        .bind(
          timestampForStorage(date),
          stamp,
          stamp,
          record.user_id,
          new Date(now).toISOString(),
          event.id,
          attempt,
          session.id,
          record.user_id
        )
    )
  }
  writes.push(
    db
      .prepare(
        `INSERT INTO payments_audit_log (user_id,event_type,stripe_event_id,amount,product_id)
    SELECT ?,?,?,?,? WHERE ${guard}`
      )
      .bind(
        record.user_id,
        event.type,
        event.id,
        record.amount,
        record.product_id,
        event.id,
        attempt
      ),
    db
      .prepare(
        `UPDATE native_checkouts SET state='completed' WHERE stripe_session_id = ? AND ${guard}`
      )
      .bind(session.id, event.id, attempt),
    db
      .prepare(
        `UPDATE stripe_events SET state='completed' WHERE event_id = ? AND processing_token = ?`
      )
      .bind(event.id, attempt)
  )
  await db.batch(writes)
  return json({ received: true })
}

export async function handlePaymentRoutes(input) {
  const { request, db, path, user, claims, env } = input
  if (!path.startsWith('/payments/')) return null
  requireFullScope(claims)
  if (path === '/payments/create-checkout' && request.method === 'POST') return checkout(input)
  if (path === '/payments/history' && request.method === 'GET') {
    const { results } = await db
      .prepare(
        `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE user_id = ? ORDER BY created_at DESC,id DESC`
      )
      .bind(user.id)
      .all()
    const codec = createMappedCodec('payments', {
      wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE
    })
    return json(results.map(row => codec.decodeRow(row)))
  }
  return null
}

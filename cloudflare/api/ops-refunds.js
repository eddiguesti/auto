import { ApiError, json } from './errors.js'
import { stripeClient } from './payments.js'
import { timestampForStorage, timestampToApi } from './value-codecs.js'

const objectId = (value, prefix) =>
  typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9_]{1,200}$`).test(value)
const reference = value => (typeof value === 'string' ? value : value?.id)
const fullPrint = `EXISTS(SELECT 1 FROM print_orders o JOIN print_entitlements e ON e.id=o.entitlement_id WHERE e.stripe_session_id=p.stripe_session_id AND o.status IN ('queued','submitting','submitted','dispatched','review'))`
const available = `p.status='completed' AND u.deleted_at IS NULL AND r.status='pending' AND r.user_id=p.user_id AND r.amount=p.amount
  AND p.amount>0 AND lower(p.currency)='gbp' AND NOT ${fullPrint}
  AND NOT EXISTS(SELECT 1 FROM lulu_orders WHERE user_id=p.user_id AND lower(status) NOT IN ('cancelled','canceled','rejected'))`
const actorGuard = 'EXISTS(SELECT 1 FROM users WHERE id=? AND is_admin=1 AND deleted_at IS NULL)'
const attemptGuard = `EXISTS(SELECT 1 FROM native_refund_attempts a WHERE a.id=? AND a.lease_id=? AND a.state='succeeded')`

async function getAttempt(db, paymentId) {
  return db
    .prepare('SELECT * FROM native_refund_attempts WHERE payment_id=?')
    .bind(paymentId)
    .first()
}
function knownPremium(payment, user) {
  if (
    payment.product_type !== 'premium_bundle' ||
    !user.premium_until ||
    !user.premium_activated_at
  )
    return null
  const purchased = new Date(timestampToApi(payment.created_at, 'timestamp', 'UTC'))
  const activated = new Date(timestampToApi(user.premium_activated_at, 'timestamp', 'UTC'))
  if (purchased.getTime() !== activated.getTime()) return null
  const next = new Date(purchased),
    last = new Date(
      Date.UTC(purchased.getUTCFullYear() + 1, purchased.getUTCMonth() + 1, 0)
    ).getUTCDate()
  next.setUTCDate(Math.min(purchased.getUTCDate(), last))
  next.setUTCFullYear(purchased.getUTCFullYear() + 1)
  return new Date(timestampToApi(user.premium_until, 'timestamp', 'UTC')).getTime() ===
    next.getTime()
    ? user.premium_until
    : null
}
function proof(attempt, refund) {
  return (
    objectId(refund?.id, 're') &&
    reference(refund.charge) === attempt.charge_id &&
    reference(refund.payment_intent) === attempt.payment_intent_id &&
    refund.amount === attempt.amount &&
    refund.currency === attempt.currency &&
    refund.metadata?.native_refund_attempt === attempt.id
  )
}
async function fail(db, attempt, lease, state, code) {
  await db
    .prepare(
      'UPDATE native_refund_attempts SET state=?,error_code=?,lease_id=NULL,lease_expires=NULL,updated_at=? WHERE id=? AND lease_id=?'
    )
    .bind(state, code, Date.now(), attempt.id, lease)
    .run()
}
async function recordRefund(db, attempt, lease, refund) {
  if (!proof(attempt, refund))
    throw new ApiError(409, {
      error: 'Provider refund does not match the frozen payment',
      code: 'REFUND_RECONCILIATION_REQUIRED'
    })
  const now = Date.now(),
    stamp = timestampForStorage(now),
    instant = timestampForStorage(now, 'instant')
  if (refund.status !== 'succeeded') {
    const state = ['failed', 'canceled'].includes(refund.status) ? 'failed' : 'pending'
    const saved = await db
      .prepare(
        `UPDATE native_refund_attempts SET state=?,provider_refund_id=?,lease_id=NULL,lease_expires=NULL,error_code=?,updated_at=?
      WHERE id=? AND lease_id=? AND lease_expires>? RETURNING id`
      )
      .bind(
        state,
        refund.id,
        state === 'failed' ? 'PROVIDER_REFUND_FAILED' : null,
        now,
        attempt.id,
        lease,
        now
      )
      .first()
    if (!saved) throw new ApiError(409, { error: 'Refund reconciliation lease lost' })
    if (state === 'failed')
      throw new ApiError(409, {
        error: 'Stripe confirmed that this refund failed. Contact support for review.',
        code: 'REFUND_FAILED'
      })
    return json(
      {
        success: false,
        status: 'pending',
        paymentId: attempt.payment_id,
        refundRequestId: attempt.refund_request_id,
        message: 'Stripe is still processing the refund. The payment has not been marked refunded.'
      },
      202
    )
  }
  const args = [attempt.id, lease]
  const result = await db.batch([
    db
      .prepare(
        `UPDATE native_refund_attempts SET state='succeeded',provider_refund_id=?,error_code=NULL,updated_at=?
      WHERE id=? AND lease_id=? AND lease_expires>? AND state IN ('effect_started','pending','needs_reconciliation') RETURNING id`
      )
      .bind(refund.id, now, attempt.id, lease, now),
    db
      .prepare(
        `UPDATE refund_requests SET status='approved',stripe_refund_id=?,admin_notes='Confirmed by Stripe',resolved_at=?,updated_at=?
      WHERE id=? AND payment_id=? AND ${attemptGuard}`
      )
      .bind(refund.id, stamp, stamp, attempt.refund_request_id, attempt.payment_id, ...args),
    db
      .prepare(`UPDATE payments SET status='refunded',updated_at=? WHERE id=? AND ${attemptGuard}`)
      .bind(stamp, attempt.payment_id, ...args),
    db
      .prepare(
        `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
      SELECT text_key,?,? FROM print_orders WHERE status='proof' AND entitlement_id IN(SELECT id FROM print_entitlements WHERE stripe_session_id=?) AND ${attemptGuard}
      ON CONFLICT(object_key) DO NOTHING`
      )
      .bind(instant, instant, attempt.stripe_session_id, ...args),
    db
      .prepare(
        `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
      SELECT cover_key,?,? FROM print_orders WHERE status='proof' AND entitlement_id IN(SELECT id FROM print_entitlements WHERE stripe_session_id=?) AND ${attemptGuard}
      ON CONFLICT(object_key) DO NOTHING`
      )
      .bind(instant, instant, attempt.stripe_session_id, ...args),
    db
      .prepare(
        `DELETE FROM print_entitlements WHERE stripe_session_id=? AND ${attemptGuard}
      AND NOT EXISTS(SELECT 1 FROM print_orders WHERE entitlement_id=print_entitlements.id AND status<>'proof')`
      )
      .bind(attempt.stripe_session_id, ...args),
    db
      .prepare(
        `UPDATE users SET premium_until=NULL,updated_at=? WHERE id=? AND premium_until=? AND ${attemptGuard}
      AND NOT EXISTS(SELECT 1 FROM payments WHERE user_id=users.id AND id<>? AND status='completed' AND (product_type IN ('premium_bundle','subscription') OR stripe_subscription_id IS NOT NULL))
      AND NOT EXISTS(SELECT 1 FROM native_admin_premium_grants WHERE user_id=users.id AND julianday(expires_at)>julianday(?))`
      )
      .bind(
        stamp,
        attempt.user_id,
        attempt.known_premium_until,
        ...args,
        attempt.payment_id,
        new Date(now).toISOString()
      ),
    db
      .prepare(
        `INSERT INTO native_ops_audit(id,actor_id,subject_id,action,details,created_at)
      SELECT id,actor_id,user_id,'refund_confirmed',json_object('paymentId',payment_id,'refundRequestId',refund_request_id,'amount',amount,'currency',currency,'providerRefundId',provider_refund_id),?
      FROM native_refund_attempts WHERE id=? AND lease_id=? AND state='succeeded' ON CONFLICT(id) DO NOTHING`
      )
      .bind(now, ...args),
    db
      .prepare(
        "UPDATE native_refund_attempts SET lease_id=NULL,lease_expires=NULL WHERE id=? AND lease_id=? AND state='succeeded'"
      )
      .bind(...args)
  ])
  if (!result[0].results.length)
    throw new ApiError(409, { error: 'Refund reconciliation lease lost' })
  return json({
    success: true,
    status: 'succeeded',
    refundRequestId: attempt.refund_request_id,
    paymentId: attempt.payment_id
  })
}

async function runAttempt(
  db,
  env,
  attempt,
  { actorId = null, now = Date.now(), allowCreate = false } = {}
) {
  if (attempt.state === 'succeeded')
    return json({
      success: true,
      status: 'succeeded',
      refundRequestId: attempt.refund_request_id,
      paymentId: attempt.payment_id
    })
  if (attempt.state === 'failed')
    throw new ApiError(409, {
      error: 'This refund needs manual support review',
      code: 'REFUND_FAILED'
    })
  const lease = crypto.randomUUID()
  const claimed = await db
    .prepare(
      `UPDATE native_refund_attempts SET lease_id=?,lease_expires=?,updated_at=?,
    state=CASE WHEN state IN ('created','lookup') THEN 'lookup' WHEN state='effect_started' THEN 'needs_reconciliation' ELSE state END
    WHERE id=? AND (lease_id IS NULL OR lease_expires<=?) AND state NOT IN ('succeeded','failed') RETURNING *`
    )
    .bind(lease, now + 90_000, now, attempt.id, now)
    .first()
  if (!claimed)
    throw new ApiError(409, {
      error: 'A refund operation is already in progress',
      code: 'REFUND_PROCESSING'
    })
  attempt = claimed
  const stripe = stripeClient(env)
  let effect = attempt.state !== 'lookup'
  try {
    if (attempt.state === 'lookup') {
      if (!allowCreate || !actorId)
        throw new ApiError(409, { error: 'An administrator must confirm this refund' })
      const session = await stripe.checkout.sessions.retrieve(attempt.stripe_session_id)
      const payment = await db
        .prepare('SELECT * FROM payments WHERE id=?')
        .bind(attempt.payment_id)
        .first()
      const checkout = await db
        .prepare("SELECT * FROM native_checkouts WHERE stripe_session_id=? AND state='completed'")
        .bind(attempt.stripe_session_id)
        .first()
      if (
        !payment ||
        !checkout ||
        checkout.user_id !== attempt.user_id ||
        checkout.amount !== attempt.amount ||
        checkout.currency !== attempt.currency ||
        checkout.product_id !== payment.product_id ||
        session.id !== attempt.stripe_session_id ||
        session.mode !== 'payment' ||
        session.payment_status !== 'paid' ||
        session.amount_total !== attempt.amount ||
        session.currency !== attempt.currency ||
        session.metadata?.userId !== String(attempt.user_id) ||
        session.metadata?.productId !== payment.product_id ||
        !objectId(reference(session.payment_intent), 'pi')
      )
        throw new ApiError(409, {
          error: 'Payment verification failed; no refund was sent',
          code: 'REFUND_PAYMENT_MISMATCH'
        })
      const intent = await stripe.paymentIntents.retrieve(reference(session.payment_intent), {
        expand: ['latest_charge']
      })
      const charge = intent.latest_charge
      if (
        intent.id !== reference(session.payment_intent) ||
        intent.status !== 'succeeded' ||
        intent.amount_received !== attempt.amount ||
        intent.currency !== attempt.currency ||
        !charge ||
        typeof charge !== 'object' ||
        !objectId(charge.id, 'ch') ||
        !charge.paid ||
        !charge.captured ||
        charge.amount !== attempt.amount ||
        charge.currency !== attempt.currency ||
        charge.amount_refunded !== 0 ||
        reference(charge.payment_intent) !== intent.id ||
        (attempt.charge_id && attempt.charge_id !== charge.id) ||
        (attempt.payment_intent_id && attempt.payment_intent_id !== intent.id)
      )
        throw new ApiError(409, {
          error: 'Charge verification failed; no refund was sent',
          code: 'REFUND_CHARGE_MISMATCH'
        })
      const at = Date.now()
      const started = await db
        .prepare(
          `UPDATE native_refund_attempts SET payment_intent_id=?,charge_id=?,state='effect_started',lease_expires=?,updated_at=?
        WHERE id=? AND lease_id=? AND state='lookup' AND lease_expires>? AND ${actorGuard}
        AND EXISTS(SELECT 1 FROM payments p JOIN users u ON u.id=p.user_id JOIN refund_requests r ON r.id=native_refund_attempts.refund_request_id WHERE p.id=native_refund_attempts.payment_id
          AND p.user_id=native_refund_attempts.user_id AND p.stripe_session_id=native_refund_attempts.stripe_session_id
          AND p.amount=native_refund_attempts.amount AND lower(p.currency)=native_refund_attempts.currency AND ${available}) RETURNING *`
        )
        .bind(intent.id, charge.id, at + 60_000, at, attempt.id, lease, at, actorId)
        .first()
      if (!started)
        throw new ApiError(409, {
          error: 'Payment, fulfilment or administrator authorization changed; no refund was sent',
          code: 'REFUND_AUTHORITY_CHANGED'
        })
      attempt = started
      effect = true
      const refund = await stripe.refunds.create(
        {
          charge: attempt.charge_id,
          amount: attempt.amount,
          reason: 'requested_by_customer',
          metadata: { native_refund_attempt: attempt.id }
        },
        { idempotencyKey: attempt.idempotency_key }
      )
      return await recordRefund(db, attempt, lease, refund)
    }
    let refund
    if (attempt.provider_refund_id)
      refund = await stripe.refunds.retrieve(attempt.provider_refund_id)
    else if (attempt.charge_id) {
      const listed = await stripe.refunds.list({ charge: attempt.charge_id, limit: 100 })
      const matches = listed.data.filter(
        item => item.metadata?.native_refund_attempt === attempt.id
      )
      if (matches.length === 1) refund = matches[0]
    }
    if (!refund)
      throw new ApiError(409, {
        error:
          'The refund outcome is uncertain. Support must reconcile the existing Stripe request; no repeat refund was sent.',
        code: 'REFUND_RECONCILIATION_REQUIRED'
      })
    return await recordRefund(db, attempt, lease, refund)
  } catch (error) {
    // No automatic POST replay, including after Stripe's24h idempotency window.
    // Reconciliation only reads the already frozen charge/refund identifiers.
    const current = await getAttempt(db, attempt.payment_id)
    if (current?.lease_id === lease)
      await fail(
        db,
        attempt,
        lease,
        effect ? 'needs_reconciliation' : error instanceof ApiError ? 'failed' : 'created',
        effect
          ? 'REFUND_RECONCILIATION_REQUIRED'
          : error instanceof ApiError
            ? error.body.code || 'REFUND_NOT_SENT'
            : 'REFUND_LOOKUP_UNAVAILABLE'
      )
    if (error instanceof ApiError) throw error
    throw new ApiError(503, {
      error: effect
        ? 'The refund outcome is uncertain. No repeat refund will be sent automatically.'
        : 'Stripe verification is unavailable. No refund was sent.',
      code: effect ? 'REFUND_RECONCILIATION_REQUIRED' : 'REFUND_LOOKUP_UNAVAILABLE'
    })
  }
}

export async function processNativeRefund({ db, env, paymentId, actorId, now = Date.now() }) {
  if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, { error: 'Refund provider unavailable' })
  let attempt = await getAttempt(db, paymentId)
  if (!attempt) {
    const payment = await db
      .prepare(
        'SELECT p.*,u.premium_until,u.premium_activated_at FROM payments p JOIN users u ON u.id=p.user_id WHERE p.id=? AND u.deleted_at IS NULL'
      )
      .bind(paymentId)
      .first()
    if (!payment || !objectId(payment.stripe_session_id, 'cs'))
      throw new ApiError(404, { error: 'A verified Stripe payment was not found' })
    const id = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO native_refund_attempts(id,user_id,payment_id,refund_request_id,actor_id,stripe_session_id,amount,currency,known_premium_until,idempotency_key,created_at,updated_at)
      SELECT ?,p.user_id,p.id,r.id,?,p.stripe_session_id,p.amount,lower(p.currency),?,?,?,? FROM payments p JOIN users u ON u.id=p.user_id
      JOIN refund_requests r ON r.payment_id=p.id WHERE p.id=? AND ${available} AND ${actorGuard}
      ORDER BY r.created_at DESC,r.id DESC LIMIT 1 ON CONFLICT(payment_id) DO NOTHING`
      )
      .bind(
        id,
        actorId,
        knownPremium(payment, payment),
        `memoir-refund-${id}`,
        now,
        now,
        paymentId,
        actorId
      )
      .run()
    attempt = await getAttempt(db, paymentId)
    if (!attempt)
      throw new ApiError(409, {
        error:
          'No pending full refund is eligible for automatic processing. Fulfilled or in-flight book orders require support review.',
        code: 'REFUND_MANUAL_REVIEW_REQUIRED'
      })
  }
  return runAttempt(db, env, attempt, { actorId, now, allowCreate: true })
}
export async function reconcileNativeRefunds(env, now = Date.now()) {
  if (!env.DB || !env.STRIPE_SECRET_KEY) return { skipped: true }
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB
  const { results } = await db
    .prepare(
      `SELECT * FROM native_refund_attempts WHERE state IN ('pending','needs_reconciliation','effect_started') AND (lease_id IS NULL OR lease_expires<=?) ORDER BY updated_at LIMIT 10`
    )
    .bind(now)
    .all()
  let completed = 0
  for (const attempt of results) {
    try {
      const response = await runAttempt(db, env, attempt, { now })
      if (response.status === 200) completed++
    } catch {
      /* Durable state retains unresolved outcomes, without raw provider logging. */
    }
  }
  return { checked: results.length, completed }
}

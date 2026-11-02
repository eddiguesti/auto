import { nativeBookvault, printConfigurationReady } from './print-provider.js'
import { nativePrintFileUrls } from './print-files.js'
import { timestampForStorage } from './value-codecs.js'

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/
const eligible = `EXISTS(SELECT 1 FROM print_orders o JOIN users u ON u.id=o.user_id
  JOIN print_entitlements e ON e.id=o.entitlement_id AND e.user_id=o.user_id
  JOIN payments p ON p.stripe_session_id=e.stripe_session_id AND p.user_id=o.user_id AND p.status='completed'
  WHERE o.id=native_print_dispatch.order_id AND u.deleted_at IS NULL)`

export async function publishPrintOutbox(env, now = Date.now()) {
  if (!env.PRINT_QUEUE?.send || !env.DB) throw new Error('Print queue bindings unavailable')
  const db = env.DB.withSession('first-primary'),
    token = crypto.randomUUID()
  await db
    .prepare(
      `UPDATE native_print_outbox SET state='pending',claim_token=NULL,lease_until=NULL
    WHERE order_id IN(SELECT order_id FROM native_print_dispatch WHERE state IN('active','effect_started') AND lease_until<=?)`
    )
    .bind(now)
    .run()
  const rows = await db
    .prepare(
      `UPDATE native_print_outbox SET claim_token=?,lease_until=? WHERE order_id IN(
    SELECT o.order_id FROM native_print_outbox o JOIN native_print_dispatch d ON d.order_id=o.order_id
    WHERE o.state='pending' AND (o.lease_until IS NULL OR o.lease_until<=?) AND d.next_attempt_at<=?
      AND (d.lease_until IS NULL OR d.lease_until<=?) AND d.state IN('queued','submitted','active','effect_started') ORDER BY d.next_attempt_at LIMIT 10) RETURNING order_id`
    )
    .bind(token, now + 60000, now, now, now)
    .all()
  for (const row of rows.results) {
    await env.PRINT_QUEUE.send({ version: 1, orderId: row.order_id })
    await db
      .prepare(
        `UPDATE native_print_outbox SET state='published',claim_token=NULL,lease_until=NULL WHERE order_id=? AND claim_token=?`
      )
      .bind(row.order_id, token)
      .run()
  }
  return rows.results.length
}

export async function consumePrintQueue(batch, env, { now = () => Date.now() } = {}) {
  if (!env.DB) throw new Error('Print database unavailable')
  const db = env.DB.withSession('first-primary'),
    provider = nativeBookvault(env)
  for (const message of batch.messages) {
    const id = message.body?.orderId
    if (
      message.body?.version !== 1 ||
      !UUID.test(id || '') ||
      Object.keys(message.body).sort().join(',') !== 'orderId,version'
    ) {
      message.ack()
      continue
    }
    if (!printConfigurationReady(env)) {
      message.retry({ delaySeconds: 300 })
      continue
    }
    const time = now(),
      token = crypto.randomUUID()
    const claim = await db
      .prepare(
        `UPDATE native_print_dispatch SET state='active',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=?
      WHERE order_id=? AND state IN('queued','submitted','active','effect_started') AND next_attempt_at<=?
      AND (lease_until IS NULL OR lease_until<=?) AND ${eligible} RETURNING *`
      )
      .bind(token, time + 900000, time, id, time, time)
      .first()
    if (!claim) {
      const current = await db
        .prepare('SELECT state,lease_until FROM native_print_dispatch WHERE order_id=?')
        .bind(id)
        .first()
      if (!current || ['review', 'dispatched'].includes(current.state)) message.ack()
      else message.retry({ delaySeconds: 60 })
      continue
    }
    const fence = `EXISTS(SELECT 1 FROM native_print_dispatch WHERE order_id=? AND lease_token=? AND lease_until>? AND state IN('active','effect_started') AND ${eligible})`
    const finish = async (existing, providerId) => {
      const progress = existing?.fulfillment?.progress || {},
        tracking = existing?.fulfillment?.trackingDetails || {}
      const dispatched = progress.isDispatched === true,
        status = dispatched ? 'dispatched' : 'submitted'
      let trackingUrl = null
      try {
        const url = new URL(tracking.combinedURL)
        if (url.protocol === 'https:' && !url.username && !url.password) trackingUrl = url.href
      } catch {
        /* absent tracking */
      }
      const instant = now(),
        stamp = timestampForStorage(instant, 'instant')
      const result = await db.batch([
        db
          .prepare(
            `UPDATE print_orders SET status=?,provider_id=?,provider_status=?,tracking_url=?,tracking_number=?,last_error=NULL,updated_at=? WHERE id=? AND ${fence} RETURNING id`
          )
          .bind(
            status,
            String(providerId),
            String(progress.status || 'Created').slice(0, 200),
            trackingUrl,
            typeof tracking.trackingNumber === 'string'
              ? tracking.trackingNumber.slice(0, 200)
              : null,
            stamp,
            id,
            id,
            token,
            instant
          ),
        db
          .prepare(
            `UPDATE native_print_dispatch SET state=?,lease_token=NULL,lease_until=NULL,error_code=NULL,attempts=0,next_attempt_at=?,updated_at=? WHERE order_id=? AND lease_token=? AND lease_until>? AND ${eligible} RETURNING order_id`
          )
          .bind(status, instant + 300000, instant, id, token, instant),
        db
          .prepare(
            `UPDATE native_print_outbox SET state='pending',claim_token=NULL,lease_until=NULL WHERE order_id=? AND EXISTS(SELECT 1 FROM native_print_dispatch WHERE order_id=? AND state='submitted')`
          )
          .bind(id, id)
      ])
      if (!result[0].results.length || !result[1].results.length)
        throw new Error('PRINT_CLAIM_LOST')
    }
    const review = async code => {
      const instant = now()
      await db.batch([
        db
          .prepare(
            `UPDATE print_orders SET status='review',last_error='Printer acceptance needs review. Contact support before any resubmission.',updated_at=? WHERE id=? AND ${fence}`
          )
          .bind(timestampForStorage(instant, 'instant'), id, id, token, instant),
        db
          .prepare(
            `UPDATE native_print_dispatch SET state='review',error_code=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE order_id=? AND lease_token=?`
          )
          .bind(code, instant, id, token)
      ])
    }
    try {
      const order = await db.prepare('SELECT * FROM print_orders WHERE id=?').bind(id).first()
      if (!order) {
        message.ack()
        continue
      }
      order.shipping_address = JSON.parse(order.shipping_address)
      const found = await provider.find(`EM-${id}`)
      if (found?.criticalError) {
        await review('PRINT_PROVIDER_REPORTED_ERROR')
        message.ack()
        continue
      }
      if (found?.identification?.podRef) await finish(found, found.identification.podRef)
      else if (claim.post_started_at !== null || order.provider_id)
        await review('PRINT_PROVIDER_OUTCOME_UNKNOWN')
      else {
        const instant = now()
        // Persist the irreversible boundary before the only permitted POST.
        const started = await db.batch([
          db
            .prepare(
              `UPDATE print_orders SET status='submitting',updated_at=? WHERE id=? AND ${fence}`
            )
            .bind(timestampForStorage(instant, 'instant'), id, id, token, instant),
          db
            .prepare(
              `UPDATE native_print_dispatch SET state='effect_started',post_started_at=?,updated_at=? WHERE order_id=? AND lease_token=? AND lease_until>? AND post_started_at IS NULL AND ${eligible} RETURNING order_id`
            )
            .bind(instant, instant, id, token, instant)
        ])
        if (!started[1].results.length) throw new Error('PRINT_CLAIM_LOST')
        const providerId = await provider.submit(order, await nativePrintFileUrls(env, id, instant))
        await finish(null, providerId)
      }
      message.ack()
    } catch {
      const current = await db
        .prepare(
          'SELECT post_started_at FROM native_print_dispatch WHERE order_id=? AND lease_token=?'
        )
        .bind(id, token)
        .first()
      if (!current) {
        message.ack()
        continue
      }
      if (claim.attempts >= 3) {
        await review(
          current.post_started_at !== null
            ? 'PRINT_PROVIDER_OUTCOME_UNKNOWN'
            : 'PRINT_LOOKUP_UNAVAILABLE'
        )
        message.ack()
        continue
      }
      const instant = now()
      await db.batch([
        db
          .prepare(
            `UPDATE native_print_dispatch SET state=?,error_code=?,lease_token=NULL,lease_until=NULL,next_attempt_at=?,updated_at=? WHERE order_id=? AND lease_token=?`
          )
          .bind(
            current.post_started_at !== null ? 'effect_started' : 'queued',
            current.post_started_at !== null
              ? 'PRINT_PROVIDER_OUTCOME_UNKNOWN'
              : 'PRINT_LOOKUP_UNAVAILABLE',
            instant + 60000,
            instant,
            id,
            token
          ),
        db
          .prepare(
            `UPDATE native_print_outbox SET state='pending',claim_token=NULL,lease_until=NULL WHERE order_id=?`
          )
          .bind(id)
      ])
      message.ack()
    }
  }
}

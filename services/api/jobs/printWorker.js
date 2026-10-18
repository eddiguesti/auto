import { bookvault, printConfigurationReady } from '../services/bookvault.js'
import { printFileUrls } from '../services/printFiles.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('print-worker')
export async function processPrintOrders(
  db,
  provider = bookvault,
  ready = printConfigurationReady
) {
  if (!ready()) return
  // The table is the durable outbox; restarting a worker cannot lose an approved order.
  const { rows } =
    await db.query(`SELECT o.*,o.updated_at::text AS claim_version FROM print_orders o WHERE
    o.status='queued' OR (o.status IN ('submitting','submitted') AND o.updated_at < NOW() - INTERVAL '5 minutes')
    ORDER BY o.updated_at LIMIT 10`)
  for (const order of rows) {
    try {
      const status = order.status
      const claim = await db.query(
        `UPDATE print_orders o SET status=CASE WHEN status='queued' THEN 'submitting' ELSE status END,updated_at=NOW()
        WHERE id=$1 AND status=$2 AND updated_at::text=$3
        AND EXISTS (SELECT 1 FROM print_entitlements e JOIN payments p ON p.stripe_session_id=e.stripe_session_id
          WHERE e.id=o.entitlement_id AND p.status='completed') RETURNING id`,
        [order.id, status, order.claim_version]
      )
      if (!claim.rows.length) continue
      const existing = await provider.find(`EM-${order.id}`)
      if (existing?.criticalError) throw new Error('Printer reported an order error')
      if (existing?.identification?.podRef) {
        const fulfillment = existing.fulfillment || {}
        const tracking = fulfillment.trackingDetails || {}
        const dispatched = fulfillment.progress?.isDispatched === true
        const trackingUrl = /^https:\/\//.test(tracking.combinedURL || '')
          ? tracking.combinedURL
          : null
        await db.query(
          `UPDATE print_orders SET status=$2,provider_id=$3,provider_status=$4,tracking_url=$5,tracking_number=$6,last_error=NULL,updated_at=NOW() WHERE id=$1`,
          [
            order.id,
            dispatched ? 'dispatched' : 'submitted',
            String(existing.identification.podRef),
            fulfillment.progress?.status || 'Created',
            trackingUrl,
            tracking.trackingNumber || null
          ]
        )
      } else if (status === 'queued') {
        const providerId = await provider.submit(order, printFileUrls(order.id))
        await db.query(
          "UPDATE print_orders SET status='submitted',provider_id=$2,provider_status='Created',last_error=NULL,updated_at=NOW() WHERE id=$1",
          [order.id, providerId]
        )
      } else {
        // A timed-out POST may have succeeded. Never POST again automatically.
        await db.query(
          "UPDATE print_orders SET status='review',last_error='Provider acceptance could not be confirmed. Reconcile DocRef before any resubmission.',updated_at=NOW() WHERE id=$1",
          [order.id]
        )
      }
    } catch (error) {
      logger.error('Print order needs review', { orderId: order.id, error: error.message })
      await db.query(
        "UPDATE print_orders SET status='review',last_error=$2,updated_at=NOW() WHERE id=$1",
        [order.id, error.message.slice(0, 300)]
      )
    }
  }
}

export function startPrintWorker(db) {
  let running = null
  const poll = () => {
    if (running) return
    running = processPrintOrders(db)
      .catch(error => {
        logger.error('Print polling failed', { error: error.message })
      })
      .finally(() => {
        running = null
      })
  }
  const timer = setInterval(poll, 30000)
  void poll()
  return {
    async stop() {
      clearInterval(timer)
      await running
    }
  }
}

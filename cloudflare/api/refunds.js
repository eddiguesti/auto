import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson, validate } from './request.js'
import { refundSchemas } from '../../services/api/schemas/index.js'
import { timestampForStorage, timestampToApi } from './value-codecs.js'

const thresholds = {
  chaptersWithContent: 3,
  voiceSessions: 3,
  exportsGenerated: 0,
  photosUploaded: 10
}
const stamp = value => (value === null ? null : timestampToApi(value, 'timestamp', 'UTC'))
export async function handleRefundRoutes({ request, db, user, claims, path, now }) {
  if (!path.startsWith('/refunds/')) return null
  requireFullScope(claims)
  if (path === '/refunds/usage' && request.method === 'GET') {
    const [chapters, voice, exports, photos, payment, previous] = await db.batch([
      db
        .prepare(
          "SELECT COUNT(DISTINCT chapter_id) AS count FROM stories WHERE user_id=? AND answer IS NOT NULL AND TRIM(answer) <> ''"
        )
        .bind(user.id),
      db.prepare('SELECT COUNT(*) AS count FROM voice_sessions WHERE user_id=?').bind(user.id),
      db.prepare('SELECT COUNT(*) AS count FROM generated_exports WHERE user_id=?').bind(user.id),
      db
        .prepare(
          'SELECT COUNT(*) AS count FROM photos p LEFT JOIN stories s ON s.id=p.story_id WHERE p.user_id=? OR (p.user_id IS NULL AND s.user_id=?)'
        )
        .bind(user.id, user.id),
      db
        .prepare(
          "SELECT created_at FROM payments WHERE user_id=? AND status='completed' ORDER BY created_at DESC,id DESC LIMIT 1"
        )
        .bind(user.id),
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM refund_requests WHERE user_id=? AND status='approved' AND type='guarantee'"
        )
        .bind(user.id)
    ])
    const chaptersUsed = chapters.results[0].count,
      voiceSessions = voice.results[0].count,
      exportsGenerated = exports.results[0].count,
      photosUploaded = photos.results[0].count
    const previousGuaranteeUsed = previous.results[0].count > 0
    const daysSincePurchase = payment.results.length
      ? Math.floor((now - new Date(stamp(payment.results[0].created_at)).getTime()) / 86400000)
      : null
    const breaches = []
    if (chaptersUsed > thresholds.chaptersWithContent)
      breaches.push(`Chapters with content: ${chaptersUsed} of 24 (limit: 3)`)
    if (voiceSessions > thresholds.voiceSessions)
      breaches.push(`Voice sessions: ${voiceSessions} (limit: 3)`)
    if (exportsGenerated > 0)
      breaches.push(`Exports generated: ${exportsGenerated} (any export voids guarantee)`)
    if (photosUploaded > thresholds.photosUploaded)
      breaches.push(`Photos uploaded: ${photosUploaded} (limit: 10)`)
    const withinPeriod =
      daysSincePurchase !== null && daysSincePurchase >= 0 && daysSincePurchase <= 30
    return json({
      usage: {
        chaptersUsed,
        totalChapters: 24,
        voiceSessions,
        exportsGenerated,
        photosUploaded,
        usagePercentage: Math.round((chaptersUsed / 24) * 100)
      },
      guarantee: {
        eligible: withinPeriod && !previousGuaranteeUsed && !breaches.length,
        withinPeriod,
        daysSincePurchase,
        daysRemaining: daysSincePurchase === null ? null : Math.max(0, 30 - daysSincePurchase),
        thresholdBreaches: breaches,
        previousGuaranteeUsed
      },
      thresholds
    })
  }
  if (path === '/refunds/history' && request.method === 'GET') {
    const { results } = await db
      .prepare(
        `SELECT r.id,r.type,r.status,r.amount,r.reason,r.created_at,r.resolved_at,p.product_id,p.product_type FROM refund_requests r JOIN payments p ON p.id=r.payment_id WHERE r.user_id=? AND p.user_id=? ORDER BY r.created_at DESC,r.id DESC`
      )
      .bind(user.id, user.id)
      .all()
    return json(
      results.map(row => ({
        id: row.id,
        reference: `RF-${row.id}`,
        type: row.type,
        status: row.status,
        amount: row.amount,
        displayAmount: `£${(row.amount / 100).toFixed(2)}`,
        reason: row.reason,
        productId: row.product_id,
        productType: row.product_type,
        createdAt: stamp(row.created_at),
        resolvedAt: stamp(row.resolved_at)
      }))
    )
  }
  if (path === '/refunds/request' && request.method === 'POST') {
    const body = validate(await readJson(request), refundSchemas.request.body)
    const payment = await db
      .prepare(
        `SELECT id,amount FROM payments WHERE user_id=? AND status='completed' ${body.paymentId ? 'AND id=?' : ''} ORDER BY created_at DESC,id DESC LIMIT 1`
      )
      .bind(user.id, ...(body.paymentId ? [body.paymentId] : []))
      .first()
    if (!payment) throw new ApiError(404, { error: 'No eligible payment found' })
    const created = timestampForStorage(now)
    const row = await db
      .prepare(
        `INSERT INTO refund_requests (user_id,payment_id,type,reason,amount,status,created_at)
      SELECT ?,?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM payments WHERE id=? AND user_id=? AND status='completed')
      AND NOT EXISTS(SELECT 1 FROM refund_requests WHERE user_id=? AND payment_id=? AND status='pending') RETURNING id,created_at`
      )
      .bind(
        user.id,
        payment.id,
        body.type,
        body.reason || '',
        payment.amount,
        created,
        payment.id,
        user.id,
        user.id,
        payment.id
      )
      .first()
    if (!row)
      throw new ApiError(409, { error: 'A refund request for this payment is already pending' })
    return json(
      {
        id: row.id,
        reference: `RF-${row.id}`,
        status: 'pending',
        amount: payment.amount,
        displayAmount: `£${(payment.amount / 100).toFixed(2)}`,
        createdAt: stamp(row.created_at),
        message: 'Your refund request has been submitted. We will review it within 5 working days.'
      },
      201
    )
  }
  return null
}

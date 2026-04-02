import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { adminSchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('admin')

// ---------- Metrics ----------

router.get(
  '/metrics',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db

    const [usersResult, activeResult, storiesResult, paymentsResult] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM users'),
      db.query(
        `SELECT COUNT(DISTINCT user_id) AS active
         FROM stories
         WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),
      db.query('SELECT COUNT(*) AS total FROM stories'),
      db.query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS revenue
         FROM payments
         WHERE status = 'completed'`
      )
    ])

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total, 10),
      activeUsers7d: parseInt(activeResult.rows[0].active, 10),
      totalStories: parseInt(storiesResult.rows[0].total, 10),
      totalPayments: parseInt(paymentsResult.rows[0].total, 10),
      revenueTotal: parseInt(paymentsResult.rows[0].revenue, 10)
    })
  })
)

// ---------- Users list ----------

router.get(
  '/users',
  requireDb,
  validate(adminSchemas.listUsers),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const { page, limit, q: search } = req.validatedQuery
    const offset = (page - 1) * limit

    const params = []
    let whereClause = ''

    if (search) {
      params.push(`%${search}%`)
      whereClause = `WHERE u.email ILIKE $1 OR u.name ILIKE $1`
    }

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`
    const countResult = await db.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total, 10)

    const dataParams = [...params, limit, offset]
    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2

    const dataQuery = `
      SELECT u.id, u.email, u.name, u.created_at, u.premium_until, u.is_admin,
             (SELECT COUNT(*) FROM stories s WHERE s.user_id = u.id) AS story_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `

    const dataResult = await db.query(dataQuery, dataParams)

    res.json({
      users: dataResult.rows,
      meta: { total, page, limit }
    })
  })
)

// ---------- User detail ----------

router.get(
  '/users/:id',
  requireDb,
  validate(adminSchemas.userById),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.validatedParams.id

    const userResult = await db.query(
      `SELECT id, email, name, birth_year, avatar_url, created_at,
              premium_until, email_verified, is_admin
       FROM users WHERE id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const [storyCount, payments] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM stories WHERE user_id = $1', [userId]),
      db.query(
        `SELECT id, product_id, product_type, amount, currency, status, created_at
         FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      )
    ])

    res.json({
      user: {
        ...userResult.rows[0],
        storyCount: parseInt(storyCount.rows[0].count, 10)
      },
      payments: payments.rows
    })
  })
)

// ---------- Grant / extend premium ----------

router.post(
  '/users/:id/premium',
  requireDb,
  validate(adminSchemas.grantPremium),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.validatedParams.id
    const { months } = req.validatedBody

    // Extend from current premium_until or from now, whichever is later
    const result = await db.query(
      `UPDATE users
       SET premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW())
                           + ($1 || ' months')::INTERVAL,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, premium_until`,
      [String(months), userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    logger.info('Premium granted by admin', {
      adminId: req.user.id,
      targetUserId: userId,
      months
    })

    res.json({ user: result.rows[0] })
  })
)

// ---------- Payments list ----------

router.get(
  '/payments',
  requireDb,
  validate(adminSchemas.listPayments),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const { page, limit } = req.validatedQuery
    const offset = (page - 1) * limit

    const countResult = await db.query('SELECT COUNT(*) AS total FROM payments')
    const total = parseInt(countResult.rows[0].total, 10)

    const dataResult = await db.query(
      `SELECT p.id, p.user_id, p.product_id, p.product_type, p.amount,
              p.currency, p.status, p.created_at,
              u.email AS user_email, u.name AS user_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    res.json({
      payments: dataResult.rows,
      meta: { total, page, limit }
    })
  })
)

// ---------- Process refund ----------

router.post(
  '/refunds/:paymentId/process',
  requireDb,
  validate(adminSchemas.processRefund),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const paymentId = req.validatedParams.paymentId

    const refundResult = await db.query(
      `SELECT id, user_id, payment_id, amount, status
       FROM refund_requests
       WHERE payment_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [paymentId]
    )

    if (refundResult.rows.length === 0) {
      return res.status(404).json({ error: 'No pending refund request found for this payment' })
    }

    const refund = refundResult.rows[0]

    // Mark the refund request as processed
    await db.query(
      `UPDATE refund_requests
       SET status = 'approved',
           admin_notes = $1,
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [`Approved by admin ${req.user.id}`, refund.id]
    )

    // Mark the payment as refunded
    await db.query(`UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1`, [
      paymentId
    ])

    logger.info('Refund processed by admin', {
      adminId: req.user.id,
      refundRequestId: refund.id,
      paymentId,
      amount: refund.amount
    })

    res.json({
      success: true,
      refundRequestId: refund.id,
      paymentId
    })
  })
)

export default router

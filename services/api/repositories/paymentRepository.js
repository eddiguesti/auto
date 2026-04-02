// @ts-check
/**
 * Payment repository — encapsulates all database access for payments and
 * premium subscription state changes triggered by Stripe webhooks.
 * @typedef {import('../types/index.js').Payment} Payment
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { PAYMENT_PUBLIC } from '../db/columns.js'

export const paymentRepository = {
  /**
   * Find a user by id for webhook validation.
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<{id: number, email: string}|null>}
   */
  async findUserById(db, userId) {
    const result = await db.query('SELECT id, email FROM users WHERE id = $1', [userId])
    return result.rows[0] || null
  },

  /**
   * Record a completed payment (idempotent — stripe_session_id is unique).
   * Safe to call multiple times for the same webhook event.
   * @param {DbClient} db
   * @param {{ userId: number, stripeSessionId: string, productId: string, productType: string, amount: number }} data
   * @returns {Promise<void>}
   */
  async recordPayment(db, { userId, stripeSessionId, productId, productType, amount }) {
    await db.query(
      `INSERT INTO payments (user_id, stripe_session_id, product_id, product_type, amount, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', CURRENT_TIMESTAMP)
       ON CONFLICT (stripe_session_id) DO NOTHING`,
      [userId, stripeSessionId, productId, productType, amount]
    )
  },

  /**
   * Activate premium access for a user by id.
   * Only updates if premium_until is currently null or already expired (idempotent).
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async activatePremiumById(db, userId) {
    await db.query(
      `UPDATE users
       SET premium_until = CURRENT_TIMESTAMP + INTERVAL '12 months',
           premium_activated_at = COALESCE(premium_activated_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND (premium_until IS NULL OR premium_until < CURRENT_TIMESTAMP)`,
      [userId]
    )
  },

  /**
   * Activate premium access for a user by email until the given date.
   * Used when Stripe provides customer email (subscription events).
   * Only updates if premium_until is currently null or before periodEnd.
   * @param {DbClient} db
   * @param {string} email
   * @param {string} premiumUntil - ISO date string
   * @returns {Promise<void>}
   */
  async activatePremiumByEmail(db, email, premiumUntil) {
    await db.query(
      `UPDATE users
       SET premium_until = $1,
           premium_activated_at = COALESCE(premium_activated_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $2 AND (premium_until IS NULL OR premium_until < $1)`,
      [premiumUntil, email]
    )
  },

  /**
   * Set premium to expire after a grace period for a user by email.
   * Uses LEAST so it never extends an earlier expiry (e.g. after cancellation).
   * @param {DbClient} db
   * @param {string} email
   * @param {string} gracePeriod - ISO date string
   * @returns {Promise<void>}
   */
  async expirePremiumByEmail(db, email, gracePeriod) {
    await db.query(
      `UPDATE users
       SET premium_until = LEAST(premium_until, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $2`,
      [gracePeriod, email]
    )
  },

  /**
   * Get payment history for a user (excludes sensitive Stripe session IDs).
   * @param {DbClient} db
   * @param {number} userId
   * @returns {Promise<Payment[]>}
   */
  async findByUserId(db, userId) {
    const result = await db.query(
      `SELECT ${PAYMENT_PUBLIC} FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows
  },

  /**
   * Check whether a user has a completed payment for a specific product type.
   * Returns true if at least one completed payment exists.
   * @param {DbClient} db
   * @param {number} userId
   * @param {string} productType
   * @returns {Promise<boolean>}
   */
  async hasProductPayment(db, userId, productType) {
    const result = await db.query(
      `SELECT id FROM payments
       WHERE user_id = $1 AND product_type = $2 AND status = 'completed'
       LIMIT 1`,
      [userId, productType]
    )
    return result.rows.length > 0
  },

  /**
   * Check whether a user is an "early adopter" (first N users by id).
   * Returns true if the count of users with id <= userId is within the threshold.
   * @param {DbClient} db
   * @param {number} userId
   * @param {number} [threshold=100]
   * @returns {Promise<boolean>}
   */
  async isEarlyAdopter(db, userId, threshold = 100) {
    const result = await db.query('SELECT COUNT(*) as count FROM users WHERE id <= $1', [userId])
    return parseInt(result.rows[0].count) <= threshold
  },

  /**
   * Append an immutable entry to the payments audit log.
   * Call after every Stripe webhook event — never update or delete these rows.
   * @param {DbClient} db
   * @param {{ userId: number|null, eventType: string, stripeEventId: string, amount?: number, productId?: string }} data
   * @returns {Promise<void>}
   */
  async recordAuditEvent(
    db,
    { userId, eventType, stripeEventId, amount = null, productId = null }
  ) {
    await db.query(
      `INSERT INTO payments_audit_log (user_id, event_type, stripe_event_id, amount, product_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, eventType, stripeEventId, amount, productId]
    )
  }
}

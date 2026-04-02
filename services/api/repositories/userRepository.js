// @ts-check
/**
 * User data access — consolidates user queries from routes/auth.js, routes/user.js
 * @typedef {import('../types/index.js').UserProfile} UserProfile
 * @typedef {import('../types/index.js').UserAuth} UserAuth
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { USER_PROFILE, USER_AUTH } from '../db/columns.js'

export const userRepository = {
  /**
   * @param {DbClient} db
   * @param {number} id
   * @returns {Promise<UserProfile|null>}
   */
  async findById(db, id) {
    const result = await db.query(
      `SELECT ${USER_PROFILE} FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )
    return result.rows[0] || null
  },

  /**
   * @param {DbClient} db
   * @param {string} email
   * @returns {Promise<UserAuth|null>}
   */
  async findByEmail(db, email) {
    const result = await db.query(
      `SELECT ${USER_AUTH} FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    )
    return result.rows[0] || null
  },

  /**
   * Soft-delete a user account. Data is retained for 30 days for GDPR compliance.
   * @param {DbClient} db
   * @param {number} id
   * @returns {Promise<void>}
   */
  async softDelete(db, id) {
    await db.query(`UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`, [id])
  },

  /**
   * @param {DbClient} db
   * @param {{ email: string, passwordHash: string, name: string, birthYear?: number }} data
   * @returns {Promise<UserProfile>}
   */
  async create(db, { email, passwordHash, name, birthYear }) {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, birth_year)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, birth_year, avatar_url`,
      [email, passwordHash, name, birthYear || null]
    )
    return result.rows[0]
  },

  /**
   * @param {DbClient} db
   * @param {number} id
   * @param {{ name?: string, birthYear?: number }} data
   * @returns {Promise<UserProfile|null>}
   */
  async updateProfile(db, id, { name, birthYear }) {
    const updates = []
    const values = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`)
      values.push(name)
      paramCount++
    }
    if (birthYear !== undefined) {
      updates.push(`birth_year = $${paramCount}`)
      values.push(birthYear)
      paramCount++
    }

    if (updates.length === 0) return null

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, birth_year, avatar_url`,
      values
    )
    return result.rows[0]
  },

  /**
   * @param {DbClient} db
   * @param {number} id
   * @param {string} until - ISO date string
   * @returns {Promise<void>}
   */
  async setPremium(db, id, until) {
    await db.query(
      `UPDATE users SET premium_until = $1, premium_activated_at = COALESCE(premium_activated_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (premium_until IS NULL OR premium_until < $1)`,
      [until, id]
    )
  },

  /**
   * @param {DbClient} db
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async exists(db, email) {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email])
    return result.rows.length > 0
  }
}

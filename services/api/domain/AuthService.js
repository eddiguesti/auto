/**
 * AuthService — domain facade for authentication operations.
 * Delegates to the existing repositories and utilities so that
 * route handlers remain thin coordinators.
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth.js'
import { blacklistToken, blacklistAllUserTokens } from '../utils/tokenBlacklist.js'
import { initializeGameState } from '../utils/gameStateManager.js'
import {
  sendEmail,
  passwordResetEmailTemplate,
  emailVerificationTemplate
} from '../services/emailService.js'
import { authLogger } from '../utils/logger.js'

const APP_URL = () => process.env.APP_URL || 'https://easymemoir.co.uk'

/**
 * Register a new user with email/password.
 * Inserts the user row, initialises game state, and sends a verification email.
 *
 * @param {object} db
 * @param {object} opts
 * @param {string} opts.email
 * @param {string} opts.password  - plaintext, will be hashed here
 * @param {string} opts.name
 * @param {number} [opts.birthYear]
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function register(db, { email, password, name, birthYear }) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    const err = new Error('Registration failed. Please try again or use a different email.')
    err.statusCode = 400
    throw err
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const result = await db.query(
    `INSERT INTO users (email, password_hash, name, birth_year)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, birth_year, avatar_url`,
    [email, passwordHash, name, birthYear || null]
  )

  const user = result.rows[0]

  await initializeGameState(user.id)

  const token = generateToken(user)

  sendVerificationEmail(db, user).catch(err =>
    authLogger.error('Failed to send verification email', { error: err.message, userId: user.id })
  )

  return { user, token }
}

/**
 * Log in with email and password.
 *
 * @param {object} db
 * @param {string} email
 * @param {string} password  - plaintext
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(db, email, password) {
  const result = await db.query(
    `SELECT id, email, name, birth_year, avatar_url, password_hash, email_verified
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  )

  const user = result.rows[0]
  const valid = user && (await bcrypt.compare(password, user.password_hash))
  if (!valid) {
    const err = new Error('Invalid email or password')
    err.statusCode = 401
    throw err
  }

  const { password_hash, ...safeUser } = user
  const token = generateToken(safeUser)

  return { user: safeUser, token }
}

/**
 * Invalidate a single token (logout).
 *
 * @param {object} decoded  - JWT payload
 */
export async function logout(decoded) {
  await blacklistToken(decoded)
}

/**
 * Invalidate all tokens for a user (force logout everywhere).
 *
 * @param {number} userId
 */
export async function logoutAll(userId) {
  await blacklistAllUserTokens(userId)
}

/**
 * Send a password reset email.
 *
 * @param {object} db
 * @param {string} email
 */
export async function requestPasswordReset(db, email) {
  const result = await db.query(
    'SELECT id, name FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  )
  const user = result.rows[0]

  // Always resolve successfully to prevent email enumeration
  if (!user) return

  const resetToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  )

  const resetUrl = `${APP_URL()}/reset-password?token=${resetToken}`
  const emailHtml = passwordResetEmailTemplate({ name: user.name, resetUrl })

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - Easy Memoir',
    html: emailHtml
  })
}

/**
 * Complete a password reset using the token from the email link.
 *
 * @param {object} db
 * @param {string} token   - raw token from URL
 * @param {string} newPassword  - plaintext
 */
export async function resetPassword(db, token, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const result = await db.query(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash]
  )

  const row = result.rows[0]
  if (!row) {
    const err = new Error('Invalid or expired reset token')
    err.statusCode = 400
    throw err
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id])

  await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [
    tokenHash
  ])

  await blacklistAllUserTokens(row.user_id)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function sendVerificationEmail(db, user) {
  const verifyToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  )

  const verifyUrl = `${APP_URL()}/verify-email?token=${verifyToken}`
  const emailHtml = emailVerificationTemplate({ name: user.name, verifyUrl })

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - Easy Memoir',
    html: emailHtml
  })
}

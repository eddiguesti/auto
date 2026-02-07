import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { generateToken, authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { initializeGameState } from '../utils/gameStateManager.js'
import validate from '../middleware/validate.js'
import { authSchemas } from '../schemas/index.js'
import { authLogger } from '../utils/logger.js'
import { sendEmail, passwordResetEmailTemplate } from '../services/emailService.js'

const router = Router()

// Initialize Google client from environment variable
const googleClientId = process.env.GOOGLE_CLIENT_ID
let googleClient = null

function getGoogleClient() {
  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID not configured')
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(googleClientId)
  }
  return googleClient
}

// Email/Password Registration
router.post(
  '/register',
  requireDb,
  validate(authSchemas.register),
  asyncHandler(async (req, res) => {
    const { email, password, name, birthYear, _hp, _ts } = req.validatedBody
    const db = req.app.locals.db

    // Bot protection: reject if honeypot field is filled
    if (_hp && _hp.length > 0) {
      authLogger.warn('Registration rejected - honeypot filled', { email, requestId: req.id })
      return res.status(400).json({ error: 'Registration failed' })
    }

    // Bot protection: reject if form submitted too quickly (< 2 seconds)
    if (_ts) {
      const timeOnPage = Date.now() - _ts
      if (timeOnPage < 2000) {
        authLogger.warn('Registration rejected - too fast', {
          email,
          timeOnPage,
          requestId: req.id
        })
        return res.status(400).json({ error: 'Please take your time filling out the form' })
      }
      // Also reject if timestamp is from the future or too old (> 1 hour)
      if (timeOnPage < 0 || timeOnPage > 3600000) {
        authLogger.warn('Registration rejected - invalid timestamp', {
          email,
          timeOnPage,
          requestId: req.id
        })
        return res.status(400).json({ error: 'Registration failed' })
      }
    }

    try {
      // Check if email exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' })
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const result = await db.query(
        `
      INSERT INTO users (email, password_hash, name, birth_year)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, birth_year, avatar_url
    `,
        [email, passwordHash, name, birthYear || null]
      )

      const user = result.rows[0]

      // Initialize game state for new user
      await initializeGameState(user.id)

      const token = generateToken(user)

      res.status(201).json({ user, token })
    } catch (err) {
      authLogger.error('Registration failed', { error: err.message, email, requestId: req.id })
      res.status(500).json({ error: 'Registration failed' })
    }
  })
)

// Email/Password Login
router.post(
  '/login',
  requireDb,
  validate(authSchemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody
    const db = req.app.locals.db

    try {
      const result = await db.query(
        'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const user = result.rows[0]

      if (!user.password_hash) {
        return res.status(401).json({ error: 'Please use Google Sign-In for this account' })
      }

      const validPassword = await bcrypt.compare(password, user.password_hash)
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const token = generateToken(user)
      res.json({
        user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        token
      })
    } catch (err) {
      authLogger.error('Login failed', { error: err.message, email, requestId: req.id })
      res.status(500).json({ error: 'Login failed' })
    }
  })
)

// Google Sign-In
router.post(
  '/google',
  validate(authSchemas.googleAuth),
  requireDb,
  asyncHandler(async (req, res) => {
    const { credential } = req.validatedBody
    const db = req.app.locals.db

    authLogger.info('Google auth attempt', {
      requestId: req.id,
      credentialLength: credential?.length,
      hasGoogleClientId: !!googleClientId
    })

    // Get Google client (validates configuration)
    let client
    try {
      client = getGoogleClient()
    } catch (err) {
      authLogger.error('Google client error', { error: err.message, requestId: req.id })
      throw err
    }

    // Verify Google token
    let ticket
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId
      })
    } catch (err) {
      authLogger.error('Google token verification failed', {
        error: err.message,
        requestId: req.id,
        googleClientId: googleClientId?.substring(0, 20) + '...'
      })
      throw err
    }
    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    // Check if user exists by google_id first, then email
    let result = await db.query(
      'SELECT id, email, name, avatar_url, google_id FROM users WHERE google_id = $1',
      [googleId]
    )

    let user
    if (result.rows.length > 0) {
      // Existing Google user — update avatar
      user = result.rows[0]
      await db.query(
        `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [picture, user.id]
      )
      user.avatar_url = picture
    } else {
      // Check if email exists without google_id (email/password account)
      const emailResult = await db.query(
        'SELECT id, email, name, avatar_url, google_id FROM users WHERE email = $1',
        [email]
      )

      if (emailResult.rows.length > 0 && !emailResult.rows[0].google_id) {
        // Link Google to existing email account — safe because Google verified the email
        user = emailResult.rows[0]
        await db.query(
          `UPDATE users SET google_id = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [googleId, picture, user.id]
        )
        user.avatar_url = picture
      } else if (emailResult.rows.length > 0) {
        // Email exists with different google_id — reject to prevent takeover
        return res
          .status(409)
          .json({ error: 'This email is already linked to a different Google account' })
      } else {
        // Create new user
        result = await db.query(
          `INSERT INTO users (email, google_id, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name, avatar_url`,
          [email, googleId, name, picture]
        )
        user = result.rows[0]

        // Initialize game state for new user
        await initializeGameState(user.id)
      }
    }

    const token = generateToken(user)
    res.json({ user, token })
  })
)

// Logout - server-side session tracking
// Note: JWTs are stateless, so this endpoint:
// 1. Logs the logout event for audit trail
// 2. Returns success so client clears token
// For full token invalidation, implement a Redis token blacklist
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    authLogger.info('User logged out', { userId: req.user.id, requestId: req.id })
    res.json({ success: true, message: 'Logged out successfully' })
  })
)

// Get current user
router.get(
  '/me',
  authenticateToken,
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db

    const result = await db.query(
      'SELECT id, email, name, birth_year, avatar_url, premium_until FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    user.isPremium = user.premium_until && new Date(user.premium_until) > new Date()
    res.json({ user })
  })
)

// Update profile (for adding birth year after Google sign-in)
router.put(
  '/profile',
  authenticateToken,
  requireDb,
  validate(authSchemas.updateProfile),
  asyncHandler(async (req, res) => {
    const { name, birthYear } = req.validatedBody || {}
    const db = req.app.locals.db

    try {
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

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(req.user.id)

      const result = await db.query(
        `
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, birth_year, avatar_url
    `,
        values
      )

      res.json({ user: result.rows[0] })
    } catch (err) {
      authLogger.error('Profile update failed', {
        error: err.message,
        userId: req.user.id,
        requestId: req.id
      })
      res.status(500).json({ error: 'Failed to update profile' })
    }
  })
)

// ============================================================================
// PASSWORD RESET FLOW
// ============================================================================

/**
 * POST /forgot-password
 * Request a password reset email
 */
router.post(
  '/forgot-password',
  requireDb,
  asyncHandler(async (req, res) => {
    const { email } = req.body
    const db = req.app.locals.db

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Always return success to prevent email enumeration attacks
    const successResponse = {
      success: true,
      message:
        'If an account exists with that email, you will receive a password reset link shortly.'
    }

    try {
      // Find user by email
      const userResult = await db.query(
        'SELECT id, name, email, password_hash FROM users WHERE email = $1',
        [normalizedEmail]
      )

      if (userResult.rows.length === 0) {
        // User not found - still return success to prevent enumeration
        authLogger.info('Password reset requested for non-existent email', {
          email: normalizedEmail,
          requestId: req.id
        })
        return res.json(successResponse)
      }

      const user = userResult.rows[0]

      // Check if user has a password (not Google-only account)
      if (!user.password_hash) {
        // Google-only account - send different message but still generic response
        authLogger.info('Password reset requested for Google-only account', {
          email: normalizedEmail,
          requestId: req.id
        })
        return res.json(successResponse)
      }

      // Invalidate any existing unused tokens for this user
      await db.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      )

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store token hash (never store raw token)
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      )

      // Generate reset URL
      const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
      const resetUrl = `${appUrl}/reset-password?token=${token}`

      // Send email
      const emailHtml = passwordResetEmailTemplate({
        name: user.name,
        resetUrl
      })

      await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - Easy Memoir',
        html: emailHtml
      })

      authLogger.info('Password reset email sent', {
        userId: user.id,
        email: normalizedEmail,
        requestId: req.id
      })
      res.json(successResponse)
    } catch (err) {
      authLogger.error('Password reset request failed', {
        error: err.message,
        email: normalizedEmail,
        requestId: req.id
      })
      // Still return success to prevent timing attacks
      res.json(successResponse)
    }
  })
)

/**
 * POST /reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  requireDb,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body
    const db = req.app.locals.db

    // Validate input
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' })
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'New password is required' })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain a lowercase letter' })
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain an uppercase letter' })
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain a number' })
    }

    try {
      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Find valid token
      const tokenResult = await db.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, u.email
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token_hash = $1
           AND prt.used_at IS NULL
           AND prt.expires_at > NOW()`,
        [tokenHash]
      )

      if (tokenResult.rows.length === 0) {
        authLogger.warn('Invalid or expired password reset token used', { requestId: req.id })
        return res
          .status(400)
          .json({ error: 'Invalid or expired reset link. Please request a new one.' })
      }

      const resetToken = tokenResult.rows[0]

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12)

      // Update user password
      await db.query(
        `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [passwordHash, resetToken.user_id]
      )

      // Mark token as used
      await db.query(`UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`, [
        resetToken.id
      ])

      authLogger.info('Password reset successful', {
        userId: resetToken.user_id,
        email: resetToken.email,
        requestId: req.id
      })

      res.json({
        success: true,
        message:
          'Your password has been reset successfully. You can now sign in with your new password.'
      })
    } catch (err) {
      authLogger.error('Password reset failed', { error: err.message, requestId: req.id })
      res.status(500).json({ error: 'Failed to reset password. Please try again.' })
    }
  })
)

/**
 * GET /verify-reset-token
 * Verify if a reset token is valid (for frontend to check before showing form)
 */
router.get(
  '/verify-reset-token',
  requireDb,
  asyncHandler(async (req, res) => {
    const { token } = req.query
    const db = req.app.locals.db

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, error: 'Token is required' })
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      const result = await db.query(
        `SELECT id FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()`,
        [tokenHash]
      )

      res.json({ valid: result.rows.length > 0 })
    } catch (err) {
      authLogger.error('Token verification failed', { error: err.message, requestId: req.id })
      res.json({ valid: false })
    }
  })
)

export default router

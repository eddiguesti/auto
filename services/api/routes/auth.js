import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { generateToken, authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { initializeGameState } from '../utils/gameStateManager.js'
import validate from '../middleware/validate.js'
import { authSchemas } from '../schemas/index.js'
import { authLogger } from '../utils/logger.js'

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
router.post('/register', requireDb, validate(authSchemas.register), async (req, res) => {
  const { email, password, name, birthYear } = req.validatedBody
  const db = req.app.locals.db

  try {
    // Check if email exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, name, birth_year)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, birth_year, avatar_url
    `, [email, passwordHash, name, birthYear || null])

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

// Email/Password Login
router.post('/login', requireDb, validate(authSchemas.login), async (req, res) => {
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

// Google Sign-In
router.post('/google', validate(authSchemas.googleAuth), requireDb, asyncHandler(async (req, res) => {
  const { credential } = req.validatedBody
  const db = req.app.locals.db

  // Get Google client (validates configuration)
  const client = getGoogleClient()

  // Verify Google token
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: googleClientId
  })
  const payload = ticket.getPayload()
  const { sub: googleId, email, name, picture } = payload

  // Check if user exists by google_id or email
  let result = await db.query(
    'SELECT id, email, name, avatar_url FROM users WHERE google_id = $1 OR email = $2',
    [googleId, email]
  )

  let user
  if (result.rows.length > 0) {
    // Update existing user with Google ID if needed
    user = result.rows[0]
    await db.query(`
      UPDATE users SET google_id = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [googleId, picture, user.id])
    user.avatar_url = picture
  } else {
    // Create new user
    result = await db.query(`
      INSERT INTO users (email, google_id, name, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, avatar_url
    `, [email, googleId, name, picture])
    user = result.rows[0]

    // Initialize game state for new user
    await initializeGameState(user.id)
  }

  const token = generateToken(user)
  res.json({ user, token })
}))

// Logout - server-side session tracking
// Note: JWTs are stateless, so this endpoint:
// 1. Logs the logout event for audit trail
// 2. Returns success so client clears token
// For full token invalidation, implement a Redis token blacklist
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  authLogger.info('User logged out', { userId: req.user.id, requestId: req.id })
  res.json({ success: true, message: 'Logged out successfully' })
}))

// Get current user
router.get('/me', authenticateToken, requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db

  const result = await db.query(
    'SELECT id, email, name, birth_year, avatar_url FROM users WHERE id = $1',
    [req.user.id]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user: result.rows[0] })
}))

// Update profile (for adding birth year after Google sign-in)
router.put('/profile', authenticateToken, requireDb, validate(authSchemas.updateProfile), async (req, res) => {
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

    const result = await db.query(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, birth_year, avatar_url
    `, values)

    res.json({ user: result.rows[0] })
  } catch (err) {
    authLogger.error('Profile update failed', { error: err.message, userId: req.user.id, requestId: req.id })
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router

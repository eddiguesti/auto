import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { body, validationResult } from 'express-validator'
import { generateToken, authenticateToken } from '../middleware/auth.js'

const router = Router()

// Initialize Google client - fallback to production ID if env var has issues
const PROD_GOOGLE_CLIENT_ID = '965574659024-9s7hved45v1626q8ljh5h92h0gvhps6q.apps.googleusercontent.com'
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || PROD_GOOGLE_CLIENT_ID
const googleClient = new OAuth2Client(googleClientId)

// Email/Password Registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  const { email, password, name } = req.body
  const db = req.app.locals.db

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
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
    const result = await db.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, avatar_url
    `, [email, passwordHash, name])

    const user = result.rows[0]
    const token = generateToken(user)

    res.status(201).json({ user, token })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Email/Password Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid email or password' })
  }

  const { email, password } = req.body
  const db = req.app.locals.db

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

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
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Google Sign-In
router.post('/google', async (req, res) => {
  const { credential } = req.body
  const db = req.app.locals.db

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }


  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
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
    }

    const token = generateToken(user)
    res.json({ user, token })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(401).json({ error: 'Google authentication failed' })
  }
})

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  const db = req.app.locals.db

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    const result = await db.query(
      'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

export default router

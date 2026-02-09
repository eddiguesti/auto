import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('magic-link')

/**
 * GET /api/magic/:token
 * Public endpoint - validates a magic link token and returns a scoped JWT + prompt
 * Used by the /talk/:token frontend page for no-login voice sessions
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params
    const db = req.app.locals.db

    if (!token || token.length < 32) {
      return res.status(400).json({ error: 'Invalid link' })
    }

    // Hash the token to compare against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid, unused, non-expired token
    const result = await db.query(
      `SELECT est.*, u.email, u.name, u.id as user_id
       FROM email_session_tokens est
       JOIN users u ON est.user_id = u.id
       WHERE est.token_hash = $1
         AND est.used_at IS NULL
         AND est.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'This link has expired or already been used. Check your email for a new one.'
      })
    }

    const session = result.rows[0]

    // Generate a scoped JWT (shorter expiry, limited permissions)
    const secret = process.env.JWT_SECRET
    const scopedToken = jwt.sign(
      {
        id: session.user_id,
        email: session.email,
        scope: 'magic_link',
        session_token_id: session.id
      },
      secret,
      { expiresIn: '2h' }
    )

    // Mark as used
    await db.query(`UPDATE email_session_tokens SET used_at = NOW() WHERE id = $1`, [session.id])

    logger.info(`Magic link used by user ${session.user_id}`)

    res.json({
      token: scopedToken,
      user: {
        name: session.name,
        id: session.user_id
      },
      prompt: {
        text: session.prompt_text,
        chapter_id: session.prompt_chapter_id,
        question_id: session.prompt_question_id
      }
    })
  } catch (err) {
    logger.error('Magic link validation failed:', { error: err.message })
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

/**
 * POST /api/magic/:token/session
 * Creates a voice session for the magic link user (uses the scoped JWT from the GET above)
 * Called by the frontend after validating the magic link
 */
router.post('/:token/session', async (req, res) => {
  try {
    // Verify the scoped JWT from Authorization header
    const authHeader = req.headers['authorization']
    const jwtToken = authHeader && authHeader.split(' ')[1]

    if (!jwtToken) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const secret = process.env.JWT_SECRET
    let decoded
    try {
      decoded = jwt.verify(jwtToken, secret)
    } catch {
      return res
        .status(403)
        .json({ error: 'Session expired. Please use the link from your email again.' })
    }

    if (decoded.scope !== 'magic_link') {
      return res.status(403).json({ error: 'Invalid session type' })
    }

    const { chapterId } = req.body
    const db = req.app.locals.db

    // Create xAI Realtime session
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Voice service not configured' })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 } // 10 minute token for seniors (longer than normal)
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      logger.error('xAI session error:', { error })
      return res.status(response.status).json({ error: 'Failed to start voice session' })
    }

    const data = await response.json()

    // Create or get voice session in DB
    let voiceSession
    if (chapterId) {
      const existing = await db.query(
        `SELECT * FROM voice_sessions
         WHERE user_id = $1 AND chapter_id = $2 AND session_status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [decoded.id, chapterId]
      )

      if (existing.rows.length > 0) {
        voiceSession = existing.rows[0]
      } else {
        const created = await db.query(
          `INSERT INTO voice_sessions (user_id, chapter_id, session_status)
           VALUES ($1, $2, 'active')
           RETURNING *`,
          [decoded.id, chapterId]
        )
        voiceSession = created.rows[0]
      }
    }

    res.json({
      ...data,
      session_id: voiceSession?.id,
      questions_answered: voiceSession?.questions_answered || []
    })
  } catch (err) {
    logger.error('Magic link session creation failed:', { error: err.message })
    res.status(500).json({ error: 'Could not start voice session' })
  }
})

export default router

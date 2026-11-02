import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { reserveAIUsage } from '../middleware/aiQuota.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'
import { ConfigurationError, ExternalServiceError } from '../utils/errors.js'

const router = Router()
const logger = createLogger('magic-link')

/**
 * GET /api/magic/:token
 * Public endpoint - validates a magic link token and returns a scoped JWT + prompt
 * Used by the /talk/:token frontend page for no-login voice sessions
 */
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params
    const db = req.app.locals.db

    if (!token || token.length < 32) {
      return res.status(400).json({ error: 'Invalid link' })
    }

    const secret = process.env.JWT_SECRET
    if (!secret || secret.length < 32 || /CHANGE_ME/i.test(secret))
      throw new ConfigurationError('JWT_SECRET')

    // Hash the token to compare against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid, unused, non-expired token
    const result = await db.query(
      `UPDATE email_session_tokens est SET used_at = NOW()
     FROM users u WHERE est.user_id = u.id AND u.deleted_at IS NULL AND est.token_hash = $1
       AND est.used_at IS NULL AND est.expires_at > NOW()
     RETURNING est.*, u.email, u.name, u.id as user_id`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'This link has expired or already been used. Check your email for a new one.'
      })
    }

    const session = result.rows[0]

    // Generate a scoped JWT (shorter expiry, limited permissions)
    const scopedToken = jwt.sign(
      {
        id: session.user_id,
        email: session.email,
        scope: 'magic_link',
        jti: crypto.randomUUID(),
        session_token_id: session.id
      },
      secret,
      { expiresIn: '2h' }
    )

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
  })
)

/**
 * POST /api/magic/:token/session
 * Creates a voice session for the magic link user (uses the scoped JWT from the GET above)
 * Called by the frontend after validating the magic link
 */
router.post(
  '/:token/session',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const decoded = req.user
    if (decoded.scope !== 'magic_link')
      return res.status(403).json({ error: 'Invalid session type' })
    const { chapterId } = req.body
    const db = req.app.locals.db
    const link = await db.query(
      `SELECT id FROM email_session_tokens WHERE id = $1 AND user_id = $2 AND token_hash = $3
       AND used_at IS NOT NULL AND expires_at > NOW()`,
      [
        decoded.session_token_id,
        decoded.id,
        crypto.createHash('sha256').update(req.params.token).digest('hex')
      ]
    )
    if (!link.rows[0]) return res.status(403).json({ error: 'Invalid session link' })

    // Create xAI Realtime session
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      throw new ConfigurationError('GROK_API_KEY')
    }

    await reserveAIUsage(db, decoded.id)
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 } // 10 minute token for seniors (longer than normal)
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      logger.error('xAI session error', { status: response.status, requestId: req.id })
      throw new ExternalServiceError('xAI Realtime API')
    }

    const data = await response.json()

    // Create or get voice session in DB
    let voiceSession
    if (chapterId) {
      const existing = await db.query(
        `SELECT id, user_id, chapter_id, session_status, questions_answered, current_question_id,
              questions_since_compile, session_transcripts, started_at, ended_at,
              last_compile_at, created_at, updated_at
       FROM voice_sessions
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
  })
)

export default router

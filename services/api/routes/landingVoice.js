import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ConfigurationError } from '../utils/errors.js'
import { createVoiceTicket } from '../utils/voiceProxy.js'

const router = Router()

/**
 * POST /api/landing-voice/session
 * Create a one-time voice proxy ticket for landing page voice demo.
 * Public endpoint — rate limited at the mount level in index.js.
 */
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      throw new ConfigurationError('GROK_API_KEY')
    }

    const ticket = createVoiceTicket()
    res.json({ ticket })
  })
)

export default router

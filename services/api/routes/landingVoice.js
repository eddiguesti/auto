import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'
import { ConfigurationError, ExternalServiceError } from '../utils/errors.js'

const router = Router()
const logger = createLogger('landing-voice')

/**
 * POST /api/landing-voice/session
 * Create ephemeral xAI Realtime API token for landing page voice demo.
 * Public endpoint — rate limited at the mount level in index.js.
 */
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      throw new ConfigurationError('GROK_API_KEY')
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
        expires_after: { seconds: 300 } // 5 minute token
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      logger.error('xAI session error', { status: response.status, requestId: req.id })
      throw new ExternalServiceError('xAI Realtime API')
    }

    const data = await response.json()
    res.json(data)
  })
)

export default router

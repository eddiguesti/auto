import { Router } from 'express'
import { TelnyxCallBridge, getBridge } from '../services/telnyxCallBridge.js'
import { createLogger } from '../utils/logger.js'
import { authenticateToken } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ConfigurationError, ExternalServiceError } from '../utils/errors.js'

const router = Router()
const logger = createLogger('telnyx-call')

/**
 * POST /api/telnyx/request-call
 * User-initiated outbound call. Requires JWT authentication.
 */
router.post(
  '/request-call',
  authenticateToken,
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { phoneNumber } = req.body

    if (!phoneNumber || !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
      return res
        .status(400)
        .json({ error: 'Valid phone number with country code required (e.g. +447700900000)' })
    }

    // Rate limit: max 3 calls per hour per user
    const recentCalls = await db.query(
      `SELECT COUNT(*) as count FROM telnyx_calls
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    )
    if (parseInt(recentCalls.rows[0].count) >= 3) {
      return res.status(429).json({ error: 'Maximum 3 calls per hour. Please try again later.' })
    }

    // Save/update phone number and consent
    await db.query(
      `UPDATE users SET
         phone_number = $2,
         phone_call_consent = true,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, phoneNumber]
    )

    const apiKey = process.env.TELNYX_API_KEY
    const connectionId = process.env.TELNYX_CONNECTION_ID
    const fromNumber = process.env.TELNYX_PHONE_NUMBER

    if (!apiKey || !connectionId || !fromNumber) {
      throw new ConfigurationError('Telnyx')
    }

    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const wsUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: connectionId,
        to: phoneNumber,
        from: fromNumber,
        stream_url: `${wsUrl}/api/telnyx/media-stream`,
        stream_bidirectional_mode: 'mp',
        stream_bidirectional_codec: 'L16',
        stream_track: 'both_tracks',
        webhook_url: `${appUrl}/api/telnyx/webhook`,
        client_state: Buffer.from(
          JSON.stringify({
            userId,
            prompt: { text: 'Free conversation — let the user share any memory or story they like' }
          })
        ).toString('base64')
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      logger.error('User call initiation failed', { userId, status: response.status, error })
      throw new ExternalServiceError('Telnyx')
    }

    const data = await response.json()
    const callControlId = data.data?.call_control_id

    await db.query(
      `INSERT INTO telnyx_calls (user_id, call_control_id, call_status, prompt_text)
       VALUES ($1, $2, 'initiated', 'User-requested call')`,
      [userId, callControlId]
    )

    logger.info('User-initiated call', {
      userId,
      callControlId,
      phoneNumber: phoneNumber.substring(0, 6) + '...'
    })

    res.json({
      success: true,
      call_control_id: callControlId,
      message: "We're calling you now! Pick up to start sharing your story."
    })
  })
)

/**
 * POST /api/telnyx/call
 * Initiate an outbound phone call to a user.
 * Protected by internal secret (called from cron or admin, not from frontend).
 */
router.post(
  '/call',
  asyncHandler(async (req, res) => {
    // Verify internal auth - reject if secret is not configured or doesn't match
    const expectedSecret = process.env.INTERNAL_CRON_SECRET
    if (
      !expectedSecret ||
      !req.headers['x-internal-secret'] ||
      req.headers['x-internal-secret'] !== expectedSecret
    ) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { userId, phoneNumber, prompt } = req.body
    const db = req.app.locals.db

    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'Missing userId or phoneNumber' })
    }

    const apiKey = process.env.TELNYX_API_KEY
    const connectionId = process.env.TELNYX_CONNECTION_ID
    const fromNumber = process.env.TELNYX_PHONE_NUMBER

    if (!apiKey || !connectionId || !fromNumber) {
      throw new ConfigurationError('Telnyx')
    }

    // Build the WebSocket URL for media streaming
    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const wsUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://')

    // Initiate the call via Telnyx Call Control API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: connectionId,
        to: phoneNumber,
        from: fromNumber,
        stream_url: `${wsUrl}/api/telnyx/media-stream`,
        stream_bidirectional_mode: 'mp',
        stream_bidirectional_codec: 'L16',
        stream_track: 'both_tracks',
        webhook_url: `${appUrl}/api/telnyx/webhook`,
        client_state: Buffer.from(
          JSON.stringify({
            userId,
            prompt
          })
        ).toString('base64')
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      logger.error('Telnyx call initiation failed', { status: response.status, error })
      throw new ExternalServiceError('Telnyx')
    }

    const data = await response.json()
    const callControlId = data.data?.call_control_id

    // Record the call in our database
    if (db) {
      await db.query(
        `INSERT INTO telnyx_calls (user_id, call_control_id, call_status, prompt_text, prompt_chapter_id, prompt_question_id)
       VALUES ($1, $2, 'initiated', $3, $4, $5)`,
        [userId, callControlId, prompt?.text, prompt?.chapter_id, prompt?.question_id]
      )
    }

    logger.info('Call initiated', {
      userId,
      callControlId,
      phoneNumber: phoneNumber.substring(0, 6) + '...'
    })

    res.json({
      success: true,
      call_control_id: callControlId
    })
  })
)

/**
 * POST /api/telnyx/webhook
 * Telnyx call event webhooks (answered, hangup, etc.)
 */
router.post('/webhook', async (req, res) => {
  // Verify Telnyx webhook signature headers are present
  const sigHeader = req.headers['telnyx-signature-ed25519']
  const timestamp = req.headers['telnyx-timestamp']

  if (!sigHeader || !timestamp) {
    logger.warn('Telnyx webhook rejected — missing signature headers')
    return res.status(400).json({ error: 'Missing signature headers' })
  }

  // Always respond 200 quickly to Telnyx
  res.status(200).json({ ok: true })

  try {
    const event = req.body?.data
    if (!event) return

    const eventType = event.event_type
    const callControlId = event.payload?.call_control_id
    const db = req.app.locals.db

    logger.info('Telnyx webhook', { eventType, callControlId })

    switch (eventType) {
      case 'call.initiated':
        if (db) {
          await db.query(
            `UPDATE telnyx_calls SET call_status = 'initiated', updated_at = NOW() WHERE call_control_id = $1`,
            [callControlId]
          )
        }
        break

      case 'call.answered':
        if (db) {
          await db.query(
            `UPDATE telnyx_calls SET call_status = 'answered', answered_at = NOW(), updated_at = NOW() WHERE call_control_id = $1`,
            [callControlId]
          )
        }
        break

      case 'call.hangup': {
        if (db) {
          await db.query(
            `UPDATE telnyx_calls SET call_status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE call_control_id = $1`,
            [callControlId]
          )
        }

        // Clean up bridge if still active
        const bridge = getBridge(callControlId)
        if (bridge) {
          bridge.handleCallEnd()
        }
        break
      }

      case 'streaming.started': {
        const streamId = event.payload?.stream_id
        if (db) {
          await db.query(
            `UPDATE telnyx_calls SET stream_id = $1, call_status = 'streaming', updated_at = NOW() WHERE call_control_id = $2`,
            [streamId, callControlId]
          )
        }
        break
      }

      case 'streaming.stopped':
        // Streaming ended, bridge cleanup handled by WebSocket close
        break

      case 'call.machine.detection.ended':
        // If answering machine detected, hang up
        if (event.payload?.result === 'machine') {
          logger.info('Answering machine detected, hanging up', { callControlId })
          const apiKey = process.env.TELNYX_API_KEY
          await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          }).catch(err => logger.error('Hangup failed', { error: err.message }))

          if (db) {
            await db.query(
              `UPDATE telnyx_calls SET call_status = 'machine_detected', ended_at = NOW(), updated_at = NOW() WHERE call_control_id = $1`,
              [callControlId]
            )
          }
        }
        break
    }
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message })
  }
})

/**
 * Handle Telnyx media stream WebSocket upgrade.
 * Called from the WebSocket server in index.js — not a normal HTTP route.
 *
 * @param {WebSocket} ws - The Telnyx WebSocket connection
 * @param {object} db - Database pool
 */
export async function handleTelnyxMediaStream(ws, db) {
  logger.info('Telnyx media stream WebSocket connected')

  // Wait for the 'start' event to get the call_control_id from client_state
  const startTimeout = setTimeout(() => {
    logger.error('Telnyx stream start timeout')
    ws.close()
  }, 15000)

  ws.once('message', async data => {
    clearTimeout(startTimeout)

    try {
      const msg = JSON.parse(data)

      if (msg.event === 'connected') {
        // Wait for the actual 'start' event with metadata
        ws.once('message', async startData => {
          try {
            const startMsg = JSON.parse(startData)
            await initBridge(startMsg, ws, db)
          } catch (err) {
            logger.error('Failed to init bridge on start', { error: err.message })
            ws.close()
          }
        })
      } else if (msg.event === 'start') {
        // Sometimes start comes directly
        await initBridge(msg, ws, db)
      } else {
        logger.warn('Unexpected first message', { event: msg.event })
        ws.close()
      }
    } catch (err) {
      logger.error('Failed to parse first message', { error: err.message })
      ws.close()
    }
  })
}

/**
 * Initialize the bridge from a Telnyx 'start' event
 */
async function initBridge(startMsg, ws, db) {
  const callControlId = startMsg.start?.call_control_id
  const streamId = startMsg.stream_id

  if (!callControlId) {
    logger.error('No call_control_id in start message')
    ws.close()
    return
  }

  // Decode client_state to get userId and prompt
  let clientState = {}
  try {
    const stateStr = startMsg.start?.client_state
    if (stateStr) {
      clientState = JSON.parse(Buffer.from(stateStr, 'base64').toString())
    }
  } catch {
    // Try to look up from DB
  }

  // If we don't have client state from the message, look it up from our DB
  let userId = clientState.userId
  let prompt = clientState.prompt

  if (!userId && db) {
    const callRecord = await db.query(
      `SELECT user_id, prompt_text, prompt_chapter_id, prompt_question_id FROM telnyx_calls WHERE call_control_id = $1`,
      [callControlId]
    )
    if (callRecord.rows[0]) {
      userId = callRecord.rows[0].user_id
      prompt = {
        text: callRecord.rows[0].prompt_text,
        chapter_id: callRecord.rows[0].prompt_chapter_id,
        question_id: callRecord.rows[0].prompt_question_id
      }
    }
  }

  if (!userId) {
    logger.error('Could not determine userId for call', { callControlId })
    ws.close()
    return
  }

  logger.info('Starting bridge', { callControlId, streamId, userId })

  const bridge = new TelnyxCallBridge({
    callId: callControlId,
    userId,
    prompt,
    db
  })

  bridge.streamId = streamId
  await bridge.start(ws)
}

export default router

import { Router, raw } from 'express'
import { TelnyxCallBridge, getBridge } from '../services/telnyxCallBridge.js'
import { createLogger } from '../utils/logger.js'
import { authenticateToken, requireScope } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { reserveAIUsage } from '../middleware/aiQuota.js'
import { ConfigurationError, ExternalServiceError } from '../utils/errors.js'

import {
  createTelnyxStreamToken,
  verifyTelnyxWebhook,
  secretMatches
} from '../utils/telnyxSecurity.js'

const router = Router()
const logger = createLogger('telnyx-call')

/**
 * POST /api/telnyx/request-call
 * User-initiated outbound call. Requires JWT authentication.
 */
router.post(
  '/request-call',
  authenticateToken,
  requireScope(),
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

    if (!apiKey || !connectionId || !fromNumber || !process.env.GROK_API_KEY) {
      throw new ConfigurationError('Telnyx')
    }

    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const wsUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    const stream = createTelnyxStreamToken(userId)

    await reserveAIUsage(db, Number(userId))
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
        stream_url: `${wsUrl}/api/telnyx/media-stream?token=${encodeURIComponent(stream.token)}`,
        stream_bidirectional_mode: 'mp',
        stream_bidirectional_codec: 'L16',
        stream_track: 'both_tracks',
        webhook_url: `${appUrl}/api/telnyx/webhook`,
        client_state: Buffer.from(
          JSON.stringify({
            userId,
            streamNonce: stream.nonce,
            prompt: { text: 'Free conversation — let the user share any memory or story they like' }
          })
        ).toString('base64')
      }),
      signal: AbortSignal.timeout(15000)
    })

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
    if (!secretMatches(req.headers['x-internal-secret'], process.env.INTERNAL_CRON_SECRET)) {
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

    if (!apiKey || !connectionId || !fromNumber || !process.env.GROK_API_KEY) {
      throw new ConfigurationError('Telnyx')
    }

    // Build the WebSocket URL for media streaming
    const appUrl = process.env.APP_URL || 'https://easymemoir.co.uk'
    const wsUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    const stream = createTelnyxStreamToken(userId)

    // Initiate the call via Telnyx Call Control API

    await reserveAIUsage(db, Number(userId))
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
        stream_url: `${wsUrl}/api/telnyx/media-stream?token=${encodeURIComponent(stream.token)}`,
        stream_bidirectional_mode: 'mp',
        stream_bidirectional_codec: 'L16',
        stream_track: 'both_tracks',
        webhook_url: `${appUrl}/api/telnyx/webhook`,
        client_state: Buffer.from(
          JSON.stringify({
            userId,
            streamNonce: stream.nonce,
            prompt
          })
        ).toString('base64')
      }),
      signal: AbortSignal.timeout(15000)
    })

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
router.post(
  '/webhook',
  raw({ type: 'application/json', limit: '1mb' }),
  asyncHandler(async (req, res) => {
    if (!process.env.TELNYX_PUBLIC_KEY)
      return res.status(503).json({ error: 'Phone webhook verification unavailable' })
    if (!verifyTelnyxWebhook(req.body, req.headers, process.env.TELNYX_PUBLIC_KEY))
      return res.status(400).json({ error: 'Invalid webhook signature or timestamp' })
    let event
    try {
      event = JSON.parse(req.body.toString('utf8')).data
    } catch {
      return res.status(400).json({ error: 'Invalid webhook body' })
    }
    if (
      !event ||
      typeof event.id !== 'string' ||
      event.id.length > 200 ||
      typeof event.event_type !== 'string' ||
      typeof event.payload?.call_control_id !== 'string'
    )
      return res.status(400).json({ error: 'Invalid call event' })
    const db = req.app.locals.db
    if (!db) return res.status(503).json({ error: 'Phone event storage unavailable' })
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM telnyx_webhook_events WHERE expires_at < NOW()')
      const claimed = await client.query(
        `INSERT INTO telnyx_webhook_events (event_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '1 day') ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [event.id]
      )
      if (!claimed.rows.length) {
        await client.query('COMMIT')
        return res.json({ ok: true })
      }
      const afterCommit = await processTelnyxEvent(event, client)
      await client.query('COMMIT')
      // Bridge writes use the main pool, after releasing this transaction's call-row lock.
      if (afterCommit) await afterCommit()
      return res.json({ ok: true })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })
)

export async function processTelnyxEvent(event, db) {
  const callControlId = event.payload.call_control_id
  const known = await db.query('SELECT user_id FROM telnyx_calls WHERE call_control_id = $1', [
    callControlId
  ])
  if (!known.rows[0]) return
  switch (event.event_type) {
    case 'call.initiated':
      await db.query(
        `UPDATE telnyx_calls SET call_status = 'initiated', updated_at = NOW()
        WHERE call_control_id = $1 AND call_status = 'initiated'`,
        [callControlId]
      )
      break
    case 'call.answered':
      await db.query(
        `UPDATE telnyx_calls SET call_status = 'answered', answered_at = NOW(), updated_at = NOW()
        WHERE call_control_id = $1 AND ended_at IS NULL`,
        [callControlId]
      )
      break
    case 'call.hangup':
      await db.query(
        `UPDATE telnyx_calls SET call_status = 'completed', ended_at = NOW(), updated_at = NOW()
        WHERE call_control_id = $1`,
        [callControlId]
      )
      return async () => {
        await getBridge(callControlId)?.handleCallEnd()
      }
    case 'streaming.started':
      await db.query(
        `UPDATE telnyx_calls SET stream_id = $1, call_status = 'streaming', updated_at = NOW()
        WHERE call_control_id = $2 AND ended_at IS NULL`,
        [event.payload.stream_id, callControlId]
      )
      break
    case 'call.machine.detection.ended':
      if (event.payload.result === 'machine') {
        const response = await fetch(
          `https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/hangup`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command_id: event.id }),
            signal: AbortSignal.timeout(5000)
          }
        )
        if (!response.ok) throw new ExternalServiceError('Telnyx')
        await db.query(
          `UPDATE telnyx_calls SET call_status = 'machine_detected', ended_at = NOW(), updated_at = NOW()
          WHERE call_control_id = $1`,
          [callControlId]
        )
      }
      break
  }
}

/**
 * Handle Telnyx media stream WebSocket upgrade.
 * Called from the WebSocket server in index.js — not a normal HTTP route.
 *
 * @param {WebSocket} ws - The Telnyx WebSocket connection
 * @param {object} db - Database pool
 */
export async function handleTelnyxMediaStream(ws, db, streamClaims) {
  logger.info('Telnyx media stream WebSocket connected')
  const durationLimit = setTimeout(() => {
    const close = () => ws.close(1000, 'Call interview time limit reached')
    const callId = ws.telnyxCallControlId
    if (!callId) return close()
    // Closing a media stream alone can leave the telephone call billable.
    void fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(callId)}/actions/hangup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command_id: streamClaims.nonce }),
      signal: AbortSignal.timeout(5000)
    })
      .catch(error => logger.error('Call duration-limit hangup failed', { error: error.message }))
      .finally(close)
  }, 30 * 60_000)
  durationLimit.unref?.()
  ws.once('close', () => clearTimeout(durationLimit))

  // Wait for the 'start' event to get the call_control_id from client_state
  const startTimeout = setTimeout(() => {
    logger.error('Telnyx stream start timeout')
    ws.close()
  }, 15000)

  ws.once('close', () => clearTimeout(startTimeout))
  ws.once('message', async data => {
    try {
      const msg = JSON.parse(data)

      if (msg.event === 'connected') {
        // Wait for the actual 'start' event with metadata
        ws.once('message', async startData => {
          try {
            const startMsg = JSON.parse(startData)
            clearTimeout(startTimeout)
            await initBridge(startMsg, ws, db, streamClaims)
          } catch (err) {
            logger.error('Failed to init bridge on start', { error: err.message })
            ws.close()
          }
        })
      } else if (msg.event === 'start') {
        // Sometimes start comes directly
        clearTimeout(startTimeout)
        await initBridge(msg, ws, db, streamClaims)
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
async function initBridge(startMsg, ws, db, streamClaims) {
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

  if (
    !db ||
    !streamClaims ||
    clientState.streamNonce !== streamClaims.nonce ||
    clientState.userId !== streamClaims.userId
  ) {
    ws.close(1008, 'Invalid call stream')
    return
  }
  // Do not trust stream-supplied user IDs or prompts: resolve ownership from the call record.
  const callRecord = await db.query(
    `SELECT user_id, prompt_text, prompt_chapter_id, prompt_question_id FROM telnyx_calls
     WHERE call_control_id = $1 AND user_id = $2 AND ended_at IS NULL`,
    [callControlId, streamClaims.userId]
  )
  const record = callRecord.rows[0]
  if (!record || getBridge(callControlId)) {
    ws.close(1008, 'Unknown or already active call')
    return
  }
  const userId = record.user_id
  const prompt = {
    text: record.prompt_text,
    chapter_id: record.prompt_chapter_id,
    question_id: record.prompt_question_id
  }

  ws.telnyxCallControlId = callControlId
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

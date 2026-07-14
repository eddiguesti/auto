/**
 * Voice WebSocket proxy — bridges browser WebSocket connections to xAI Realtime API.
 *
 * Browser cannot set Authorization headers on WebSocket connections, but Node.js can.
 * This proxy:
 *   1. Accepts a browser WS connection authenticated via JWT query param
 *   2. Opens a server-side WS to xAI with the GROK_API_KEY in the Authorization header
 *   3. Forwards all messages bidirectionally
 *
 * IMPORTANT: The browser connects to the proxy instantly (same server), but the proxy's
 * connection to xAI takes time. Messages from the browser are queued until xAI is ready.
 */

import { WebSocket } from 'ws'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { createLogger } from './logger.js'
import { isTokenBlacklisted, isUserTokenBlacklisted } from './tokenBlacklist.js'

const logger = createLogger('voice-proxy')

// One-time tickets for unauthenticated voice (landing page demos)
const voiceTickets = new Map()
const TICKET_TTL_MS = 60_000
const MAX_PENDING_MESSAGES = 32
const MAX_PENDING_BYTES = 2 * 1024 * 1024
const MAX_SESSION_MS = 15 * 60 * 1000
const FREE_DAILY_AI_LIMIT = 10

/**
 * Create a single-use voice ticket for public (no JWT) voice connections.
 * Tickets expire after 60 seconds and are consumed on first use.
 */
export function createVoiceTicket() {
  const ticket = crypto.randomBytes(32).toString('hex')
  voiceTickets.set(ticket, Date.now() + TICKET_TTL_MS)
  // Cleanup expired tickets periodically
  if (voiceTickets.size > 50) {
    const now = Date.now()
    for (const [k, exp] of voiceTickets) {
      if (exp < now) voiceTickets.delete(k)
    }
  }
  return ticket
}

/**
 * Handle an authenticated voice proxy WebSocket connection.
 * @param {WebSocket} browserWs - The browser's WebSocket connection
 * @param {import('http').IncomingMessage} req - The upgrade HTTP request
 */
export async function handleVoiceProxy(browserWs, req, db) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const userToken = url.searchParams.get('token')
  const ticket = url.searchParams.get('ticket')

  // Authenticate via JWT or one-time ticket
  let userId = 'anonymous'
  if (userToken) {
    let decoded
    try {
      decoded = jwt.verify(userToken, process.env.JWT_SECRET)
    } catch {
      browserWs.close(1008, 'Unauthorized')
      return
    }

    try {
      if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
        browserWs.close(1008, 'Token revoked')
        return
      }
      if (decoded.iat && (await isUserTokenBlacklisted(decoded.id, decoded.iat))) {
        browserWs.close(1008, 'Token revoked')
        return
      }

      const userResult = await db.query(
        'SELECT id, premium_until FROM users WHERE id = $1 AND deleted_at IS NULL',
        [decoded.id]
      )
      if (userResult.rows.length === 0) {
        browserWs.close(1008, 'Unauthorized')
        return
      }

      const premiumUntil = userResult.rows[0].premium_until
      const isPremium = premiumUntil && new Date(premiumUntil) > new Date()
      if (!isPremium) {
        const usage = await db.query(
          `INSERT INTO ai_usage (user_id, date, request_count)
           VALUES ($1, CURRENT_DATE, 1)
           ON CONFLICT (user_id, date)
           DO UPDATE SET request_count = ai_usage.request_count + 1, updated_at = NOW()
           RETURNING request_count`,
          [decoded.id]
        )
        if (usage.rows[0].request_count > FREE_DAILY_AI_LIMIT) {
          browserWs.close(1008, 'Daily AI limit reached')
          return
        }
      }

      userId = decoded.id
    } catch (error) {
      logger.error('Voice authorization store unavailable', { error: error.message })
      browserWs.close(1013, 'Authentication temporarily unavailable')
      return
    }
  } else if (ticket) {
    const expiry = voiceTickets.get(ticket)
    if (!expiry || expiry < Date.now()) {
      voiceTickets.delete(ticket)
      browserWs.close(1008, 'Invalid or expired ticket')
      return
    }
    voiceTickets.delete(ticket) // single-use
  } else {
    browserWs.close(1008, 'Unauthorized')
    return
  }

  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    logger.error('GROK_API_KEY not configured for voice proxy')
    browserWs.close(1011, 'Server configuration error')
    return
  }

  // Queue for messages that arrive before xAI connection is ready
  const pendingMessages = []
  let pendingBytes = 0
  const sessionTimer = setTimeout(() => {
    if (browserWs.readyState === WebSocket.OPEN) browserWs.close(1000, 'Session complete')
  }, MAX_SESSION_MS)
  sessionTimer.unref()

  // Connect to xAI — Authorization header is the only reliable auth method
  const xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })

  xaiWs.on('open', () => {
    logger.info('xAI proxy connected', { userId })
    // Flush messages that arrived while xAI was still connecting
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift()
      pendingBytes -= msg.data.length ?? msg.data.byteLength ?? 0
      xaiWs.send(msg.data, { binary: msg.isBinary })
    }
  })

  xaiWs.on('error', err => {
    logger.error('xAI WebSocket error', { userId, error: err.message })
    pendingMessages.length = 0
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close(1011, 'Upstream error')
    }
  })

  xaiWs.on('close', (code, reason) => {
    clearTimeout(sessionTimer)
    pendingMessages.length = 0
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close(code, reason)
    }
  })

  // Browser → xAI (queue if xAI not ready yet)
  browserWs.on('message', (data, isBinary) => {
    if (xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.send(data, { binary: isBinary })
    } else if (xaiWs.readyState === WebSocket.CONNECTING) {
      const size = data.length ?? data.byteLength ?? 0
      if (
        pendingMessages.length >= MAX_PENDING_MESSAGES ||
        pendingBytes + size > MAX_PENDING_BYTES
      ) {
        browserWs.close(1009, 'Too much buffered data')
        xaiWs.close()
        return
      }
      pendingMessages.push({ data, isBinary })
      pendingBytes += size
    }
  })

  browserWs.on('error', () => {
    pendingMessages.length = 0
    if (xaiWs.readyState !== WebSocket.CLOSED && xaiWs.readyState !== WebSocket.CLOSING) {
      xaiWs.close()
    }
  })

  browserWs.on('close', () => {
    clearTimeout(sessionTimer)
    pendingMessages.length = 0
    if (xaiWs.readyState !== WebSocket.CLOSED && xaiWs.readyState !== WebSocket.CLOSING) {
      xaiWs.close()
    }
  })

  // xAI → browser
  xaiWs.on('message', (data, isBinary) => {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(data, { binary: isBinary })
    }
  })
}

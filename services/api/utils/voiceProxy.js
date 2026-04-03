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

const logger = createLogger('voice-proxy')

// One-time tickets for unauthenticated voice (landing page demos)
const voiceTickets = new Map()
const TICKET_TTL_MS = 60_000

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
export function handleVoiceProxy(browserWs, req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const userToken = url.searchParams.get('token')
  const ticket = url.searchParams.get('ticket')

  // Authenticate via JWT or one-time ticket
  let userId = 'anonymous'
  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET)
      userId = decoded.id
    } catch {
      browserWs.close(1008, 'Unauthorized')
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

  // Connect to xAI — Authorization header is the only reliable auth method
  const xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })

  xaiWs.on('open', () => {
    logger.info('xAI proxy connected', { userId })
    // Flush messages that arrived while xAI was still connecting
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift()
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
      pendingMessages.push({ data, isBinary })
    }
  })

  browserWs.on('error', () => {
    pendingMessages.length = 0
    if (xaiWs.readyState !== WebSocket.CLOSED && xaiWs.readyState !== WebSocket.CLOSING) {
      xaiWs.close()
    }
  })

  browserWs.on('close', () => {
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

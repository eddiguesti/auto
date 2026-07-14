/**
 * Voice WebSocket proxy — bridges browser WebSocket connections to xAI Realtime API.
 *
 * Browser cannot set Authorization headers on WebSocket connections, but Node.js can.
 * This proxy:
 *   1. Accepts a browser WS connection authenticated by a single-use ticket
 *   2. Opens a server-side WS to xAI with the GROK_API_KEY in the Authorization header
 *   3. Forwards all messages bidirectionally
 *
 * IMPORTANT: The browser connects to the proxy instantly (same server), but the proxy's
 * connection to xAI takes time. Messages from the browser are queued until xAI is ready.
 */

import { WebSocket } from 'ws'
import crypto from 'crypto'
import { createLogger } from './logger.js'

const logger = createLogger('voice-proxy')

// One-time tickets for unauthenticated voice (landing page demos)
const voiceTickets = new Map()
const TICKET_TTL_MS = 60_000
const MAX_PENDING_MESSAGES = 32
const MAX_PENDING_BYTES = 2 * 1024 * 1024
const MAX_SESSION_MS = 15 * 60 * 1000

/**
 * Create a single-use voice ticket for public (no JWT) voice connections.
 * Tickets expire after 60 seconds and are consumed on first use.
 */
export function createVoiceTicket({ userId = 'anonymous' } = {}) {
  const ticket = crypto.randomBytes(32).toString('hex')
  voiceTickets.set(ticket, { expiresAt: Date.now() + TICKET_TTL_MS, userId })
  // Cleanup expired tickets periodically
  if (voiceTickets.size > 50) {
    const now = Date.now()
    for (const [k, entry] of voiceTickets) {
      if (entry.expiresAt < now) voiceTickets.delete(k)
    }
  }
  return ticket
}

/**
 * Handle an authenticated voice proxy WebSocket connection.
 * @param {WebSocket} browserWs - The browser's WebSocket connection
 * @param {import('http').IncomingMessage} req - The upgrade HTTP request
 */
export async function handleVoiceProxy(browserWs, req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const ticket = url.searchParams.get('ticket')

  // HTTP authentication and quota checks happen before this ticket is issued.
  let userId = 'anonymous'
  if (ticket) {
    const entry = voiceTickets.get(ticket)
    if (!entry || entry.expiresAt < Date.now()) {
      voiceTickets.delete(ticket)
      browserWs.close(1008, 'Invalid or expired ticket')
      return
    }
    voiceTickets.delete(ticket) // single-use
    userId = entry.userId
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

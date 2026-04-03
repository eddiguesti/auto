/**
 * Voice WebSocket proxy — bridges browser WebSocket connections to xAI Realtime API.
 *
 * Browser cannot set Authorization headers on WebSocket connections, but Node.js can.
 * This proxy:
 *   1. Accepts a browser WS connection authenticated via JWT query param
 *   2. Opens a server-side WS to xAI with the GROK_API_KEY in the Authorization header
 *   3. Forwards all messages bidirectionally
 */

import { WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { createLogger } from './logger.js'

const logger = createLogger('voice-proxy')

/**
 * Handle an authenticated voice proxy WebSocket connection.
 * @param {WebSocket} browserWs - The browser's WebSocket connection
 * @param {import('http').IncomingMessage} req - The upgrade HTTP request
 */
export function handleVoiceProxy(browserWs, req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const userToken = url.searchParams.get('token')

  // Authenticate via JWT
  if (!userToken) {
    browserWs.close(1008, 'Unauthorized')
    return
  }

  let userId
  try {
    const decoded = jwt.verify(userToken, process.env.JWT_SECRET)
    userId = decoded.id
  } catch {
    browserWs.close(1008, 'Unauthorized')
    return
  }

  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    logger.error('GROK_API_KEY not configured for voice proxy')
    browserWs.close(1011, 'Server configuration error')
    return
  }

  // Connect to xAI — Authorization header is the only reliable auth method
  const xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })

  xaiWs.on('open', () => {
    logger.info('xAI proxy connected', { userId })
  })

  xaiWs.on('error', err => {
    logger.error('xAI WebSocket error', { userId, error: err.message })
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close(1011, 'Upstream error')
    }
  })

  xaiWs.on('close', (code, reason) => {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close(code, reason)
    }
  })

  // Browser → xAI
  browserWs.on('message', (data, isBinary) => {
    if (xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.send(data, { binary: isBinary })
    }
  })

  browserWs.on('error', () => {
    if (xaiWs.readyState !== WebSocket.CLOSED && xaiWs.readyState !== WebSocket.CLOSING) {
      xaiWs.close()
    }
  })

  browserWs.on('close', () => {
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

/** Bounded, revocation-aware bridge to the paid realtime provider. */
import { WebSocket } from 'ws'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { createLogger } from './logger.js'
import {
  assertCanonicalToken,
  tokenRevocationKey,
  isTokenBlacklisted,
  isUserTokenBlacklisted
} from '../infrastructure/tokenBlacklist.js'
import { reserveAIUsage } from '../middleware/aiQuota.js'
import { checkRateLimit } from './security.js'

const logger = createLogger('voice-proxy')
const voiceTickets = new Map()
const TICKET_TTL_MS = 60_000
const MAX_BUFFER_BYTES = 1024 * 1024
const MAX_SESSION_MS = 30 * 60_000
const DEMO_SESSION_MS = 90_000
let activeDemos = 0

export function createVoiceTicket() {
  const now = Date.now()
  for (const [key, expires] of voiceTickets) if (expires < now) voiceTickets.delete(key)
  if (voiceTickets.size >= 1000) throw new Error('Voice demo capacity reached')
  const ticket = crypto.randomBytes(32).toString('hex')
  voiceTickets.set(ticket, now + TICKET_TTL_MS)
  return ticket
}

export async function verifyVoiceToken(token, db) {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32 || /CHANGE_ME/i.test(secret)) throw new Error('Unauthorized')
  assertCanonicalToken(token)
  const claims = jwt.verify(token, secret, { algorithms: ['HS256'] })
  if (
    !Number.isInteger(claims.id) ||
    claims.id <= 0 ||
    !Number.isFinite(claims.exp) ||
    !Number.isFinite(claims.iat) ||
    (claims.scope && claims.scope !== 'magic_link')
  )
    throw new Error('Unauthorized')
  if (
    (await isTokenBlacklisted(tokenRevocationKey(claims, token), db)) ||
    (await isUserTokenBlacklisted(claims.id, claims.iat, db))
  )
    throw new Error('Token revoked')
  if (
    !db ||
    !(await db.query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [claims.id]))
      .rows[0]
  )
    throw new Error('Account unavailable')
  return claims
}

export async function handleVoiceProxy(browserWs, req, db, dependencies = {}) {
  const WebSocketImpl = dependencies.WebSocketImpl || WebSocket
  const verifyIdentity = dependencies.verifyIdentity || verifyVoiceToken
  const reserveUsage = dependencies.reserveUsage || reserveAIUsage
  const rateLimit = dependencies.rateLimit || checkRateLimit
  let upstream,
    leaseId,
    userId,
    timer,
    connectTimer,
    revocationTimer,
    demo = false,
    closed = false
  let queuedBytes = 0
  const pending = []

  function cleanup() {
    if (closed) return
    closed = true
    clearTimeout(timer)
    clearTimeout(connectTimer)
    clearInterval(revocationTimer)
    pending.length = 0
    queuedBytes = 0
    if (demo) activeDemos--
    if (upstream && upstream.readyState !== WebSocket.CLOSED) upstream.terminate()
    if (leaseId)
      void db
        .query('DELETE FROM voice_connection_leases WHERE user_id = $1 AND lease_id = $2', [
          userId,
          leaseId
        ])
        .catch(error => logger.error('Voice lease release failed', { error: error.message }))
  }
  function stop(code, reason) {
    if (browserWs.readyState === WebSocket.OPEN) browserWs.close(code, reason)
    cleanup()
  }
  browserWs.on('close', cleanup)
  browserWs.on('error', cleanup)
  // Queue initial session.update while authorization/database checks are in flight.
  browserWs.on('message', (data, isBinary) => {
    if (closed) return
    const bytes = Buffer.byteLength(data)
    if (bytes > 256 * 1024) return stop(1009, 'Voice message too large')
    if (upstream?.readyState === WebSocket.OPEN) {
      if (upstream.bufferedAmount + bytes > MAX_BUFFER_BYTES)
        return stop(1009, 'Voice connection is too slow')
      upstream.send(data, { binary: isBinary })
    } else {
      queuedBytes += bytes
      if (queuedBytes > MAX_BUFFER_BYTES) return stop(1009, 'Voice buffer limit reached')
      pending.push({ data, isBinary })
    }
  })

  try {
    const url = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')
    if (!process.env.GROK_API_KEY) return stop(1011, 'Voice service unavailable')
    let duration = DEMO_SESSION_MS
    if (token) {
      const claims = await verifyIdentity(token, db)
      userId = claims.id
      duration = Math.min(MAX_SESSION_MS, claims.exp * 1000 - Date.now())
      if (closed || duration <= 0) return stop(1008, 'Session expired')
      if (!(await rateLimit(userId)).allowed) return stop(1008, 'Voice rate limit reached')
      const candidate = crypto.randomUUID()
      const { rows } = await db.query(
        `INSERT INTO voice_connection_leases (user_id, lease_id, expires_at)
         VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE
         SET lease_id = $2, expires_at = $3 WHERE voice_connection_leases.expires_at < NOW()
         RETURNING lease_id`,
        [userId, candidate, new Date(Date.now() + duration + 30000)]
      )
      if (!rows[0]) return stop(1008, 'Another voice session is already active')
      leaseId = candidate
      if (closed) {
        await db.query('DELETE FROM voice_connection_leases WHERE user_id = $1 AND lease_id = $2', [
          userId,
          leaseId
        ])
        return
      }
      await reserveUsage(db, userId)
      revocationTimer = setInterval(() => {
        void verifyIdentity(token, db).catch(() => stop(1008, 'Session revoked'))
      }, 30_000)
      revocationTimer.unref?.()
    } else {
      const ticket = url.searchParams.get('ticket')
      const expiry = voiceTickets.get(ticket)
      voiceTickets.delete(ticket)
      if (!expiry || expiry < Date.now() || activeDemos >= 20)
        return stop(1008, 'Invalid ticket or voice demo capacity reached')
      demo = true
      activeDemos++
    }
    if (closed) return
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) return stop(1011, 'Voice service unavailable')
    timer = setTimeout(() => stop(1000, 'Voice session time limit reached'), duration)
    timer.unref?.()
    upstream = new WebSocketImpl('wss://api.x.ai/v1/realtime', {
      headers: { Authorization: `Bearer ${apiKey}` },
      maxPayload: 256 * 1024,
      handshakeTimeout: 15000
    })
    connectTimer = setTimeout(() => stop(1011, 'Voice connection timed out'), 15000)
    connectTimer.unref?.()
    upstream.on('open', () => {
      clearTimeout(connectTimer)
      if (closed) return upstream.terminate()
      while (pending.length) {
        const message = pending.shift()
        upstream.send(message.data, { binary: message.isBinary })
      }
      queuedBytes = 0
    })
    upstream.on('message', (data, isBinary) => {
      if (browserWs.readyState !== WebSocket.OPEN) return
      if (browserWs.bufferedAmount + Buffer.byteLength(data) > MAX_BUFFER_BYTES)
        return stop(1009, 'Voice connection is too slow')
      browserWs.send(data, { binary: isBinary })
    })
    upstream.on('error', error => {
      logger.error('Voice upstream failed', { userId, error: error.message })
      stop(1011, 'Voice service unavailable')
    })
    upstream.on('close', () => stop(1000, 'Voice session ended'))
  } catch (error) {
    logger.warn('Voice authorization rejected', { userId, code: error.code || 'UNAUTHORIZED' })
    stop(
      1008,
      error.code === 'UPGRADE_REQUIRED'
        ? 'Daily AI limit reached'
        : 'Voice authorization unavailable'
    )
  }
}

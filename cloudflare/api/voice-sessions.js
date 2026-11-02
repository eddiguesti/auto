import { DurableObject } from 'cloudflare:workers'
import { ApiError, json } from './errors.js'
import { verifyToken, requireFullScope } from './auth.js'
import { createRepositories } from './repositories.js'
import { reserveAIUsage } from './ai-quota.js'
import { issueVoiceTicket, verifyVoiceTicket } from './voice-tickets.js'
import { sha256 } from './auth-rate-limit.js'
import { authorizeMagic, magicInstructions } from './magic-authorization.js'
import {
  reserveUserVoiceLease,
  assertUserVoiceLease,
  releaseUserVoiceLease
} from '../phone/leases.js'

const LIMIT = 1024 * 1024
const size = value =>
  typeof value === 'string' ? new TextEncoder().encode(value).byteLength : value.byteLength

// A user/network has one coordinator. The paired outbound socket cannot hibernate,
// so standard accepted WebSockets are deliberate. Persisted ticket consumption
// and an alarm retain the authorization/duration boundary across event interleaving.
export class VoiceSession extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.connection = null
    this.pendingLeaseRelease = Promise.resolve()
    ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS voice_tickets(hash TEXT PRIMARY KEY,subject TEXT NOT NULL,authentication TEXT,session_id INTEGER,expires_at INTEGER NOT NULL)`
    )
    ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS voice_active(id INTEGER PRIMARY KEY,connection_id TEXT NOT NULL,authentication TEXT,expires_at INTEGER NOT NULL)`
    )
    // Standard socket pairs close on isolate replacement; never strand a user
    // behind a lease left by an earlier terminated instance.
    ctx.storage.sql.exec('DELETE FROM voice_active')
  }
  database() {
    return this.env.DB.withSession('first-primary')
  }
  async identity(authentication, magic = false) {
    const token = await verifyToken(
      new Request('https://voice.internal/auth', { headers: { Authorization: authentication } }),
      this.env.JWT_SECRET
    )
    if (magic) await authorizeMagic(this.database(), token)
    else requireFullScope(token.claims)
    const identity = await createRepositories(this.database(), {
      wallClockTimeZone: this.env.SOURCE_TIMESTAMP_TIMEZONE
    }).authenticate(token)
    if (!identity || identity.revoked) throw new ApiError(401, { error: 'Voice session revoked' })
    return token
  }
  async remember(subject, authentication, sessionId, expiresAt) {
    const now = Date.now(),
      sql = this.ctx.storage.sql
    sql.exec('DELETE FROM voice_tickets WHERE expires_at <= ?', now)
    if (sql.exec('SELECT COUNT(*) AS count FROM voice_tickets').one().count >= 5)
      throw new ApiError(429, { error: 'Please wait before starting another voice session' })
    const owner = await this.ctx.storage.get('owner')
    if (owner && owner !== subject) throw new ApiError(403, { error: 'Invalid voice coordinator' })
    if (!owner) await this.ctx.storage.put('owner', subject)
    const issued = await issueVoiceTicket(subject, this.env, now, expiresAt)
    const nonceHash = await sha256(issued.value.nonce)
    this.ctx.storage.transactionSync(() => {
      sql.exec('DELETE FROM voice_tickets WHERE expires_at <= ?', Date.now())
      if (sql.exec('SELECT COUNT(*) AS count FROM voice_tickets').one().count >= 5)
        throw new ApiError(429, { error: 'Please wait before starting another voice session' })
      sql.exec(
        'INSERT INTO voice_tickets VALUES(?,?,?,?,?)',
        nonceHash,
        subject,
        authentication ? JSON.stringify(authentication) : null,
        sessionId,
        issued.value.exp * 1000
      )
    })
    return { ticket: issued.ticket }
  }
  async issueTicket(authentication, sessionId) {
    try {
      return await this.userTicket(authentication, sessionId)
    } catch (error) {
      return {
        error:
          error instanceof ApiError
            ? { status: error.status, body: error.body }
            : { status: 503, body: { error: 'Voice sessions unavailable' } }
      }
    }
  }
  async userTicket(authentication, sessionId) {
    const token = await this.identity(authentication)
    const session = await this.database()
      .prepare('SELECT id FROM voice_sessions WHERE id=? AND user_id=?')
      .bind(sessionId, token.claims.id)
      .first()
    if (!session) throw new ApiError(404, { error: 'Session not found' })
    return this.remember(`user:${token.claims.id}`, token, sessionId, token.claims.exp * 1000)
  }
  async issueMagicTicket(authentication, sessionId) {
    try {
      const token = await this.identity(authentication, true),
        link = await authorizeMagic(this.database(), token)
      if (link.voice_session_id !== sessionId)
        throw new ApiError(403, { error: 'This link cannot access another interview' })
      return await this.remember(
        `user:${token.claims.id}`,
        { ...token, magicPrompt: magicInstructions(link), magicSessionId: sessionId },
        sessionId,
        token.claims.exp * 1000
      )
    } catch (error) {
      return {
        error:
          error instanceof ApiError
            ? { status: error.status, body: error.body }
            : { status: 503, body: { error: 'Voice sessions unavailable' } }
      }
    }
  }
  async issueDemoTicket(subjectHash) {
    try {
      if (!/^[a-f0-9]{64}$/.test(subjectHash))
        throw new ApiError(400, { error: 'Invalid voice subject' })
      return await this.remember(`demo:${subjectHash}`, null, null)
    } catch (error) {
      return {
        error:
          error instanceof ApiError
            ? { status: error.status, body: error.body }
            : { status: 503, body: { error: 'Voice sessions unavailable' } }
      }
    }
  }
  stop(code = 1000, reason = 'Voice session ended') {
    const connection = this.connection
    this.connection = null
    this.ctx.storage.sql.exec('DELETE FROM voice_active')
    if (connection) {
      if (connection.userId) {
        this.pendingLeaseRelease = releaseUserVoiceLease(
          this.database(),
          connection.userId,
          connection.connectionId
        ).catch(() => {
          console.error('Voice connection lease release pending expiry')
        })
        this.ctx.waitUntil(this.pendingLeaseRelease)
      }
      for (const socket of [connection.browser, connection.upstream]) {
        try {
          socket.close(code, reason)
        } catch {
          /* Closed peers need no further I/O. */
        }
      }
    }
  }
  async alarm() {
    const active = this.ctx.storage.sql.exec('SELECT * FROM voice_active').toArray()[0]
    if (!active) return
    if (active.expires_at <= Date.now()) {
      this.stop(1000, 'Voice session time limit reached')
      return
    }
    if (!this.connection) {
      await this.ctx.storage.setAlarm(Math.min(Date.now() + 30000, active.expires_at))
      return
    }
    if (active.authentication) {
      try {
        const token = JSON.parse(active.authentication)
        if (token.claims.exp * 1000 <= Date.now()) throw new Error('Expired')
        const identity = await createRepositories(this.database(), {
          wallClockTimeZone: this.env.SOURCE_TIMESTAMP_TIMEZONE
        }).authenticate(token)
        if (!identity || identity.revoked) throw new Error('Revoked')
        const heartbeatExpiry = Math.min(Date.now() + 90000, active.expires_at)
        if (
          !(await assertUserVoiceLease(this.database(), token.claims.id, active.connection_id)) ||
          !(await reserveUserVoiceLease(
            this.database(),
            token.claims.id,
            active.connection_id,
            heartbeatExpiry
          ))
        )
          throw new Error('Lease lost')
        if (this.connection?.connectionId !== active.connection_id) return
        this.connection.leaseExpiresAt = heartbeatExpiry
        if (token.claims.scope === 'magic_link') {
          const link = await authorizeMagic(this.database(), token)
          if (
            magicInstructions(link) !== token.magicPrompt ||
            link.voice_session_id !== token.magicSessionId
          )
            throw new Error('Prompt changed')
        }
      } catch {
        if (this.connection?.connectionId !== active.connection_id) return
        this.stop(1008, 'Voice session revoked')
        return
      }
    }
    if (this.connection?.connectionId === active.connection_id)
      await this.ctx.storage.setAlarm(Math.min(Date.now() + 30000, active.expires_at))
  }
  async fetch(request) {
    let claimedId, sharedUserId, sharedExpiresAt
    try {
      await this.pendingLeaseRelease
      if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
        return json({ error: 'WebSocket upgrade required' }, 426)
      const ticket = await verifyVoiceTicket(
        new URL(request.url).searchParams.get('ticket'),
        this.env
      )
      const hash = await sha256(ticket.nonce),
        sql = this.ctx.storage.sql,
        now = Date.now()
      const prior = sql.exec('SELECT expires_at FROM voice_active').toArray()[0]
      if (this.connection && (!prior || prior.expires_at <= now))
        this.stop(1000, 'Voice session time limit reached')
      const connectionId = crypto.randomUUID()
      const stored = this.ctx.storage.transactionSync(() => {
        const found = sql
          .exec(
            'SELECT * FROM voice_tickets WHERE hash=? AND subject=? AND expires_at>?',
            hash,
            ticket.sub,
            now
          )
          .toArray()[0]
        if (!found) throw new ApiError(401, { error: 'Voice ticket already used or expired' })
        const active = sql.exec('SELECT expires_at FROM voice_active').toArray()[0]
        if (active?.expires_at > now)
          throw new ApiError(409, { error: 'Another voice session is already active' })
        const authentication = found.authentication ? JSON.parse(found.authentication) : null
        const expiresAt = Math.min(
          now + (authentication ? 30 * 60000 : 90000),
          authentication ? authentication.claims.exp * 1000 : Infinity
        )
        sql.exec('DELETE FROM voice_tickets WHERE hash=?', hash)
        sql.exec(
          'INSERT OR REPLACE INTO voice_active VALUES(1,?,?,?)',
          connectionId,
          found.authentication,
          expiresAt
        )
        return { ...found, authentication, expiresAt }
      })
      claimedId = connectionId
      if (!this.env.GROK_API_KEY) throw new ApiError(503, { error: 'Voice service unavailable' })
      if (stored.authentication) {
        const identity = await createRepositories(this.database(), {
          wallClockTimeZone: this.env.SOURCE_TIMESTAMP_TIMEZONE
        }).authenticate(stored.authentication)
        if (!identity || identity.revoked)
          throw new ApiError(401, { error: 'Voice session revoked' })
        sharedExpiresAt = Math.min(Date.now() + 90000, stored.expiresAt)
        if (
          !(await reserveUserVoiceLease(
            this.database(),
            stored.authentication.claims.id,
            connectionId,
            sharedExpiresAt
          ))
        )
          throw new ApiError(409, { error: 'Another voice session is already active' })
        sharedUserId = stored.authentication.claims.id
        if (stored.authentication.claims.scope === 'magic_link') {
          const link = await authorizeMagic(this.database(), stored.authentication)
          if (
            link.voice_session_id !== stored.session_id ||
            magicInstructions(link) !== stored.authentication.magicPrompt
          )
            throw new ApiError(403, { error: 'Voice session scope changed' })
        }
        await reserveAIUsage(this.database(), stored.authentication.claims.id, now)
      }
      const upstreamResponse = await (this.env.VOICE_PROVIDER || { fetch }).fetch(
        'https://api.x.ai/v1/realtime?model=grok-voice-latest',
        {
          headers: { Upgrade: 'websocket', Authorization: `Bearer ${this.env.GROK_API_KEY}` },
          redirect: 'manual',
          signal: AbortSignal.timeout(15000)
        }
      )
      const upstream = upstreamResponse.webSocket
      if (upstreamResponse.status !== 101 || !upstream)
        throw new ApiError(502, { error: 'Voice service unavailable' })
      const current = sql.exec('SELECT connection_id FROM voice_active').toArray()[0]
      if (current?.connection_id !== connectionId || stored.expiresAt <= Date.now()) {
        upstream.accept()
        upstream.close(1008, 'Voice session expired')
        throw new ApiError(401, { error: 'Voice session expired' })
      }
      const [client, browser] = Object.values(new globalThis.WebSocketPair())
      this.connection = {
        browser,
        upstream,
        connectionId,
        userId: sharedUserId,
        leaseExpiresAt: sharedExpiresAt
      }
      let totalBytes = 0
      const relay = (source, target) => {
        let windowStarted = Date.now(),
          windowBytes = 0
        source.addEventListener('message', event => {
          try {
            if (this.connection?.connectionId !== connectionId) return
            if (Date.now() >= stored.expiresAt) {
              this.stop(1000, 'Voice session time limit reached')
              return
            }
            if (sharedUserId && Date.now() >= this.connection.leaseExpiresAt) {
              this.stop(1008, 'Voice authorization lease expired')
              return
            }
            const bytes = size(event.data)
            if (Date.now() - windowStarted >= 1000) {
              windowStarted = Date.now()
              windowBytes = 0
            }
            windowBytes += bytes
            totalBytes += bytes
            if (
              bytes > 256 * 1024 ||
              windowBytes > LIMIT ||
              totalBytes > (stored.authentication ? 256 : 8) * LIMIT ||
              (target.bufferedAmount || 0) + bytes > LIMIT
            ) {
              this.stop(1009, 'Voice buffer limit reached')
              return
            }
            if (target.readyState !== 1) {
              this.stop(1011, 'Voice connection unavailable')
              return
            }
            let outgoing = event.data
            if (source === browser && stored.authentication?.magicPrompt) {
              let eventData
              try {
                eventData = JSON.parse(event.data)
              } catch {
                throw new Error('Invalid scoped voice event')
              }
              if (eventData.type === 'session.update') {
                outgoing = JSON.stringify({
                  type: 'session.update',
                  session: {
                    modalities: ['text', 'audio'],
                    voice: 'Eve',
                    input_audio_format: 'pcm16',
                    output_audio_format: 'pcm16',
                    input_audio_transcription: { model: 'whisper-1' },
                    turn_detection: { type: 'server_vad' },
                    instructions: stored.authentication.magicPrompt,
                    tools: [],
                    tool_choice: 'none'
                  }
                })
              } else if (eventData.type === 'response.create') {
                outgoing = JSON.stringify({
                  type: 'response.create',
                  response: { instructions: stored.authentication.magicPrompt }
                })
              } else if (
                ![
                  'input_audio_buffer.append',
                  'input_audio_buffer.commit',
                  'input_audio_buffer.clear',
                  'response.cancel',
                  'conversation.item.truncate'
                ].includes(eventData.type)
              )
                throw new Error('Scoped voice event forbidden')
            }
            target.send(outgoing)
          } catch {
            this.stop(1011, 'Voice connection unavailable')
          }
        })
      }
      relay(browser, upstream)
      relay(upstream, browser)
      for (const socket of [browser, upstream]) {
        socket.addEventListener('close', () => {
          if (this.connection?.connectionId === connectionId) this.stop()
        })
        socket.addEventListener('error', () => {
          if (this.connection?.connectionId === connectionId)
            this.stop(1011, 'Voice connection unavailable')
        })
      }
      upstream.binaryType = 'arraybuffer'
      upstream.accept()
      browser.accept()
      await this.ctx.storage.setAlarm(Math.min(now + 30000, stored.expiresAt))
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: { 'Cache-Control': 'no-store' }
      })
    } catch (error) {
      // A failed concurrent connection must not tear down the existing interview.
      if (claimedId) {
        if (this.connection?.connectionId === claimedId)
          this.stop(1011, 'Voice connection unavailable')
        else this.ctx.storage.sql.exec('DELETE FROM voice_active WHERE connection_id=?', claimedId)
      }
      if (sharedUserId)
        await releaseUserVoiceLease(this.database(), sharedUserId, claimedId).catch(() => {
          console.error('Voice connection lease release pending expiry')
        })
      return error instanceof ApiError
        ? json(error.body, error.status)
        : json({ error: 'Voice service unavailable' }, 503)
    }
  }
}

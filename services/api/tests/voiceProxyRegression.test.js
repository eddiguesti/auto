import { EventEmitter } from 'node:events'
import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVoiceTicket, handleVoiceProxy, verifyVoiceToken } from '../utils/voiceProxy.js'

class Upstream extends EventEmitter {
  static instances = []
  constructor() {
    super()
    this.readyState = 0
    this.bufferedAmount = 0
    this.send = vi.fn()
    this.terminate = vi.fn(() => {
      this.readyState = 3
    })
    Upstream.instances.push(this)
  }
}
function browser() {
  const ws = new EventEmitter()
  ws.readyState = 1
  ws.bufferedAmount = 0
  ws.close = vi.fn(() => {
    ws.readyState = 3
    ws.emit('close')
  })
  ws.send = vi.fn()
  return ws
}
function request(query = 'token=valid') {
  return { url: `/api/voice/ws?${query}`, headers: { host: 'localhost' } }
}
const claims = () => ({ id: 7, exp: Math.floor(Date.now() / 1000) + 3600 })
let db, deps, sockets
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'voice-security-test-secret-at-least-32-characters')
  vi.stubEnv('GROK_API_KEY', 'test-provider-key')
  Upstream.instances.length = 0
  sockets = []
  db = {
    query: vi.fn(async sql => ({
      rows: sql.includes('INSERT INTO voice_connection_leases') ? [{ lease_id: 'leased' }] : []
    }))
  }
  deps = {
    WebSocketImpl: Upstream,
    verifyIdentity: vi.fn(async () => claims()),
    reserveUsage: vi.fn(async () => ({})),
    rateLimit: vi.fn(async () => ({ allowed: true }))
  }
})
afterEach(() => {
  sockets.forEach(ws => {
    if (ws.readyState === 1) ws.close()
  })
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
function client() {
  const ws = browser()
  sockets.push(ws)
  return ws
}

describe('paid realtime voice boundary', () => {
  it('rejects revoked, unknown-scope and deleted-account JWTs before opening the paid provider', async () => {
    const secret = process.env.JWT_SECRET
    const token = jwt.sign({ id: 7, jti: 'revoked' }, secret, { expiresIn: '1h' })
    const revokedDb = { query: vi.fn(async () => ({ rows: [{}] })) }
    await expect(verifyVoiceToken(token, revokedDb)).rejects.toThrow('revoked')
    const scoped = jwt.sign({ id: 7, scope: 'unrecognized' }, secret, { expiresIn: '1h' })
    await expect(verifyVoiceToken(scoped, revokedDb)).rejects.toThrow('Unauthorized')
    const deletedDb = { query: vi.fn(async () => ({ rows: [] })) }
    await expect(verifyVoiceToken(token, deletedDb)).rejects.toThrow('Account unavailable')
    const ws = client()
    await handleVoiceProxy(ws, request(), db, {
      ...deps,
      verifyIdentity: vi.fn(async () => {
        throw new Error('revoked')
      })
    })
    expect(ws.close).toHaveBeenCalledWith(1008, expect.any(String))
    expect(Upstream.instances).toHaveLength(0)
    expect(deps.reserveUsage).not.toHaveBeenCalled()
  })
  it('prevents concurrent sessions across processes before spending another allowance', async () => {
    db.query.mockResolvedValue({ rows: [] })
    const ws = client()
    await handleVoiceProxy(ws, request(), db, deps)
    expect(ws.close).toHaveBeenCalledWith(1008, 'Another voice session is already active')
    expect(deps.reserveUsage).not.toHaveBeenCalled()
    expect(Upstream.instances).toHaveLength(0)
  })
  it('reserves usage, preserves initial messages during async authorization, and releases its lease', async () => {
    let authorize
    deps.verifyIdentity.mockImplementation(
      () =>
        new Promise(resolve => {
          authorize = resolve
        })
    )
    const ws = client(),
      opening = handleVoiceProxy(ws, request(), db, deps)
    const message = Buffer.from('{"type":"session.update"}')
    ws.emit('message', message, false)
    authorize(claims())
    await opening
    expect(deps.reserveUsage).toHaveBeenCalledWith(db, 7)
    const upstream = Upstream.instances[0]
    upstream.readyState = 1
    upstream.emit('open')
    expect(upstream.send).toHaveBeenCalledWith(message, { binary: false })
    ws.close()
    expect(upstream.terminate).toHaveBeenCalledOnce()
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM voice_connection_leases'),
      [7, expect.any(String)]
    )
  })
  it('rechecks revocation and ends an already-open session after logout/reset', async () => {
    vi.useFakeTimers()
    const ws = client()
    await handleVoiceProxy(ws, request(), db, deps)
    const upstream = Upstream.instances[0]
    upstream.readyState = 1
    upstream.emit('open')
    deps.verifyIdentity.mockRejectedValueOnce(new Error('revoked'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(ws.close).toHaveBeenCalledWith(1008, 'Session revoked')
  })
  it('bounds buffered client data before authorization and never opens upstream after the socket closes', async () => {
    let authorize
    deps.verifyIdentity.mockImplementation(
      () =>
        new Promise(resolve => {
          authorize = resolve
        })
    )
    const ws = client(),
      opening = handleVoiceProxy(ws, request(), db, deps)
    for (let i = 0; i < 5; i++) ws.emit('message', Buffer.alloc(256 * 1024), false)
    expect(ws.close).toHaveBeenCalledWith(1009, 'Voice buffer limit reached')
    authorize(claims())
    await opening
    expect(Upstream.instances).toHaveLength(0)
  })
  it('never forwards excessive slow-client buffered data', async () => {
    const ws = client()
    await handleVoiceProxy(ws, request(), db, deps)
    const upstream = Upstream.instances[0]
    upstream.readyState = 1
    upstream.emit('open')
    ws.bufferedAmount = 1024 * 1024
    upstream.emit('message', Buffer.from('audio'), false)
    expect(ws.send).not.toHaveBeenCalled()
    expect(ws.close).toHaveBeenCalledWith(1009, 'Voice connection is too slow')
  })
  it('bounds public demo duration and consumes its ticket only once', async () => {
    vi.useFakeTimers()
    const ticket = createVoiceTicket(),
      ws = client()
    await handleVoiceProxy(ws, request(`ticket=${ticket}`), null, deps)
    const upstream = Upstream.instances[0]
    upstream.readyState = 1
    upstream.emit('open')
    expect(deps.reserveUsage).not.toHaveBeenCalled()
    const replay = client()
    await handleVoiceProxy(replay, request(`ticket=${ticket}`), null, deps)
    expect(replay.close).toHaveBeenCalledWith(1008, expect.stringContaining('Invalid ticket'))
    await vi.advanceTimersByTimeAsync(90_000)
    expect(ws.close).toHaveBeenCalledWith(1000, 'Voice session time limit reached')
  })
})

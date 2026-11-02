import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import express from 'express'
import jwt from 'jsonwebtoken'
import { EventEmitter } from 'node:events'
const bridgeMocks = vi.hoisted(() => ({ start: vi.fn(async () => {}), create: vi.fn() }))
vi.mock('../services/telnyxCallBridge.js', () => ({
  TelnyxCallBridge: class {
    constructor(options) {
      bridgeMocks.create(options)
      this.start = bridgeMocks.start
    }
  },
  getBridge: vi.fn()
}))
import {
  createTelnyxStreamToken,
  verifyTelnyxStreamToken,
  verifyTelnyxWebhook
} from '../utils/telnyxSecurity.js'
import telnyxRouter, { handleTelnyxMediaStream } from '../routes/telnyxCall.js'

const keys = generateKeyPairSync('ed25519')
const rawKey = keys.publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(-32)
  .toString('base64')
const rawFetch = globalThis.fetch
let server, base, query
const event = {
  data: { id: 'event-1', event_type: 'call.answered', payload: { call_control_id: 'call-7' } }
}
function signed(body, seconds = Math.floor(Date.now() / 1000)) {
  const timestamp = String(seconds)
  return {
    'Content-Type': 'application/json',
    'telnyx-timestamp': timestamp,
    'telnyx-signature-ed25519': sign(
      null,
      Buffer.from(`${timestamp}|${body}`),
      keys.privateKey
    ).toString('base64')
  }
}

beforeEach(async () => {
  vi.stubEnv('TELNYX_PUBLIC_KEY', rawKey)
  vi.stubEnv('JWT_SECRET', 'voice-security-test-secret-at-least-32-characters')
  const seen = new Set()
  query = vi.fn(async (sql, values) => {
    if (sql.includes('INSERT INTO telnyx_webhook_events')) {
      if (seen.has(values[0])) return { rows: [] }
      seen.add(values[0])
      return { rows: [{ event_id: values[0] }] }
    }
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 7 }] }
    if (sql.includes('SELECT premium_until')) return { rows: [{ premium_until: null }] }
    if (sql.includes('INSERT INTO ai_usage')) return { rows: [{ request_count: 1 }] }
    if (sql.includes('COUNT(*) as count FROM telnyx_calls')) return { rows: [{ count: '0' }] }
    if (sql.includes('SELECT user_id FROM telnyx_calls')) return { rows: [{ user_id: 7 }] }
    return { rows: [] }
  })
  const app = express()
  app.locals.db = { query, connect: async () => ({ query, release: vi.fn() }) }
  app.use('/api/telnyx/request-call', express.json())
  app.use('/api/telnyx', telnyxRouter)
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}/api/telnyx/webhook`
})
afterEach(async () => {
  await new Promise(resolve => server.close(resolve))
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Telnyx signature and replay protection', () => {
  it('verifies exact raw bytes, rejects tampering, stale/future timestamps and malformed signatures', () => {
    const body = Buffer.from(JSON.stringify(event, null, 2))
    expect(verifyTelnyxWebhook(body, signed(body), rawKey)).toBe(true)
    expect(verifyTelnyxWebhook(Buffer.from(JSON.stringify(event)), signed(body), rawKey)).toBe(
      false
    )
    expect(
      verifyTelnyxWebhook(body, signed(body, Math.floor(Date.now() / 1000) - 301), rawKey)
    ).toBe(false)
    expect(
      verifyTelnyxWebhook(body, signed(body, Math.floor(Date.now() / 1000) + 301), rawKey)
    ).toBe(false)
    expect(
      verifyTelnyxWebhook(body, { ...signed(body), 'telnyx-signature-ed25519': 'fake' }, rawKey)
    ).toBe(false)
  })
  it('rejects forged events before touching the database', async () => {
    const body = JSON.stringify(event)
    const response = await rawFetch(base, {
      method: 'POST',
      body,
      headers: { ...signed(body), 'telnyx-signature-ed25519': 'forged' }
    })
    expect(response.status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })
  it('processes a valid event once and acknowledges duplicate delivery without repeated effects', async () => {
    const body = JSON.stringify(event, null, 2),
      headers = signed(body)
    for (let i = 0; i < 2; i++)
      expect((await rawFetch(base, { method: 'POST', body, headers })).status).toBe(200)
    expect(
      query.mock.calls.filter(([sql]) => sql.includes("SET call_status = 'answered'"))
    ).toHaveLength(1)
    expect(query.mock.calls.filter(([sql]) => sql === 'COMMIT')).toHaveLength(2)
  })
  it('fails closed without a configured verification key', async () => {
    vi.stubEnv('TELNYX_PUBLIC_KEY', '')
    const body = JSON.stringify(event)
    expect((await rawFetch(base, { method: 'POST', body, headers: signed(body) })).status).toBe(503)
    expect(query).not.toHaveBeenCalled()
  })
  it('signs stream credentials for one user and audience; rejects arbitrary and expired credentials', () => {
    const stream = createTelnyxStreamToken(7)
    expect(verifyTelnyxStreamToken(stream.token)).toMatchObject({
      userId: 7,
      nonce: stream.nonce,
      aud: 'telnyx-stream'
    })
    expect(verifyTelnyxStreamToken('internal-cron-secret')).toBeNull()
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60_000)
    expect(verifyTelnyxStreamToken(stream.token)).toBeNull()
    vi.useRealTimers()
  })
  it('includes a user-bound signed stream token and matching nonce when initiating an actual call request', async () => {
    vi.stubEnv('TELNYX_API_KEY', 'provider-test-key')
    vi.stubEnv('TELNYX_CONNECTION_ID', 'connection-1')
    vi.stubEnv('TELNYX_PHONE_NUMBER', '+441234567890')
    vi.stubEnv('GROK_API_KEY', 'voice-test-key')
    const provider = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ data: { call_control_id: 'call-7' } }) })
    const token = jwt.sign({ id: 7, email: 'voice@example.com' }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    })
    const response = await rawFetch(base.replace('/webhook', '/request-call'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phoneNumber: '+447700900000' })
    })
    expect(response.status).toBe(200)
    const outgoing = JSON.parse(provider.mock.calls[0][1].body)
    const streamClaims = verifyTelnyxStreamToken(
      new URL(outgoing.stream_url).searchParams.get('token')
    )
    const state = JSON.parse(Buffer.from(outgoing.client_state, 'base64').toString())
    expect(streamClaims).toMatchObject({ userId: 7, nonce: state.streamNonce })
    expect(state.userId).toBe(7)
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(true)
  })
  it('rejects mismatched stream metadata and uses stored ownership before opening a call bridge', async () => {
    bridgeMocks.create.mockClear()
    const claims = { userId: 7, nonce: 'signed-nonce' }
    const makeSocket = () => {
      const ws = new EventEmitter()
      ws.close = vi.fn(() => ws.emit('close'))
      return ws
    }
    const start = state =>
      JSON.stringify({
        event: 'start',
        stream_id: 'stream-7',
        start: {
          call_control_id: 'call-7',
          client_state: Buffer.from(JSON.stringify(state)).toString('base64')
        }
      })
    const ws = makeSocket()
    await handleTelnyxMediaStream(ws, { query }, claims)
    ws.emit('message', start({ userId: 8, streamNonce: 'signed-nonce' }))
    await vi.waitFor(() => expect(ws.close).toHaveBeenCalledWith(1008, 'Invalid call stream'))
    expect(bridgeMocks.create).not.toHaveBeenCalled()
    const owned = makeSocket(),
      ownedDb = {
        query: vi.fn(async () => ({ rows: [{ user_id: 7, prompt_text: 'Stored prompt' }] }))
      }
    await handleTelnyxMediaStream(owned, ownedDb, claims)
    owned.emit(
      'message',
      start({ userId: 7, streamNonce: 'signed-nonce', prompt: { text: 'Untrusted prompt' } })
    )
    await vi.waitFor(() =>
      expect(bridgeMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 7,
          prompt: { text: 'Stored prompt', chapter_id: undefined, question_id: undefined }
        })
      )
    )
    owned.close()
  })
})

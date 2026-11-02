import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync, sign } from 'node:crypto'
vi.mock('../services/entityExtractionService.js', () => ({
  extractAndStoreEntities: vi.fn(async () => {})
}))
vi.mock('../services/transcriptService.js', () => ({ compileTranscripts: vi.fn(async () => {}) }))
import { createApp } from '../app.js'
import * as grok from '../services/grokService.js'

let server, base, token
const query = vi.fn()
beforeAll(async () => {
  const secret = 'voice-saving-test-secret-at-least-32-characters'
  vi.stubEnv('JWT_SECRET', secret)
  vi.stubEnv('GROK_API_KEY', 'fake-configured-provider')
  token = jwt.sign({ id: 7, email: 'voice@example.com' }, secret, { expiresIn: '1h' })
  const app = createApp({
    database: { query, connect: async () => ({ query, release() {} }) },
    serveStatic: false
  })
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
beforeEach(() => {
  query.mockReset().mockImplementation(async sql => {
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 7 }] }
    if (sql.includes('SELECT premium_until')) return { rows: [{ premium_until: null }] }
    if (sql.includes('INSERT INTO ai_usage')) return { rows: [] } // Allowance already exhausted.
    if (sql.includes('INSERT INTO stories')) return { rows: [{ id: 21 }] }
    if (sql.includes('questions_since_compile, questions_answered'))
      return { rows: [{ questions_since_compile: 1, questions_answered: ['q1'] }] }
    if (sql.includes('FROM voice_sessions')) return { rows: [{ id: 11, user_id: 7 }] }
    return { rows: [] }
  })
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
function post(path, body) {
  return fetch(base + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('voice persistence after free AI allowance is exhausted', () => {
  it.each(['/api/voice', '/api/v1/voice'])(
    'continues saving and ending an existing session at %s',
    async prefix => {
      const saved = await post(`${prefix}/transcript`, {
        session_id: 11,
        chapter_id: 'earliest-memories',
        question_id: 'q1',
        user_transcript: 'A precious family memory.'
      })
      expect(saved.status).toBe(200)
      expect(await saved.json()).toMatchObject({ success: true, story_id: 21 })
      expect((await post(`${prefix}/end-session`, { session_id: 11 })).status).toBe(200)
      expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(false)
    }
  )
  it('still rejects chargeable manual compilation when the free allowance is exhausted', async () => {
    const response = await post('/api/voice/compile', { session_id: 11 })
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'UPGRADE_REQUIRED' })
  })
  it('preserves exact webhook bytes through the full application middleware stack', async () => {
    const keys = generateKeyPairSync('ed25519')
    vi.stubEnv(
      'TELNYX_PUBLIC_KEY',
      keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64')
    )
    const body = JSON.stringify(
      {
        data: {
          id: 'duplicate-7',
          event_type: 'call.answered',
          payload: { call_control_id: 'call-7' }
        }
      },
      null,
      2
    )
    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = await fetch(base + '/api/telnyx/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'telnyx-timestamp': timestamp,
        'telnyx-signature-ed25519': sign(
          null,
          Buffer.from(`${timestamp}|${body}`),
          keys.privateKey
        ).toString('base64')
      }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(
      query.mock.calls.some(([sql]) => sql.includes('INSERT INTO telnyx_webhook_events'))
    ).toBe(true)
  })
  it('loads persisted voice continuation context without charging quota or calling an AI provider', async () => {
    const baseQuery = query.getMockImplementation()
    query.mockImplementation(async (sql, values) => {
      if (sql.includes('SELECT compiled_content FROM stories'))
        return { rows: [{ compiled_content: 'An existing compiled memory. '.repeat(10) }] }
      if (sql.includes('FROM voice_sessions'))
        return { rows: [{ id: 11, questions_answered: ['q1'] }] }
      return baseQuery(sql, values)
    })
    const provider = vi
      .spyOn(grok, 'grokChat')
      .mockResolvedValue({ content: 'Unexpected paid summary' })
    const response = await fetch(base + '/api/voice/config?chapter=earliest-memories', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
    expect((await response.json()).session.compiledSummary).toContain(
      'An existing compiled memory.'
    )
    expect(provider).not.toHaveBeenCalled()
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(false)
    provider.mockRestore()
  })
})

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import pg from 'pg'
import express from 'express'
import { EventEmitter } from 'node:events'
import { randomBytes, generateKeyPairSync, sign } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { reserveAIUsage } from '../middleware/aiQuota.js'
import { handleVoiceProxy } from '../utils/voiceProxy.js'
vi.mock('../services/grokService.js', () => ({ grokChat: vi.fn() }))
vi.mock('../utils/memoryContext.js', () => ({ getMemoryContext: vi.fn(async () => '') }))
import { grokChat } from '../services/grokService.js'
import { compileTranscripts } from '../services/transcriptService.js'
import telnyxRouter from '../routes/telnyxCall.js'

const connection = process.env.TEST_DATABASE_URL
const suite = connection ? describe : describe.skip
suite('real PostgreSQL voice reservations and signed webhook deduplication', () => {
  const schema = `audit_voice_${randomBytes(6).toString('hex')}`
  const keys = generateKeyPairSync('ed25519')
  let admin, pool, server, base, userId
  const sockets = []
  class Provider extends EventEmitter {
    static instances = []
    constructor() {
      super()
      this.readyState = 0
      Provider.instances.push(this)
    }
    terminate() {
      this.readyState = 3
    }
  }
  const browser = () => {
    const ws = new EventEmitter()
    ws.readyState = 1
    ws.bufferedAmount = 0
    ws.close = vi.fn(() => {
      ws.readyState = 3
      ws.emit('close')
    })
    ws.send = vi.fn()
    sockets.push(ws)
    return ws
  }
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: connection })
    await admin.connect()
    await admin.query(`CREATE SCHEMA ${schema}`)
    await admin.query(`SET search_path TO ${schema}`)
    const directory = new URL('../db/migrations/', import.meta.url)
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort())
      await admin.query(await readFile(new URL(name, directory), 'utf8'))
    await admin.query(`CREATE TABLE event_effects (count INTEGER NOT NULL); INSERT INTO event_effects VALUES(0);
      CREATE FUNCTION count_event_effect() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
        UPDATE event_effects SET count=count+1; RETURN NEW; END $$;
      CREATE TRIGGER count_call_updates AFTER UPDATE ON telnyx_calls FOR EACH ROW EXECUTE FUNCTION count_event_effect();`)
    pool = new pg.Pool({
      connectionString: connection,
      options: `-c search_path=${schema}`,
      max: 8
    })
    const app = express()
    app.locals.db = pool
    app.use('/telnyx', telnyxRouter)
    server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    base = `http://127.0.0.1:${server.address().port}`
  }, 30000)
  beforeEach(async () => {
    await pool.query('TRUNCATE users, telnyx_webhook_events RESTART IDENTITY CASCADE')
    await pool.query('UPDATE event_effects SET count=0')
    userId = (
      await pool.query(
        "INSERT INTO users(email,name) VALUES('voice@example.com','Voice') RETURNING id"
      )
    ).rows[0].id
    Provider.instances.length = 0
    vi.stubEnv('GROK_API_KEY', 'test-configured-provider')
    vi.stubEnv(
      'TELNYX_PUBLIC_KEY',
      keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64')
    )
  })
  afterEach(async () => {
    sockets.splice(0).forEach(ws => {
      if (ws.readyState === 1) ws.close()
    })
    await vi.waitFor(async () =>
      expect(
        Number((await pool.query('SELECT COUNT(*) FROM voice_connection_leases')).rows[0].count)
      ).toBe(0)
    )
    vi.unstubAllEnvs()
  })
  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    if (pool) await pool.end()
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      await admin.end()
    }
  })
  it('limits simultaneous free-user reservations to exactly ten without lost updates', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 16 }, () => reserveAIUsage(pool, userId))
    )
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(10)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(6)
    expect(
      (await pool.query('SELECT request_count FROM ai_usage WHERE user_id=$1', [userId])).rows[0]
        .request_count
    ).toBe(10)
  })
  it('lets only one concurrent proxy instance acquire a user lease and spend usage', async () => {
    const deps = {
      WebSocketImpl: Provider,
      verifyIdentity: async () => ({ id: userId, exp: Math.floor(Date.now() / 1000) + 3600 }),
      rateLimit: async () => ({ allowed: true })
    }
    const first = browser(),
      second = browser()
    await Promise.all(
      [first, second].map(ws =>
        handleVoiceProxy(
          ws,
          { url: '/api/voice/ws?token=valid', headers: { host: 'localhost' } },
          pool,
          deps
        )
      )
    )
    expect(Provider.instances).toHaveLength(1)
    expect([first, second].filter(ws => ws.readyState === 3)).toHaveLength(1)
    expect(
      (await pool.query('SELECT request_count FROM ai_usage WHERE user_id=$1', [userId])).rows[0]
        .request_count
    ).toBe(1)
    expect(
      Number((await pool.query('SELECT COUNT(*) FROM voice_connection_leases')).rows[0].count)
    ).toBe(1)
  })
  it('deduplicates simultaneous valid webhook deliveries transactionally across connections', async () => {
    await pool.query("INSERT INTO telnyx_calls(user_id,call_control_id) VALUES($1,'call-7')", [
      userId
    ])
    const body = JSON.stringify({
      data: { id: 'event-7', event_type: 'call.answered', payload: { call_control_id: 'call-7' } }
    })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const headers = {
      'Content-Type': 'application/json',
      'telnyx-timestamp': timestamp,
      'telnyx-signature-ed25519': sign(
        null,
        Buffer.from(`${timestamp}|${body}`),
        keys.privateKey
      ).toString('base64')
    }
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        fetch(base + '/telnyx/webhook', { method: 'POST', body, headers })
      )
    )
    expect(responses.map(response => response.status)).toEqual([200, 200, 200, 200])
    expect(
      Number((await pool.query('SELECT COUNT(*) FROM telnyx_webhook_events')).rows[0].count)
    ).toBe(1)
    expect((await pool.query('SELECT count FROM event_effects')).rows[0].count).toBe(1)
    expect((await pool.query('SELECT call_status FROM telnyx_calls')).rows[0].call_status).toBe(
      'answered'
    )
  })
  it('keeps newer raw transcripts intact when a slow compilation finishes later', async () => {
    const sessionId = (
      await pool.query(
        "INSERT INTO voice_sessions(user_id,chapter_id) VALUES($1,'childhood') RETURNING id",
        [userId]
      )
    ).rows[0].id
    await pool.query(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,voice_session_id) VALUES($1,'childhood','q1','Original memory',$2)",
      [userId, sessionId]
    )
    grokChat.mockImplementationOnce(async () => {
      await pool.query(
        "UPDATE stories SET answer='New correction',updated_at=clock_timestamp() WHERE user_id=$1",
        [userId]
      )
      return { content: 'Polished old memory' }
    })
    await compileTranscripts(pool, userId, sessionId, ['q1'])
    expect(
      (await pool.query('SELECT answer,compiled_content FROM stories WHERE user_id=$1', [userId]))
        .rows[0]
    ).toEqual({ answer: 'New correction', compiled_content: null })
    expect(
      (
        await pool.query('SELECT questions_since_compile FROM voice_sessions WHERE id=$1', [
          sessionId
        ])
      ).rows[0].questions_since_compile
    ).toBe(1)
    const version = (
      await pool.query('SELECT updated_at::text AS version FROM stories WHERE user_id=$1', [userId])
    ).rows[0].version
    grokChat.mockResolvedValueOnce({ content: 'Polished new correction' })
    await compileTranscripts(pool, userId, sessionId, ['q1'])
    expect(
      (
        await pool.query(
          'SELECT compiled_content,updated_at::text AS version FROM stories WHERE user_id=$1',
          [userId]
        )
      ).rows[0]
    ).toEqual({ compiled_content: 'Polished new correction', version })
  })
})

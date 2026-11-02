import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync, sign, randomUUID } from 'node:crypto'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import { sqlStatements } from './fixtures/sql-statements.mjs'
import { signInternalPhoneRequest, verifyPhoneWebhook } from '../phone/security.js'
import { enqueueScheduledTopicCall, phoneConfiguration } from '../phone/calls.js'

const secret = 'fake-native-phone-signing-secret-at-least-32-characters'
const keys = generateKeyPairSync('ed25519')
const publicKey = keys.publicKey
  .export({ type: 'spki', format: 'der' })
  .subarray(-32)
  .toString('base64')
let providerHold = null
let runtime,
  db,
  dials,
  hangups,
  providerFailure,
  sockets = []
const token = (id = 1, extra = {}) =>
  jwt.sign({ id, email: `phone${id}@example.invalid`, ...extra }, secret, { expiresIn: '1h' })
before(async () => {
  const bundle = fileURLToPath(
    new URL('../../.cloudflare/api-tests/phone-worker.mjs', import.meta.url)
  )
  await build({
    entryPoints: [fileURLToPath(new URL('./fixtures/phone-test-worker.js', import.meta.url))],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers'],
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'phone-api',
          modules: true,
          scriptPath: bundle,
          compatibilityDate: '2026-10-09',
          bindings: {
            JWT_SECRET: secret,
            INTERNAL_CRON_SECRET: secret,
            TELNYX_CALLS_ENABLED: 'true',
            TELNYX_CALLBACKS_VERIFIED: 'true',
            TELNYX_API_KEY: 'fake-phone-telnyx-key',
            GROK_API_KEY: 'fake-phone-voice-key',
            TELNYX_PUBLIC_KEY: publicKey,
            TELNYX_CONNECTION_ID: 'fake-connection',
            TELNYX_PHONE_NUMBER: '+441234567890',
            TELNYX_CALLBACK_ORIGIN: 'https://phone-api.invalid'
          },
          d1Databases: { DB: 'phone-db' },
          durableObjects: { PHONE_SESSIONS: { className: 'TestPhoneSession', useSQLite: true } },
          serviceBindings: {
            VOICE_PROVIDER: 'phone-provider',
            TELNYX_FETCH: async request => {
              assert.equal(new URL(request.url).origin, 'https://api.telnyx.com')
              assert.equal(request.headers.get('Authorization'), 'Bearer fake-phone-telnyx-key')
              const body = await request.json()
              if (new URL(request.url).pathname.endsWith('/actions/hangup')) {
                hangups.push({ body, url: request.url })
                return Response.json({ data: { result: 'ok' } })
              }
              dials.push(body)
              if (providerHold) await providerHold
              if (providerFailure) throw new Error('Synthetic uncertain network outcome')
              return Response.json({ data: { call_control_id: `fake-control-${body.command_id}` } })
            }
          }
        },
        {
          name: 'phone-provider',
          modules: true,
          scriptPath: fileURLToPath(
            new URL('./fixtures/phone-provider-worker.js', import.meta.url)
          ),
          compatibilityDate: '2026-10-09'
        }
      ]
    })
  )
  db = await runtime.getD1Database('DB', 'phone-api')
  for (const file of [
    '../db/schema.sql',
    ...(await readdir(new URL('./migrations/', import.meta.url)))
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => `./migrations/${file}`)
  ]) {
    await db.batch(
      sqlStatements(await readFile(new URL(file, import.meta.url), 'utf8')).map(sql =>
        db.prepare(sql)
      )
    )
  }
})
after(async () => {
  for (const socket of sockets) {
    try {
      socket.close()
    } catch {
      /* Already closed. */
    }
  }
  await runtime?.dispose()
})
beforeEach(async () => {
  for (const socket of sockets) {
    try {
      socket.close()
    } catch {
      /* Already closed. */
    }
  }
  sockets = []
  dials = []
  hangups = []
  providerFailure = false
  providerHold = null
  await db.batch(
    ['phone_commands', 'telnyx_webhook_events', 'users'].map(table =>
      db.prepare(`DELETE FROM ${table}`)
    )
  )
  await db
    .prepare(
      "INSERT INTO users(id,email,name,premium_until,phone_number,phone_call_consent,contact_preference) VALUES(1,'phone1@example.invalid','Author','2099-01-01 00:00:00','+441234567891',1,'phone'),(2,'phone2@example.invalid','Other',NULL,NULL,0,'email')"
    )
    .run()
})
function call(path, body, extra = {}) {
  return runtime.dispatchFetch(`https://phone-api.invalid/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
}
async function start(extra = {}) {
  const response = await call('/telnyx/request-call', { phoneNumber: '+441234567891' }, extra)
  const data = await response.json()
  assert.equal(response.status, 200, JSON.stringify(data))
  return data
}
async function row(id) {
  return db.prepare('SELECT * FROM phone_interviews WHERE id = ?').bind(id).first()
}
async function connect(dial = dials.at(-1)) {
  const response = await runtime.dispatchFetch(dial.stream_url.replace('wss:', 'https:'), {
    headers: { Upgrade: 'websocket' }
  })
  if (response.webSocket) {
    response.webSocket.accept()
    sockets.push(response.webSocket)
  }
  return response
}
const begin = (socket, dial = dials.at(-1), changes = {}) =>
  socket.send(
    JSON.stringify({
      event: 'start',
      stream_id: 'fake-stream',
      start: {
        call_control_id: `fake-control-${dial.command_id}`,
        client_state: dial.client_state,
        media_format: { encoding: 'PCMU', sample_rate: 8000, channels: 1 },
        ...changes
      }
    })
  )
const media = (socket, chunk, payload) =>
  socket.send(
    JSON.stringify({
      event: 'media',
      stream_id: 'fake-stream',
      media: { track: 'inbound', chunk: String(chunk), payload }
    })
  )
async function until(check) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const value = await check()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 15))
  }
  throw new Error('Timed out waiting for synthetic phone event')
}
function next(socket, type = 'message') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Phone ${type} timeout`)), 5000)
    socket.addEventListener(
      type,
      event => {
        clearTimeout(timer)
        resolve(event)
      },
      { once: true }
    )
  })
}
function webhook(event, now = Date.now(), raw) {
  const body = raw || JSON.stringify({ data: event }),
    timestamp = String(Math.floor(now / 1000))
  const signature = sign(null, Buffer.from(timestamp + '|' + body), keys.privateKey).toString(
    'base64'
  )
  return runtime.dispatchFetch('https://phone-api.invalid/api/telnyx/webhook', {
    method: 'POST',
    headers: { 'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': signature },
    body
  })
}

test('admission is idempotent, owner scoped, bounded and sends the reviewed PCMU dial contract', async () => {
  assert.throws(
    () => phoneConfiguration({}),
    error => error.body.code === 'PHONE_CALLS_DISABLED'
  )
  assert.deepEqual(await enqueueScheduledTopicCall({}, {}), { skipped: true, reason: 'disabled' })
  const key = randomUUID(),
    first = await start({ 'Idempotency-Key': key }),
    same = await start({ 'Idempotency-Key': key })
  assert.equal(same.request_id, first.request_id)
  assert.equal(dials.length, 1)
  const dial = dials[0]
  assert.equal(dial.stream_codec, 'PCMU')
  assert.equal(dial.stream_track, 'inbound_track')
  assert.equal(dial.stream_bidirectional_mode, 'rtp')
  assert.equal(dial.retry_on_timeout, false)
  assert.ok(dial.time_limit_secs <= 1770)
  assert.equal(dial.timeout_secs, 30)
  assert.equal(new URL(dial.webhook_url).origin, 'https://phone-api.invalid')
  assert.equal((await call('/telnyx/request-call', { phoneNumber: '+441234567891' })).status, 409)
  assert.equal(
    (
      await call(`/telnyx/calls/${first.request_id}`, undefined, {
        Authorization: `Bearer ${token(2)}`
      })
    ).status,
    404
  )
  assert.equal(
    (
      await call(
        '/telnyx/request-call',
        { phoneNumber: '+441234567891' },
        { Authorization: `Bearer ${token(1, { scope: 'magic' })}` }
      )
    ).status,
    403
  )
})

test('private cron calls require a fresh body-bound signature and matching stored consent', async () => {
  const body = JSON.stringify({
    userId: 2,
    requestId: randomUUID(),
    phoneNumber: '+441234567892',
    prompt: { text: 'Your first school', chapter_id: 'school', question_id: 'first-day' }
  })
  const signed = await signInternalPhoneRequest(
    secret,
    new TextEncoder().encode(body),
    '/api/telnyx/call'
  )
  const send = (value = body, headers = {}) =>
    runtime.dispatchFetch('https://phone-api.invalid/api/telnyx/call', {
      method: 'POST',
      headers: {
        'X-Internal-Timestamp': signed.timestamp,
        'X-Internal-Signature': signed.signature,
        ...headers
      },
      body: value
    })
  assert.equal((await send()).status, 409)
  assert.equal(dials.length, 0)
  await db
    .prepare("UPDATE users SET phone_number = '+441234567892',phone_call_consent = 1 WHERE id = 2")
    .run()
  assert.equal((await send(body + ' ')).status, 403)
  assert.equal(
    (await send(body, { 'X-Internal-Timestamp': String(Number(signed.timestamp) - 301) })).status,
    403
  )
  assert.equal((await send()).status, 200)
  assert.equal((await send()).status, 200)
  assert.equal(dials.length, 1)
})

test('Ed25519 authenticates exact bytes and timestamp, while callbacks dedupe and preserve terminal state', async () => {
  const started = await start(),
    control = started.call_control_id
  const event = {
    id: randomUUID(),
    event_type: 'call.answered',
    payload: { call_control_id: control }
  }
  const raw = '{ "data": ' + JSON.stringify(event) + ' }'
  assert.equal((await webhook(event, Date.now(), raw)).status, 200)
  assert.equal((await webhook(event, Date.now(), raw)).status, 200)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM telnyx_webhook_events').first()).n, 1)
  assert.equal((await row(started.request_id)).state, 'answered')
  assert.equal((await webhook(event, Date.now() - 301_000)).status, 400)
  const timestamp = String(Math.floor(Date.now() / 1000)),
    signature = sign(null, Buffer.from(timestamp + '|' + raw), keys.privateKey).toString('base64')
  assert.equal(
    await verifyPhoneWebhook(
      new TextEncoder().encode(raw + ' '),
      new Headers({ 'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': signature }),
      publicKey
    ),
    false
  )
  await webhook({ ...event, id: randomUUID(), event_type: 'call.hangup' })
  await webhook({ ...event, id: randomUUID() })
  assert.equal((await row(started.request_id)).state, 'ending')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_commands').first()).n, 1)
})

test('transcripts append to original writing atomically, dedupe, invalidate compilation and retain concurrent edits', async () => {
  await db
    .prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,compiled_content,compiled_at) VALUES(1,'school','first-day','My original words.','Old compile','2026-01-01 00:00:00')"
    )
    .run()
  const body = JSON.stringify({
    userId: 1,
    requestId: randomUUID(),
    phoneNumber: '+441234567891',
    prompt: { text: 'Your school', chapter_id: 'school', question_id: 'first-day' }
  })
  const signed = await signInternalPhoneRequest(
    secret,
    new TextEncoder().encode(body),
    '/api/telnyx/call'
  )
  const response = await runtime.dispatchFetch('https://phone-api.invalid/api/telnyx/call', {
    method: 'POST',
    headers: { 'X-Internal-Timestamp': signed.timestamp, 'X-Internal-Signature': signed.signature },
    body
  })
  assert.equal(response.status, 200)
  const { request_id: id } = await response.json()
  const append = (eventId, value) => call('/__test__/append', { id, eventId, value })
  assert.equal((await append('one', 'The teacher was kind.')).status, 200)
  assert.equal((await append('one', 'The teacher was kind.')).status, 200)
  let story = await db
    .prepare("SELECT * FROM stories WHERE user_id = 1 AND chapter_id = 'school'")
    .first()
  assert.equal(story.answer, 'My original words.\n\nThe teacher was kind.')
  assert.equal(story.compiled_content, null)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM story_outbox').first()).n, 1)
  assert.equal((await append('one', 'Changed replay')).status, 409)
  await db
    .prepare(
      "UPDATE stories SET answer = 'A newer author edit.',updated_at = '2090-01-01 00:00:00' WHERE id = ?"
    )
    .bind(story.id)
    .run()
  const conflicted = await append('two', 'Another phone sentence.')
  assert.equal((await conflicted.json()).conflict, true)
  story = await db.prepare('SELECT * FROM stories WHERE id = ?').bind(story.id).first()
  assert.equal(story.answer, 'A newer author edit.')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n, 2)
  await call('/__test__/finalize', { id })
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM voice_compilation_jobs').first()).n, 0)
})

test('real workerd socket relays PCMU in chunk order and saves only final author transcripts', async () => {
  const started = await start(),
    response = await connect()
  assert.equal(response.status, 101)
  assert.equal((await connect()).status, 401)
  begin(response.webSocket)
  await until(async () => (await row(started.request_id)).stream_id)
  const received = next(response.webSocket)
  const one = Buffer.from('a'.repeat(160)).toString('base64'),
    two = Buffer.from('b'.repeat(160)).toString('base64')
  media(response.webSocket, 2, two)
  media(response.webSocket, 1, one)
  const emitted = JSON.parse((await received).data)
  assert.equal(emitted.event, 'media')
  assert.equal(Buffer.from(emitted.media.payload, 'base64').length, 160)
  await until(
    async () =>
      (await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n === 2
  )
  const messages = await (await call('/__test__/provider')).json()
  const session = messages.findLast(value => value.type === 'session.update').session
  assert.equal(session.audio.input.format.type, 'audio/pcmu')
  assert.equal(session.audio.output.format.type, 'audio/pcmu')
  assert.deepEqual(session.tools, [])
  assert.deepEqual(
    messages
      .filter(value => value.type === 'input_audio_buffer.append')
      .slice(-2)
      .map(value => value.audio),
    [one, two]
  )
  const story = await db.prepare('SELECT answer FROM stories WHERE user_id = 1').first()
  assert.equal(story.answer, 'I remember the old garden.\nI remember the old garden.')
  await call('/__test__/finish', { id: started.request_id })
  await call('/__test__/finalize', { id: started.request_id })
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM voice_compilation_jobs').first()).n, 1)
})

test('revocation closes a connected phone, releases only its lease and delivers one idempotent hangup', async () => {
  const started = await start(),
    response = await connect()
  begin(response.webSocket)
  await until(async () => (await row(started.request_id)).stream_id)
  const closed = next(response.webSocket, 'close')
  await db.prepare('UPDATE users SET phone_call_consent = 0 WHERE id = 1').run()
  await call('/__test__/recheck', { id: started.request_id })
  await closed
  assert.equal((await row(started.request_id)).state, 'completed')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM voice_connection_leases').first()).n, 0)
  assert.equal(hangups.length, 1)
  await call('/__test__/maintenance', {})
  assert.equal(hangups.length, 1)
  assert.equal(
    (
      await call('/__test__/append', {
        id: started.request_id,
        eventId: 'late',
        value: 'Must not save.'
      })
    ).status,
    409
  )
})

test('cross-channel exclusion, transcript authorization and hourly admission limits fail closed', async () => {
  await db
    .prepare('INSERT INTO voice_connection_leases(user_id,lease_id,expires_at) VALUES(1,?,?)')
    .bind(randomUUID(), new Date(Date.now() + 90_000).toISOString())
    .run()
  assert.equal((await call('/telnyx/request-call', { phoneNumber: '+441234567891' })).status, 409)
  await db.prepare('DELETE FROM voice_connection_leases').run()
  const auth = token(),
    started = await start({ Authorization: `Bearer ${auth}` })
  const revoked = jwt.decode(auth)
  // Native legacy JWT revocation uses the complete token when jti is absent.
  await db
    .prepare('INSERT INTO user_token_invalidation(user_id,invalidated_at) VALUES(1,?)')
    .bind(new Date(revoked.iat * 1000).toISOString())
    .run()
  assert.equal(
    (await call('/__test__/append', { id: started.request_id, eventId: 'late', value: 'Revoked.' }))
      .status,
    409
  )
  await db.prepare('DELETE FROM user_token_invalidation').run()
  await call('/__test__/finish', { id: started.request_id })
  for (let i = 0; i < 2; i++) {
    const callData = await start()
    await call('/__test__/finish', { id: callData.request_id })
  }
  assert.equal((await call('/telnyx/request-call', { phoneNumber: '+441234567891' })).status, 409)
  assert.equal(dials.length, 3)
})

test('scheduled calls dedupe by local occurrence, expire within24h and never redial an ambiguous provider outcome', async () => {
  const intent = {
    userId: 1,
    prompt: { text: 'Your first school' },
    occurrenceKey: 'weekly-topic:1:2026-11-02'
  }
  assert.equal((await (await call('/__test__/schedule', intent)).json()).enqueued, true)
  assert.equal((await (await call('/__test__/schedule', intent)).json()).enqueued, false)
  providerFailure = true
  await call('/__test__/maintenance', {})
  assert.equal(dials.length, 1)
  assert.equal(
    (await db.prepare('SELECT state FROM phone_outreach').first()).state,
    'needs_reconciliation'
  )
  await call('/__test__/maintenance', {})
  assert.equal(dials.length, 1)
  await db.prepare('UPDATE phone_outreach SET occurrence_key = ?').bind('old').run()
  await call('/__test__/schedule', intent)
  await db
    .prepare("UPDATE phone_outreach SET expires_at = ? WHERE state = 'pending'")
    .bind(Date.now() - 1)
    .run()
  await call('/__test__/maintenance', {})
  assert.equal(dials.length, 1)
  assert.equal(
    (
      await db
        .prepare('SELECT state FROM phone_outreach WHERE occurrence_key = ?')
        .bind(intent.occurrenceKey)
        .first()
    ).state,
    'cancelled'
  )
})

test('wrong stream identity never reaches AI; account deletion erases transcripts while retaining a minimal hangup intent', async () => {
  await start()
  const response = await connect(),
    closed = next(response.webSocket, 'close')
  const forged = JSON.parse(atob(dials[0].client_state))
  forged.userId = 2
  begin(response.webSocket, dials[0], { client_state: btoa(JSON.stringify(forged)) })
  await closed
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n, 0)
  const second = await start(),
    other = await connect()
  begin(other.webSocket)
  await until(async () => (await row(second.request_id)).stream_id)
  await call('/__test__/append', {
    id: second.request_id,
    eventId: 'one',
    value: 'Private memory.'
  })
  await call('/__test__/cancel', { userId: 1 })
  await db.prepare('DELETE FROM users WHERE id = 1').run()
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_interviews').first()).n, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n, 0)
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS n FROM phone_commands WHERE state = 'pending' AND request_id IS NULL"
        )
        .first()
    ).n,
    1
  )
  await call('/__test__/recheck', { id: second.request_id })
  assert.ok(hangups.some(value => value.url.includes(encodeURIComponent(second.call_control_id))))
})

test('a transcript/outbox failure rolls the entire D1 batch back before a retry', async () => {
  const started = await start()
  await db
    .prepare(
      "CREATE TRIGGER phone_test_abort BEFORE INSERT ON story_outbox BEGIN SELECT RAISE(ABORT,'synthetic outbox failure'); END"
    )
    .run()
  try {
    assert.equal(
      (
        await call('/__test__/append', {
          id: started.request_id,
          eventId: 'atomic',
          value: 'An atomic memory.'
        })
      ).status,
      500
    )
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n,
      0
    )
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM stories').first()).n, 0)
    assert.equal((await row(started.request_id)).transcript_bytes, 0)
  } finally {
    await db.prepare('DROP TRIGGER phone_test_abort').run()
  }
  assert.equal(
    (
      await call('/__test__/append', {
        id: started.request_id,
        eventId: 'atomic',
        value: 'An atomic memory.'
      })
    ).status,
    200
  )
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM story_outbox').first()).n, 1)
})

test('a call resolving after account erasure is hung up using only its minimal provider control', async () => {
  let release
  providerHold = new Promise(resolve => {
    release = resolve
  })
  const pending = call('/telnyx/request-call', { phoneNumber: '+441234567891' })
  await until(() => dials.length)
  await db.prepare('DELETE FROM users WHERE id = 1').run()
  release()
  assert.equal((await pending).status, 503)
  assert.equal(hangups.length, 1)
  const command = await db.prepare('SELECT * FROM phone_commands').first()
  assert.equal(command.request_id, null)
  assert.equal(command.state, 'completed')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_interviews').first()).n, 0)
})

test('lease replacement and oversized frames terminate sockets without clearing a newer channel lease', async () => {
  const started = await start(),
    response = await connect()
  begin(response.webSocket)
  await until(async () => (await row(started.request_id)).stream_id)
  const replacement = randomUUID(),
    closed = next(response.webSocket, 'close')
  await db
    .prepare('UPDATE voice_connection_leases SET lease_id = ? WHERE user_id = 1')
    .bind(replacement)
    .run()
  media(response.webSocket, 1, Buffer.from('a'.repeat(160)).toString('base64'))
  await closed
  await until(
    async () =>
      (await db.prepare('SELECT state FROM phone_commands').first())?.state === 'completed'
  )
  assert.equal(
    (await db.prepare('SELECT lease_id FROM voice_connection_leases WHERE user_id = 1').first())
      .lease_id,
    replacement
  )
  await db.prepare('DELETE FROM voice_connection_leases').run()
  await start()
  const second = await connect(),
    oversized = next(second.webSocket, 'close')
  second.webSocket.send('x'.repeat(256 * 1024 + 1))
  await oversized
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_transcript_events').first()).n, 0)
})

test('abandoned dialing recovers locally and a late signed callback queues its newly learned control for hangup', async () => {
  providerFailure = true
  const response = await call('/telnyx/request-call', { phoneNumber: '+441234567891' })
  const { request_id: id } = await response.json()
  assert.equal(response.status, 503)
  await db
    .prepare('UPDATE phone_interviews SET created_at = ? WHERE id = ?')
    .bind(Date.now() - 61_000, id)
    .run()
  await call('/__test__/maintenance', {})
  assert.equal((await row(id)).finalized, 1)
  const event = {
    id: randomUUID(),
    event_type: 'call.answered',
    payload: { call_control_id: 'late-vendor-control', client_state: dials[0].client_state }
  }
  assert.equal((await webhook(event)).status, 200)
  assert.equal((await row(id)).state, 'completed')
  await call('/__test__/maintenance', {})
  assert.ok(hangups.some(value => value.url.includes('late-vendor-control')))
  assert.equal(dials.length, 1)
})

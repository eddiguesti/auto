import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'

const root = fileURLToPath(new URL('../../', import.meta.url))
const bundle = `${root}/.cloudflare/api-tests/voice-uploads-worker.mjs`
const secret = 'voice-upload-fixture-key-with-at-least-32-characters'
let runtime, db, media, providerCalls
const webm = new Uint8Array([26, 69, 223, 163, 0, 0, 0, 0, ...new TextEncoder().encode('webm'), 0])
before(async () => {
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import worker from './cloudflare/api-staging.js'
    export default {async fetch(request,env) {
      if(request.headers.has('X-Test-No-Key')) env={...env,GROK_API_KEY:''}
      if(request.headers.has('X-Test-Lost-Commit')) {
        const database=env.DB
        env={...env,DB:{withSession:(...args)=>{
          const session=database.withSession(...args)
          return {prepare:sql=>session.prepare(sql),batch:async statements=>{await session.batch(statements);throw new Error('lost acknowledgement')}}
        }}}
      }
      if(request.headers.has('X-Test-Storage-Failure')) {
        const bucket=env.MEDIA
        env={...env,MEDIA:{
        put:async(key,body,opts)=>{await bucket.put(key,body,opts);throw new Error('partial store')},
        delete:async(key)=>bucket.delete(key)}}
      }
      if(request.headers.has('X-Test-Cleanup-Failure')) {
        const bucket=env.MEDIA
        env={...env,MEDIA:{put:async(key,body,opts)=>{await bucket.put(key,body,opts);throw new Error('partial store')},delete:()=>{throw new Error('cleanup down')}}}
      }
      return worker.fetch(request,env)
    }}
  `
    },
    outfile: bundle,
    bundle: true,
    external: ['cloudflare:workers', 'node:buffer'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'voice-uploads-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        GROK_API_KEY: 'provider-fixture'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000016' },
      r2Buckets: ['MEDIA'],
      serviceBindings: {
        XAI_FETCH: async request => {
          const form = await request.formData()
          const file = form.get('file'),
            bytes = new Uint8Array(await file.arrayBuffer())
          providerCalls.push({
            url: request.url,
            fields: [...form.keys()],
            type: file.type,
            name: file.name,
            bytes
          })
          if (bytes.at(-1) === 9) return new Response('private provider failure', { status: 500 })
          if (bytes.at(-1) === 8) return Response.json({ text: 1 })
          if (bytes.at(-1) === 7) return new Response('x'.repeat(600000))
          return Response.json({ text: 'A family holiday.', duration: 1.2 })
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  media = await runtime.getR2Bucket('MEDIA')
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
  await db.batch(
    schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(sql => sql.trim())
      .filter(Boolean)
      .map(sql => db.prepare(sql))
  )
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.prepare('DROP TRIGGER IF EXISTS reject_recording').run()
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM media_deletion_jobs').run()
  await db.prepare('DELETE FROM token_blacklist').run()
  await db
    .prepare(
      "INSERT INTO users (id,email,name) VALUES (1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  const objects = await media.list()
  await Promise.all(objects.objects.map(object => media.delete(object.key)))
  providerCalls = []
})
function token(id = 1, extra = {}) {
  return jwt.sign({ id, email: `${id}@example.com`, jti: crypto.randomUUID(), ...extra }, secret, {
    expiresIn: '1h'
  })
}
function form(bytes = webm) {
  const value = new FormData()
  value.append('audio', new Blob([bytes], { type: 'application/octet-stream' }), 'untrusted.exe')
  return value
}
async function request(path = '/api/voice/upload', options = {}) {
  const { auth = token(), ...init } = options
  const url = `https://api-staging.invalid${path}`
  const wire = new Request(url, {
    method: 'POST',
    body: form(),
    ...init,
    headers: { Authorization: `Bearer ${auth}`, ...init.headers }
  })
  return runtime.dispatchFetch(url, {
    method: wire.method,
    headers: Object.fromEntries(wire.headers),
    ...(wire.body ? { body: new Uint8Array(await wire.arrayBuffer()) } : {})
  })
}
test('both prefixes store actual WebM bytes with private owner playback and source response shape', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    const response = await request(`${prefix}/voice/upload`)
    assert.equal(response.status, 201)
    const { success, data } = await response.json()
    assert.equal(success, true)
    assert.equal(data.transcript, 'A family holiday.')
    assert.equal(data.duration, 2)
    assert.match(data.audioUrl, /^\/api\/voice\/uploads\/[a-f0-9-]+$/)
    const row = await db
      .prepare('SELECT * FROM voice_uploads WHERE id = ?')
      .bind(data.audioUrl.split('/').at(-1))
      .first()
    assert.equal(row.user_id, 1)
    assert.equal(row.content_type, 'audio/webm')
    assert.equal(row.duration, 2)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM media_deletion_jobs').first()).n, 0)
    const playback = await request(data.audioUrl, { method: 'GET', body: undefined })
    assert.equal(playback.status, 200)
    assert.equal(playback.headers.get('Content-Type'), 'audio/webm')
    assert.equal(playback.headers.get('Cache-Control'), 'private, no-store')
    assert.deepEqual(new Uint8Array(await playback.arrayBuffer()), webm)
    assert.equal(
      (await request(data.audioUrl, { method: 'GET', body: undefined, auth: token(2) })).status,
      404
    )
    assert.equal(
      (await request(`${prefix}/voice/uploads/not-a-uuid`, { method: 'GET', body: undefined }))
        .status,
      404
    )
  }
  assert.equal(providerCalls.length, 2)
  assert.deepEqual(providerCalls[0].fields, ['model', 'file'])
  assert.equal(providerCalls[0].url, 'https://api.x.ai/v1/stt')
  assert.equal(providerCalls[0].type, 'audio/webm')
  assert.equal(providerCalls[0].name, 'recording.webm')
})
test('unsupported media, duplicate files, missing configuration and restricted scope spend no quota', async () => {
  assert.equal((await request(undefined, { body: form(new Uint8Array([1, 2, 3])) })).status, 400)
  const duplicate = form()
  duplicate.append('audio', new Blob([webm]), 'second.webm')
  assert.equal((await request(undefined, { body: duplicate })).status, 400)
  assert.equal((await request(undefined, { headers: { 'X-Test-No-Key': '1' } })).status, 503)
  assert.equal((await request(undefined, { auth: token(1, { scope: 'magic_link' }) })).status, 403)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM ai_usage').first()).n, 0)
  assert.equal(providerCalls.length, 0)
})
test('daily quota atomically admits at most ten concurrent free operations; premium bypasses', async () => {
  const responses = await Promise.all(Array.from({ length: 14 }, () => request()))
  assert.equal(responses.filter(r => r.status === 201).length, 10)
  assert.equal(responses.filter(r => r.status === 403).length, 4)
  assert.equal(providerCalls.length, 10)
  assert.equal(
    (await db.prepare('SELECT request_count FROM ai_usage WHERE user_id=1').first()).request_count,
    10
  )
  await db.prepare("UPDATE users SET premium_until='2099-01-01 00:00:00' WHERE id=1").run()
  assert.equal((await request()).status, 201)
  assert.equal(
    (await db.prepare('SELECT request_count FROM ai_usage WHERE user_id=1').first()).request_count,
    10
  )
})
test('failed and oversized provider responses cannot store a recording or disclose provider text', async () => {
  for (const marker of [9, 8, 7]) {
    const bytes = webm.slice()
    bytes[bytes.length - 1] = marker
    const response = await request(undefined, { body: form(bytes) })
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), {
      error: 'Audio transcription temporarily unavailable'
    })
  }
  assert.equal((await db.prepare('SELECT count(*) AS n FROM voice_uploads').first()).n, 0)
  assert.equal((await media.list()).objects.length, 0)
})
test('metadata failures and partial R2 writes compensate, retaining durable cleanup when R2 is unavailable', async () => {
  await db.exec(
    "CREATE TRIGGER reject_recording BEFORE INSERT ON voice_uploads BEGIN SELECT RAISE(ABORT,'test metadata failure'); END;"
  )
  assert.equal((await request()).status, 503)
  assert.equal((await media.list()).objects.length, 0)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM media_deletion_jobs').first()).n, 0)
  await db.prepare('DROP TRIGGER reject_recording').run()
  assert.equal(
    (await request(undefined, { headers: { 'X-Test-Storage-Failure': '1' } })).status,
    503
  )
  assert.equal((await media.list()).objects.length, 0)
  assert.equal(
    (await request(undefined, { headers: { 'X-Test-Cleanup-Failure': '1' } })).status,
    503
  )
  const pending = await db
    .prepare('SELECT object_key,next_attempt_at FROM media_deletion_jobs')
    .first()
  assert.ok(pending.object_key.startsWith('recordings/1/'))
  assert.ok(new Date(pending.next_attempt_at.replace(/\+00$/, 'Z')).getTime() > Date.now())
  assert.equal((await media.list()).objects.length, 1)
})
test('missing private objects, revoked tokens and deleted owners fail closed', async () => {
  const auth = token()
  const result = await (await request(undefined, { auth })).json()
  const row = await db.prepare('SELECT object_key FROM voice_uploads').first()
  await media.delete(row.object_key)
  assert.equal(
    (await request(result.data.audioUrl, { method: 'GET', body: undefined, auth })).status,
    404
  )
  assert.equal((await request('/api/auth/logout', { body: undefined, auth })).status, 200)
  assert.equal((await request(undefined, { auth })).status, 401)
  await db.prepare("UPDATE users SET deleted_at='2026-01-01 00:00:00' WHERE id=2").run()
  assert.equal((await request(undefined, { auth: token(2) })).status, 401)
})

test('a lost D1 commit acknowledgement cannot erase a successfully attached private recording', async () => {
  const response = await request(undefined, { headers: { 'X-Test-Lost-Commit': '1' } })
  assert.equal(response.status, 503)
  const row = await db.prepare('SELECT object_key,transcript FROM voice_uploads').first()
  assert.equal(row.transcript, 'A family holiday.')
  const object = await media.get(row.object_key)
  assert.ok(object)
  assert.deepEqual(new Uint8Array(await object.arrayBuffer()), webm)
})

import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'

const root = fileURLToPath(new URL('../../', import.meta.url))
const bundle = `${root}/.cloudflare/api-tests/photos-worker.mjs`
const secret = 'photos-native-test-key-with-at-least-32-characters'
let runtime, db, media
let providerCalls = []
before(async () => {
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import worker from './cloudflare/api-staging.js'
    export default {async fetch(request,env) {
      // Fault injection exists only in this generated test harness.
      if(request.headers.has('X-Test-Storage-Down')) env={...env,MEDIA:{
        get:()=>{throw new Error('R2 down')}, put:()=>{throw new Error('R2 down')}, delete:()=>{throw new Error('R2 down')}
      }}
      if(request.headers.has('X-Test-No-Key')) env={...env,GROK_API_KEY:''}
      return worker.fetch(request,env)
    }}
  `
    },
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'photos-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        GROK_API_KEY: 'provider-fixture-key'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000006' },
      r2Buckets: ['MEDIA'],
      serviceBindings: {
        XAI_FETCH: async request => {
          const payload = await request.json()
          providerCalls.push({
            url: request.url,
            authorization: request.headers.get('Authorization'),
            payload
          })
          const data = payload.messages[0].content[1].image_url.url
          const marker = Buffer.from(data.split(',')[1], 'base64').at(-1)
          if (marker === 9) return new Response('provider secret failure', { status: 429 })
          const analysis =
            marker === 8
              ? { description: 'Incomplete' }
              : {
                  description: 'A family garden. xai-' + 'z'.repeat(25),
                  era: '1960s',
                  people_count: 2,
                  setting: 'garden',
                  questions: ['Who was there?', 'What did the flowers smell like?']
                }
          return Response.json({ choices: [{ message: { content: JSON.stringify(analysis) } }] })
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
  await db.prepare('DROP TRIGGER IF EXISTS reject_photo').run()
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM token_blacklist').run()
  await db
    .prepare(
      "INSERT INTO users (id,email,name) VALUES (1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories (id,user_id,chapter_id,question_id,answer) VALUES (1,1,'earliest-memories','garden','A garden'),(2,2,'earliest-memories','beach','A beach')"
    )
    .run()
  const objects = await media.list()
  await Promise.all(objects.objects.map(object => media.delete(object.key)))
  providerCalls = []
})
function token(userId = 1) {
  return jwt.sign(
    { id: userId, email: `${userId === 1 ? 'one' : 'two'}@example.com`, jti: crypto.randomUUID() },
    secret,
    { expiresIn: '1h' }
  )
}
function form({
  bytes = [255, 216, 255, 0],
  type = 'image/jpeg',
  storyId = '1',
  caption = 'The garden',
  chapterId
} = {}) {
  const data = new FormData()
  data.append('photo', new Blob([new Uint8Array(bytes)], { type }), 'family.jpg')
  if (storyId !== null) data.append('story_id', storyId)
  if (caption !== null) data.append('caption', caption)
  if (chapterId) data.append('chapter_id', chapterId)
  return data
}
async function request(
  path,
  { method = 'GET', body, userId = 1, auth = token(userId), headers = {} } = {}
) {
  const url = `http://localhost${path}`
  const wire = new Request(url, {
    method,
    headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers },
    ...(body ? { body } : {})
  })
  return runtime.dispatchFetch(url, {
    method,
    headers: Object.fromEntries(wire.headers),
    ...(body ? { body: new Uint8Array(await wire.arrayBuffer()) } : {})
  })
}

test('R2 uploads preserve bytes, metadata and owner-scoped lists through both API prefixes', async () => {
  const response = await request('/api/photos', { method: 'POST', body: form() })
  assert.equal(response.status, 200)
  const saved = await response.json()
  assert.equal(saved.success, true)
  const object = await media.get(saved.filename)
  assert.deepEqual([...new Uint8Array(await object.arrayBuffer())], [255, 216, 255, 0])
  assert.equal(object.httpMetadata.contentType, 'image/jpeg')
  const row = await db.prepare('SELECT * FROM photos WHERE id=?').bind(saved.id).first()
  assert.equal(row.user_id, 1)
  assert.equal(row.original_name, 'family.jpg')
  for (const prefix of ['/api', '/api/v1']) {
    const list = await (await request(`${prefix}/photos/story/1`)).json()
    assert.equal(list[0].caption, 'The garden')
    assert.match(list[0].created_at, /Z$/)
    assert.deepEqual(await (await request(`${prefix}/photos/story/1`, { userId: 2 })).json(), [])
    assert.equal(
      (await request(`${prefix}/photos/file/${saved.filename}`, { userId: 2 })).status,
      403
    )
  }
  const file = await request(`/api/photos/file/${saved.filename}`)
  assert.equal(file.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(file.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal((await request('/api/photos/story/1', { auth: null })).status, 401)
})

test('unowned stories and disguised images cause no storage/database writes', async () => {
  for (const [options, status] of [
    [{ storyId: '2' }, 403],
    [{ storyId: '1 OR 1=1' }, 400],
    [{ storyId: null }, 400],
    [{ type: 'image/png' }, 400],
    [{ type: 'text/html' }, 400],
    [{ type: 'image/webp', bytes: [...Buffer.from('RIFFxxxxWAVE')] }, 400]
  ])
    assert.equal(
      (await request('/api/photos', { method: 'POST', body: form(options) })).status,
      status
    )
  assert.equal((await media.list()).objects.length, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM photos').first()).count, 0)
})

test('WebP content requires both RIFF and WEBP identifiers', async () => {
  const response = await request('/api/photos', {
    method: 'POST',
    body: form({ type: 'image/webp', bytes: [...Buffer.from('RIFFxxxxWEBP')] })
  })
  assert.equal(response.status, 200)
  assert.match((await response.json()).filename, /\.webp$/)
})

test('multipart duplicate fields and oversized uploads are rejected before R2 writes', async () => {
  const duplicate = form()
  duplicate.append('story_id', '2')
  assert.equal((await request('/api/photos', { method: 'POST', body: duplicate })).status, 400)
  const large = new Uint8Array(10 * 1024 * 1024 + 1)
  large.set([255, 216, 255])
  assert.equal(
    (await request('/api/photos', { method: 'POST', body: form({ bytes: large }) })).status,
    413
  )
  assert.equal((await media.list()).objects.length, 0)
})

test('a failed D1 insert compensates its R2 object rather than leaving an unreferenced upload', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_photo BEFORE INSERT ON photos BEGIN SELECT RAISE(ABORT,'blocked'); END"
    )
    .run()
  assert.equal((await request('/api/photos', { method: 'POST', body: form() })).status, 503)
  assert.equal((await media.list()).objects.length, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM photos').first()).count, 0)
})

test('R2 failures preserve metadata for retry; unauthorized deletion cannot remove another owner object', async () => {
  const saved = await (await request('/api/photos', { method: 'POST', body: form() })).json()
  assert.equal(
    (await request(`/api/photos/${saved.id}`, { method: 'DELETE', userId: 2 })).status,
    404
  )
  assert.equal(
    (
      await request(`/api/photos/${saved.id}`, {
        method: 'DELETE',
        headers: { 'X-Test-Storage-Down': '1' }
      })
    ).status,
    503
  )
  assert.ok(await db.prepare('SELECT id FROM photos WHERE id=?').bind(saved.id).first())
  assert.ok(await media.get(saved.filename))
  assert.equal((await request(`/api/photos/${saved.id}`, { method: 'DELETE' })).status, 200)
  assert.equal(await media.get(saved.filename), null)
  assert.equal(await db.prepare('SELECT id FROM photos WHERE id=?').bind(saved.id).first(), null)
})

test('legacy story photos remain readable while conflicting explicit ownership fails closed', async () => {
  await db
    .prepare(
      "INSERT INTO photos(id,story_id,user_id,filename) VALUES (1,1,NULL,'legacy.jpg'),(2,1,2,'conflict.jpg')"
    )
    .run()
  await media.put('legacy.jpg', new Uint8Array([255, 216, 255]), {
    httpMetadata: { contentType: 'image/jpeg' }
  })
  await media.put('conflict.jpg', new Uint8Array([255, 216, 255]), {
    httpMetadata: { contentType: 'image/jpeg' }
  })
  assert.equal((await request('/api/photos/file/legacy.jpg')).status, 200)
  for (const userId of [1, 2])
    assert.equal((await request('/api/photos/file/conflict.jpg', { userId })).status, 403)
  assert.equal((await (await request('/api/photos/story/1')).json()).length, 1)
})

test('native analysis uses the real provider contract, retains original image and makes unlinked owner photos accessible', async () => {
  const result = await request('/api/photos/analyze', {
    method: 'POST',
    body: form({ storyId: null, chapterId: 'earliest-memories' })
  })
  assert.equal(result.status, 200)
  const photo = await result.json()
  assert.equal(photo.description, 'A family garden. [redacted]')
  assert.equal(photo.people_count, 2)
  assert.equal(providerCalls.length, 1)
  assert.equal(providerCalls[0].url, 'https://api.x.ai/v1/chat/completions')
  assert.equal(providerCalls[0].authorization, 'Bearer provider-fixture-key')
  assert.equal(providerCalls[0].payload.model, 'grok-4-1-fast-non-reasoning')
  assert.equal((await request(`/api/photos/file/${photo.filename}`)).status, 200)
  assert.equal((await request(`/api/photos/file/${photo.filename}`, { userId: 2 })).status, 403)
  const gallery = await (await request('/api/photos/my-photos')).json()
  assert.deepEqual(gallery[0].ai_questions, ['Who was there?', 'What did the flowers smell like?'])
  assert.deepEqual(await (await request('/api/photos/my-photos', { userId: 2 })).json(), [])
  assert.equal((await request(`/api/photos/${photo.id}`, { method: 'DELETE' })).status, 200)
})

test('unavailable credentials, provider failures and malformed analysis do not fabricate results or retain uploads', async () => {
  assert.equal(
    (
      await request('/api/photos/analyze', {
        method: 'POST',
        body: form(),
        headers: { 'X-Test-No-Key': '1' }
      })
    ).status,
    503
  )
  assert.equal(providerCalls.length, 0)
  for (const marker of [8, 9]) {
    const result = await request('/api/photos/analyze', {
      method: 'POST',
      body: form({ bytes: [255, 216, 255, marker] })
    })
    assert.equal(result.status, 502)
    assert.deepEqual(await result.json(), { error: 'Photo analysis temporarily unavailable' })
  }
  assert.equal((await media.list()).objects.length, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM photos').first()).count, 0)
})

test('filename traversal, double encoding and unsafe stored content types are rejected', async () => {
  for (const key of ['bad%2Ffile.jpg', 'bad..jpg', 'bad%252Ffile.jpg'])
    assert.equal((await request(`/api/photos/file/${key}`)).status, 400)
  await db.prepare("INSERT INTO photos(story_id,user_id,filename) VALUES (1,1,'unsafe.jpg')").run()
  await media.put('unsafe.jpg', '<html>', { httpMetadata: { contentType: 'text/html' } })
  assert.equal((await request('/api/photos/file/unsafe.jpg')).status, 503)
})

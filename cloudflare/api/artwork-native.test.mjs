import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
const root = fileURLToPath(new URL('../../', import.meta.url)),
  secret = 'native-artwork-fixture-secret-long-32-characters'
let runtime,
  db,
  media,
  calls = [],
  clock,
  mode = 'done',
  mutation = null,
  image,
  initialImage,
  putGate = Promise.resolve(),
  putReady = () => {}
before(async () => {
  image = await readFile(new URL('../../apps/mobile/assets/icon.png', import.meta.url))
  initialImage = image
  const bundle = `${root}/.cloudflare/api-tests/artwork-worker.mjs`
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import {handleNativeArtwork} from './cloudflare/api/artwork.js'
    import {consumeArtworkQueue} from './cloudflare/api/artwork-jobs.js'
    import {verifyToken} from './cloudflare/api/auth.js'
    import {createRepositories} from './cloudflare/api/repositories.js'
    import {ApiError,json} from './cloudflare/api/errors.js'
    export default {async fetch(request,env){try{
      const path=new URL(request.url).pathname.replace(/^\\/api(?:\\/v1)?/,'')
      const now=Number(request.headers.get('X-Test-Now'))||Date.now(),db=env.DB.withSession('first-primary')
      env={...env,ARTWORK_QUEUE:{send:async()=>{}}}
      if(request.headers.has('X-Test-Pause-Put')){
        const bucket=env.MEDIA
        env={...env,MEDIA:{get:bucket.get.bind(bucket),put:async(...args)=>{await env.TEST_PUT_GATE.fetch('https://put-gate.invalid');return bucket.put(...args)}}}
      }
      if(path.startsWith('/__test/consume/')){
        let ack=0,retry=0;await consumeArtworkQueue({messages:[{body:{version:1,artworkJobId:path.split('/').at(-1)},ack(){ack++},retry(){retry++}}]},env,{now:()=>now});return json({ack,retry})
      }
      const token=await verifyToken(request,env.JWT_SECRET),identity=await createRepositories(db,{wallClockTimeZone:'UTC'}).authenticate(token)
      if(!identity||identity.revoked)throw new ApiError(401,{error:'Token revoked'})
      return await handleNativeArtwork({request,env,db,path,user:identity.user,claims:token.claims,now})||json({error:'Not found'},404)
    }catch(error){if(error instanceof ApiError)return json(error.body,error.status);console.error('Artwork fixture error',error.message);return json({error:'Unavailable'},503)}}}
  `
    },
    outfile: bundle,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    external: ['cloudflare:workers', 'node:buffer']
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'artwork-native-tests',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        GROK_API_KEY: 'artwork-provider-fixture',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000041' },
      r2Buckets: ['MEDIA'],
      serviceBindings: {
        TEST_PUT_GATE: async () => {
          putReady()
          await putGate
          return new Response('released')
        },
        XAI_FETCH: async request => {
          const url = new URL(request.url),
            body = request.method === 'POST' ? await request.json() : null
          calls.push({
            url: url.href,
            method: request.method,
            body,
            authorization: request.headers.get('Authorization')
          })
          if (url.hostname === 'imgen.x.ai') {
            if (mutation) {
              const apply = mutation
              mutation = null
              await apply()
            }
            return new Response(image, { headers: { 'Content-Type': 'image/png' } })
          }
          if (request.method === 'POST')
            return mode === 'ambiguous'
              ? new Response('provider private diagnostic', { status: 503 })
              : Response.json({ request_id: crypto.randomUUID() })
          return Response.json(
            mode === 'pending'
              ? { status: 'pending' }
              : mode === 'failed'
                ? { status: 'failed', error: { message: 'private provider diagnostic' } }
                : {
                    status: 'done',
                    data: [
                      {
                        url:
                          mode === 'malicious'
                            ? 'https://127.0.0.1/private'
                            : 'https://imgen.x.ai/artwork.png?temporary=fixture',
                        mime_type: 'image/png'
                      }
                    ]
                  }
          )
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  media = await runtime.getR2Bucket('MEDIA')
  for (const file of [
    '../db/schema.sql',
    './migrations/0002_auth_rate_limits.sql',
    './migrations/0009_print_artwork.sql'
  ]) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8'),
      trigger = source.match(/CREATE TRIGGER[\s\S]*? END;/)?.[0]
    await db.batch(
      (trigger ? source.replace(trigger, '') : source)
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(sql => sql.trim())
        .filter(Boolean)
        .map(sql => db.prepare(sql))
    )
    if (trigger) await db.prepare(trigger).run()
  }
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM auth_rate_limits').run()
  await db.prepare('DELETE FROM media_deletion_jobs').run()
  await db
    .prepare(
      "INSERT INTO users(id,email,name) VALUES(1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  const objects = await media.list()
  for (const object of objects.objects) await media.delete(object.key)
  calls = []
  clock = Date.now()
  mode = 'done'
  mutation = null
  image = initialImage
  putGate = Promise.resolve()
  putReady = () => {}
})
function auth(id = 1, extra = {}) {
  return jwt.sign({ id, email: `${id}@example.com`, jti: crypto.randomUUID(), ...extra }, secret, {
    expiresIn: '1h'
  })
}
async function request(
  path,
  { method = 'GET', body, user = 1, token = auth(user), headers = {} } = {}
) {
  return runtime.dispatchFetch(`https://artwork.invalid/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Test-Now': String(clock),
      ...headers,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
}
async function start(chapter = 'earliest-memories') {
  const response = await request(`/chapter-images/generate/${chapter}`, { method: 'POST' })
  assert.equal(response.status, 202, await response.clone().text())
  return (await response.json()).jobId
}
async function consume(id) {
  const response = await request(`/__test/consume/${id}`, { method: 'POST' })
  assert.equal(response.status, 200, await response.clone().text())
  return response.json()
}

test('cover metadata preserves structured settings, owner isolation and the actual ten-book package', async () => {
  const saved = await request('/covers/save', {
    method: 'POST',
    body: {
      title: 'My Story',
      author: 'One',
      colorScheme: JSON.stringify({ background: '#234' }),
      customSettings: { spine: 'gold' }
    }
  })
  assert.equal(saved.status, 200)
  const cover = (await saved.json()).cover
  assert.deepEqual(cover.color_scheme, { background: '#234' })
  assert.deepEqual(cover.custom_settings, { spine: 'gold' })
  assert.equal((await (await request('/covers/saved', { user: 2 })).json()).cover, null)
  const options = await (await request('/covers/options')).json()
  assert.equal(options.bookFormats[0].quantity, 10)
  assert.equal(options.bookFormats[0].price, '£250')
  assert.equal(
    (await request('/covers/save', { method: 'POST', body: { colorScheme: 'not JSON' } })).status,
    400
  )
  assert.equal(calls.length, 0)
})

test('deferred generation starts once, polls without another charge and stores only a private owned image URL', async () => {
  const id = await start(),
    duplicate = await start()
  assert.equal(id, duplicate)
  assert.equal(calls.length, 0)
  await consume(id)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].body.model, 'grok-imagine-image-2.0')
  assert.equal(calls[0].body.deferred, true)
  assert.equal(calls[0].body.n, 1)
  assert.equal(
    (await db.prepare('SELECT request_count FROM ai_usage WHERE user_id=1').first()).request_count,
    1
  )
  mode = 'pending'
  clock += 16000
  await consume(id)
  assert.equal(
    (await db.prepare('SELECT state FROM native_artwork_jobs WHERE id=?').bind(id).first()).state,
    'provider_pending'
  )
  mode = 'done'
  clock += 16000
  await consume(id)
  const info = await (await request('/chapter-images')).json(),
    url = info.images['earliest-memories'].imageUrl
  assert.match(url, /^\/api\/chapter-images\/file\/artwork\/1\//)
  assert.equal(info.images['earliest-memories'].status, 'completed')
  const own = await request(url.slice(4))
  assert.equal(own.status, 200)
  assert.deepEqual(Buffer.from(await own.arrayBuffer()), image)
  assert.equal((await request(url.slice(4), { user: 2 })).status, 404)
  const cdn = calls.find(call => call.url.startsWith('https://imgen.x.ai/'))
  assert.equal(cdn.authorization, null)
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(
    (await db.prepare('SELECT request_count FROM ai_usage WHERE user_id=1').first()).request_count,
    1
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM media_deletion_jobs').first()).count,
    0
  )
  await consume(id)
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
})

test('provider ambiguity pauses for review and redelivery cannot issue a second paid generation', async () => {
  const id = await start()
  mode = 'ambiguous'
  await consume(id)
  clock += 1000000
  await consume(id)
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(
    (
      await db
        .prepare('SELECT state,error_code FROM native_artwork_jobs WHERE id=?')
        .bind(id)
        .first()
    ).state,
    'review'
  )
  const info = await (await request('/chapter-images/status')).json()
  assert.equal(info.summary.failed, 1)
  assert.equal(info.summary.completed, 0)
  assert.equal((await media.list()).objects.length, 0)
})

test('provider URL injection cannot fetch arbitrary hosts or expose a fabricated completed image', async () => {
  const id = await start()
  await consume(id)
  mode = 'malicious'
  for (let attempt = 0; attempt < 3; attempt++) {
    clock += 61000
    await consume(id)
  }
  assert.equal(
    calls.some(call => call.url.includes('127.0.0.1')),
    false
  )
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(
    (await db.prepare('SELECT state FROM native_artwork_jobs WHERE id=?').bind(id).first()).state,
    'failed'
  )
  assert.equal((await media.list()).objects.length, 0)
})

test('concurrent image jobs share the atomic daily quota and failed image generations retain no files', async () => {
  await db
    .prepare('INSERT INTO ai_usage(user_id,date,request_count) VALUES(1,?,9)')
    .bind(new Date(clock).toISOString().slice(0, 10))
    .run()
  const first = await start('earliest-memories'),
    second = await start('childhood')
  await Promise.all([consume(first), consume(second)])
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(
    (await db.prepare('SELECT request_count FROM ai_usage WHERE user_id=1').first()).request_count,
    10
  )
  mode = 'failed'
  clock += 16000
  await consume(first)
  await consume(second)
  assert.equal((await media.list()).objects.length, 0)
  assert.equal(
    (
      await db
        .prepare("SELECT COUNT(*) count FROM chapter_images WHERE generation_status='failed'")
        .first()
    ).count,
    2
  )
})

test('account deletion or explicit image reset during download fences late results', async () => {
  const id = await start('childhood')
  await consume(id)
  clock += 16000
  mutation = () => db.prepare('DELETE FROM users WHERE id=1').run()
  await consume(id)
  assert.equal((await media.list()).objects.length, 0)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM native_artwork_jobs').first()).count,
    0
  )
  assert.equal((await db.prepare('SELECT COUNT(*) count FROM chapter_images').first()).count, 0)
})

test('regeneration schedules the old private image for erasure and reset preserves the first chapter', async () => {
  const earliest = await start()
  await consume(earliest)
  clock += 16000
  await consume(earliest)
  const old = await start('childhood')
  await consume(old)
  clock += 16000
  await consume(old)
  const oldKey = (
    await db.prepare('SELECT object_key FROM native_artwork_jobs WHERE id=?').bind(old).first()
  ).object_key
  const newer = await start('childhood')
  await consume(newer)
  clock += 16000
  await consume(newer)
  assert.ok(
    await db
      .prepare('SELECT object_key FROM media_deletion_jobs WHERE object_key=?')
      .bind(oldKey)
      .first()
  )
  assert.equal((await request('/chapter-images/reset', { method: 'DELETE' })).status, 200)
  const info = await (await request('/chapter-images')).json()
  assert.deepEqual(Object.keys(info.images), ['earliest-memories'])
  assert.equal(
    (await (await request('/chapter-images', { user: 2 })).json()).images['earliest-memories'],
    undefined
  )
  assert.equal(
    (await request('/chapter-images', { token: auth(1, { scope: 'magic_link' }) })).status,
    403
  )
})

test('a late put from an expired claim cannot overwrite a newer completed artwork object', async () => {
  const id = await start()
  await consume(id)
  clock += 16000
  let releasePut
  const entered = new Promise(resolve => {
    putReady = resolve
  })
  putGate = new Promise(resolve => {
    releasePut = resolve
  })
  const stale = request(`/__test/consume/${id}`, {
    method: 'POST',
    headers: { 'X-Test-Pause-Put': '1' }
  })
  await entered
  clock += 901000
  image = await readFile(new URL('../../apps/mobile/assets/favicon.png', import.meta.url))
  await consume(id)
  const current = await db
    .prepare('SELECT object_key,state FROM native_artwork_jobs WHERE id=?')
    .bind(id)
    .first()
  assert.equal(current.state, 'completed')
  assert.match(current.object_key, /^artwork\/1\/[a-f0-9-]+\/[a-f0-9-]+$/)
  releasePut()
  assert.equal((await stale).status, 200)
  assert.deepEqual(Buffer.from(await (await media.get(current.object_key)).arrayBuffer()), image)
  assert.equal((await media.list()).objects.length, 2)
  const cleanup = await db.prepare('SELECT object_key FROM media_deletion_jobs').all()
  assert.equal(cleanup.results.length, 1)
  assert.notEqual(cleanup.results[0].object_key, current.object_key)
  assert.equal(calls.filter(call => call.method === 'POST').length, 1)
})

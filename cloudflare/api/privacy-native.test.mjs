import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import { sqlStatements } from './fixtures/sql-statements.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  bundle = `${root}/.cloudflare/api-tests/privacy-worker.mjs`
const secret = 'privacy-test-session-secret-at-least-32-characters'
let runtime, db, media
before(async () => {
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import worker from './cloudflare/api-staging.js'
    import {processMediaDeletionJobs} from './cloudflare/api/media-deletion.js'
    export default {fetch(request,env){
      if(new URL(request.url).pathname==='/__test_scheduled') {
        env={...env,GENERATION_QUEUE:{send:async()=>{}},VOICE_COMPILE_QUEUE:{send:async()=>{}},ARTWORK_QUEUE:{send:async()=>{}}}
        return worker.scheduled({scheduledTime:Date.now()},env).then(()=>Response.json({ok:true})).catch(()=>Response.json({ok:false},{status:503}))
      }
      if(new URL(request.url).pathname==='/__test_cleanup') {
        if(request.headers.has('X-Test-Storage-Down')) env={...env,MEDIA:{delete:()=>{throw new Error('private failure')}}}
        return processMediaDeletionJobs(env,Number(new URL(request.url).searchParams.get('now'))||Date.now()).then(Response.json)
      }
      if(request.headers.has('X-Test-Print-Race')) {
        const session=env.DB.withSession('first-primary')
        env={...env,DB:{withSession:()=>({prepare:session.prepare.bind(session),batch:async statements=>{
          await session.prepare("INSERT INTO print_orders(id,user_id,status,title,text_key,cover_key,page_count,colour_pages,product_sku)VALUES('12345678-1234-1234-1234-123456789abc',1,'queued','Memoir','print/text.pdf','print/cover.pdf',32,0,'fixture')").run()
          return session.batch(statements)
        }})}}
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
      name: 'privacy-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000036' },
      r2Buckets: ['MEDIA']
    })
  )
  db = await runtime.getD1Database('DB')
  media = await runtime.getR2Bucket('MEDIA')
  const files = [
    '../db/schema.sql',
    ...(await readdir(new URL('./migrations/', import.meta.url)))
      .filter(n => n.endsWith('.sql'))
      .sort()
      .map(n => `./migrations/${n}`)
  ]
  for (const file of files) {
    const sql = await readFile(new URL(file, import.meta.url), 'utf8')
    await db.batch(sqlStatements(sql).map(statement => db.prepare(statement)))
  }
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.prepare('DROP TRIGGER IF EXISTS reject_erasure').run()
  for (const table of [
    'family_encouragements',
    'family_prompts',
    'daily_prompts',
    'photos',
    'stories',
    'voice_sessions',
    'generation_jobs',
    'print_orders',
    'newsletter_subscribers',
    'users',
    'media_deletion_jobs',
    'token_blacklist'
  ])
    await db.prepare(`DELETE FROM ${table}`).run()
  await db
    .prepare(
      "INSERT INTO users (id,email,name) VALUES(1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer) VALUES(1,1,'earliest-memories','garden','One memory'),(2,2,'earliest-memories','garden','Two memory')"
    )
    .run()
  const objects = await media.list()
  await Promise.all(objects.objects.map(o => media.delete(o.key)))
})
function token(id = 1, extra = {}) {
  return jwt.sign({ id, email: `${id}@example.com`, jti: crypto.randomUUID(), ...extra }, secret, {
    expiresIn: '1h'
  })
}
function request(
  path = '/api/user/delete-account',
  { auth = token(), method = 'DELETE', headers = {} } = {}
) {
  return runtime.dispatchFetch(`https://api-staging.invalid${path}`, {
    method,
    headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers }
  })
}
async function cleanup(now = Date.now(), headers = {}) {
  return (
    await runtime.dispatchFetch(`https://api-staging.invalid/__test_cleanup?now=${now}`, {
      headers
    })
  ).json()
}
async function job({
  id = crypto.randomUUID(),
  owner = 1,
  key = 'exports/deleted.epub',
  state = 'active',
  safe = Date.now() + 3600000
} = {}) {
  await db
    .prepare(
      `INSERT INTO generation_jobs(id,user_id,owner_id,kind,request_key,payload,state,object_key,safe_cleanup_after,created_at,updated_at) VALUES(?,?,?,'epub',?,'{"private":"memoir text"}',?,?,?,0,0)`
    )
    .bind(id, owner, owner, id, state, key, safe)
    .run()
  return id
}
test('account erasure is one atomic owner-only transaction and old sessions immediately fail', async () => {
  await db
    .prepare("INSERT INTO voice_sessions(id,user_id,chapter_id)VALUES(1,1,'earliest-memories')")
    .run()
  await db.prepare('UPDATE stories SET voice_session_id=1 WHERE id=1').run()
  await db
    .prepare(
      "INSERT INTO photos(id,user_id,story_id,filename)VALUES(1,1,1,'one.jpg'),(2,2,1,'other.jpg'),(3,1,2,'one-mislinked.jpg')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO free_stories(user_id,title,content)VALUES(1,'Private','A memory'),(2,'Keep','Another memory')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO memos(user_id,audio_url,transcript)VALUES(1,'/api/memos/audio/one.webm','Private words')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript)VALUES('12345678-1234-1234-1234-123456789abc',1,'recordings/1/one.webm','audio/webm','Voice memory')"
    )
    .run()
  const generation = await job()
  for (const key of [
    'one.jpg',
    'other.jpg',
    'one-mislinked.jpg',
    'memos/one.webm',
    'recordings/1/one.webm',
    'exports/deleted.epub'
  ])
    await media.put(key, 'private bytes')
  const auth = token(),
    response = await request(undefined, { auth })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).mediaCleanup, 'scheduled')
  assert.equal(await db.prepare('SELECT id FROM users WHERE id=1').first(), null)
  assert.ok(await db.prepare('SELECT id FROM users WHERE id=2').first())
  assert.equal((await request('/api/stories/all', { auth, method: 'GET' })).status, 401)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM free_stories').first()).n, 1)
  assert.deepEqual(await db.prepare('SELECT user_id,story_id FROM photos WHERE id=2').first(), {
    user_id: 2,
    story_id: null
  })
  const tombstone = await db
    .prepare('SELECT state,user_id,payload FROM generation_jobs WHERE id=?')
    .bind(generation)
    .first()
  assert.deepEqual(tombstone, { state: 'cancelled', user_id: null, payload: '{}' })
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
  const swept = await cleanup()
  assert.equal(swept.deleted, 4)
  assert.ok(await media.get('other.jpg'))
  assert.ok(await media.get('exports/deleted.epub'))
  const later = await cleanup(Date.now() + 7200000)
  assert.equal(later.deleted, 1)
  assert.equal(await media.get('exports/deleted.epub'), null)
})
test('scoped, missing and revoked credentials cannot erase data', async () => {
  assert.equal((await request(undefined, { auth: null })).status, 401)
  assert.equal((await request(undefined, { auth: token(1, { scope: 'magic_link' }) })).status, 403)
  const auth = token()
  await request('/api/auth/logout', { auth, method: 'POST' })
  assert.equal((await request(undefined, { auth })).status, 401)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM users').first()).n, 2)
})
test('a database failure rolls back user deletion, cleanup reservations and generation cancellation together', async () => {
  const id = await job()
  await db.exec(
    "CREATE TRIGGER reject_erasure BEFORE DELETE ON users BEGIN SELECT RAISE(ABORT,'test deletion failure'); END;"
  )
  const response = await request()
  assert.equal(response.status, 503)
  assert.ok(await db.prepare('SELECT id FROM users WHERE id=1').first())
  assert.equal(
    (await db.prepare('SELECT state FROM generation_jobs WHERE id=?').bind(id).first()).state,
    'active'
  )
  assert.equal((await db.prepare('SELECT count(*) AS n FROM media_deletion_jobs').first()).n, 0)
})
test('cleanup protects live recordings and completed EPUBs; premature generation erasure defers until safe', async () => {
  await db
    .prepare(
      "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript)VALUES('12345678-1234-1234-1234-123456789abc',1,'recordings/1/live.webm','audio/webm','Voice')"
    )
    .run()
  await job({ key: 'exports/live.epub', state: 'completed' })
  await job({ key: 'exports/inflight.epub' })
  for (const key of ['recordings/1/live.webm', 'exports/live.epub', 'exports/inflight.epub']) {
    await media.put(key, 'bytes')
    await db
      .prepare(
        "INSERT INTO media_deletion_jobs(object_key,next_attempt_at)VALUES(?,'2000-01-01 00:00:00+00')"
      )
      .bind(key)
      .run()
  }
  const result = await cleanup()
  assert.equal(result.retained, 2)
  assert.equal(result.deferred, 1)
  assert.equal(result.deleted, 0)
  assert.equal((await media.list()).objects.length, 3)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM media_deletion_jobs').first()).n, 1)
})
test('a print fulfilment race returns a conflict and rolls back all account erasure work', async () => {
  const id = await job()
  const response = await request(undefined, { headers: { 'X-Test-Print-Race': '1' } })
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'EXTERNAL_ACCOUNT_WORK_PENDING')
  assert.ok(await db.prepare('SELECT id FROM users WHERE id=1').first())
  assert.equal(
    (await db.prepare('SELECT state FROM generation_jobs WHERE id=?').bind(id).first()).state,
    'active'
  )
  assert.equal((await db.prepare('SELECT count(*) AS n FROM media_deletion_jobs').first()).n, 0)
})
test('private chapter artwork is retained while attached and erased with its verified owner and newsletter consent', async () => {
  await db.prepare('UPDATE users SET email_verified=1 WHERE id=1').run()
  await db
    .prepare(
      "INSERT INTO newsletter_subscribers(email)VALUES('one@example.com'),('two@example.com')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,image_url)VALUES(1,'earliest-memories','/api/chapter-images/file/artwork/1/chapter.png')"
    )
    .run()
  await media.put('artwork/1/chapter.png', 'private image')
  await db
    .prepare(
      "INSERT INTO media_deletion_jobs(object_key,next_attempt_at)VALUES('artwork/1/chapter.png','2000-01-01 00:00:00+00')"
    )
    .run()
  assert.equal((await cleanup()).retained, 1)
  assert.equal((await request()).status, 200)
  assert.equal((await cleanup()).deleted, 1)
  assert.equal(await media.get('artwork/1/chapter.png'), null)
  assert.deepEqual((await db.prepare('SELECT email FROM newsletter_subscribers').all()).results, [
    { email: 'two@example.com' }
  ])
})
test('concurrent cleanup claims do not duplicate erasure; failed storage deletion leaves a durable redacted retry', async () => {
  for (let i = 0; i < 21; i++) {
    await media.put(`orphan/${i}`, 'bytes')
    await db
      .prepare(
        "INSERT INTO media_deletion_jobs(object_key,next_attempt_at)VALUES(?,'2000-01-01 00:00:00+00')"
      )
      .bind(`orphan/${i}`)
      .run()
  }
  const results = await Promise.all([cleanup(), cleanup()])
  assert.equal(
    results.reduce((n, r) => n + r.deleted, 0),
    21
  )
  assert.equal((await media.list()).objects.length, 0)
  await media.put('orphan/failure', 'bytes')
  await db
    .prepare(
      "INSERT INTO media_deletion_jobs(object_key,next_attempt_at)VALUES('orphan/failure','2000-01-01 00:00:00+00')"
    )
    .run()
  assert.equal((await cleanup(Date.now(), { 'X-Test-Storage-Down': '1' })).failed, 1)
  const pending = await db.prepare('SELECT attempts,last_error FROM media_deletion_jobs').first()
  assert.deepEqual(pending, { attempts: 1, last_error: 'Media deletion failed; retry scheduled' })
  assert.ok(await media.get('orphan/failure'))
})
test('a failed scheduled task does not prevent private media cleanup and never claims a successful heartbeat', async () => {
  await db.prepare('DELETE FROM cron_health').run()
  await media.put('orphan/scheduled', 'private bytes')
  await db
    .prepare(
      "INSERT INTO media_deletion_jobs(object_key,next_attempt_at)VALUES('orphan/scheduled','2000-01-01 00:00:00+00')"
    )
    .run()
  const response = await runtime.dispatchFetch('https://api-staging.invalid/__test_scheduled')
  assert.equal(response.status, 503)
  assert.equal(await media.get('orphan/scheduled'), null)
  const failed = await db
    .prepare("SELECT last_attempt,last_success FROM cron_health WHERE job_name='print-outbox'")
    .first()
  assert.ok(failed.last_attempt)
  assert.equal(failed.last_success, null)
  const cleaned = await db
    .prepare(
      "SELECT last_attempt,last_success FROM cron_health WHERE job_name='private-media-cleanup'"
    )
    .first()
  assert.equal(cleaned.last_success, cleaned.last_attempt)
})

import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import JSZip from 'jszip'
import { handlePublishingRoutes } from './publishing.js'
import { ApiError } from './errors.js'
import { createGenerationRepository } from '../jobs/repository.js'
import { consumeGenerationQueue, publishGenerationOutbox } from '../jobs/consumer.js'
import { encodeFishRequest, requestFishAudio, storeAudioStream } from '../jobs/fish-audio.js'

let runtime, db, bucket, messages, clock
const initialTime = Date.parse('2026-11-02T12:00:00Z')
const mp3 = Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 11, 22, 33])
const env = () => ({
  DB: db,
  MEDIA: bucket,
  GENERATION_QUEUE: {
    send: async body => {
      messages.push(body)
    }
  },
  FISH_AUDIO_API_KEY: 'synthetic-test-only-fish-key'
})

before(async () => {
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'publishing-native-test',
      modules: true,
      script: 'export default { fetch() { return new Response("test only") } }',
      compatibilityDate: '2026-10-09',
      d1Databases: { DB: 'publishing-db' },
      r2Buckets: { MEDIA: 'publishing-media' }
    })
  )
  db = await runtime.getD1Database('DB')
  bucket = await runtime.getR2Bucket('MEDIA')
  for (const name of [
    '../db/schema.sql',
    './migrations/0003_generation_jobs.sql',
    './migrations/0006_writing.sql'
  ]) {
    const sql = (await readFile(new URL(name, import.meta.url), 'utf8')).replace(/--[^\n]*/g, '')
    const statements = sql
      .split(';')
      .map(text => text.trim())
      .filter(Boolean)
    await db.batch(statements.map(sql => db.prepare(sql)))
  }
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  clock = initialTime
  messages = []
  await db.batch([
    db.prepare('DELETE FROM generation_jobs'),
    db.prepare('DELETE FROM users'),
    db.prepare('DELETE FROM media_deletion_jobs')
  ])
  await db.batch(
    Array.from({ length: 101 }, (_, index) =>
      db
        .prepare('INSERT INTO users (id,email,name) VALUES (?,?,?)')
        .bind(index + 1, `user${index + 1}@example.test`, `User ${index + 1}`)
    )
  )
  await db.prepare('INSERT INTO settings (user_id,name) VALUES (1,?)').bind('Ada <Writer>').run()
  await db
    .prepare('INSERT INTO stories (user_id,chapter_id,question_id,answer) VALUES (1,?,?,?)')
    .bind('earliest-memories', 'q1', 'My <script>memory</script> & café.')
    .run()
  await db
    .prepare('INSERT INTO free_stories (user_id,title,content) VALUES (1,?,?)')
    .bind('A free memory', 'A separate story.')
    .run()
})

async function route(
  path,
  { method = 'GET', body, userId = 1, scope, key, environment = env() } = {}
) {
  const request = new Request(`https://example.test/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
  try {
    return await handlePublishingRoutes({
      request,
      env: environment,
      db,
      path,
      user: { id: userId },
      claims: { id: userId, ...(scope ? { scope } : {}) },
      now: clock
    })
  } catch (error) {
    if (error instanceof ApiError) return Response.json(error.body, { status: error.status })
    throw error
  }
}

function delivery(body) {
  return {
    body,
    acknowledged: 0,
    retried: 0,
    ack() {
      this.acknowledged++
    },
    retry() {
      this.retried++
    }
  }
}
const repo = () => createGenerationRepository(db, { now: () => clock })
const count = async table => (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n

test('EPUB queues durably, publishes canonical text, downloads privately and accounts once across duplicate deliveries', async () => {
  const response = await route('/export/epub', { key: crypto.randomUUID() })
  assert.equal(response.status, 202)
  const { jobId } = await response.json()
  assert.equal(messages.length, 0)
  assert.equal(await count('generation_outbox'), 1)
  await publishGenerationOutbox(env(), { now: () => clock })
  assert.equal(messages.length, 1)
  const first = delivery(messages[0])
  await consumeGenerationQueue({ messages: [first] }, env(), { now: () => clock })
  assert.equal(first.acknowledged, 1)
  const status = await (await route(`/export/jobs/${jobId}`)).json()
  assert.equal(status.status, 'completed')
  const file = await route(`/export/download/${status.filename}`)
  assert.equal(file.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(file.headers.get('Content-Type'), 'application/epub+zip')
  const bytes = new Uint8Array(await file.arrayBuffer()),
    zip = await JSZip.loadAsync(bytes)
  assert.equal(new TextDecoder().decode(bytes.subarray(30, 38)), 'mimetype')
  assert.equal(await zip.file('mimetype').async('string'), 'application/epub+zip')
  const chapters = await Promise.all(
    Object.keys(zip.files)
      .filter(key => /chapter\d+\.xhtml$/.test(key))
      .map(key => zip.file(key).async('string'))
  )
  assert(chapters.some(text => text.includes('My &lt;script&gt;memory&lt;/script&gt; &amp; café.')))
  assert(chapters.some(text => text.includes('A separate story.')))
  assert(chapters.every(text => !text.includes('<script>')))
  const duplicate = delivery(messages[0])
  await consumeGenerationQueue({ messages: [duplicate] }, env(), {
    now: () => clock,
    epubRenderer: () => {
      throw new Error('duplicate render')
    }
  })
  assert.equal(duplicate.acknowledged, 1)
  assert.equal(await count('generated_exports'), 1)
  assert.equal(await count('media_deletion_jobs'), 0)
  assert.equal((await route(`/export/jobs/${jobId}`, { userId: 2 })).status, 404)
  assert.equal((await route(`/export/download/${status.filename}`, { userId: 2 })).status, 404)
})

test('full-scope, purchase, consent and private ownership checks precede generation', async () => {
  assert.equal((await route('/export/epub', { scope: 'interview' })).status, 403)
  assert.equal(
    (await route('/audiobook/generate', { method: 'POST', body: {}, userId: 101 })).status,
    403
  )
  assert.equal((await route('/export/epub', { userId: 101 })).status, 403)
  assert.equal(await count('generation_jobs'), 0)
  await db
    .prepare(
      "INSERT INTO payments (user_id,product_id,product_type,amount,status) VALUES (101,'test_bundle','premium_bundle',29900,'completed')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories (user_id,chapter_id,question_id,answer) VALUES (101,'earliest-memories','q1','Paid memory')"
    )
    .run()
  assert.equal((await route('/export/epub', { userId: 101 })).status, 202)
  assert.equal(
    (await route('/audiobook/generate', { method: 'POST', body: { useOwnVoice: true } })).status,
    400
  )
  assert.equal(
    (await route('/audiobook/generate', { method: 'POST', body: { useOwnVoice: 'false' } })).status,
    400
  )
  assert.equal((await route('/audiobook/download/..%2Fother.mp3')).status, 400)
  assert.equal((await route('/audiobook/download/unknown.mp3')).status, 404)
})

test('audiobook duplicates/concurrency call the paid provider once and complete/account once', async () => {
  const response = await route('/audiobook/generate', {
    method: 'POST',
    body: {},
    key: crypto.randomUUID()
  })
  assert.equal(response.status, 202)
  const { jobId } = await response.json()
  await publishGenerationOutbox(env(), { now: () => clock })
  let calls = 0
  const audioRequester = async args => {
    calls++
    assert(args.text.includes('A separate story.'))
    assert(args.text.includes('My <script>memory</script>'))
    return new Response(mp3)
  }
  const one = delivery(messages[0]),
    two = delivery(messages[0])
  await Promise.all([
    consumeGenerationQueue({ messages: [one] }, env(), { now: () => clock, audioRequester }),
    consumeGenerationQueue({ messages: [two] }, env(), { now: () => clock, audioRequester })
  ])
  assert.equal(calls, 1)
  assert.equal(await count('audiobooks'), 1)
  assert.equal(await count('generated_exports'), 1)
  const status = await (await route(`/audiobook/jobs/${jobId}`)).json()
  assert.equal(status.status, 'completed')
  const history = await (await route('/audiobook/status')).json()
  assert.equal(history.previousAudiobooks[0].created_at, new Date(clock).toISOString())
  assert.deepEqual(
    new Uint8Array(await (await route(`/audiobook/download/${status.filename}`)).arrayBuffer()),
    mp3
  )
  const duplicate = delivery(messages[0])
  await consumeGenerationQueue({ messages: [duplicate] }, env(), {
    now: () => clock,
    audioRequester
  })
  assert.equal(calls, 1)
  assert.equal(duplicate.acknowledged, 1)
})

test('idempotency keys bind options; concurrent active requests and daily/recent quotas are durable', async () => {
  const key = crypto.randomUUID()
  const first = await route('/audiobook/generate', { method: 'POST', body: {}, key })
  const second = await route('/audiobook/generate', { method: 'POST', body: {}, key })
  assert.equal((await first.json()).jobId, (await second.json()).jobId)
  assert.equal(await count('audiobook_generation_requests'), 1)
  const concurrent = await Promise.all(
    Array.from({ length: 2 }, () => route('/audiobook/generate', { method: 'POST', body: {} }))
  )
  assert(concurrent.every(response => response.status === 409))
  await db
    .prepare(
      "INSERT INTO voice_models(user_id,fish_model_id,consent_given) VALUES (1,'voice.mp3',1)"
    )
    .run()
  assert.equal(
    (await route('/audiobook/generate', { method: 'POST', body: { useOwnVoice: true }, key }))
      .status,
    409
  )
  await db.prepare("UPDATE generation_jobs SET state = 'failed'").run()
  assert.equal((await route('/audiobook/generate', { method: 'POST', body: {} })).status, 429)
  for (let i = 0; i < 2; i++) {
    clock += 16 * 60_000
    assert.equal((await route('/audiobook/generate', { method: 'POST', body: {} })).status, 202)
    await db.prepare("UPDATE generation_jobs SET state = 'failed'").run()
  }
  clock += 16 * 60_000
  assert.equal((await route('/audiobook/generate', { method: 'POST', body: {} })).status, 429)
  assert.equal(await count('audiobook_generation_requests'), 3)
})

test('expired paid effects reconcile without replay; expired pure claims fence stale completion', async () => {
  const audio = await repo().enqueue({
    userId: 1,
    kind: 'audiobook',
    requestKey: crypto.randomUUID(),
    payload: {}
  })
  const audioClaim = await repo().claim(audio.id)
  await repo().beginProviderEffect(audioClaim)
  clock += 16 * 60_000
  assert.equal(await repo().claim(audio.id), null)
  assert.equal((await repo().get(audio.id)).state, 'needs_reconciliation')
  let calls = 0
  await consumeGenerationQueue({ messages: [delivery({ version: 1, jobId: audio.id })] }, env(), {
    now: () => clock,
    audioRequester: () => {
      calls++
      return new Response(mp3)
    }
  })
  assert.equal(calls, 0)
  const epub = await repo().enqueue({ userId: 1, kind: 'epub', requestKey: crypto.randomUUID() })
  const old = await repo().claim(epub.id)
  clock += 16 * 60_000
  const replacement = await repo().claim(epub.id)
  assert.notEqual(old.lease_token, replacement.lease_token)
  assert.notEqual(old.object_key, replacement.object_key)
  await assert.rejects(repo().assertClaim(old), /CLAIM_LOST/)
  await assert.rejects(repo().complete(old), /CLAIM_LOST/)
  assert.equal(await count('generated_exports'), 0)
  await bucket.put(replacement.object_key, 'current artifact')
  await repo().complete(replacement)
  await bucket.put(old.object_key, 'late stale upload')
  assert.equal(await (await bucket.get(replacement.object_key)).text(), 'current artifact')
  assert(
    await db
      .prepare('SELECT object_key FROM media_deletion_jobs WHERE object_key = ?')
      .bind(old.object_key)
      .first()
  )
  assert.equal(
    await db
      .prepare('SELECT object_key FROM media_deletion_jobs WHERE object_key = ?')
      .bind(replacement.object_key)
      .first(),
    null
  )
})

test('paid failure and account deletion retain cleanup intent and never republish a completed or uncertain effect', async () => {
  const audio = await repo().enqueue({
    userId: 1,
    kind: 'audiobook',
    requestKey: crypto.randomUUID()
  })
  let calls = 0
  const audioRequester = async () => {
    calls++
    throw new Error('synthetic provider private response')
  }
  const message = delivery({ version: 1, jobId: audio.id })
  await consumeGenerationQueue({ messages: [message] }, env(), { now: () => clock, audioRequester })
  assert.equal((await repo().get(audio.id)).state, 'needs_reconciliation')
  assert.equal(await count('media_deletion_jobs'), 1)
  assert.equal(await repo().cleanupAllowed((await repo().get(audio.id)).object_key), false)
  await consumeGenerationQueue({ messages: [delivery(message.body)] }, env(), {
    now: () => clock,
    audioRequester
  })
  assert.equal(calls, 1)
  clock += 16 * 60_000
  const next = await repo().enqueue({
    userId: 1,
    kind: 'audiobook',
    requestKey: crypto.randomUUID()
  })
  await consumeGenerationQueue({ messages: [delivery({ version: 1, jobId: next.id })] }, env(), {
    now: () => clock,
    audioRequester: async () => {
      await db.prepare('DELETE FROM users WHERE id = 1').run()
      return new Response(mp3)
    }
  })
  assert.equal(await bucket.get(next.object_key), null)
  assert.equal(await count('audiobooks'), 0)
  assert.equal((await repo().get(next.id)).user_id, null)
  assert.equal(await repo().cleanupAllowed((await repo().get(next.id)).object_key), false)
})

test('outbox recovers publish-before-mark failure; style batches yield durably and do not count as exports', async () => {
  const job = await repo().enqueue({
    userId: 1,
    kind: 'style',
    requestKey: crypto.randomUUID(),
    payload: { tones: [] }
  })
  let sent
  await assert.rejects(
    repo().publish({
      send: async body => {
        sent = body
        throw new Error('lost acknowledgement')
      }
    })
  )
  clock += 61_000
  await publishGenerationOutbox(env(), { now: () => clock })
  assert.deepEqual(messages[0], sent)
  let work = 0
  const styleProcessor = async ({ leaseToken, jobId, now }) => {
    await repo().assertClaim({ id: jobId, lease_token: leaseToken })
    assert.equal(now(), clock)
    return { done: ++work === 2 }
  }
  await consumeGenerationQueue({ messages: [delivery(messages[0])] }, env(), {
    now: () => clock,
    styleProcessor
  })
  assert.equal((await repo().get(job.id)).state, 'queued')
  messages = []
  await publishGenerationOutbox(env(), { now: () => clock })
  await consumeGenerationQueue({ messages: [delivery(messages[0])] }, env(), {
    now: () => clock,
    styleProcessor
  })
  assert.equal((await repo().get(job.id)).state, 'completed')
  assert.equal(await count('generated_exports'), 0)
})

test('voice sample requires explicit consent, validates bytes and preserves deletion work across replacement', async () => {
  assert.equal(
    (
      await route('/audiobook/voice-sample', {
        method: 'POST',
        body: { audioData: Buffer.from(mp3).toString('base64'), consentGiven: false }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await route('/audiobook/voice-sample', {
        method: 'POST',
        body: { audioData: Buffer.from('not audio').toString('base64'), consentGiven: true }
      })
    ).status,
    400
  )
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await route('/audiobook/voice-sample', {
          method: 'POST',
          body: { audioData: Buffer.from(mp3).toString('base64'), consentGiven: true }
        })
      ).status,
      200
    )
  assert.equal(await count('voice_models'), 1)
  assert.equal(await count('media_deletion_jobs'), 1)
  const status = await (await route('/audiobook/voice-status')).json()
  assert.equal(status.hasVoiceModel, true)
  assert.equal(status.consentGiven, true)
  assert.equal((await route('/audiobook/voice-sample', { method: 'DELETE' })).status, 200)
  assert.equal(await count('voice_models'), 0)
  assert.equal(await count('media_deletion_jobs'), 2)
})

test('Fish uses supported fixed-origin JSON/MessagePack bodies and bounded streaming R2 output', async () => {
  assert.equal(
    Buffer.from(
      encodeFishRequest({ text: 'é', references: [{ audio: Uint8Array.of(0, 1, 255), text: '' }] })
    ).toString('hex'),
    '82a474657874a2c3a9aa7265666572656e6365739182a5617564696fc4030001ffa474657874a0'
  )
  await bucket.put('voices/sample.mp3', mp3)
  for (const voiceFilename of [undefined, 'sample.mp3']) {
    await requestFishAudio({
      env: env(),
      bucket,
      text: 'A private memory',
      voiceFilename,
      fetcher: async (url, init) => {
        assert.equal(url, 'https://api.fish.audio/v1/tts')
        assert.equal(init.redirect, 'manual')
        assert.equal(init.headers.model, 's2.1-pro')
        assert.equal(
          init.headers['Content-Type'],
          voiceFilename ? 'application/msgpack' : 'application/json'
        )
        assert(
          voiceFilename
            ? init.body instanceof Uint8Array
            : JSON.parse(init.body).text === 'A private memory'
        )
        return new Response(mp3)
      }
    })
  }
  let redirects = 0
  await assert.rejects(
    requestFishAudio({
      env: env(),
      bucket,
      text: 'A private memory',
      fetcher: async (url, init) => {
        redirects++
        assert.equal(url, 'https://api.fish.audio/v1/tts')
        assert.equal(init.redirect, 'manual')
        return new Response(null, {
          status: 302,
          headers: { Location: 'https://untrusted.invalid/collect' }
        })
      }
    }),
    /FISH_AUDIO_REQUEST_FAILED/
  )
  assert.equal(redirects, 1)
  await assert.rejects(
    storeAudioStream(bucket, 'audiobooks/invalid.mp3', new Response('not audio').body),
    /INVALID_GENERATED_AUDIO/
  )
  assert.equal(await bucket.get('audiobooks/invalid.mp3'), null)
})

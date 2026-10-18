import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'

const root = fileURLToPath(new URL('../../', import.meta.url))
const bundle = fileURLToPath(
  new URL('../../.cloudflare/api-tests/account-worker.mjs', import.meta.url)
)
const secret = 'account-native-test-secret-at-least-32-characters'
let runtime, db

before(async () => {
  // Exercise the integrated Worker in real workerd; no mocked database or auth.
  await build({
    entryPoints: [`${root}/cloudflare/api-staging.js`],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'account-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000004' }
    })
  )
  db = await runtime.getD1Database('DB')
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
  await db.batch(
    schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => db.prepare(s))
  )
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM token_blacklist').run()
  await db
    .prepare(
      `INSERT INTO users (id,email,name,created_at) VALUES
    (1,'one@example.com','One','2020-01-01 12:34:56.123456'),
    (2,'two@example.com','Two','2020-01-01 12:34:56.123456')`
    )
    .run()
})
function token(id = 1, extra = {}) {
  return jwt.sign(
    { id, email: `${id === 1 ? 'one' : 'two'}@example.com`, jti: crypto.randomUUID(), ...extra },
    secret,
    { expiresIn: '1h' }
  )
}
async function request(path, { method = 'GET', body, auth = token() } = {}) {
  return runtime.dispatchFetch(`http://localhost${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
}

test('both prefixes require verified identity; account settings reject scoped tokens', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    assert.equal((await request(`${prefix}/user/phone-settings`, { auth: null })).status, 401)
    assert.equal(
      (await request(`${prefix}/user/export-data`, { auth: token(1, { scope: 'magic_link' }) }))
        .status,
      403
    )
    assert.equal(
      (await request(`${prefix}/onboarding/status`, { auth: token(1, { scope: 'magic_link' }) }))
        .status,
      200
    )
  }
  const revoked = token()
  const claims = jwt.decode(revoked)
  await db
    .prepare('INSERT INTO token_blacklist (jti,user_id,expires_at) VALUES (?,?,?)')
    .bind(claims.jti, 1, '2099-01-01 00:00:00+00')
    .run()
  assert.equal((await request('/api/user/export-data', { auth: revoked })).status, 401)
})

test('phone updates validate E.164, preserve omissions, persist false, and cannot select another owner', async () => {
  const save = await request('/api/user/phone-settings', {
    method: 'PUT',
    body: { phoneNumber: '+447700900000', phoneCallConsent: true, contactPreference: 'both' }
  })
  assert.deepEqual(await save.json(), {
    phone_number: '+447700900000',
    phone_call_consent: true,
    contact_preference: 'both'
  })
  const decline = await request('/api/v1/user/phone-settings', {
    method: 'PUT',
    body: { phoneCallConsent: false }
  })
  assert.equal((await decline.json()).phone_call_consent, false)
  assert.equal(
    (await (await request('/api/user/phone-settings')).json()).phone_number,
    '+447700900000'
  )
  assert.deepEqual(await (await request('/api/user/phone-settings', { auth: token(2) })).json(), {
    phone_number: null,
    phone_call_consent: false,
    contact_preference: 'email'
  })
  for (const body of [{ phoneNumber: '07700900000' }, { contactPreference: 'sms' }, { userId: 2 }])
    assert.equal((await request('/api/user/phone-settings', { method: 'PUT', body })).status, 400)
})

test('onboarding creates first-use rows and preserves supplied context between updates', async () => {
  assert.deepEqual(await (await request('/api/onboarding/status')).json(), {
    completed: false,
    isNewUser: true
  })
  assert.equal(
    (
      await request('/api/onboarding/context-form', {
        method: 'POST',
        body: {
          name: ' Alice ',
          birthPlace: 'York',
          birthCountry: 'UK',
          birthYear: '1952',
          additionalContext: 'The garden'
        }
      })
    ).status,
    200
  )
  assert.equal(
    (
      await request('/api/v1/onboarding/preference', {
        method: 'POST',
        body: { preference: 'type' }
      })
    ).status,
    200
  )
  await request('/api/onboarding/context-form', {
    method: 'POST',
    body: { birthCountry: 'England' }
  })
  assert.deepEqual(await (await request('/api/onboarding/status')).json(), {
    completed: false,
    preference: 'type',
    birthPlace: 'York',
    birthCountry: 'England',
    birthYear: 1952,
    isNewUser: false
  })
  assert.equal((await db.prepare('SELECT name FROM users WHERE id=1').first()).name, 'Alice')
  assert.deepEqual(await (await request('/api/onboarding/status', { auth: token(2) })).json(), {
    completed: false,
    isNewUser: true
  })
  for (const body of [
    { birthYear: '1952oops' },
    { birthYear: 1899 },
    { birthYear: 9999 },
    { name: 'a'.repeat(101) },
    { additionalContext: 'a'.repeat(5001) },
    { userId: 2 }
  ])
    assert.equal(
      (await request('/api/onboarding/context-form', { method: 'POST', body })).status,
      400
    )
})

test('context name and onboarding update roll back together on a D1 constraint failure', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_context BEFORE INSERT ON user_onboarding WHEN NEW.birth_place = 'blocked' BEGIN SELECT RAISE(ABORT, 'blocked'); END"
    )
    .run()
  try {
    assert.equal(
      (
        await request('/api/onboarding/context-form', {
          method: 'POST',
          body: { name: 'Changed', birthPlace: 'blocked' }
        })
      ).status,
      503
    )
    assert.equal((await db.prepare('SELECT name FROM users WHERE id=1').first()).name, 'One')
    assert.equal(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
  } finally {
    await db.prepare('DROP TRIGGER reject_context').run()
  }
})

test('channels persist without prior onboarding, deduplicate, and reject unknown choices', async () => {
  const saved = await request('/api/onboarding/channel-preferences', {
    method: 'POST',
    body: { channels: ['webapp', 'email', 'email'] }
  })
  assert.deepEqual(await saved.json(), { success: true, channels: ['webapp', 'email'] })
  assert.deepEqual(
    JSON.parse(
      (await db.prepare('SELECT channel_preferences FROM user_onboarding WHERE user_id=1').first())
        .channel_preferences
    ),
    ['webapp', 'email']
  )
  for (const channels of [[], ['sms'], [4], 'email'])
    assert.equal(
      (await request('/api/onboarding/channel-preferences', { method: 'POST', body: { channels } }))
        .status,
      400
    )
})

test('completion persists for first use and never promises unimplemented artwork', async () => {
  const response = await request('/api/onboarding/complete', { method: 'POST' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    message: 'Onboarding complete.',
    artwork: { status: 'unavailable', code: 'IMAGE_GENERATION_NOT_MIGRATED' }
  })
  assert.equal((await (await request('/api/onboarding/status')).json()).completed, true)
  assert.equal(await db.prepare('SELECT * FROM chapter_images WHERE user_id=1').first(), null)
})

test('export decodes dates, JSON arrays, and booleans without another owner data or password hashes', async () => {
  await db.batch([
    db.prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer,created_at) VALUES(1,1,'earliest-memories','q','Owner','2020-01-01 12:34:56.123456'),(2,2,'childhood','q','Secret','2020-01-01 12:34:56')"
    ),
    db.prepare(
      "INSERT INTO photos(story_id,user_id,filename) VALUES(1,1,'mine.webp'),(2,2,'private.webp'),(1,2,'inconsistent.webp'),(1,NULL,'legacy.webp'),(NULL,1,'unlinked.webp'),(NULL,2,'private-unlinked.webp'),(2,1,'wrong-story.webp')"
    ),
    db.prepare(
      `INSERT INTO user_onboarding(user_id,additional_context,onboarding_completed) VALUES(1,'{"details":["Garden"]}',1)`
    ),
    db.prepare(
      `INSERT INTO user_style_preferences(user_id,tones) VALUES(1,'["warm","reflective"]')`
    ),
    db.prepare(`INSERT INTO book_covers(user_id,color_scheme) VALUES(1,'{"cover":"forest"}')`),
    db.prepare(
      'INSERT INTO user_game_state(user_id,daily_prompt_completed_today,game_mode_enabled) VALUES(1,1,0)'
    )
  ])
  const response = await request('/api/v1/user/export-data')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  const data = await response.json()
  assert.equal(data.user.accountCreated, '2020-01-01T12:34:56.123Z')
  assert.equal(data.stories[0].createdAt, '2020-01-01T12:34:56.123Z')
  assert.equal(data.stories.length, 1)
  assert.deepEqual(data.photos.map(p => p.filename).sort(), [
    'legacy.webp',
    'mine.webp',
    'unlinked.webp'
  ])
  assert.deepEqual(data.onboarding.additional_context, { details: ['Garden'] })
  assert.equal(data.onboarding.onboarding_completed, true)
  assert.deepEqual(data.stylePreferences.tones, ['warm', 'reflective'])
  assert.deepEqual(data.coverDesign.color_scheme, { cover: 'forest' })
  assert.equal(data.gameProgress.daily_prompt_completed_today, true)
  assert.equal(data.gameProgress.game_mode_enabled, false)
  assert.equal(JSON.stringify(data).includes('password_hash'), false)
  assert.equal(JSON.stringify(data).includes('Secret'), false)
})

test('reset is owner-scoped and atomic; existing private artwork prevents unsafe cleanup', async () => {
  await db
    .prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type'),(2,'voice')")
    .run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,generation_status) VALUES(1,'earliest-memories','failed'),(2,'earliest-memories','completed')"
    )
    .run()
  assert.equal((await request('/api/onboarding/reset', { method: 'DELETE' })).status, 200)
  assert.equal(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
  assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=2').first(), null)
  await db.prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type')").run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,image_url) VALUES(1,'earliest-memories','https://media.example.invalid/private.webp')"
    )
    .run()
  const response = await request('/api/onboarding/reset', { method: 'DELETE' })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, 'MEDIA_CLEANUP_UNAVAILABLE')
  assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
})

test('reset rolls back onboarding when image metadata deletion fails', async () => {
  await db.prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type')").run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,generation_status) VALUES(1,'earliest-memories','failed')"
    )
    .run()
  await db
    .prepare(
      "CREATE TRIGGER reject_reset BEFORE DELETE ON chapter_images BEGIN SELECT RAISE(ABORT, 'blocked'); END"
    )
    .run()
  try {
    assert.equal((await request('/api/onboarding/reset', { method: 'DELETE' })).status, 503)
    assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
    assert.notEqual(await db.prepare('SELECT * FROM chapter_images WHERE user_id=1').first(), null)
  } finally {
    await db.prepare('DROP TRIGGER reject_reset').run()
  }
})

test('deletion and missing voice services fail explicitly and retain all private data', async () => {
  for (const [path, method, code] of [
    ['/api/user/delete-account', 'DELETE', 'ACCOUNT_DELETION_NOT_MIGRATED'],
    ['/api/onboarding/voice-session', 'POST', 'VOICE_ONBOARDING_NOT_MIGRATED'],
    ['/api/onboarding/context', 'POST', 'VOICE_ONBOARDING_NOT_MIGRATED']
  ]) {
    const response = await request(path, { method })
    assert.equal(response.status, 501)
    assert.equal((await response.json()).code, code)
  }
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 2)
})

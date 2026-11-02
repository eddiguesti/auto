import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import { createRepositories } from './repositories.js'
import { createMappedCodec, timestampToApi } from './value-codecs.js'
import { getNativePublicProducts } from './payments.js'

const secret = 'native-test-secret-for-HS256-at-least-32-characters'
const root = fileURLToPath(new URL('../../', import.meta.url))
const bundle = fileURLToPath(
  new URL('../../.cloudflare/api-tests/staging-worker.mjs', import.meta.url)
)
let runtime
let db

before(async () => {
  await build({
    entryPoints: [`${root}/cloudflare/api-staging.js`],
    outfile: bundle,
    bundle: true,
    external: ['cloudflare:workers', 'node:buffer'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'native-staging-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000001' }
    })
  )
  db = await runtime.getD1Database('DB')
  // These reviewed DDL files contain no semicolons in string literals. D1.exec
  // operates line-by-line and cannot ingest the compiler's multiline/comment layout.
  for (const file of ['../db/schema.sql', './migrations/0001_story_outbox.sql']) {
    const ddl = await readFile(new URL(file, import.meta.url), 'utf8')
    const statements = ddl
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(statement => statement.trim())
      .filter(Boolean)
    await db.batch(statements.map(statement => db.prepare(statement)))
  }
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.batch(
    [
      'story_outbox',
      'token_blacklist',
      'user_token_invalidation',
      'photos',
      'stories',
      'settings',
      'users'
    ].map(table => db.prepare(`DELETE FROM ${table}`))
  )
  await db
    .prepare(
      `INSERT INTO users (id, email, name, premium_until, email_verified, is_admin) VALUES
    (1, 'one@example.com', 'One', NULL, 1, 0),
    (2, 'two@example.com', 'Two', '2099-01-01 00:00:00.123456', 0, 1)`
    )
    .run()
})

function token(id = 1, extra = {}, options = {}) {
  return jwt.sign(
    { id, email: `${id === 1 ? 'one' : 'two'}@example.com`, jti: crypto.randomUUID(), ...extra },
    secret,
    { expiresIn: '1h', ...options }
  )
}
async function request(path, { method = 'GET', auth = token(), body, headers = {} } = {}) {
  return runtime.dispatchFetch(`http://localhost${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  })
}
const story = {
  chapter_id: 'earliest-memories',
  question_id: 'first-memory',
  answer: 'Remembering the garden.',
  total_questions: 5
}

test('both prefixes expose the authoritative catalog anonymously while payment mutations remain protected', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    const response = await request(`${prefix}/payments/products`, { auth: null })
    assert.equal(response.status, 200)
    const products = await response.json()
    assert.deepEqual(products, getNativePublicProducts({}))
    assert.deepEqual(Object.fromEntries(products.map(product => [product.id, product.price])), {
      export_style: 499,
      export_ebook: 799,
      export_audiobook: 1499,
      printed_book: 25000,
      premium_monthly: 999,
      premium_yearly: 9999,
      premium_bundle: 25000,
      onboarding_bundle: 25000
    })
    assert.equal(
      products.find(product => product.id === 'premium_monthly').checkoutAvailable,
      false
    )
    assert.equal(products.find(product => product.id === 'premium_yearly').checkoutAvailable, false)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.equal(
      (await request(`${prefix}/payments/products`, { method: 'POST', auth: null })).status,
      401
    )
    assert.equal(
      (await request(`${prefix}/payments/create-checkout`, { method: 'POST', auth: null })).status,
      401
    )
    assert.equal(
      (
        await request(`${prefix}/payments/create-checkout`, {
          method: 'POST',
          auth: token(1, { scope: 'magic_link' })
        })
      ).status,
      403
    )
    const unavailable = await request(`${prefix}/payments/create-checkout`, {
      method: 'POST',
      body: { productId: 'export_ebook' }
    })
    assert.equal(unavailable.status, 503)
    assert.equal((await unavailable.json()).code, 'PUBLISHING_UNAVAILABLE')
  }
})

test('public catalog requires no D1, identity provider, signing secret or timezone policy', async () => {
  const catalogOnly = new Miniflare(
    convertV4MiniflareOptions({
      name: 'catalog-only-staging-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: { NATIVE_API_STAGE: 'local-d1-slice' }
    })
  )
  try {
    for (const prefix of ['/api', '/api/v1']) {
      const response = await catalogOnly.dispatchFetch(
        `https://api-staging.invalid${prefix}/payments/products`
      )
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), getNativePublicProducts({}))
    }
  } finally {
    await catalogOnly.dispose()
  }
})

test('native workerd health identifies the incomplete staging slice', async () => {
  const response = await request('/api/health', { auth: null })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    status: 'staging',
    nativeSlice: 'stories',
    productionReady: false
  })
})

test('source-minted HS256 tokens verify and both API prefixes preserve auth protection', async () => {
  const authentic = jwt.sign(
    {
      id: 1,
      email: 'one@example.com',
      jti: 'invalid-utf8-signature-fixture',
      iat: 1700000000,
      exp: 4102444800
    },
    secret
  )
  assert.throws(() =>
    new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.from(authentic.split('.')[2], 'base64url')
    )
  )
  assert.equal((await request('/api/stories/all', { auth: authentic })).status, 200)
  assert.equal(
    (
      await request('/api/stories/all', {
        auth: authentic,
        headers: { Authorization: `bearer ${authentic}` }
      })
    ).status,
    200
  )
  assert.equal(
    (
      await request('/api/stories/all', {
        auth: authentic,
        headers: { Authorization: `Basic ${authentic}` }
      })
    ).status,
    403
  )
  for (const prefix of ['/api', '/api/v1']) {
    const missing = await request(`${prefix}/stories/all`, { auth: null })
    assert.equal(missing.status, 401)
    assert.deepEqual(await missing.json(), { error: 'Authentication required' })
    const valid = await request(`${prefix}/stories/all`)
    assert.equal(valid.status, 200)
    assert.deepEqual(await valid.json(), [])
    assert.equal(valid.headers.get('cache-control'), 'private, no-store')
  }
})

test('expired, future and wrong-algorithm tokens are rejected', async () => {
  for (const value of [
    token(1, {}, { expiresIn: -1 }),
    token(1, { nbf: Math.floor(Date.now() / 1000) + 100 }),
    token(1, {}, { algorithm: 'HS384' })
  ]) {
    assert.equal((await request('/api/stories/all', { auth: value })).status, 403)
  }
})

test('writes retain owner, public response ID, trimmed answer and atomically stored side-effect intent', async () => {
  const response = await request('/api/stories', {
    method: 'POST',
    body: { ...story, answer: '  Our home.  ' }
  })
  assert.equal(response.status, 200)
  const saved = await response.json()
  assert.equal(saved.success, true)
  assert.equal(typeof saved.id, 'number')
  const row = await db
    .prepare('SELECT user_id, answer FROM stories WHERE id = ?')
    .bind(saved.id)
    .first()
  assert.deepEqual(row, { user_id: 1, answer: 'Our home.' })
  const outbox = await db.prepare('SELECT story_id, payload, state FROM story_outbox').first()
  assert.equal(outbox.story_id, saved.id)
  assert.equal(outbox.state, 'pending')
  assert.equal(JSON.parse(outbox.payload).answer, 'Our home.')
  assert.equal((await request('/api/v1/stories/progress')).status, 200)
  assert.deepEqual(await (await request('/api/stories/progress')).json(), {
    'earliest-memories': 1
  })
})

test('upsert remains owner-scoped and preserves styled/original content', async () => {
  const first = await (await request('/api/stories', { method: 'POST', body: story })).json()
  await db
    .prepare(
      "UPDATE stories SET original_answer = 'Original', style_applied = 'hemingway' WHERE id = ?"
    )
    .bind(first.id)
    .run()
  const updated = await (
    await request('/api/v1/stories', { method: 'POST', body: { ...story, answer: 'Updated.' } })
  ).json()
  assert.equal(updated.id, first.id)
  const other = await (
    await request('/api/stories', { method: 'POST', auth: token(2), body: story })
  ).json()
  assert.notEqual(other.id, first.id)
  const owned = await (await request('/api/stories/all')).json()
  assert.equal(owned.length, 1)
  assert.equal(owned[0].answer, 'Updated.')
  assert.equal(owned[0].original_answer, 'Original')
  assert.equal(owned[0].style_applied, 'hemingway')
  assert.equal(owned[0].user_id, 1)
})

test('photo JSON aggregation retains null caption and excludes an inconsistent different-owner photo', async () => {
  const saved = await (await request('/api/stories', { method: 'POST', body: story })).json()
  await db
    .prepare('INSERT INTO photos (story_id, filename, caption, user_id) VALUES (?, ?, ?, ?)')
    .bind(saved.id, 'legacy.jpg', null, null)
    .run()
  await db
    .prepare('INSERT INTO photos (story_id, filename, caption, user_id) VALUES (?, ?, ?, ?)')
    .bind(saved.id, 'other.jpg', 'Private', 2)
    .run()
  const rows = await (await request('/api/stories/earliest-memories')).json()
  assert.equal(rows.length, 1)
  assert.deepEqual(
    rows[0].photos.map(photo => ({ filename: photo.filename, caption: photo.caption })),
    [{ filename: 'legacy.jpg', caption: null }]
  )
  assert.equal((await request('/api/stories/all', { auth: token(2) })).status, 200)
  assert.deepEqual(await (await request('/api/stories/all', { auth: token(2) })).json(), [])
})

test('premium chapter access is denied without entitlement and accepted for a paid owner', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    assert.equal((await request(`${prefix}/stories/childhood`)).status, 403)
    assert.equal(
      (
        await request(`${prefix}/stories`, {
          method: 'POST',
          body: { ...story, chapter_id: 'childhood' }
        })
      ).status,
      403
    )
    assert.equal(
      (
        await request(`${prefix}/stories`, {
          method: 'POST',
          auth: token(2),
          body: { ...story, chapter_id: 'childhood' }
        })
      ).status,
      200
    )
  }
})

test('D1 batch rolls back the story update when durable intent insertion fails', async () => {
  const saved = await (await request('/api/stories', { method: 'POST', body: story })).json()
  await db.exec(
    "CREATE TRIGGER reject_test_intent BEFORE INSERT ON story_outbox BEGIN SELECT RAISE(ABORT, 'test outbox failure'); END;"
  )
  try {
    const failed = await request('/api/stories', {
      method: 'POST',
      body: { ...story, answer: 'Must roll back.' }
    })
    assert.equal(failed.status, 503)
    assert.equal(
      (await db.prepare('SELECT answer FROM stories WHERE id = ?').bind(saved.id).first()).answer,
      story.answer
    )
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM story_outbox').first()).count, 1)
  } finally {
    await db.exec('DROP TRIGGER reject_test_intent')
  }
})

test('concurrent saves create one owner/question row and durable intents for each accepted version', async () => {
  const responses = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      request('/api/stories', { method: 'POST', body: { ...story, answer: `Version ${index}` } })
    )
  )
  assert.equal(
    responses.every(response => response.status === 200),
    true
  )
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM stories').first()).count, 1)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM story_outbox').first()).count, 8)
  const { results } = await db.prepare('SELECT payload FROM story_outbox').all()
  assert.deepEqual(
    results.map(row => JSON.parse(row.payload).answer).sort(),
    Array.from({ length: 8 }, (_, index) => `Version ${index}`)
  )
})

test('settings update is owner-scoped and keeps source name trimming and ignored birth-year semantics', async () => {
  assert.deepEqual(await (await request('/api/stories/settings')).json(), {})
  const response = await request('/api/v1/stories/settings', {
    method: 'POST',
    body: { name: '  Ada  ', birth_year: 1950 }
  })
  assert.equal(response.status, 200)
  const owned = await (await request('/api/stories/settings')).json()
  assert.equal(owned.name, 'Ada')
  assert.equal(owned.user_id, 1)
  assert.deepEqual(await (await request('/api/stories/settings', { auth: token(2) })).json(), {})
  assert.equal(
    (await db.prepare('SELECT birth_year FROM users WHERE id = 1').first()).birth_year,
    null
  )
})

test('validation rejects ownership injection, malformed JSON, unknown keys and invalid chapter slugs', async () => {
  assert.equal(
    (await request('/api/stories', { method: 'POST', body: { ...story, user_id: 2 } })).status,
    400
  )
  assert.equal((await request('/api/stories', { method: 'POST', body: '{' })).status, 400)
  assert.equal((await request('/api/stories/%3Cscript%3E')).status, 400)
  assert.equal((await request('/api/stories/%ZZ')).status, 400)
  assert.equal(
    (
      await request('/api/stories', {
        method: 'POST',
        body: { ...story, chapter_id: 'bad_chapter' }
      })
    ).status,
    400
  )
})

test('logout immediately revokes JTI tokens across sequential requests', async () => {
  const auth = token()
  assert.equal((await request('/api/auth/logout', { method: 'POST', auth })).status, 200)
  const rejected = await request('/api/v1/stories/all', { auth })
  assert.equal(rejected.status, 401)
  assert.deepEqual(await rejected.json(), { error: 'Token revoked' })
})

test('user-wide revocation advances exported +00 timestamps and preserves later invalidations', async () => {
  const auth = token()
  await db
    .prepare(
      "INSERT INTO user_token_invalidation(user_id,invalidated_at) VALUES(1,'2000-01-01 00:00:00.123456+00')"
    )
    .run()
  assert.equal((await request('/api/stories/all', { auth })).status, 200)
  const repository = createRepositories(db, { wallClockTimeZone: 'UTC' })
  await repository.invalidateUserTokens(1)
  assert.equal((await request('/api/stories/all', { auth })).status, 401)
  await db
    .prepare(
      "UPDATE user_token_invalidation SET invalidated_at='2099-01-01 00:00:00.123456+00' WHERE user_id=1"
    )
    .run()
  await repository.invalidateUserTokens(1)
  assert.equal(
    (await db.prepare('SELECT invalidated_at FROM user_token_invalidation WHERE user_id=1').first())
      .invalidated_at,
    '2099-01-01 00:00:00.123456+00'
  )
})

test('an actual revocation table outage fails closed instead of bypassing logout checks', async () => {
  await db.exec('ALTER TABLE token_blacklist RENAME TO unavailable_token_blacklist')
  try {
    const response = await request('/api/stories/all')
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'Service unavailable' })
  } finally {
    await db.exec('ALTER TABLE unavailable_token_blacklist RENAME TO token_blacklist')
  }
})

test('legacy tokens without JTI get single-token fingerprint revocation', async () => {
  const auth = token(1, { jti: undefined })
  assert.equal((await request('/api/stories/all', { auth })).status, 200)
  assert.equal((await request('/api/auth/logout', { method: 'POST', auth })).status, 200)
  assert.equal((await request('/api/stories/all', { auth })).status, 401)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const noncanonical = auth.slice(0, -1) + alphabet[alphabet.indexOf(auth.at(-1)) + 1]
  assert.equal((await request('/api/stories/all', { auth: noncanonical })).status, 403)
  assert.equal((await request('/api/stories/all', { auth: token() })).status, 200)
})

test('a guarded repository write cannot bypass revoked premium entitlement', async () => {
  const repository = createRepositories(db, { wallClockTimeZone: 'UTC' })
  const id = await repository.saveStory(1, {
    chapterId: 'childhood',
    questionId: 'first-memory',
    answer: 'Private',
    totalQuestions: 5
  })
  assert.equal(id, null)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM stories').first()).count, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM story_outbox').first()).count, 0)
})

test('large request bodies and optional empty answers preserve limits and progress semantics', async () => {
  const oversized = await request('/api/stories', {
    method: 'POST',
    body: { ...story, answer: 'a'.repeat(1024 * 1024) }
  })
  assert.equal(oversized.status, 413)
  const saved = await (
    await request('/api/stories', {
      method: 'POST',
      body: { chapter_id: story.chapter_id, question_id: story.question_id }
    })
  ).json()
  assert.equal(typeof saved.id, 'number')
  assert.equal(
    (await db.prepare('SELECT answer FROM stories WHERE id = ?').bind(saved.id).first()).answer,
    null
  )
  assert.deepEqual(await (await request('/api/stories/progress')).json(), {})
})

test('user-level invalidation honors issuance seconds and deleted accounts cannot use old tokens', async () => {
  const auth = token()
  const repository = createRepositories(db, { wallClockTimeZone: 'UTC' })
  await repository.invalidateUserTokens(1)
  assert.equal((await request('/api/stories/all', { auth })).status, 401)
  await db.prepare("UPDATE users SET deleted_at = '2026-01-01 00:00:00' WHERE id = 2").run()
  assert.equal((await request('/api/stories/all', { auth: token(2) })).status, 401)
})

test('scoped tokens cannot read account-wide stories or enter full-scope payment/account routes', async () => {
  const auth = token(1, { scope: 'magic_link' })
  assert.equal((await request('/api/stories/all', { auth })).status, 403)
  for (const path of ['/api/payments/history', '/api/v1/user/profile', '/api/refunds/request']) {
    const options = path.includes('/refunds/request')
      ? { method: 'POST', body: { type: 'other' } }
      : {}
    assert.equal((await request(path, { ...options, auth })).status, 403)
    assert.equal(
      (await request(path, options)).status,
      path.includes('/payments/history') ? 200 : path.includes('/refunds/request') ? 404 : 501
    )
  }
})

test('mapped profile booleans and imported timestamp API serialization match PostgreSQL shapes', async () => {
  await db
    .prepare("UPDATE users SET premium_until = '2099-01-01 01:02:03.123456' WHERE id = 2")
    .run()
  const profile = await (await request('/api/auth/me', { auth: token(2) })).json()
  assert.equal(profile.user.email_verified, false)
  assert.equal(profile.user.is_admin, true)
  assert.equal(profile.user.premium_until, '2099-01-01T01:02:03.123Z')
  assert.equal(profile.user.isPremium, true)
  assert.equal(
    (await db.prepare('SELECT premium_until FROM users WHERE id = 2').first()).premium_until,
    '2099-01-01 01:02:03.123456'
  )
})

test('mapping codec preserves exact JSON/decimal storage and refuses unsafe numeric API decoding', () => {
  const codec = createMappedCodec('prompt_library', { wallClockTimeZone: 'UTC' })
  assert.equal(codec.encode('avg_completion_rate', '0.99'), '0.99')
  const jsonCodec = createMappedCodec('collection_items', { wallClockTimeZone: 'UTC' })
  const exact = '{"count":9007199254740993}'
  assert.equal(jsonCodec.encode('completion_criteria', exact), exact)
  assert.throws(
    () => jsonCodec.decodeRow({ completion_criteria: exact }),
    /cannot be represented exactly/
  )
  assert.equal(
    timestampToApi('2025-02-01 01:02:03.123456+00', 'instant'),
    '2025-02-01T01:02:03.123Z'
  )
  assert.throws(() => timestampToApi('2025-02-01 01:02:03.123456', 'timestamp'), /verified UTC/)
})

test('raw story edits invalidate compiled prose atomically while preserving stale reviewed chapters and other owners', async () => {
  const saved = await (await request('/api/stories', { method: 'POST', body: story })).json()
  await db.batch([
    db
      .prepare(
        "UPDATE stories SET compiled_content='Old compilation', compiled_at='2000-01-01 00:00:00' WHERE id=?"
      )
      .bind(saved.id),
    db.prepare(
      "INSERT INTO chapter_reviews(user_id,chapter_id,polished_text,updated_at) VALUES(1,'earliest-memories','Author-reviewed text','2000-01-01 00:00:00')"
    ),
    db.prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,compiled_content,compiled_at) VALUES(2,'earliest-memories','other','Other owner','Other compiled','2000-01-01 00:00:00')"
    )
  ])
  const edited = await request('/api/stories', {
    method: 'POST',
    body: { ...story, answer: 'An edited raw memory.' }
  })
  assert.equal(edited.status, 200)
  const row = await db.prepare('SELECT * FROM stories WHERE id=?').bind(saved.id).first()
  assert.equal(row.answer, 'An edited raw memory.')
  assert.equal(row.compiled_content, null)
  assert.equal(row.compiled_at, null)
  const review = await db.prepare('SELECT * FROM chapter_reviews WHERE user_id=1').first()
  assert.equal(review.polished_text, 'Author-reviewed text')
  assert.ok(
    new Date(row.updated_at.replace(' ', 'T') + 'Z') >
      new Date(review.updated_at.replace(' ', 'T') + 'Z')
  )
  assert.equal(
    (await db.prepare('SELECT compiled_content FROM stories WHERE user_id=2').first())
      .compiled_content,
    'Other compiled'
  )
})

test('settings writes remain authoritative and do not erase reviewed or compiled chapter content', async () => {
  await db.batch([
    db.prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,compiled_content) VALUES(1,'earliest-memories','q','Raw','Compiled')"
    ),
    db.prepare(
      "INSERT INTO chapter_reviews(user_id,chapter_id,polished_text) VALUES(1,'earliest-memories','Final review')"
    )
  ])
  await request('/api/stories/settings', { method: 'POST', body: { name: 'New author' } })
  assert.equal((await (await request('/api/stories/settings')).json()).name, 'New author')
  assert.equal(
    (await db.prepare('SELECT compiled_content FROM stories WHERE user_id=1').first())
      .compiled_content,
    'Compiled'
  )
  assert.equal(
    (await db.prepare('SELECT polished_text FROM chapter_reviews WHERE user_id=1').first())
      .polished_text,
    'Final review'
  )
})

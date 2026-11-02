import { sqlStatements } from './fixtures/sql-statements.mjs'
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync } from 'node:crypto'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
const secret = 'fake-native-google-app-secret-at-least-32-characters',
  clientId = '123-test.apps.googleusercontent.com'
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = {
  ...publicKey.export({ format: 'jwk' }),
  kid: 'test-google-key',
  alg: 'RS256',
  use: 'sig'
}
let runtime, db, keyRequests
before(async () => {
  const outfile = fileURLToPath(
    new URL('../../.cloudflare/api-tests/google-worker.mjs', import.meta.url)
  )
  await build({
    entryPoints: [fileURLToPath(new URL('../api-staging.js', import.meta.url))],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers', 'node:buffer'],
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'google-api',
      modules: true,
      scriptPath: outfile,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        GOOGLE_CLIENT_ID: clientId,
        AUTH_RATE_MODE: 'account-budget',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        NATIVE_API_STAGE: 'local-d1-slice'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000083' },
      serviceBindings: {
        GOOGLE_JWKS_FETCH: async request => {
          keyRequests.push({
            url: request.url,
            authorization: request.headers.get('Authorization'),
            cookie: request.headers.get('Cookie')
          })
          return Response.json(
            { keys: [jwk] },
            { headers: { 'Cache-Control': 'public,max-age=3600' } }
          )
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  for (const file of [
    '../db/schema.sql',
    ...(await readdir(new URL('./migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql'))
      .sort()
      .map(name => `./migrations/${name}`)
  ]) {
    const text = await readFile(new URL(file, import.meta.url), 'utf8')
    await db.batch(sqlStatements(text).map(sql => db.prepare(sql)))
  }
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  keyRequests = []
  await db.batch(
    ['auth_rate_limits', 'users', 'collections'].map(table => db.prepare(`DELETE FROM ${table}`))
  )
  await db
    .prepare(
      "INSERT INTO collections(id,collection_key,collection_name,is_active) VALUES(1,'active','Active',1)"
    )
    .run()
})
function credential(extra = {}, options = {}) {
  return jwt.sign(
    {
      sub: 'google-123',
      email: 'writer@gmail.com',
      email_verified: true,
      name: 'Writer',
      picture: 'https://example.invalid/avatar.png',
      ...extra
    },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: jwk.kid,
      issuer: 'https://accounts.google.com',
      audience: clientId,
      expiresIn: '1h',
      ...options
    }
  )
}
function call(raw, extra = {}) {
  return runtime.dispatchFetch('https://google-api.invalid/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify({ credential: raw })
  })
}
test('native RS256 Google login verifies fixed Google keys and atomically initializes an account with an interoperable full-scope JWT', async () => {
  const response = await call(credential())
  assert.equal(response.status, 200)
  const data = await response.json(),
    claims = jwt.verify(data.token, secret, { algorithms: ['HS256'] })
  assert.equal(claims.id, data.user.id)
  assert.equal(claims.scope, undefined)
  assert.equal((await db.prepare('SELECT email_verified FROM users').first()).email_verified, 1)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM user_game_state').first()).count, 1)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM user_collection_progress').first()).count,
    1
  )
  assert.deepEqual(keyRequests, [
    { url: 'https://www.googleapis.com/oauth2/v3/certs', authorization: null, cookie: null }
  ])
  assert.equal((await call(credential({ picture: 'https://example.invalid/new.png' }))).status, 200)
  assert.equal(
    (await db.prepare('SELECT avatar_url FROM users').first()).avatar_url,
    'https://example.invalid/new.png'
  )
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1)
})
test('wrong issuer, audience, signature, expiry, unverified email and algorithm are rejected without account creation', async () => {
  const invalid = [
    credential({}, { issuer: 'https://attacker.invalid' }),
    credential({}, { audience: 'wrong.apps.googleusercontent.com' }),
    credential({ email_verified: false }),
    credential({}, { expiresIn: -1 }),
    credential().slice(0, -8) + 'AAAAAAAA',
    jwt.sign({ sub: 'google-123', email: 'writer@gmail.com' }, secret)
  ]
  for (const raw of invalid) assert.equal((await call(raw)).status, 401)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 0)
})
test('verified Gmail can link an existing password account, while unrelated Google identities and non-authoritative third-party addresses cannot take it over', async () => {
  await db
    .prepare(
      "INSERT INTO users(email,name,password_hash) VALUES('writer@gmail.com','Original','existing-hash'),('other@example.invalid','Other','other-hash')"
    )
    .run()
  assert.equal((await call(credential())).status, 200)
  assert.equal(
    (
      await db
        .prepare("SELECT google_id,password_hash,name FROM users WHERE email='writer@gmail.com'")
        .first()
    ).name,
    'Original'
  )
  assert.equal((await call(credential({ sub: 'different-google' }))).status, 409)
  assert.equal(
    (await call(credential({ sub: 'third-party-google', email: 'other@example.invalid' }))).status,
    409
  )
  assert.equal(
    (await db.prepare("SELECT google_id FROM users WHERE email='other@example.invalid'").first())
      .google_id,
    null
  )
})
test('concurrent Google creation initializes once, deleted accounts stay closed and D1 initialization errors roll back account creation', async () => {
  const responses = await Promise.all([call(credential()), call(credential())])
  assert.ok(responses.every(response => response.status === 200))
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM user_game_state').first()).count, 1)
  await db.prepare("UPDATE users SET deleted_at='2026-01-01 00:00:00'").run()
  assert.equal((await call(credential())).status, 409)
  await db.prepare('DELETE FROM users').run()
  await db
    .prepare(
      "CREATE TRIGGER reject_google_game BEFORE INSERT ON user_game_state BEGIN SELECT RAISE(ABORT,'game unavailable'); END"
    )
    .run()
  try {
    assert.equal(
      (await call(credential({ sub: 'new-google', email: 'new@gmail.com' }))).status,
      503
    )
  } finally {
    await db.prepare('DROP TRIGGER reject_google_game').run()
  }
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 0)
})
test('a cross-site Google callback is rejected and existing provider identity wins over a changed email match', async () => {
  assert.equal((await call(credential(), { Origin: 'https://attacker.invalid' })).status, 403)
  await db
    .prepare(
      "INSERT INTO users(id,email,google_id,name) VALUES(1,'old@gmail.com','google-123','Original'),(2,'writer@gmail.com',NULL,'Other')"
    )
    .run()
  const response = await call(credential())
  assert.equal(response.status, 200)
  assert.equal((await response.json()).user.id, 1)
  assert.equal((await db.prepare('SELECT google_id FROM users WHERE id=2').first()).google_id, null)
})

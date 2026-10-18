import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'
import { tokenLifetime } from './auth.js'
import { signClientIdentity } from '../ingress-identity.js'

const secret = 'auth-native-test-secret-longer-than-32-characters'
const password = 'StrongPassword9'
let runtime, db, importedHash
let identityFails, emailFails, identityRequests, emails
const bundle = fileURLToPath(
  new URL('../../.cloudflare/api-tests/auth-worker.mjs', import.meta.url)
)
before(async () => {
  await build({
    entryPoints: [fileURLToPath(new URL('../api-staging.js', import.meta.url))],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  const bundled = await readFile(bundle, 'utf8')
  assert.ok(
    !/from ["'](?:node:)?crypto["']/.test(bundled),
    'browser bundle has no Node crypto import'
  )
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'auth-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      bindings: {
        JWT_SECRET: secret,
        JWT_EXPIRES_IN: '3600',
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        APP_URL: 'https://easymemoir.co.uk'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000002' },
      serviceBindings: {
        AUTH_CLIENT_ID: async request => {
          identityRequests.push({
            method: request.method,
            url: request.url,
            headers: [...request.headers],
            body: await request.text()
          })
          return identityFails
            ? new Response('rejected', { status: 403 })
            : Response.json({ subject: 'ip:203.0.113.42' })
        },
        EMAIL_PROVIDER: async request => {
          emails.push(await request.json())
          return emailFails
            ? new Response('unavailable', { status: 503 })
            : Response.json({ id: 'email-test-delivered' })
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  const migrationNames = (await readdir(new URL('./migrations/', import.meta.url)))
    .filter(name => name.endsWith('.sql'))
    .sort()
  for (const file of ['../db/schema.sql', ...migrationNames.map(name => `./migrations/${name}`)]) {
    const ddl = await readFile(new URL(file, import.meta.url), 'utf8')
    const statements = ddl
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(value => value.trim())
      .filter(Boolean)
    await db.batch(statements.map(statement => db.prepare(statement)))
  }
  importedHash = await bcrypt.hash(password, 12)
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  identityFails = false
  emailFails = false
  identityRequests = []
  emails = []
  await db.batch(
    ['auth_rate_limits', 'token_blacklist', 'user_token_invalidation', 'users', 'collections'].map(
      table => db.prepare(`DELETE FROM ${table}`)
    )
  )
  await db
    .prepare(
      `INSERT INTO users (id,email,name,password_hash) VALUES (1,'imported@example.com','Imported',?)`
    )
    .bind(importedHash)
    .run()
  await db
    .prepare(
      `INSERT INTO collections (id,collection_key,collection_name,is_active) VALUES (1,'active','Active',1),(2,'inactive','Inactive',0)`
    )
    .run()
})
function request(path, body, headers = {}) {
  return runtime.dispatchFetch(`https://api-staging.invalid${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
}
const registration = extra => ({
  email: 'new@example.com',
  password,
  name: 'New Person',
  birthYear: 1960,
  _ts: Date.now() - 3000,
  ...extra
})
const login = extra => ({ email: 'imported@example.com', password, ...extra })

test('workerd registration uses bcrypt12, atomic source defaults, real email adapter and Node-compatible HS256', async () => {
  const start = performance.now()
  const response = await request(
    '/api/v1/auth/register',
    registration({ email: ' NEW@EXAMPLE.COM ', name: '  <New Person>  ' })
  )
  assert.equal(response.status, 201)
  const result = await response.json()
  assert.deepEqual(Object.keys(result).sort(), ['token', 'user'])
  assert.deepEqual(result.user, {
    id: 2,
    email: 'new@example.com',
    name: '<New Person>',
    birth_year: 1960,
    avatar_url: null
  })
  const claims = jwt.verify(result.token, secret)
  assert.equal(claims.exp - claims.iat, 3600)
  assert.match(claims.jti, /^[a-f0-9]{32}$/)
  assert.equal(claims.scope, undefined)
  const stored = await db
    .prepare('SELECT password_hash,email_verified FROM users WHERE id=2')
    .first()
  assert.match(stored.password_hash, /^\$2b\$12\$/)
  assert.equal(await bcrypt.compare(password, stored.password_hash), true)
  assert.equal(stored.email_verified, 0)
  assert.equal(
    (await db.prepare('SELECT game_mode_enabled FROM user_game_state WHERE user_id=2').first())
      .game_mode_enabled,
    0
  )
  assert.deepEqual(
    (await db.prepare('SELECT collection_id FROM user_collection_progress WHERE user_id=2').all())
      .results,
    [{ collection_id: 1 }]
  )
  assert.equal(emails.length, 1)
  assert.equal(emails[0].to, 'new@example.com')
  assert.ok(emails[0].html.includes('&lt;New Person&gt;'))
  const raw = /token=([a-f0-9]{64})/.exec(emails[0].html)[1]
  const verify = await db
    .prepare('SELECT token_hash,expires_at FROM email_verification_tokens WHERE user_id=2')
    .first()
  assert.equal(verify.token_hash, createHash('sha256').update(raw).digest('hex'))
  assert.ok(!JSON.stringify(result).includes(raw))
  const me = await runtime.dispatchFetch('https://api-staging.invalid/api/auth/me', {
    headers: { Authorization: `Bearer ${result.token}` }
  })
  assert.equal(me.status, 200)
  console.log(
    `bcrypt12 registration total local wall time including D1/email: ${Math.round(performance.now() - start)}ms; this is not a hosted CPU measurement`
  )
})

test('workerd verifies imported 2a/2b/2y bcrypt hashes without rewriting them', async () => {
  for (const version of ['2a', '2b', '2y']) {
    const hash = importedHash.replace('$2b$', `$${version}$`)
    await db.prepare('UPDATE users SET password_hash=? WHERE id=1').bind(hash).run()
    const response = await request(
      '/api/auth/login',
      login({ email: ' IMPORTED@EXAMPLE.COM ', password: ` ${password} ` })
    )
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.deepEqual(result.user, {
      id: 1,
      email: 'imported@example.com',
      name: 'Imported',
      avatar_url: null
    })
    assert.equal(jwt.verify(result.token, secret).id, 1)
    assert.equal(
      (await db.prepare('SELECT password_hash FROM users WHERE id=1').first()).password_hash,
      hash
    )
  }
})

test('wrong credentials, Google-only accounts, soft deletion and corrupt hashes fail safely', async () => {
  assert.equal(
    (await request('/api/auth/login', login({ password: 'WrongPassword9' }))).status,
    401
  )
  assert.equal(
    (await request('/api/auth/login', login({ email: 'missing@example.com' }))).status,
    401
  )
  await db.prepare('UPDATE users SET password_hash=NULL WHERE id=1').run()
  const google = await request('/api/auth/login', login())
  assert.equal(google.status, 401)
  assert.deepEqual(await google.json(), { error: 'Please use Google Sign-In for this account' })
  await db
    .prepare("UPDATE users SET deleted_at='2026-10-09 00:00:00',password_hash=? WHERE id=1")
    .bind(importedHash)
    .run()
  assert.equal((await request('/api/auth/login', login())).status, 401)
  await db.prepare("UPDATE users SET deleted_at=NULL,password_hash='not-a-hash' WHERE id=1").run()
  assert.equal((await request('/api/auth/login', login())).status, 503)
})

test('source schema validation and bot checks reject unsafe registration before writes', async () => {
  for (const extra of [
    { password: 'weak' },
    { _hp: 'bot' },
    { _ts: Date.now() + 50000 },
    { _ts: Date.now() - 4000000 },
    { is_admin: true },
    { email: 'bad' }
  ]) {
    assert.equal((await request('/api/auth/register', registration(extra))).status, 400)
  }
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1)
  assert.equal(emails.length, 0)
})

test('duplicate and concurrent same-email registrations cannot create partial or duplicate accounts', async () => {
  assert.equal(
    (await request('/api/auth/register', registration({ email: 'imported@example.com' }))).status,
    400
  )
  const responses = await Promise.all([
    request('/api/auth/register', registration()),
    request('/api/v1/auth/register', registration())
  ])
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 400])
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS count FROM users WHERE email='new@example.com'").first())
      .count,
    1
  )
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM user_game_state').first()).count, 1)
  assert.equal(emails.length, 1)
})

test('actual D1 registration batch rolls back all user/token writes if game initialization fails', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_game BEFORE INSERT ON user_game_state BEGIN SELECT RAISE(ABORT,'game rejected'); END"
    )
    .run()
  try {
    assert.equal((await request('/api/auth/register', registration())).status, 503)
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*) AS count FROM users WHERE email='new@example.com'")
          .first()
      ).count,
      0
    )
    assert.equal(
      (await db.prepare('SELECT COUNT(*) AS count FROM email_verification_tokens').first()).count,
      0
    )
  } finally {
    await db.prepare('DROP TRIGGER reject_game').run()
  }
})

test('atomic source10/900 rate window covers both prefixes and ignores spoofed IP/account rotation', async () => {
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      request(
        `${index % 2 ? '/api' : '/api/v1'}/auth/login`,
        login({ email: `missing${index}@example.com` }),
        {
          'CF-Connecting-IP': `203.0.113.${index}`,
          'X-Forwarded-For': `192.0.2.${index}`
        }
      )
    )
  )
  assert.equal(responses.filter(response => response.status === 401).length, 10)
  assert.equal(responses.filter(response => response.status === 429).length, 2)
  assert.ok(
    Number(responses.find(response => response.status === 429).headers.get('Retry-After')) > 0
  )
  assert.equal((await request('/api/auth/register', registration())).status, 429)
  await db
    .prepare('UPDATE auth_rate_limits SET window_started_at=?')
    .bind(Math.floor(Date.now() / 1000) - 900)
    .run()
  assert.equal(
    (await request('/api/auth/login', login({ email: 'missing@example.com' }))).status,
    401
  )
  assert.equal((await db.prepare('SELECT attempts FROM auth_rate_limits').first()).attempts, 1)
})

test('trusted identity provider failures block hashing and receive no JWT, body or client IP headers', async () => {
  identityFails = true
  const response = await request('/api/auth/register', registration(), {
    Authorization: 'Bearer sensitive-user-token',
    Cookie: 'private-cookie',
    'CF-Connecting-IP': '192.0.2.2',
    'X-EasyMemoir-Client-Identity': 'signed-network-assertion'
  })
  assert.equal(response.status, 503)
  assert.equal(identityRequests.length, 1)
  assert.deepEqual(identityRequests[0], {
    method: 'POST',
    url: 'https://auth-identity.internal/verify',
    headers: [
      ['content-length', '0'],
      ['host', 'auth-identity.internal'],
      ['x-easymemoir-auth-path', '/api/auth/register'],
      ['x-easymemoir-client-identity', 'signed-network-assertion']
    ],
    body: ''
  })
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1)
})

test('missing bound identity provider cannot be bypassed using Cloudflare-looking client headers', async () => {
  const missingProvider = new Miniflare(
    convertV4MiniflareOptions({
      name: 'auth-provider-absent-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000003' }
    })
  )
  try {
    const response = await missingProvider.dispatchFetch(
      'https://api-staging.invalid/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.42',
          'X-EasyMemoir-Client-Identity': 'forged'
        },
        body: JSON.stringify(login())
      }
    )
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'Trusted auth client identity unavailable' })
  } finally {
    await missingProvider.dispose()
  }
})

test('an actual D1 rate-table outage fails closed before account creation', async () => {
  await db.prepare('DROP TABLE auth_rate_limits').run()
  try {
    assert.equal((await request('/api/auth/register', registration())).status, 503)
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1)
  } finally {
    await db
      .prepare(
        'CREATE TABLE auth_rate_limits (subject_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, attempts INTEGER NOT NULL CHECK(attempts>0)) STRICT'
      )
      .run()
  }
})

test('email provider failure preserves source registration success without marking email verified', async () => {
  emailFails = true
  const response = await request('/api/auth/register', registration())
  assert.equal(response.status, 201)
  assert.equal(
    (await db.prepare("SELECT email_verified FROM users WHERE email='new@example.com'").first())
      .email_verified,
    0
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM email_verification_tokens').first()).count,
    1
  )
})

test('verification uses imported +00 timestamps and consumes token atomically only once', async () => {
  const raw = 'imported-verification-token'
  await db
    .prepare(
      "INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES(1,?,'2099-01-01 00:00:00.123456+00')"
    )
    .bind(createHash('sha256').update(raw).digest('hex'))
    .run()
  const results = await Promise.all([
    request('/api/auth/verify-email', { token: raw }),
    request('/api/v1/auth/verify-email', { token: raw })
  ])
  assert.deepEqual(results.map(response => response.status).sort(), [200, 400])
  assert.equal(
    (await db.prepare('SELECT email_verified FROM users WHERE id=1').first()).email_verified,
    1
  )
  assert.ok((await db.prepare('SELECT used_at FROM email_verification_tokens').first()).used_at)
  assert.equal((await request('/api/auth/verify-email', { token: 'wrong' })).status, 400)
})

test('expired and deleted-user verification links are rejected, and a failed update rolls back consumption', async () => {
  const hash = createHash('sha256').update('test-verification').digest('hex')
  await db
    .prepare(
      "INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES(1,?,'2000-01-01 00:00:00+00')"
    )
    .bind(hash)
    .run()
  assert.equal(
    (await request('/api/auth/verify-email', { token: 'test-verification' })).status,
    400
  )
  await db.prepare("UPDATE email_verification_tokens SET expires_at='2099-01-01 00:00:00+00'").run()
  await db
    .prepare(
      "CREATE TRIGGER reject_verified BEFORE UPDATE ON users WHEN NEW.email_verified=1 BEGIN SELECT RAISE(ABORT,'verify rejected'); END"
    )
    .run()
  try {
    assert.equal(
      (await request('/api/auth/verify-email', { token: 'test-verification' })).status,
      503
    )
    assert.equal(
      (await db.prepare('SELECT used_at FROM email_verification_tokens').first()).used_at,
      null
    )
  } finally {
    await db.prepare('DROP TRIGGER reject_verified').run()
  }
  await db.prepare("UPDATE users SET deleted_at='2026-10-09 00:00:00' WHERE id=1").run()
  assert.equal(
    (await request('/api/auth/verify-email', { token: 'test-verification' })).status,
    400
  )
})

test('JWT lifetime matches source numeric seconds/unit defaults and unsupported auth is explicit', async () => {
  for (const [input, expected] of [
    ['3600', 3600],
    ['"3600"', 3600],
    ['24h', 86400],
    [undefined, 604800],
    ['bad', 604800],
    ['0', 604800]
  ])
    assert.equal(tokenLifetime(input), expected)
  for (const path of [
    '/auth/google',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/resend-verification'
  ]) {
    const response = await request(`/api${path}`, {})
    assert.equal(response.status, 501)
    assert.equal((await response.json()).code, 'NOT_MIGRATED')
  }
})

test('real workerd API-to-identity service binding verifies signed ingress, method and exact public path', async () => {
  const ingressSecret = 'separate-ingress-secret-longer-than-32-characters'
  const identityBundle = fileURLToPath(
    new URL('../../.cloudflare/api-tests/auth-real-identity.mjs', import.meta.url)
  )
  await build({
    entryPoints: [fileURLToPath(new URL('../auth-client-identity.js', import.meta.url))],
    outfile: identityBundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  const paired = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'auth-api-paired',
          modules: true,
          scriptPath: bundle,
          compatibilityDate: '2026-10-09',
          bindings: {
            JWT_SECRET: secret,
            NATIVE_API_STAGE: 'local-d1-slice',
            SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
          },
          serviceBindings: { AUTH_CLIENT_ID: 'auth-identity-paired' },
          d1Databases: { DB: '00000000-0000-0000-0000-000000000004' }
        },
        {
          name: 'auth-identity-paired',
          modules: true,
          scriptPath: identityBundle,
          compatibilityDate: '2026-10-09',
          bindings: { AUTH_INGRESS_SECRET: ingressSecret }
        }
      ]
    })
  )
  try {
    const pairedDb = await paired.getD1Database('DB', 'auth-api-paired')
    await pairedDb.batch([
      pairedDb.prepare(
        'CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,name TEXT,password_hash TEXT,avatar_url TEXT,deleted_at TEXT)'
      ),
      pairedDb.prepare(
        'CREATE TABLE auth_rate_limits(subject_hash TEXT PRIMARY KEY,window_started_at INTEGER,attempts INTEGER)'
      ),
      pairedDb
        .prepare('INSERT INTO users(id,email,name,password_hash) VALUES(1,?,?,?)')
        .bind('imported@example.com', 'Imported', importedHash)
    ])
    const policy = {
      AUTH_INGRESS_MODE: 'direct-custom-domain',
      AUTH_INGRESS_RULES_VERIFIED: 'true',
      AUTH_INGRESS_HOST: 'easymemoir.example',
      AUTH_INGRESS_SECRET: ingressSecret
    }
    const incoming = path => {
      const value = new Request(`https://easymemoir.example${path}`, {
        method: 'POST',
        headers: { 'CF-Connecting-IP': '192.0.2.1' }
      })
      Object.defineProperty(value, 'cf', { value: { colo: 'LHR' } })
      return value
    }
    const path = '/api/v1/auth/login'
    const assertion = await signClientIdentity(incoming(path), policy)
    const call = identity =>
      paired.dispatchFetch(`https://api-staging.invalid${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-EasyMemoir-Client-Identity': identity },
        body: JSON.stringify(login())
      })
    const response = await call(assertion)
    assert.equal(response.status, 200)
    const issued = jwt.verify((await response.json()).token, secret)
    assert.equal(issued.exp - issued.iat, 604800)
    assert.equal(
      (await call(await signClientIdentity(incoming('/api/auth/register'), policy))).status,
      503
    )
    assert.equal((await call('forged')).status, 503)
  } finally {
    await paired.dispose()
  }
})

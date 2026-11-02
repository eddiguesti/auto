import { sqlStatements } from './fixtures/sql-statements.mjs'
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
import { createAuthRepository } from './auth-repository.js'
import { signClientIdentity } from '../ingress-identity.js'

const secret = 'auth-native-test-secret-longer-than-32-characters'
const password = 'StrongPassword9'
let runtime, db, importedHash
let identityFails, emailFails, identityRequests, emails, emailRequests
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
    external: ['cloudflare:workers', 'node:buffer'],
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
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        JWT_EXPIRES_IN: '3600',
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        APP_URL: 'https://easymemoir.co.uk',
        RESEND_API_KEY: 'fake-resend-test-key'
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
          emailRequests.push({
            url: request.url,
            method: request.method,
            authorization: request.headers.get('Authorization')
          })
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
    const statements = sqlStatements(ddl)
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
  emailRequests = []
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
      compatibilityFlags: ['nodejs_compat'],
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

test('JWT lifetime matches source numeric seconds/unit defaults and Google validates its credential body', async () => {
  for (const [input, expected] of [
    ['3600', 3600],
    ['"3600"', 3600],
    ['24h', 86400],
    [undefined, 604800],
    ['bad', 604800],
    ['0', 604800]
  ])
    assert.equal(tokenLifetime(input), expected)
  for (const path of ['/auth/google']) {
    const response = await request(`/api${path}`, {})
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'Validation failed')
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
    external: ['cloudflare:workers', 'node:buffer'],
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
          compatibilityFlags: ['nodejs_compat'],
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
          compatibilityFlags: ['nodejs_compat'],
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
      pairedDb.prepare(
        'CREATE TABLE password_reset_tokens(id INTEGER PRIMARY KEY,user_id INTEGER,token_hash TEXT,expires_at TEXT,used_at TEXT,created_at TEXT)'
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
    const incoming = (path, method = 'POST') => {
      const value = new Request(`https://easymemoir.example${path}`, {
        method,
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
    const verifyPath = '/api/v1/auth/verify-reset-token'
    const recoveryIdentity = await signClientIdentity(incoming(verifyPath, 'GET'), policy)
    const recovery = await paired.dispatchFetch(
      `https://api-staging.invalid${verifyPath}?token=unknown`,
      {
        headers: { 'X-EasyMemoir-Client-Identity': recoveryIdentity }
      }
    )
    assert.equal(recovery.status, 200)
    assert.deepEqual(await recovery.json(), { valid: false })
    const invalidMethod = await signClientIdentity(incoming(verifyPath, 'POST'), policy)
    assert.equal(invalidMethod, null)
  } finally {
    await paired.dispose()
  }
})

const recoverySuccess = {
  success: true,
  message: 'If an account exists with that email, you will receive a password reset link shortly.'
}
const hashToken = value => createHash('sha256').update(value).digest('hex')
const rawEmailToken = message => /token=([a-f0-9]{64})/.exec(message.html)[1]
const userToken = (extra = {}) =>
  jwt.sign({ id: 1, email: 'imported@example.com', ...extra }, secret, { expiresIn: '1h' })
async function seedReset(raw, expiry = '2099-01-01 00:00:00.123456+00') {
  return db
    .prepare(
      'INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(1,?,?) RETURNING id'
    )
    .bind(hashToken(raw), expiry)
    .first()
}
function verifyReset(raw, prefix = '/api') {
  return runtime.dispatchFetch(
    `https://api-staging.invalid${prefix}/auth/verify-reset-token?token=${encodeURIComponent(raw)}`
  )
}

test('forgot password uses identical anti-enumeration responses and stores only a hashed one-hour reset token', async () => {
  await db.prepare("UPDATE users SET name='<Imported>' WHERE id=1").run()
  const known = await request('/api/auth/forgot-password', { email: ' IMPORTED@EXAMPLE.COM ' })
  assert.equal(known.status, 200)
  assert.deepEqual(await known.json(), recoverySuccess)
  const missing = await request('/api/v1/auth/forgot-password', { email: 'missing@example.com' })
  assert.equal(missing.status, 200)
  assert.deepEqual(await missing.json(), recoverySuccess)
  assert.equal(emails.length, 1)
  assert.deepEqual(emailRequests[0], {
    url: 'https://api.resend.com/emails',
    method: 'POST',
    authorization: 'Bearer fake-resend-test-key'
  })
  assert.equal(emails[0].subject, 'Reset Your Password - Easy Memoir')
  assert.equal(emails[0].to, 'imported@example.com')
  assert.ok(emails[0].html.includes('&lt;Imported&gt;'))
  const raw = rawEmailToken(emails[0]),
    stored = await db
      .prepare('SELECT token_hash,expires_at,created_at FROM password_reset_tokens')
      .first()
  assert.equal(stored.token_hash, hashToken(raw))
  assert.ok(!JSON.stringify(stored).includes(raw))
  assert.equal(
    Date.parse(stored.expires_at.replace(' ', 'T') + 'Z') -
      Date.parse(stored.created_at.replace(' ', 'T') + 'Z'),
    3600000
  )
  assert.equal((await verifyReset(raw)).status, 200)
  assert.deepEqual(await (await verifyReset(raw, '/api/v1')).json(), { valid: true })
})

test('forgot password hides Google-only, deleted accounts, provider failure and per-account send limits', async () => {
  const unknown = await request('/api/auth/forgot-password', { email: 'missing@example.com' })
  assert.deepEqual(await unknown.json(), recoverySuccess)
  await db.prepare('UPDATE users SET password_hash=NULL WHERE id=1').run()
  assert.deepEqual(
    await (await request('/api/auth/forgot-password', { email: 'imported@example.com' })).json(),
    recoverySuccess
  )
  assert.equal(emails.length, 0)
  await db
    .prepare("UPDATE users SET password_hash=?,deleted_at='2026-10-09 00:00:00' WHERE id=1")
    .bind(importedHash)
    .run()
  assert.deepEqual(
    await (await request('/api/auth/forgot-password', { email: 'imported@example.com' })).json(),
    recoverySuccess
  )
  assert.equal(emails.length, 0)
  await db.prepare('UPDATE users SET deleted_at=NULL WHERE id=1').run()
  emailFails = true
  assert.deepEqual(
    await (await request('/api/auth/forgot-password', { email: 'imported@example.com' })).json(),
    recoverySuccess
  )
  assert.equal(emails.length, 1)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM password_reset_tokens').first()).count,
    1
  )
})

test('concurrent forgot-password requests atomically enforce three emails per 15 minutes and replace old tokens', async () => {
  const responses = await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      request(`${i % 2 ? '/api' : '/api/v1'}/auth/forgot-password`, {
        email: 'imported@example.com'
      })
    )
  )
  for (const response of responses) {
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), recoverySuccess)
  }
  assert.equal(emails.length, 3)
  const rows = (await db.prepare('SELECT token_hash,used_at FROM password_reset_tokens').all())
    .results
  assert.equal(rows.length, 3)
  assert.equal(rows.filter(row => row.used_at === null).length, 1)
  const active = rows.find(row => row.used_at === null)
  assert.ok(emails.some(message => hashToken(rawEmailToken(message)) === active.token_hash))
})

test('reset passwords are bcrypt12, tokens are consumed once and every older login is revoked', async () => {
  const raw = 'test-password-reset',
    next = 'NewStrongPassword8'
  await seedReset(raw)
  // PostgreSQL-exported +00 instants must advance as well as native D1 values.
  await db
    .prepare(
      "INSERT INTO user_token_invalidation(user_id,invalidated_at) VALUES(1,'2000-01-01 00:00:00.123456+00')"
    )
    .run()
  const old = userToken({ iat: Math.floor(Date.now() / 1000) - 60 })
  assert.equal(
    (
      await runtime.dispatchFetch('https://api-staging.invalid/api/auth/me', {
        headers: { Authorization: `Bearer ${old}` }
      })
    ).status,
    200
  )
  const response = await request('/api/v1/auth/reset-password', {
    token: raw,
    password: ` ${next} `
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    message:
      'Your password has been reset successfully. You can now sign in with your new password.'
  })
  const user = await db.prepare('SELECT password_hash FROM users WHERE id=1').first()
  assert.match(user.password_hash, /^\$2b\$12\$/)
  assert.equal(await bcrypt.compare(next, user.password_hash), true)
  assert.equal(
    (
      await runtime.dispatchFetch('https://api-staging.invalid/api/auth/me', {
        headers: { Authorization: `Bearer ${old}` }
      })
    ).status,
    401
  )
  assert.deepEqual(await (await verifyReset(raw)).json(), { valid: false })
  assert.equal(
    (await request('/api/auth/reset-password', { token: raw, password: 'AnotherPassword7' }))
      .status,
    400
  )
  assert.equal((await request('/api/auth/login', login())).status, 401)
  assert.equal((await request('/api/auth/login', login({ password: next }))).status, 200)
})

test('D1 reset batches serialize same-millisecond token consumption without letting the rejected request change the password', async () => {
  const raw = 'concurrent-reset',
    token = await seedReset(raw),
    now = Date.now()
  const repository = createAuthRepository(db, { wallClockTimeZone: 'UTC' })
  const outcomes = await Promise.all(
    ['winner-one', 'winner-two'].map(passwordHash =>
      repository.resetPassword({
        tokenId: token.id,
        userId: 1,
        hash: hashToken(raw),
        passwordHash,
        now
      })
    )
  )
  assert.equal(outcomes.filter(Boolean).length, 1)
  assert.equal(
    (await db.prepare('SELECT password_hash FROM users WHERE id=1').first()).password_hash,
    ['winner-one', 'winner-two'][outcomes.findIndex(Boolean)]
  )
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) AS count FROM user_token_invalidation WHERE user_id=1')
        .first()
    ).count,
    1
  )
})

test('password reset rejects expired/deleted accounts and invalid input without replacing a password', async () => {
  await seedReset('expired-reset', '2000-01-01 00:00:00+00')
  assert.equal(
    (
      await request('/api/auth/reset-password', {
        token: 'expired-reset',
        password: 'AnotherPassword7'
      })
    ).status,
    400
  )
  assert.deepEqual(await (await verifyReset('expired-reset')).json(), { valid: false })
  await seedReset('deleted-reset')
  await db.prepare("UPDATE users SET deleted_at='2026-10-09 00:00:00' WHERE id=1").run()
  assert.equal(
    (
      await request('/api/auth/reset-password', {
        token: 'deleted-reset',
        password: 'AnotherPassword7'
      })
    ).status,
    400
  )
  assert.deepEqual(await (await verifyReset('deleted-reset')).json(), { valid: false })
  await db.prepare('UPDATE users SET deleted_at=NULL WHERE id=1').run()
  for (const input of [
    {},
    { token: 'deleted-reset' },
    { token: 'deleted-reset', password: 'short' },
    { token: 'deleted-reset', password: 'alllowercase9' }
  ])
    assert.equal((await request('/api/auth/reset-password', input)).status, 400)
  assert.equal(
    (await db.prepare('SELECT password_hash FROM users WHERE id=1').first()).password_hash,
    importedHash
  )
})

test('a revocation storage failure rolls back password replacement and token consumption together', async () => {
  const raw = 'reset-rollback'
  await seedReset(raw)
  await db
    .prepare(
      "CREATE TRIGGER reject_reset_revocation BEFORE INSERT ON user_token_invalidation BEGIN SELECT RAISE(ABORT,'revocation storage rejected'); END"
    )
    .run()
  try {
    assert.equal(
      (await request('/api/auth/reset-password', { token: raw, password: 'AnotherPassword7' }))
        .status,
      503
    )
    assert.equal(
      (await db.prepare('SELECT password_hash FROM users WHERE id=1').first()).password_hash,
      importedHash
    )
    assert.equal(
      (await db.prepare('SELECT used_at FROM password_reset_tokens').first()).used_at,
      null
    )
  } finally {
    await db.prepare('DROP TRIGGER reject_reset_revocation').run()
  }
  assert.equal(
    (await request('/api/auth/reset-password', { token: raw, password: 'AnotherPassword7' }))
      .status,
    200
  )
})

test('resend verification is authenticated/full-scope, limited atomically, sends real adapter payload and verifies only the latest link', async () => {
  assert.equal((await request('/api/auth/resend-verification', {})).status, 401)
  assert.equal(
    (
      await request(
        '/api/auth/resend-verification',
        {},
        { Authorization: `Bearer ${userToken({ scope: 'magic_link' })}` }
      )
    ).status,
    403
  )
  const headers = { Authorization: `Bearer ${userToken()}` }
  const responses = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      request(`${i % 2 ? '/api' : '/api/v1'}/auth/resend-verification`, {}, headers)
    )
  )
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 200, 429])
  assert.equal(emails.length, 2)
  const active = await db
    .prepare('SELECT token_hash FROM email_verification_tokens WHERE used_at IS NULL')
    .first()
  const raw = rawEmailToken(
    emails.find(message => hashToken(rawEmailToken(message)) === active.token_hash)
  )
  assert.equal((await request('/api/auth/verify-email', { token: raw })).status, 200)
  const verified = await request('/api/auth/resend-verification', {}, headers)
  assert.deepEqual(await verified.json(), { success: true, message: 'Email already verified' })
  assert.equal(emails.length, 2)
})

test('verification resend hides provider diagnostics and refuses revoked or deleted-user credentials', async () => {
  const token = userToken(),
    headers = { Authorization: `Bearer ${token}` }
  emailFails = true
  const failed = await request('/api/auth/resend-verification', {}, headers)
  assert.equal(failed.status, 502)
  assert.deepEqual(await failed.json(), { error: 'Email provider unavailable' })
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM email_verification_tokens').first()).count,
    1
  )
  const claims = jwt.decode(token)
  await db
    .prepare(
      "INSERT INTO token_blacklist(jti,user_id,expires_at) VALUES(?,1,'2099-01-01 00:00:00+00')"
    )
    .bind(claims.jti || `sha256:${hashToken(token)}`)
    .run()
  assert.equal((await request('/api/auth/resend-verification', {}, headers)).status, 401)
  await db.prepare('DELETE FROM token_blacklist').run()
  await db.prepare("UPDATE users SET deleted_at='2026-10-09 00:00:00' WHERE id=1").run()
  assert.equal((await request('/api/auth/resend-verification', {}, headers)).status, 401)
  assert.equal(emails.length, 1)
})

test('all password recovery operations fail closed without trusted identity and enforce the shared network limit', async () => {
  identityFails = true
  assert.equal(
    (await request('/api/auth/forgot-password', { email: 'imported@example.com' })).status,
    503
  )
  assert.equal(
    (await request('/api/auth/reset-password', { token: 'any', password: 'AnotherPassword7' }))
      .status,
    503
  )
  assert.equal((await verifyReset('any')).status, 503)
  assert.equal(
    (await request('/api/auth/resend-verification', {}, { Authorization: `Bearer ${userToken()}` }))
      .status,
    503
  )
  assert.equal(emails.length, 0)
  identityFails = false
  await db
    .prepare('INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts) VALUES(?,?,10)')
    .bind(hashToken('ip:203.0.113.42'), Math.floor(Date.now() / 1000))
    .run()
  for (const call of [
    () => request('/api/auth/forgot-password', { email: 'imported@example.com' }),
    () => request('/api/auth/reset-password', { token: 'any', password: 'AnotherPassword7' }),
    () => verifyReset('any'),
    () => request('/api/auth/resend-verification', {}, { Authorization: `Bearer ${userToken()}` })
  ])
    assert.equal((await call()).status, 429)
  assert.equal(emails.length, 0)
})

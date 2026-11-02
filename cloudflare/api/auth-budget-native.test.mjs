import { sqlStatements } from './fixtures/sql-statements.mjs'
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'

const secret = 'fake-account-budget-secret-at-least-32-characters'
let runtime, db, identityRequests, emailRequests
const hash = value => createHash('sha256').update(value).digest('hex')
before(async () => {
  const bundle = fileURLToPath(
    new URL('../../.cloudflare/api-tests/auth-budget-worker.mjs', import.meta.url)
  )
  await build({
    entryPoints: [fileURLToPath(new URL('../api-staging.js', import.meta.url))],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers', 'node:buffer'],
    target: 'es2022'
  })
  const worker = (name, vars) => ({
    name,
    modules: true,
    scriptPath: bundle,
    compatibilityDate: '2026-10-09',
    compatibilityFlags: ['nodejs_compat'],
    bindings: {
      JWT_SECRET: secret,
      GROK_API_KEY: 'fake-budget-voice-key',
      SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
      NATIVE_API_STAGE: 'local-d1-slice',
      AUTH_RATE_MODE: 'account-budget',
      ...vars
    },
    d1Databases: { DB: '00000000-0000-0000-0000-000000000082' },
    serviceBindings: {
      AUTH_CLIENT_ID: async () => {
        identityRequests++
        return new Response('never trusted', { status: 403 })
      },
      EMAIL_PROVIDER: async () => {
        emailRequests++
        return Response.json({ id: 'synthetic-email' })
      }
    }
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          ...worker('budget-test', {
            AUTH_GLOBAL_RATE_LIMIT_MAX: '12',
            AUTH_ACCOUNT_RATE_LIMIT_MAX: '3'
          }),
          durableObjects: { VOICE_SESSIONS: { className: 'VoiceSession', useSQLite: true } }
        },
        worker('budget-default', {}),
        worker('budget-invalid', { AUTH_ACCOUNT_RATE_LIMIT_MAX: '121' }),
        worker('budget-unknown', { AUTH_RATE_MODE: 'caller-ip' })
      ]
    })
  )
  db = await runtime.getD1Database('DB', 'budget-test')
  for (const file of [
    '../db/schema.sql',
    ...(await readdir(new URL('./migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql'))
      .sort()
      .map(name => `./migrations/${name}`)
  ]) {
    const ddl = await readFile(new URL(file, import.meta.url), 'utf8')
    await db.batch(sqlStatements(ddl).map(statement => db.prepare(statement)))
  }
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  identityRequests = 0
  emailRequests = 0
  await db.batch(['auth_rate_limits', 'users'].map(table => db.prepare(`DELETE FROM ${table}`)))
  await db
    .prepare("INSERT INTO users(id,email,name) VALUES(1,'budget@example.invalid','Writer')")
    .run()
})
async function call(path, body, extra = {}, worker = 'budget-test') {
  const target = await runtime.getWorker(worker)
  return target.fetch(`https://account-budget.invalid${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body)
  })
}
const login = email => ({ email, password: 'StrongPassword9' })
const spoof = index => ({
  'CF-Connecting-IP': `203.0.113.${index}`,
  'CF-Connecting-IPv6': `2001:db8::${index}`,
  'X-Forwarded-For': `192.0.2.${index}`,
  'X-EasyMemoir-Client-Identity': `forged-${index}`
})

test('account budgets share normalized email, operations and API prefixes without trusting spoofed network assertions', async () => {
  assert.equal(
    (await call('/api/auth/login', login('  Missing@Example.invalid '), spoof(1))).status,
    401
  )
  assert.equal(
    (await call('/api/v1/auth/forgot-password', { email: 'missing@example.invalid' }, spoof(2)))
      .status,
    200
  )
  assert.equal(
    (
      await call(
        '/api/auth/register',
        { email: 'MISSING@example.invalid', password: 'weak' },
        spoof(3)
      )
    ).status,
    400
  )
  assert.equal(
    (await call('/api/v1/auth/login', login('missing@example.invalid'), spoof(4))).status,
    429
  )
  assert.equal(identityRequests, 0)
  const account = await db
    .prepare('SELECT attempts FROM auth_rate_limits WHERE subject_hash=?')
    .bind(`budget:auth:account:${hash('email:missing@example.invalid')}`)
    .first()
  assert.equal(account.attempts, 4)
  const { results } = await db.prepare('SELECT subject_hash FROM auth_rate_limits').all()
  assert.ok(
    results.every(row => !row.subject_hash.includes('@') && !row.subject_hash.includes('203.0.113'))
  )
})
test('concurrent requests cannot exceed the per-account budget', async () => {
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      call(`${i % 2 ? '/api' : '/api/v1'}/auth/login`, login('one@example.invalid'), spoof(i))
    )
  )
  assert.equal(responses.filter(response => response.status === 401).length, 3)
  assert.equal(responses.filter(response => response.status === 429).length, 9)
  assert.equal(identityRequests, 0)
})
test('the global budget bounds concurrent rotating accounts and prevents unbounded account-key creation', async () => {
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      call(
        `${i % 2 ? '/api' : '/api/v1'}/auth/login`,
        login(`rotating${i}@example.invalid`),
        spoof(i)
      )
    )
  )
  assert.equal(responses.filter(response => response.status === 401).length, 12)
  assert.equal(responses.filter(response => response.status === 429).length, 8)
  assert.equal(
    (
      await db
        .prepare('SELECT attempts FROM auth_rate_limits WHERE subject_hash=?')
        .bind('budget:auth:global')
        .first()
    ).attempts,
    13
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    13
  )
  const limited = responses.find(response => response.status === 429)
  assert.ok(Number(limited.headers.get('Retry-After')) > 0)
})
test('default policy is 120 global and 10 account attempts per aligned 900-second window', async () => {
  const started = Math.floor(Date.now() / 900000) * 900
  await db
    .prepare('INSERT INTO auth_rate_limits VALUES(?,?,119)')
    .bind('budget:auth:global', started)
    .run()
  assert.equal(
    (
      await call(
        '/api/auth/reset-password',
        { token: 'opaque-private-token', password: 'StrongPassword9' },
        {},
        'budget-default'
      )
    ).status,
    400
  )
  assert.equal(
    (
      await call(
        '/api/v1/auth/verify-email',
        { token: 'different-private-token' },
        {},
        'budget-default'
      )
    ).status,
    429
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    1
  )
  await db
    .prepare('UPDATE auth_rate_limits SET window_started_at=?')
    .bind(started - 900)
    .run()
  const responses = await Promise.all(
    Array.from({ length: 11 }, () =>
      call('/api/auth/login', login('default@example.invalid'), {}, 'budget-default')
    )
  )
  assert.equal(responses.filter(response => response.status === 401).length, 10)
  assert.equal(responses.filter(response => response.status === 429).length, 1)
})
test('token verification uses only the global budget and authenticated resends use a hashed user budget', async () => {
  const worker = await runtime.getWorker('budget-test')
  assert.equal(
    (
      await worker.fetch(
        'https://account-budget.invalid/api/v1/auth/verify-reset-token?token=not-a-real-token'
      )
    ).status,
    200
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    1
  )
  const started = Math.floor(Date.now() / 900000) * 900
  await db
    .prepare('INSERT INTO auth_rate_limits VALUES(?,?,3)')
    .bind(`budget:auth:account:${hash('user:1')}`, started)
    .run()
  const authorization = `Bearer ${jwt.sign({ id: 1, email: 'budget@example.invalid' }, secret, { expiresIn: '1h' })}`
  const response = await call(
    '/api/v1/auth/resend-verification',
    {},
    { Authorization: authorization }
  )
  assert.equal(response.status, 429)
  assert.equal(emailRequests, 0)
})
test('malformed and oversized auth bodies consume the global budget without creating account identities', async () => {
  const worker = await runtime.getWorker('budget-test')
  const bad = await worker.fetch('https://account-budget.invalid/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{malformed'
  })
  assert.equal(bad.status, 400)
  assert.equal(
    (await call('/api/auth/login', { email: 'huge@example.invalid', password: 'a'.repeat(17000) }))
      .status,
    413
  )
  assert.equal((await db.prepare('SELECT attempts FROM auth_rate_limits').first()).attempts, 2)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    1
  )
})
test('invalid operator configuration fails closed before account queries or identity fallback', async () => {
  for (const worker of ['budget-invalid', 'budget-unknown'])
    assert.equal(
      (await call('/api/auth/login', login('missing@example.invalid'), spoof(3), worker)).status,
      503
    )
  assert.equal(identityRequests, 0)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    0
  )
})
test('D1 budget failure rejects auth and account-counter failure rolls back the global reservation', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_account_budget BEFORE INSERT ON auth_rate_limits WHEN NEW.subject_hash LIKE 'budget:auth:account:%' BEGIN SELECT RAISE(ABORT,'budget storage unavailable'); END"
    )
    .run()
  try {
    assert.equal((await call('/api/auth/login', login('missing@example.invalid'))).status, 503)
  } finally {
    await db.prepare('DROP TRIGGER reject_account_budget').run()
  }
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).count,
    0
  )
  await db.prepare('DROP TABLE auth_rate_limits').run()
  try {
    assert.equal((await call('/api/auth/login', login('missing@example.invalid'))).status, 503)
  } finally {
    await db
      .prepare(
        'CREATE TABLE auth_rate_limits(subject_hash TEXT PRIMARY KEY,window_started_at INTEGER NOT NULL,attempts INTEGER NOT NULL CHECK(attempts>0)) STRICT'
      )
      .run()
    await db
      .prepare('CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(window_started_at)')
      .run()
  }
  assert.equal(identityRequests, 0)
})
test('public voice demos use a separate deployment-wide five-per-hour budget, without any IP identity fallback', async () => {
  const tickets = []
  for (let i = 0; i < 5; i++) {
    const response = await call(`${i % 2 ? '/api' : '/api/v1'}/landing-voice/session`, {}, spoof(i))
    assert.equal(response.status, 200)
    tickets.push((await response.json()).ticket)
  }
  assert.equal(new Set(tickets).size, 5)
  assert.equal((await call('/api/landing-voice/session', {}, spoof(6))).status, 429)
  assert.equal(identityRequests, 0)
  assert.equal(
    (
      await db
        .prepare('SELECT attempts FROM auth_rate_limits WHERE subject_hash=?')
        .bind('budget:demo:global')
        .first()
    ).attempts,
    6
  )
  assert.equal((await call('/api/auth/login', login('separate@example.invalid'))).status, 401)
})

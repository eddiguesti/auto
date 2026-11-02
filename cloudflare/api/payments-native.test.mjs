import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { timestampForStorage } from './value-codecs.js'
import { PRODUCTS, PRINT_PACKAGE } from '../../packages/shared/payment-catalog.js'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  bundle = `${root}/.cloudflare/api-tests/payments-worker.mjs`
const secret = 'payment-session-test-secret-at-least-32-characters',
  webhookSecret = 'fixture-webhook-secret'
let runtime, db, calls, sessions
before(async () => {
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import worker from './cloudflare/api-staging.js'
    export default {fetch(request,env){
      const stripe=env.STRIPE_FETCH
      env={...env,MEDIA:{},PRINT_QUEUE:{send:async()=>{}},STRIPE_FETCH:{fetch:(input,init)=>{
        if(init?.redirect!=='manual')throw new Error('Stripe redirects must be manual')
        return stripe.fetch(input,init)
      }}}
      if(request.headers.has('X-Test-Publishing-Off'))env={...env,PUBLISHING_ENABLED:''}
      if(request.headers.has('X-Test-Print-Off'))env={...env,PRINT_CONFIGURATION_READY:''}
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
      name: 'payments-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        STRIPE_SECRET_KEY: 'fixture-provider-credential',
        STRIPE_WEBHOOK_SECRET: webhookSecret,
        APP_URL: 'https://memoir.example',
        PUBLISHING_ENABLED: 'true',
        PRINT_CONFIGURATION_READY: 'true',
        PRINT_FULFILMENT_ENABLED: 'true',
        BOOKVAULT_API_KEY: 'fixture-book-provider',
        BOOKVAULT_TEXT_STOCK_ID: '1',
        BOOKVAULT_COVER_STOCK_ID: '2',
        BOOKVAULT_FR_DECLARED_VALUE_GBP: '250',
        PRINT_FILE_SIGNING_SECRET: 'print-fixture-signing-secret-at-least-32-characters',
        PRINT_PUBLIC_API_URL: 'https://memoir.example'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000026' },
      serviceBindings: {
        STRIPE_FETCH: async request => {
          const form = await request.formData(),
            key = request.headers.get('Idempotency-Key')
          calls.push({
            url: request.url,
            form: Object.fromEntries(form),
            key,
            redirect: request.redirect
          })
          if (form.get('customer_email') === 'redirect@example.com')
            return new Response(null, {
              status: 302,
              headers: { Location: 'https://untrusted-provider.invalid/steal' }
            })
          if (!sessions.has(key)) sessions.set(key, `cs_test_native_${sessions.size + 1}`)
          const id = sessions.get(key)
          return Response.json({ id, url: `https://checkout.stripe.com/c/pay/${id}` })
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  for (const name of ['../db/schema.sql', './migrations/0004_payments.sql']) {
    const sql = await readFile(new URL(name, import.meta.url), 'utf8')
    await db.batch(
      sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => db.prepare(s))
    )
  }
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.prepare('DROP TRIGGER IF EXISTS reject_payment_audit').run()
  for (const table of [
    'payments_audit_log',
    'native_checkouts',
    'stripe_events',
    'users',
    'token_blacklist'
  ])
    await db.prepare(`DELETE FROM ${table}`).run()
  await db
    .prepare(
      "INSERT INTO users (id,email,name) VALUES (1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  calls = []
  sessions = new Map()
})
function token(id = 1, extra = {}) {
  return jwt.sign({ id, email: `${id}@example.com`, jti: crypto.randomUUID(), ...extra }, secret, {
    expiresIn: '1h'
  })
}
function request(path, { body, auth = token(), method = 'POST', headers = {} } = {}) {
  return runtime.dispatchFetch(`https://api-staging.invalid${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      'Content-Type': 'application/json',
      ...headers
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
}
async function checkout(productId = 'export_ebook', options = {}) {
  return request('/api/payments/create-checkout', {
    body: { productId, ...options.body },
    ...options
  })
}
function eventFor(sessionId, productId = 'export_ebook', overrides = {}) {
  const product = PRODUCTS[productId]
  return {
    id: `evt_${crypto.randomUUID().replaceAll('-', '')}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        payment_status: 'paid',
        amount_total: product.price,
        currency: product.currency,
        metadata: {
          userId: '1',
          productId,
          productType: product.type,
          ...(product.type === 'premium_bundle'
            ? { printPackageVersion: PRINT_PACKAGE.version, printQuantity: '10' }
            : {})
        },
        ...overrides
      }
    }
  }
}
function deliver(event, headers = {}) {
  const payload = JSON.stringify(event)
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
  return runtime.dispatchFetch('https://api-staging.invalid/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature, ...headers },
    body: payload
  })
}
test('checkout enforces full scope, configured fulfilment and subscription/print availability before provider calls', async () => {
  assert.equal((await checkout(undefined, { auth: null })).status, 401)
  assert.equal((await checkout(undefined, { auth: token(1, { scope: 'magic_link' }) })).status, 403)
  assert.equal((await checkout('unknown')).status, 400)
  assert.equal((await checkout('premium_monthly')).status, 503)
  assert.equal(
    (await checkout('export_ebook', { headers: { 'X-Test-Publishing-Off': '1' } })).status,
    503
  )
  assert.equal(
    (await checkout('printed_book', { headers: { 'X-Test-Print-Off': '1' } })).status,
    503
  )
  assert.equal(calls.length, 0)
})
test('authoritative price/owner, exact redirect origin and retry idempotency are recorded before returning checkout URL', async () => {
  for (let i = 0; i < 2; i++) {
    const response = await request('/api/v1/payments/create-checkout', {
      body: {
        productId: 'export_ebook',
        successUrl: 'https://memoir.example.evil.test/steal',
        cancelUrl: 'https://user:secret@memoir.example/export'
      }
    })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).sessionId, 'cs_test_native_1')
  }
  assert.equal(calls[0].form['line_items[0][price_data][unit_amount]'], '799')
  assert.equal(calls[0].form['metadata[userId]'], '1')
  assert.equal(calls[0].form.success_url, 'https://memoir.example/export?success=true')
  assert.equal(calls[0].form.cancel_url, 'https://memoir.example/export?cancelled=true')
  assert.equal(calls[0].key, calls[1].key)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM native_checkouts').first()).n, 1)
})
test('Stripe redirects fail without forwarding credentials or recording a successful checkout', async () => {
  await db.prepare("UPDATE users SET email='redirect@example.com' WHERE id=1").run()
  const response = await checkout()
  assert.equal(response.status, 502)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.startsWith('https://api.stripe.com/'), true)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM native_checkouts').first()).n, 0)
})
test('raw-byte webhook signatures reject tampering, stale signatures and unsigned requests before any grant', async () => {
  const { sessionId } = await (await checkout()).json(),
    event = eventFor(sessionId)
  assert.equal((await deliver(event, { 'stripe-signature': 'invalid' })).status, 400)
  const payload = JSON.stringify(event)
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
    timestamp: 1
  })
  assert.equal((await deliver(event, { 'stripe-signature': signature })).status, 400)
  const good = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
  assert.equal(
    (
      await runtime.dispatchFetch('https://api-staging.invalid/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': good },
        body: payload + ' '
      })
    ).status,
    400
  )
  assert.equal((await db.prepare('SELECT count(*) AS n FROM payments').first()).n, 0)
})
test('concurrent duplicate delivery grants one payment, one print entitlement and one audit in one atomic batch', async () => {
  const { sessionId } = await (await checkout('premium_bundle')).json(),
    event = eventFor(sessionId, 'premium_bundle')
  const responses = await Promise.all(Array.from({ length: 12 }, () => deliver(event)))
  assert.ok(responses.every(r => r.status === 200))
  for (const table of ['payments', 'print_entitlements', 'payments_audit_log', 'stripe_events'])
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n, 1, table)
  assert.equal((await db.prepare('SELECT quantity FROM print_entitlements').first()).quantity, 10)
  const premium = (await db.prepare('SELECT premium_until FROM users WHERE id=1').first())
    .premium_until
  assert.ok(new Date(premium.replace(' ', 'T') + 'Z').getTime() > Date.now() + 360 * 86400000)
  const history = await (await request('/api/payments/history', { method: 'GET' })).json()
  assert.equal(history.length, 1)
  assert.equal(history[0].stripe_session_id, undefined)
  assert.deepEqual(
    await (await request('/api/v1/payments/history', { method: 'GET', auth: token(2) })).json(),
    []
  )
  await deliver({
    ...event,
    id: `evt_${crypto.randomUUID().replaceAll('-', '')}`,
    type: 'checkout.session.async_payment_succeeded'
  })
  assert.equal((await db.prepare('SELECT count(*) AS n FROM payments').first()).n, 1)
  assert.equal(
    (await db.prepare('SELECT premium_until FROM users WHERE id=1').first()).premium_until,
    premium
  )
})
test('transaction failure rolls back receipt, payment and entitlement so a signed retry can complete safely', async () => {
  const { sessionId } = await (await checkout('premium_bundle')).json(),
    event = eventFor(sessionId, 'premium_bundle')
  await db.exec(
    "CREATE TRIGGER reject_payment_audit BEFORE INSERT ON payments_audit_log BEGIN SELECT RAISE(ABORT,'test failure'); END;"
  )
  assert.equal((await deliver(event)).status, 503)
  for (const table of ['payments', 'print_entitlements', 'stripe_events'])
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n, 0)
  assert.equal(
    (await db.prepare('SELECT premium_until FROM users WHERE id=1').first()).premium_until,
    null
  )
  await db.prepare('DROP TRIGGER reject_payment_audit').run()
  assert.equal((await deliver(event)).status, 200)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM payments').first()).n, 1)
})
test('unknown old-installation sessions, unpaid events and deleted accounts cannot grant fresh accounts access', async () => {
  assert.equal((await deliver(eventFor('cs_old_installation'))).status, 200)
  const { sessionId } = await (await checkout()).json()
  assert.equal(
    (await deliver(eventFor(sessionId, 'export_ebook', { payment_status: 'unpaid' }))).status,
    200
  )
  assert.equal(
    (await deliver(eventFor(sessionId, 'export_ebook', { amount_total: 1 }))).status,
    400
  )
  const mismatch = eventFor(sessionId)
  mismatch.data.object.metadata.userId = '2'
  assert.equal((await deliver(mismatch)).status, 400)
  await db.prepare("UPDATE users SET deleted_at='2026-01-01 00:00:00' WHERE id=1").run()
  assert.equal((await deliver(eventFor(sessionId))).status, 200)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM payments').first()).n, 0)
})

test('refund requests are owner-scoped and concurrent retries create one pending request', async () => {
  await db
    .prepare(
      "INSERT INTO payments(id,user_id,product_id,product_type,amount,currency,status)VALUES(101,1,'export_ebook','export',999,'gbp','completed'),(102,2,'export_ebook','export',999,'gbp','completed')"
    )
    .run()
  assert.equal(
    (await request('/api/refunds/request', { body: { paymentId: 102, type: 'guarantee' } })).status,
    404
  )
  assert.equal(
    (
      await request('/api/refunds/request', {
        auth: token(1, { scope: 'magic_link' }),
        body: { paymentId: 101, type: 'guarantee' }
      })
    ).status,
    403
  )
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      request('/api/refunds/request', {
        body: { paymentId: 101, type: 'guarantee', reason: 'Please refund my purchase' }
      })
    )
  )
  assert.equal(responses.filter(r => r.status === 201).length, 1)
  assert.equal(responses.filter(r => r.status === 409).length, 11)
  assert.equal(
    (await db.prepare('SELECT count(*) AS n FROM refund_requests WHERE payment_id=101').first()).n,
    1
  )
  const own = await (await request('/api/refunds/history', { method: 'GET' })).json()
  assert.equal(own.length, 1)
  assert.equal(own[0].amount, 999)
  assert.equal('admin_notes' in own[0], false)
  assert.deepEqual(
    await (await request('/api/refunds/history', { method: 'GET', auth: token(2) })).json(),
    []
  )
})

test('guarantee usage counts owned legacy photos and completed exports, with future purchases ineligible', async () => {
  await db
    .prepare(
      "INSERT INTO payments(user_id,product_id,product_type,amount,status,created_at)VALUES(1,'export_ebook','export',999,'completed',?)"
    )
    .bind(timestampForStorage(Date.now() - 86400000))
    .run()
  await db
    .prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer)VALUES(101,1,'earliest-memories','garden','Memory'),(102,2,'earliest-memories','garden','Other')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO photos(user_id,story_id,filename)VALUES(NULL,101,'legacy.jpg'),(2,101,'other-owner.jpg'),(1,102,'own-mislinked.jpg')"
    )
    .run()
  let report = await (await request('/api/refunds/usage', { method: 'GET' })).json()
  assert.equal(report.usage.photosUploaded, 2)
  assert.equal(report.guarantee.eligible, true)
  await db.prepare("INSERT INTO generated_exports(user_id,format)VALUES(1,'epub')").run()
  report = await (await request('/api/refunds/usage', { method: 'GET' })).json()
  assert.equal(report.usage.exportsGenerated, 1)
  assert.equal(report.guarantee.eligible, false)
  await db.prepare('DELETE FROM generated_exports').run()
  await db
    .prepare('UPDATE payments SET created_at=? WHERE user_id=1')
    .bind(timestampForStorage(Date.now() + 86400000))
    .run()
  report = await (await request('/api/refunds/usage', { method: 'GET' })).json()
  assert.equal(report.guarantee.withinPeriod, false)
  assert.equal(report.guarantee.eligible, false)
})

import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { PDFDocument } from 'pdf-lib'
import jwt from 'jsonwebtoken'
import { PRINT_PACKAGE } from '../../packages/shared/payment-catalog.js'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  secret = 'native-print-fixture-session-signing-secret32'
let runtime,
  db,
  media,
  calls = [],
  orders = new Map(),
  mode = 'ok',
  clock
before(async () => {
  const bundle = `${root}/.cloudflare/api-tests/print-worker.mjs`
  await build({
    stdin: {
      resolveDir: root,
      contents: `
    import {handleNativePrint} from './cloudflare/api/print.js'
    import {serveNativePrintFile} from './cloudflare/api/print-files.js'
    import {consumePrintQueue} from './cloudflare/api/print-jobs.js'
    import {verifyToken} from './cloudflare/api/auth.js'
    import {createRepositories} from './cloudflare/api/repositories.js'
    import {ApiError,json} from './cloudflare/api/errors.js'
    export default {async fetch(request,env){try{
      const path=new URL(request.url).pathname.replace(/^\\/api(?:\\/v1)?/,'')
      const now=Number(request.headers.get('X-Test-Now'))||Date.now(),db=env.DB.withSession('first-primary')
      env={...env,PRINT_QUEUE:{send:async()=>{}}}
      if(request.headers.has('X-Test-Print-Off'))env={...env,PRINT_CONFIGURATION_READY:''}
      if(path.startsWith('/__test/consume/')){
        let ack=0,retry=0
        await consumePrintQueue({messages:[{body:{version:1,orderId:path.split('/').at(-1)},ack(){ack++},retry(){retry++}}]},env,{now:()=>now})
        return json({ack,retry})
      }
      const publicFile=await serveNativePrintFile({request,env,db,path,now})
      if(publicFile)return publicFile
      const token=await verifyToken(request,env.JWT_SECRET),identity=await createRepositories(db,{wallClockTimeZone:'UTC'}).authenticate(token)
      if(!identity||identity.revoked)throw new ApiError(401,{error:'Token revoked'})
      return await handleNativePrint({request,env,db,path,user:identity.user,claims:token.claims,now})||json({error:'Not found'},404)
    }catch(error){if(error instanceof ApiError)return json(error.body,error.status);console.error('Print fixture error',error.message);return json({error:'Unavailable'},503)}}}
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
      name: 'print-native-tests',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        PRINT_CONFIGURATION_READY: 'true',
        PRINT_FULFILMENT_ENABLED: 'true',
        PRINT_PUBLIC_API_URL: 'https://print.invalid',
        PRINT_FILE_SIGNING_SECRET: 'native-print-file-signing-secret-long-enough-32',
        BOOKVAULT_API_KEY: 'bookvault-fixture-credential',
        BOOKVAULT_TEXT_STOCK_ID: '1',
        BOOKVAULT_COVER_STOCK_ID: '2',
        BOOKVAULT_FR_DECLARED_VALUE_GBP: '100'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000039' },
      r2Buckets: ['MEDIA'],
      serviceBindings: {
        BOOKVAULT_FETCH: async request => {
          const url = new URL(request.url),
            body = request.method === 'POST' ? await request.json() : null
          calls.push({
            url: url.href,
            method: request.method,
            body,
            headers: Object.fromEntries(request.headers)
          })
          if (url.pathname === '/v4/title/calculate')
            return Response.json({
              specifications: {
                coverSizing: { expectedWidth: 320, expectedHeight: 232 },
                spine: 10
              }
            })
          if (url.pathname === '/v4/order/transientsku')
            return Response.json({ sku: 'BOOKVAULT-A5-HARDBACK' })
          if (request.method === 'GET')
            return orders.has(url.searchParams.get('value'))
              ? Response.json(orders.get(url.searchParams.get('value')))
              : new Response('', { status: 404 })
          const result = {
            identification: { podRef: 'BV-1', docRef: body.docRef },
            fulfillment: { progress: { status: 'Created', isDispatched: false } }
          }
          if (mode !== 'rejected') orders.set(body.docRef, result)
          if (mode === 'ambiguous' || mode === 'rejected')
            return new Response('private provider diagnostic', { status: 503 })
          return Response.json({ podRef: 'BV-1' })
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  media = await runtime.getR2Bucket('MEDIA')
  for (const file of [
    '../db/schema.sql',
    './migrations/0003_generation_jobs.sql',
    './migrations/0009_print_artwork.sql'
  ]) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    // The trigger is one statement containing an internal semicolon.
    const trigger = source.match(/CREATE TRIGGER[\s\S]*? END;/)?.[0]
    const without = trigger ? source.replace(trigger, '') : source
    await db.batch(
      without
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
  await media.put(
    'assets/fonts/NotoSerif-Regular.ttf',
    await readFile(
      new URL('../../services/api/assets/fonts/NotoSerif-Regular.ttf', import.meta.url)
    )
  )
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  await db.prepare('DROP TRIGGER IF EXISTS reject_print').run()
  await db.prepare('DELETE FROM print_orders').run()
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM media_deletion_jobs').run()
  await db
    .prepare(
      "INSERT INTO users(id,email,name) VALUES(1,'one@example.com','One'),(2,'two@example.com','Two')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO payments(id,user_id,stripe_session_id,product_id,product_type,amount,currency,status) VALUES(1,1,'cs_print','printed_book','premium_bundle',25000,'gbp','completed')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO print_entitlements(id,user_id,stripe_session_id,package_version,quantity) VALUES(?,1,'cs_print',?,?)"
    )
    .bind(crypto.randomUUID(), PRINT_PACKAGE.version, PRINT_PACKAGE.quantity)
    .run()
  await db
    .prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer,updated_at) VALUES(1,1,'earliest-memories','first-memory','I remember the river.','2020-01-01 00:00:00'),(2,2,'earliest-memories','first-memory','Private other account.','2020-01-01 00:00:00')"
    )
    .run()
  const objects = await media.list()
  for (const object of objects.objects)
    if (!object.key.startsWith('assets/')) await media.delete(object.key)
  calls = []
  orders = new Map()
  mode = 'ok'
  clock = Date.now()
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
  return runtime.dispatchFetch(`https://print.invalid/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Test-Now': String(clock),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
}
async function proof() {
  const response = await request('/print/proof', {
    method: 'POST',
    body: { title: 'A River Remembered', author: 'One', photoIds: [] }
  })
  assert.equal(response.status, 201, await response.clone().text())
  return response.json()
}
const address = {
  addressee: 'One Writer',
  address1: '10 Main Road',
  town: 'Bath',
  postCode: 'BA1 1AA',
  email: 'one@example.com',
  countryCode: 'GB'
}
async function approve(id, extra = {}) {
  return request(`/print/${id}/approve`, {
    method: 'POST',
    body: { approved: true, address, ...extra }
  })
}
async function consume(id) {
  return request(`/__test/consume/${id}`, { method: 'POST' })
}

test('actual licensed-font A5 PDFs preserve package limits, privacy and owner-only proof access', async () => {
  const created = await proof()
  assert.equal(created.pageCount, 32)
  assert.equal(created.colourPages, 0)
  const response = await request(`/print/${created.id}/proof/text`),
    pdf = await PDFDocument.load(await response.arrayBuffer())
  assert.equal(pdf.getPageCount(), 32)
  assert.equal(pdf.getTitle(), 'A River Remembered')
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - (148 * 72) / 25.4) < 0.01)
  assert.ok(Math.abs(pdf.getPage(0).getHeight() - (210 * 72) / 25.4) < 0.01)
  assert.equal((await request(`/print/${created.id}/proof/text`, { user: 2 })).status, 404)
  assert.equal(
    (
      await request('/print/proof', {
        method: 'POST',
        user: 2,
        body: { title: 'Other', author: 'Other', photoIds: [] }
      })
    ).status,
    403
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM media_deletion_jobs').first()).count,
    0
  )
  assert.equal(calls.filter(call => call.url === 'https://api.bookvault.app/v4/order').length, 0)
})

test('unconfigured fulfilment, unapproved proofs, invalid shipping and foreign photos cannot place orders', async () => {
  assert.equal(
    (
      await request('/print/proof', {
        method: 'POST',
        body: { title: 'Book', author: 'One', photoIds: [] },
        headers: { 'X-Test-Print-Off': '1' }
      })
    ).status,
    503
  )
  const created = await proof()
  assert.equal((await approve(created.id, { approved: false })).status, 400)
  assert.equal(
    (await approve(created.id, { address: { ...address, countryCode: 'US' } })).status,
    400
  )
  assert.equal(
    (await approve(created.id, { address: { ...address, countryCode: 'FR', postCode: 'bad' } }))
      .status,
    400
  )
  await db
    .prepare("INSERT INTO photos(id,story_id,user_id,filename) VALUES(1,2,2,'foreign.jpg')")
    .run()
  assert.equal(
    (
      await request('/print/proof', {
        method: 'POST',
        body: { title: 'Book', author: 'One', photoIds: [1] }
      })
    ).status,
    403
  )
  assert.equal(calls.filter(call => call.url === 'https://api.bookvault.app/v4/order').length, 0)
})

test('competing approvals reserve exactly one paid ten-book entitlement and replay does not duplicate it', async () => {
  const first = await proof(),
    second = await proof()
  const responses = await Promise.all([approve(first.id), approve(second.id)])
  assert.deepEqual(responses.map(row => row.status).sort(), [202, 403])
  const row = await db.prepare("SELECT id FROM print_orders WHERE status='queued'").first()
  assert.equal((await approve(row.id)).status, 200)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM native_print_dispatch').first()).count,
    1
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM native_print_outbox').first()).count,
    1
  )
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) count FROM print_orders WHERE entitlement_id IS NOT NULL')
        .first()
    ).count,
    1
  )
})

test('Bookvault submission uses exact purchased terms, immutable signed files and duplicate delivery never reposts', async () => {
  const created = await proof()
  await approve(created.id)
  await consume(created.id)
  await consume(created.id)
  const posted = calls.filter(call => call.url === 'https://api.bookvault.app/v4/order')
  assert.equal(posted.length, 1)
  assert.equal(posted[0].headers['x-bookvault-api-key'], 'bookvault-fixture-credential')
  assert.equal(posted[0].body.docRef, `EM-${created.id}`)
  assert.equal(posted[0].body.orderLines[0].quantity, 10)
  assert.equal(posted[0].body.orderLines[0].transient.monoPages, 32)
  assert.equal(posted[0].body.orderLines[0].transient.colourPages, 0)
  const file = await runtime.dispatchFetch(posted[0].body.orderLines[0].transient.files.text)
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('content-type'), 'application/pdf')
  const wrongType = posted[0].body.orderLines[0].transient.files.text.replace('/text?', '/cover?')
  assert.equal((await runtime.dispatchFetch(wrongType)).status, 403)
  const expired = new URL(posted[0].body.orderLines[0].transient.files.text)
  expired.searchParams.set('expires', String(clock - 1))
  assert.equal((await runtime.dispatchFetch(expired)).status, 403)
  assert.equal(
    (await db.prepare('SELECT status FROM print_orders WHERE id=?').bind(created.id).first())
      .status,
    'submitted'
  )
  const accepted = orders.get(`EM-${created.id}`)
  accepted.fulfillment = {
    progress: { isDispatched: true, status: 'Dispatched' },
    trackingDetails: { combinedURL: 'https://tracking.example/one', trackingNumber: 'TRACK-1' }
  }
  clock += 301000
  await consume(created.id)
  const tracked = await db
    .prepare('SELECT status,tracking_number FROM print_orders WHERE id=?')
    .bind(created.id)
    .first()
  assert.equal(tracked.status, 'dispatched')
  assert.equal(tracked.tracking_number, 'TRACK-1')
  assert.equal(calls.filter(call => call.url === 'https://api.bookvault.app/v4/order').length, 1)
})

test('ambiguous paid submission reconciles by DocRef without a second order POST', async () => {
  const created = await proof()
  await approve(created.id)
  mode = 'ambiguous'
  await consume(created.id)
  assert.equal(
    (
      await db
        .prepare('SELECT state FROM native_print_dispatch WHERE order_id=?')
        .bind(created.id)
        .first()
    ).state,
    'effect_started'
  )
  clock += 61000
  await consume(created.id)
  assert.equal(
    (await db.prepare('SELECT status FROM print_orders WHERE id=?').bind(created.id).first())
      .status,
    'submitted'
  )
  assert.equal(calls.filter(call => call.url === 'https://api.bookvault.app/v4/order').length, 1)
})

test('an unconfirmed order pauses for review; account deletion cannot race a queued or ambiguous purchase', async () => {
  const created = await proof()
  await approve(created.id)
  mode = 'rejected'
  await consume(created.id)
  clock += 61000
  await consume(created.id)
  assert.equal(
    (await db.prepare('SELECT status FROM print_orders WHERE id=?').bind(created.id).first())
      .status,
    'review'
  )
  await assert.rejects(
    db.prepare('DELETE FROM users WHERE id=1').run(),
    /EXTERNAL_ACCOUNT_WORK_PENDING/
  )
  assert.ok(await db.prepare('SELECT id FROM users WHERE id=1').first())
  await consume(created.id)
  assert.equal(calls.filter(call => call.url === 'https://api.bookvault.app/v4/order').length, 1)
})

test('failed proof metadata leaves tracked private PDFs for cleanup and overlong books fail before provider calls', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_print BEFORE INSERT ON print_orders BEGIN SELECT RAISE(ABORT,'test failure'); END"
    )
    .run()
  const response = await request('/print/proof', {
    method: 'POST',
    body: { title: 'Book', author: 'One', photoIds: [] }
  })
  assert.equal(response.status, 503)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) count FROM media_deletion_jobs').first()).count,
    2
  )
  assert.equal((await db.prepare('SELECT COUNT(*) count FROM print_orders').first()).count, 0)
  await db.prepare('DROP TRIGGER reject_print').run()
  calls = []
  for (let id = 3; id < 10; id++)
    await db
      .prepare(
        "INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES(1,'earliest-memories',?,?)"
      )
      .bind(`q${id}`, 'remember '.repeat(11000))
      .run()
  const long = await request('/print/proof', {
    method: 'POST',
    body: { title: 'Book', author: 'One', photoIds: [] }
  })
  assert.equal(long.status, 400)
  assert.match((await long.json()).error, /200-page/)
  assert.equal(calls.length, 0)
})

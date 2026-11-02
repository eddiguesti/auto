import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  parseJsonc,
  inspectConfig,
  inspectIngress,
  compareSchema,
  cloudflareRequest,
  runPreflight,
  expectedSchema,
  SCHEMA_QUERY
} from './preflight.mjs'
import { buildInventory } from './inventory.mjs'

const config = {
  account_id: 'bbdbba416f07c76f4c2754f8a61807f4',
  name: 'easy-memoir-api-staging',
  main: 'cloudflare/api-staging.js',
  workers_dev: false,
  preview_urls: false,
  routes: [],
  vars: { NATIVE_API_STAGE: 'local-d1-slice', SOURCE_TIMESTAMP_TIMEZONE: 'UTC' },
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'easymemoir-migration-staging',
      database_id: '3e7dc7e9-9813-41bc-95fb-ac3a51f51b2b'
    }
  ]
}
const target = `accounts/${config.account_id}/d1/database/${config.d1_databases[0].database_id}`
const response = result => new Response(JSON.stringify({ success: true, result }))
async function removeTestDirectory(directory) {
  const resolved = path.resolve(directory)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('memoir-preflight-'))
  await rm(resolved, { recursive: true, force: true })
}

test('JSONC retains URLs, quoted comments, escaped quotes and commas in values', () => {
  const input =
    '{ /* audited */ "url":"https://example.com/a//b", "text":' +
    JSON.stringify('comma,} and "//') +
    ', "array":[1,], // tail\n }'
  assert.deepEqual(parseJsonc(input), {
    url: 'https://example.com/a//b',
    text: 'comma,} and "//',
    array: [1]
  })
  assert.throws(() => parseJsonc('{/* never closed'))
})

test('private staging rejects public routes, sentinel IDs and credentials in vars without disclosing values', () => {
  const altered = structuredClone(config)
  altered.workers_dev = true
  altered.routes = [{ pattern: 'easymemoir.co.uk/*' }]
  altered.d1_databases[0].database_id = '00000000-0000-0000-0000-000000000001'
  altered.vars.JWT_SECRET = 'PRIVATE_SENTINEL_VALUE'
  const checks = inspectConfig(altered)
  for (const id of ['private-staging', 'd1-provisioned', 'secrets-not-vars'])
    assert.equal(checks.find(item => item.id === id).status, 'fail')
  assert.equal(JSON.stringify(checks).includes('PRIVATE_SENTINEL_VALUE'), false)
  assert.equal(
    inspectConfig(config).find(item => item.id === 'secret:JWT_SECRET').status,
    'unverified'
  )
})

test('schema comparison catches changed constraints even with identical columns', () => {
  const a = new DatabaseSync(':memory:'),
    b = new DatabaseSync(':memory:')
  try {
    a.exec(
      'CREATE TABLE owner (id INTEGER PRIMARY KEY, deleted INTEGER CHECK(deleted IN (0,1))) STRICT'
    )
    b.exec('CREATE TABLE owner (id INTEGER PRIMARY KEY, deleted INTEGER) STRICT')
    const expected = a.prepare(SCHEMA_QUERY).all(),
      actual = b.prepare(SCHEMA_QUERY).all()
    assert.deepEqual(compareSchema(expected, actual), {
      missing: 0,
      changed: 1,
      unexpected: 0,
      ok: false
    })
    b.exec('CREATE TRIGGER unexpected AFTER INSERT ON owner BEGIN UPDATE owner SET deleted=0; END')
    assert.equal(compareSchema(expected, b.prepare(SCHEMA_QUERY).all()).unexpected, 1)
  } finally {
    a.close()
    b.close()
  }
})

test('disabled ingress is safe but incomplete; local verified flags cannot establish remote WAF proof', () => {
  const disabled = inspectIngress({})
  assert.equal(disabled.find(item => item.id === 'ingress-policy-posture').status, 'pass')
  assert.equal(disabled.find(item => item.id === 'ingress-auth-enabled').status, 'fail')
  const configured = inspectIngress({
    vars: {
      AUTH_INGRESS_MODE: 'direct-custom-domain',
      AUTH_INGRESS_HOST: 'easymemoir.co.uk',
      AUTH_INGRESS_RULES_VERIFIED: 'true'
    }
  })
  assert.equal(configured.find(item => item.id === 'ingress-auth-enabled').status, 'pass')
  assert.equal(
    configured.find(item => item.id === 'ingress-operational-proof').status,
    'unverified'
  )
})

test('remote boundary refuses arbitrary SQL/endpoints before any request and sanitizes provider errors', async () => {
  let called = 0
  const fetchImpl = async () => {
    called++
    return new Response('TOKEN_AND_CUSTOMER_CONTENT', { status: 403 })
  }
  await assert.rejects(
    cloudflareRequest(`${target}/query`, { token: 'PRIVATE', sql: 'DELETE FROM users', fetchImpl })
  )
  await assert.rejects(
    cloudflareRequest('accounts/foreign/workers/scripts/production/settings', {
      token: 'PRIVATE',
      fetchImpl
    })
  )
  assert.equal(called, 0)
  await assert.rejects(cloudflareRequest(target, { token: 'PRIVATE', fetchImpl }), error => {
    assert.equal(error.message.includes('TOKEN_AND_CUSTOMER_CONTENT'), false)
    assert.equal(error.message.includes('PRIVATE'), false)
    return true
  })
  assert.equal(called, 1)
})

test('sentinel configuration blocks all remote calls', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'memoir-preflight-'))
  try {
    const altered = structuredClone(config)
    altered.d1_databases[0].database_id = '00000000-0000-0000-0000-000000000001'
    const configPath = path.join(directory, 'config.json')
    await writeFile(configPath, JSON.stringify(altered))
    const result = await runPreflight({
      configPath,
      remote: true,
      token: 'TEST_TOKEN',
      fetchImpl: () => {
        throw new Error('Network must not be called')
      }
    })
    assert.equal(result.preflightPassed, false)
    assert.equal(result.checks.find(item => item.id === 'remote-target').status, 'fail')
    assert.equal(
      result.checks.some(item => item.id === 'remote-d1-readable'),
      false
    )
  } finally {
    await removeTestDirectory(directory)
  }
})

test('remote success verifies schema, deployed binding, timestamp gate and secret names without returning values', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'memoir-preflight-'))
  try {
    const configPath = path.join(directory, 'config.json')
    await writeFile(configPath, JSON.stringify(config))
    const expected = await expectedSchema(),
      requests = []
    const fetchImpl = async (url, options) => {
      requests.push({ url, method: options.method, body: options.body })
      if (url.endsWith('/query'))
        return response([{ success: true, meta: { rows_written: 0 }, results: expected }])
      if (url.endsWith('/secrets'))
        return response([{ name: 'JWT_SECRET', type: 'secret_text', text: 'NEVER_PRINT_SECRET' }])
      if (url.endsWith('/settings'))
        return response({
          bindings: [
            { name: 'DB', type: 'd1', id: config.d1_databases[0].database_id },
            { name: 'NATIVE_API_STAGE', type: 'plain_text', text: 'local-d1-slice' },
            { name: 'SOURCE_TIMESTAMP_TIMEZONE', type: 'plain_text', text: 'UTC' }
          ]
        })
      return response({
        uuid: config.d1_databases[0].database_id,
        name: config.d1_databases[0].database_name,
        jurisdiction: 'eu'
      })
    }
    const result = await runPreflight({
      configPath,
      remote: true,
      token: 'NEVER_PRINT_TOKEN',
      fetchImpl
    })
    for (const id of [
      'remote-schema',
      'remote-worker-d1-binding',
      'remote-worker-stage',
      'remote-worker-timezone',
      'secret:JWT_SECRET'
    ])
      assert.equal(result.checks.find(item => item.id === id).status, 'pass')
    assert.equal(result.productionReady, false)
    assert.equal(JSON.stringify(result).includes('NEVER_PRINT'), false)
    assert.equal(requests.filter(item => item.method === 'POST').length, 1)
    assert.equal(JSON.parse(requests.find(item => item.method === 'POST').body).sql, SCHEMA_QUERY)
  } finally {
    await removeTestDirectory(directory)
  }
})

test('source inventory records actual aliases, scheduled timezones, websocket paths and concrete method mismatches', async () => {
  const inventory = await buildInventory()
  assert.equal(inventory.productionReady, false)
  for (const name of [
    'cloudflare/jobs/consumer.js',
    'cloudflare/notifications/outbox.js',
    'cloudflare/phone/session.js'
  ])
    assert.ok(inventory.sourceFiles.some(file => file.name === name))
  const health = inventory.routes.find(item => item.path === '/api/health')
  assert.deepEqual(health.aliases, ['/api/health'])
  assert.ok(
    inventory.routes
      .find(item => item.path === '/api/stories' && item.method === 'POST')
      .aliases.includes('/api/v1/stories')
  )
  assert.equal(
    inventory.scheduledTasks.find(item => item.name === 'weekly-tasks').timezone,
    'Europe/London'
  )
  assert.ok(inventory.websocketPaths.some(item => item.path === '/api/voice/ws'))
  const parallelReads = inventory.frontendReferences.filter(
    item => item.source.endsWith('BookOrderWizard.jsx') && !item.dynamic
  )
  assert.ok(parallelReads.length > 0)
  assert.equal(
    parallelReads.some(item => item.method === 'ALL'),
    false
  )
  assert.ok(parallelReads.every(item => item.matchingRoutes.length > 0))
  // This is a real frontend/source defect until the client contract is repaired.
  const mutation = inventory.frontendReferences.find(
    item => item.source.endsWith('storyMutations.js') && item.path === '/api/stories/save'
  )
  if (mutation) assert.equal(mutation.review, 'unmatched-reference')
})

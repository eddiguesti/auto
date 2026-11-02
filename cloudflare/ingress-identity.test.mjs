import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import {
  canonicalIpSubject,
  signClientIdentity,
  authenticationRequest
} from './ingress-identity.js'
import web from './web.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const secret = 'ingress-native-test-secret-at-least-32-characters'
const policy = {
  AUTH_INGRESS_MODE: 'direct-custom-domain',
  AUTH_INGRESS_RULES_VERIFIED: 'true',
  AUTH_INGRESS_HOST: 'easymemoir.example',
  AUTH_INGRESS_SECRET: secret
}
let runtime
before(async () => {
  const bundle = `${root}/.cloudflare/api-tests/identity-worker.mjs`
  await build({
    entryPoints: [`${root}/cloudflare/auth-client-identity.js`],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'identity-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      bindings: { AUTH_INGRESS_SECRET: secret }
    })
  )
})
after(async () => {
  await runtime?.dispose()
})
function incoming(
  path = '/api/auth/login',
  { ip = '192.0.2.1', headers = {}, cf = { colo: 'LHR' }, method = 'POST' } = {}
) {
  const request = new Request(`https://easymemoir.example${path}`, {
    method,
    ...(method === 'GET'
      ? {}
      : { body: JSON.stringify({ email: 'private@example.invalid', password: 'never-log-this' }) }),
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headers }
  })
  // Platform evidence for this offline unit fixture. Public callers cannot set
  // request.cf on a deployed direct ingress Worker.
  Object.defineProperty(request, 'cf', { value: cf })
  return request
}
function verify(assertion, path = '/api/auth/login') {
  return runtime.dispatchFetch('https://auth-identity.internal/verify', {
    method: 'POST',
    headers: { 'X-EasyMemoir-Client-Identity': assertion, 'X-EasyMemoir-Auth-Path': path }
  })
}

test('address normalization groups IPv6 by /56 and normalizes mapped IPv4 without alternate textual keys', () => {
  assert.equal(canonicalIpSubject('192.0.2.1'), 'ip:192.0.2.1')
  assert.equal(canonicalIpSubject('::ffff:192.0.2.1'), 'ip:192.0.2.1')
  assert.equal(canonicalIpSubject('2001:db8:abcd:1234::1'), 'ip:2001:db8:abcd:1200::/56')
  assert.equal(
    canonicalIpSubject('2001:0DB8:ABCD:12ff:0000:0000:0000:0002'),
    'ip:2001:db8:abcd:1200::/56'
  )
  assert.notEqual(
    canonicalIpSubject('2001:db8:abcd:1300::1'),
    canonicalIpSubject('2001:db8:abcd:1234::1')
  )
  for (const address of [
    '1.2.3',
    '127.1',
    '192.000.2.1',
    '256.0.0.1',
    ' 192.0.2.1',
    '[::1]',
    'fe80::1%eth0',
    '::1/56',
    'invalid'
  ])
    assert.throws(() => canonicalIpSubject(address))
})

test('workerd verifies signed ingress and returns only canonical rate subject', async () => {
  for (const path of ['/api/auth/login', '/api/v1/auth/register', '/api/auth/verify-email']) {
    const assertion = await signClientIdentity(incoming(path), policy)
    const response = await verify(assertion, path)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { subject: 'ip:192.0.2.1' })
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  }
})

test('assertion tampering, stale/future timestamps, wrong path and noncanonical signatures fail closed', async () => {
  const valid = await signClientIdentity(incoming(), policy)
  const stale = await signClientIdentity(incoming(), policy, Date.now() - 32000)
  const future = await signClientIdentity(incoming(), policy, Date.now() + 7000)
  const forged = await signClientIdentity(incoming(), {
    ...policy,
    AUTH_INGRESS_SECRET: 'another-test-secret-at-least-32-characters'
  })
  for (const assertion of [
    valid.slice(0, -1) + (valid.endsWith('A') ? 'B' : 'A'),
    `${valid}=`,
    stale,
    future,
    forged,
    'none'
  ]) {
    const response = await verify(assertion)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'Client identity unavailable' })
  }
  assert.equal((await verify(valid, '/api/auth/register')).status, 503)
  assert.equal((await verify(valid, '/api/stories')).status, 503)
})

test('unverified ingress, Worker subrequests and proxy evidence cannot mint identities', async () => {
  for (const request of [
    incoming('/api/auth/login', { cf: null }),
    incoming('/api/auth/login', { cf: {} }),
    incoming('/api/auth/login', { headers: { 'CF-Worker': 'some-zone.example' } }),
    incoming('/api/auth/login', { headers: { 'x-real-ip': '192.0.2.99' } }),
    incoming('/api/auth/login', { ip: 'not-an-address' })
  ]) {
    await assert.rejects(signClientIdentity(request, policy))
  }
  for (const override of [
    { AUTH_INGRESS_MODE: '' },
    { AUTH_INGRESS_RULES_VERIFIED: 'false' },
    { AUTH_INGRESS_HOST: 'different.example' },
    { AUTH_INGRESS_SECRET: 'short' }
  ])
    await assert.rejects(signClientIdentity(incoming(), { ...policy, ...override }))
})

test('frontend replaces spoofed identity without consuming auth body; unverified configuration blocks forwarding', async () => {
  const request = incoming('/api/auth/login', {
    headers: { 'X-EasyMemoir-Client-Identity': 'spoof' }
  })
  let forwarded
  const response = await web.fetch(request, {
    ...policy,
    API: {
      async fetch(value) {
        forwarded = value
        assert.notEqual(value.headers.get('X-EasyMemoir-Client-Identity'), 'spoof')
        assert.equal((await verify(value.headers.get('X-EasyMemoir-Client-Identity'))).status, 200)
        assert.deepEqual(await value.json(), {
          email: 'private@example.invalid',
          password: 'never-log-this'
        })
        return Response.json({ success: true })
      }
    }
  })
  assert.equal(response.status, 200)
  assert.ok(forwarded)
  let calls = 0
  const failure = await web.fetch(incoming(), {
    ...policy,
    AUTH_INGRESS_RULES_VERIFIED: 'false',
    API: {
      fetch() {
        calls++
      }
    }
  })
  assert.equal(failure.status, 503)
  assert.equal(calls, 0)
})

test('recovery and resend paths receive method-bound trusted assertions on both API prefixes', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    for (const path of [
      'forgot-password',
      'reset-password',
      'resend-verification',
      'verify-reset-token'
    ]) {
      const method = path === 'verify-reset-token' ? 'GET' : 'POST'
      const uri = `${prefix}/auth/${path}`
      const original = incoming(uri, { method })
      assert.equal(authenticationRequest(original), true)
      const assertion = await signClientIdentity(original, policy)
      assert.equal((await verify(assertion, uri)).status, 200)
      assert.equal(
        authenticationRequest(incoming(uri, { method: method === 'GET' ? 'POST' : 'GET' })),
        false
      )
      assert.equal(
        await signClientIdentity(
          incoming(uri, { method: method === 'GET' ? 'POST' : 'GET' }),
          policy
        ),
        null
      )
      const [payload] = assertion.split('.')
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
      assert.equal(claims.method, method)
    }
  }
})

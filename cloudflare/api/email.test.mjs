import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js'

test('Resend adapters preserve manual redirects, private payloads and validated application links', async () => {
  const requests = []
  const env = {
    APP_URL: 'https://easymemoir.example',
    RESEND_API_KEY: 'fake-resend-key',
    EMAIL_PROVIDER: {
      async fetch(request) {
        requests.push(request)
        return Response.json({ id: 'test-delivered' })
      }
    }
  }
  const user = { email: 'person@example.invalid', name: '<Person & family>' }
  await sendPasswordResetEmail(user, 'fake-reset-token', env)
  await sendVerificationEmail(user, 'fake-verification-token', env)
  for (const request of requests) {
    assert.equal(request.url, 'https://api.resend.com/emails')
    assert.equal(request.method, 'POST')
    assert.equal(request.redirect, 'manual')
    assert.equal(request.headers.get('Authorization'), 'Bearer fake-resend-key')
    const body = await request.json()
    assert.equal(body.to, user.email)
    assert.ok(body.html.includes('&lt;Person &amp; family&gt;'))
    assert.ok(body.html.includes('https://easymemoir.example/'))
  }
})
test('Resend failures expose no provider diagnostics and invalid application origins never dispatch', async () => {
  const user = { email: 'person@example.invalid', name: 'Person' }
  const env = {
    RESEND_API_KEY: 'fake-resend-key',
    EMAIL_PROVIDER: {
      async fetch() {
        return new Response('private-provider-diagnostic', { status: 500 })
      }
    }
  }
  await assert.rejects(
    sendPasswordResetEmail(user, 'fake-token', env),
    error => error.status === 502 && error.message !== 'private-provider-diagnostic'
  )
  for (const APP_URL of ['http://easymemoir.example', 'https://user:password@easymemoir.example'])
    await assert.rejects(
      sendVerificationEmail(user, 'fake-token', { ...env, APP_URL }),
      error => error.status === 503
    )
})

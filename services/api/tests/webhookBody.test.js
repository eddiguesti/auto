import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import Stripe from 'stripe'
import { setupMiddleware } from '../middleware/setup.js'

let server
let base
const stripe = new Stripe('sk_test_fake-only')
const secret = 'whsec_test-only'
beforeAll(async () => {
  const app = express()
  setupMiddleware(app)
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        secret
      )
      res.json({ raw: Buffer.isBuffer(req.body), id: event.id })
    } catch {
      res.status(400).end()
    }
  })
  app.post('/api/test-json', (req, res) => res.json(req.body))
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})

describe('signed webhook parsing', () => {
  it('preserves exact Stripe payload bytes so real signature validation succeeds', async () => {
    const payload =
      '{ "id": "evt_test", "object": "event", "type": "test.event", "data": { "object": {} } }'
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
    const response = await fetch(`${base}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
      body: payload
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ raw: true, id: 'evt_test' })
  })

  it('still parses normal JSON API requests', async () => {
    const response = await fetch(`${base}/api/test-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"value": 7}'
    })
    expect(await response.json()).toEqual({ value: 7 })
  })

  it('rejects a tampered signed payload', async () => {
    const payload = '{"id":"evt_test"}'
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
    const response = await fetch(`${base}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
      body: '{"id":"evt_tampered"}'
    })
    expect(response.status).toBe(400)
  })
})

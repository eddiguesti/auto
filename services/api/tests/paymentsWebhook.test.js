import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Stripe from 'stripe'
import { createApp } from '../app.js'

const webhookSecret = 'whsec_test_webhook_secret'
const claimed = new Set()
const statements = []

const client = {
  async query(sql, params = []) {
    statements.push(sql)
    if (sql.includes('INSERT INTO stripe_webhook_events')) {
      if (claimed.has(params[0])) return { rows: [] }
      claimed.add(params[0])
      return { rows: [{ event_id: params[0] }] }
    }
    if (sql.includes('SELECT id, email FROM users')) {
      return { rows: [{ id: 42, email: 'reader@example.com' }] }
    }
    return { rows: [] }
  },
  release() {}
}

const dbPool = {
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
  async query() {
    return { rows: [] }
  },
  async connect() {
    return client
  }
}

let server
let origin

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_test'
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret
  const { app } = createApp({ serveStatic: false, serveDocs: false, dbPool })
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  origin = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})

function signedRequest(payload, signature) {
  return fetch(`${origin}/api/v1/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature':
        signature || Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
    },
    body: payload
  })
}

describe('Stripe raw webhook route', () => {
  const event = {
    id: 'evt_raw_body_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        amount_total: 9999,
        customer_email: 'reader@example.com',
        metadata: {
          userId: '42',
          productId: 'export_ebook',
          productType: 'ebook'
        }
      }
    }
  }
  const payload = JSON.stringify(event)

  it('accepts a signature over the exact raw request bytes', async () => {
    const response = await signedRequest(payload)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(statements.filter(sql => sql.includes('INSERT INTO payments ('))).toHaveLength(1)
  })

  it('acknowledges a duplicate without applying the payment twice', async () => {
    const response = await signedRequest(payload)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(statements.filter(sql => sql.includes('INSERT INTO payments ('))).toHaveLength(1)
  })

  it('rejects an invalid signature before acquiring a database client', async () => {
    const before = statements.length
    const response = await signedRequest(payload, 't=1,v1=invalid')
    expect(response.status).toBe(400)
    expect(statements).toHaveLength(before)
  })
})

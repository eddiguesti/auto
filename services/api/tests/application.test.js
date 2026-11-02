import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import jwt from 'jsonwebtoken'

let server
let base
const query = vi.fn(async (sql, values) => ({
  rows:
    sql === 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL' ? [{ id: values[0] }] : []
}))
const database = { query, totalCount: 0, idleCount: 0, waitingCount: 0 }
beforeAll(async () => {
  const app = createApp({ database, serveStatic: false })
  // Composition must not migrate, schedule work or perform startup database queries.
  expect(query).not.toHaveBeenCalled()
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve))
})

describe('HTTP application composition', () => {
  it.each(['/api/payments/products', '/api/v1/payments/products'])(
    'serves the authoritative public catalog on %s without authentication',
    async path => {
      const callsBefore = query.mock.calls.length
      const response = await fetch(`${base}${path}`)
      expect(response.status).toBe(200)
      const products = await response.json()
      expect(Array.isArray(products)).toBe(true)
      expect(products.find(product => product.id === 'premium_bundle')).toMatchObject({
        price: 25000,
        currency: 'gbp',
        displayPrice: '250.00',
        type: 'premium_bundle'
      })
      expect(products.find(product => product.id === 'printed_book')).toMatchObject({
        price: 25000,
        type: 'premium_bundle'
      })
      expect(products.find(product => product.id === 'export_ebook')).toMatchObject({
        price: 799,
        displayPrice: '7.99'
      })
      expect(products.find(product => product.id === 'premium_monthly')).toMatchObject({
        checkoutAvailable: false
      })
      expect(products.find(product => product.id === 'premium_yearly')).toMatchObject({
        checkoutAvailable: false
      })
      expect(query.mock.calls).toHaveLength(callsBefore)
    }
  )

  it.each(['premium_monthly', 'premium_yearly'])(
    'blocks new recurring charges for %s before calling Stripe',
    async productId => {
      const secret = 'catalog-route-test-secret-at-least-32-characters'
      vi.stubEnv('JWT_SECRET', secret)
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const token = jwt.sign({ id: 7, email: 'user@example.com' }, secret)
      try {
        const response = await fetch(`${base}/api/payments/create-checkout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        })
        expect(response.status).toBe(503)
        expect(await response.json()).toMatchObject({ code: 'SUBSCRIPTIONS_UNAVAILABLE' })
      } finally {
        vi.unstubAllEnvs()
      }
    }
  )

  it('does not charge for a print package when the fulfilment provider is unconfigured', async () => {
    const secret = 'catalog-route-test-secret-at-least-32-characters'
    vi.stubEnv('JWT_SECRET', secret)
    vi.stubEnv('BOOKVAULT_API_KEY', '')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const token = jwt.sign({ id: 7, email: 'user@example.com' }, secret)
    try {
      const response = await fetch(`${base}/api/payments/create-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'premium_bundle' })
      })
      expect(response.status).toBe(503)
      expect(await response.json()).toMatchObject({ code: 'PRINT_UNAVAILABLE' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it.each([
    ['POST', '/api/payments/create-checkout'],
    ['GET', '/api/payments/history'],
    ['POST', '/api/v1/payments/create-checkout'],
    ['GET', '/api/v1/payments/history'],
    ['POST', '/api/payments/products'],
    ['POST', '/api/v1/payments/products'],
    ['GET', '/api/print/status'],
    ['POST', '/api/print/proof'],
    ['GET', '/api/v1/print/status'],
    ['POST', '/api/v1/print/proof']
  ])('preserves authentication for %s %s', async (method, path) => {
    const response = await fetch(`${base}${path}`, { method })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Authentication required' })
  })

  it.each([
    '/api/payments/history',
    '/api/v1/payments/history',
    '/api/print/status',
    '/api/v1/print/status'
  ])('rejects scoped magic-link tokens from protected payment endpoint %s', async path => {
    const secret = 'catalog-route-test-secret-at-least-32-characters'
    vi.stubEnv('JWT_SECRET', secret)
    const token = jwt.sign({ id: 7, email: 'user@example.com', scope: 'magic_link' }, secret)
    try {
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Insufficient permissions' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('uses the injected database for health checks', async () => {
    const response = await fetch(`${base}/api/health`)
    expect(response.status).toBe(200)
    expect((await response.json()).database.status).toBe('ok')
    expect(query).toHaveBeenCalledWith('SELECT 1')
  })

  it.each(['/api/stories', '/api/v1/stories'])('preserves authentication on %s', async path => {
    const response = await fetch(`${base}${path}`)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Authentication required' })
  })

  it('returns API JSON for an unknown route when static hosting is disabled', async () => {
    const response = await fetch(`${base}/api/not-a-real-route`)
    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('Not found')
  })
})

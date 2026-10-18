import { afterEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { handleStripeWebhook } from '../routes/payments.js'
import { PRINT_PACKAGE } from '../../../packages/shared/payment-catalog.js'

afterEach(() => vi.unstubAllEnvs())
const stripe = new Stripe('sk_test_fake')
async function webhook(paymentStatus, overrides = {}) {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fake')
  const session = {
    id: 'cs_test',
    payment_status: paymentStatus,
    customer_email: 'user@example.com',
    amount_total: 25000,
    currency: 'gbp',
    metadata: {
      userId: '1',
      productId: 'premium_bundle',
      productType: 'premium_bundle',
      printPackageVersion: PRINT_PACKAGE.version,
      printQuantity: '10'
    },
    ...overrides
  }
  const payload = JSON.stringify({
    id: 'evt_test',
    type: overrides.eventType || 'checkout.session.completed',
    data: { object: session }
  })
  const req = {
    body: Buffer.from(payload),
    headers: {
      'stripe-signature': stripe.webhooks.generateTestHeaderString({
        payload,
        secret: 'whsec_fake'
      })
    }
  }
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  }
  const db = {
    query: vi.fn(async sql => ({
      rows: sql.startsWith('SELECT id, email') ? [{ id: 1, email: 'user@example.com' }] : []
    }))
  }
  await handleStripeWebhook(req, res, db)
  return { db, res, req }
}

describe('paid print entitlements', () => {
  it('grants one entitlement only from a paid signed event with matching GBP package terms', async () => {
    const { db, res } = await webhook('paid')
    expect(res.json).toHaveBeenCalledWith({ received: true })
    const [sql, values] = db.query.mock.calls.find(([query]) =>
      query.includes('INSERT INTO print_entitlements')
    )
    expect(sql).toContain('ON CONFLICT (stripe_session_id) DO NOTHING')
    expect(values.slice(1)).toEqual(['1', 'cs_test', PRINT_PACKAGE.version, 10])
  })
  it('does not grant access or reserve printing for an unpaid completed checkout', async () => {
    const { db } = await webhook('unpaid')
    expect(db.query).not.toHaveBeenCalled()
  })
  it('handles delayed payment success', async () => {
    const { db } = await webhook('paid', { eventType: 'checkout.session.async_payment_succeeded' })
    expect(
      db.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO print_entitlements'))
    ).toBe(true)
  })
  it.each([{ amount_total: 1 }, { currency: 'usd' }])(
    'rejects mismatched paid package terms %j',
    async overrides => {
      const { db, res } = await webhook('paid', overrides)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(db.query).not.toHaveBeenCalled()
    }
  )
  it('preserves historical purchases without upgrading their physical entitlement silently', async () => {
    const { db } = await webhook('paid', {
      amount_total: 29900,
      metadata: { userId: '1', productId: 'premium_bundle', productType: 'premium_bundle' }
    })
    expect(db.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments '))).toBe(true)
    expect(
      db.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO print_entitlements'))
    ).toBe(false)
  })
})

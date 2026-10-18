import { describe, expect, it, vi } from 'vitest'
import { paymentRepository } from '../repositories/paymentRepository.js'

describe('complete package digital access', () => {
  it.each(['export', 'audiobook'])(
    'accepts a completed bundle payment for %s without another purchase',
    async productType => {
      const db = { query: vi.fn(async () => ({ rows: [{ id: 1 }] })) }
      expect(await paymentRepository.hasProductPayment(db, 7, productType)).toBe(true)
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status = 'completed'"), [
        7,
        [productType, 'premium_bundle']
      ])
    }
  )
  it('does not extend unrelated add-on purchases from a bundle', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) }
    expect(await paymentRepository.hasProductPayment(db, 7, 'style')).toBe(false)
    expect(db.query.mock.calls[0][1]).toEqual([7, ['style']])
  })
})

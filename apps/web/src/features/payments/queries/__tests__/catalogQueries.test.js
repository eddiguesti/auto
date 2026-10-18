import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchProductCatalog, formatProductPrice } from '../catalogQueries'

afterEach(() => vi.unstubAllGlobals())

describe('checkout product catalogue', () => {
  it('uses server pence and currency without inventing an alternative marketing price', () => {
    expect(formatProductPrice({ price: 29900, currency: 'gbp' })).toBe('£299')
    expect(formatProductPrice({ price: 999, currency: 'gbp' })).toBe('£9.99')
  })
  it('rejects unavailable responses rather than using hardcoded offers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false }))
    )
    await expect(fetchProductCatalog()).rejects.toThrow('could not be loaded')
  })
  it('does not present malformed prices as purchasable products', async () => {
    const valid = { id: 'premium_bundle', name: 'Premium Bundle', price: 29900, currency: 'gbp' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          valid,
          { ...valid, id: 'broken', price: '299' },
          { ...valid, id: 'negative', price: -1 }
        ]
      }))
    )
    await expect(fetchProductCatalog()).resolves.toEqual([valid])
  })
})

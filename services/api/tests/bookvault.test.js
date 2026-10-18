import { describe, expect, it, vi } from 'vitest'
import { createBookvaultClient, validateShipping } from '../services/bookvault.js'
import { printFileToken, verifyPrintFileToken } from '../services/printFiles.js'
import { processPrintOrders } from '../jobs/printWorker.js'

const id = 'f15e7100-1122-4333-9444-000000000001'
const address = {
  addressee: 'Élodie Smith',
  address1: '10 Rue des Fleurs',
  town: 'Paris',
  postCode: '75001',
  countryCode: 'FR',
  email: 'elodie@example.com'
}
const order = {
  id,
  status: 'queued',
  claim_version: '2026-10-09 01:02:03.123456+00',
  shipping_address: address,
  product_sku: '115CWMHB210H148W',
  title: 'My Memoir',
  page_count: 200,
  colour_pages: 8
}

describe('Bookvault hardback fulfilment', () => {
  it('submits the server-defined ten-copy package through the documented v4 contract with seller-paid French delivery', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ podRef: 42 }) }))
    const client = createBookvaultClient({
      fetcher,
      env: { BOOKVAULT_API_KEY: 'test', BOOKVAULT_FR_DECLARED_VALUE_GBP: '75' }
    })
    expect(
      await client.submit(order, {
        cover: 'https://files.example/cover',
        text: 'https://files.example/text'
      })
    ).toBe('42')
    const [url, request] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.bookvault.app/v4/order')
    expect(JSON.parse(request.body)).toMatchObject({
      docRef: `EM-${id}`,
      partner: 'Bookvault_UK',
      productionLevel: 'Standard',
      dispatchRequest: { requestedService: 'CheapestTracked' },
      customsDeclaration: { declaredValue: 75, incoTerms: 'DDP', useIOSS: false },
      orderLines: [
        {
          quantity: 10,
          transient: {
            monoPages: 192,
            colourPages: 8,
            files: { cover: 'https://files.example/cover', text: 'https://files.example/text' }
          }
        }
      ]
    })
  })

  it('does not guess a customs valuation or submit a French order without one', async () => {
    const fetcher = vi.fn()
    const client = createBookvaultClient({ fetcher, env: { BOOKVAULT_API_KEY: 'test' } })
    await expect(client.submit(order, {})).rejects.toThrow('customs value')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects unsupported shipping destinations and invalid French postcodes', () => {
    expect(validateShipping(address)).toMatchObject(address)
    expect(() => validateShipping({ ...address, countryCode: 'US' })).toThrow('UK and France')
    expect(() => validateShipping({ ...address, postCode: '123' })).toThrow('five-digit')
    expect(() => validateShipping(null)).toThrow('delivery address')
  })

  it('binds printer file access to the approved order, file and expiry', () => {
    const expires = Date.now() + 100000,
      secret = 'test-secret-with-at-least-32-characters'
    const token = printFileToken(id, 'text', expires, secret)
    expect(verifyPrintFileToken(id, 'text', expires, token, secret)).toBe(true)
    expect(verifyPrintFileToken(id, 'cover', expires, token, secret)).toBe(false)
    expect(verifyPrintFileToken('another-order', 'text', expires, token, secret)).toBe(false)
    expect(verifyPrintFileToken(id, 'text', Date.now() - 1, token, secret)).toBe(false)
  })

  it('claims an order before submission and uses a stable reference for reconciliation', async () => {
    vi.stubEnv('PRINT_FILE_SIGNING_SECRET', 'test-secret-with-at-least-32-characters')
    vi.stubEnv('PRINT_PUBLIC_API_URL', 'https://memoir.example')
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [order] })
        .mockResolvedValueOnce({ rows: [{ id }] })
        .mockResolvedValue({ rows: [] })
    }
    const provider = { find: vi.fn(async () => null), submit: vi.fn(async () => '42') }
    try {
      await processPrintOrders(db, provider, () => true)
      expect(provider.find).toHaveBeenCalledWith(`EM-${id}`)
      expect(provider.submit).toHaveBeenCalledOnce()
      expect(db.query.mock.calls[1][1]).toEqual([id, 'queued', order.claim_version])
      expect(db.query.mock.calls.at(-1)[0]).toContain("status='submitted'")
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('never submits an uncertain order again after a crash or timeout', async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ...order, status: 'submitting' }] })
        .mockResolvedValueOnce({ rows: [{ id }] })
        .mockResolvedValue({ rows: [] })
    }
    const provider = { find: vi.fn(async () => null), submit: vi.fn() }
    await processPrintOrders(db, provider, () => true)
    expect(provider.submit).not.toHaveBeenCalled()
    expect(db.query.mock.calls.at(-1)[0]).toContain("status='review'")
  })

  it('recovers an accepted order and publishes only a safe tracking link', async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ...order, status: 'submitting' }] })
        .mockResolvedValueOnce({ rows: [{ id }] })
        .mockResolvedValue({ rows: [] })
    }
    const provider = {
      find: vi.fn(async () => ({
        identification: { podRef: '42' },
        fulfillment: {
          progress: { isDispatched: true, status: 'Dispatched' },
          trackingDetails: { combinedURL: 'javascript:alert(1)', trackingNumber: 'TRACK42' }
        }
      })),
      submit: vi.fn()
    }
    await processPrintOrders(db, provider, () => true)
    expect(provider.submit).not.toHaveBeenCalled()
    expect(db.query.mock.calls.at(-1)[1]).toEqual([
      id,
      'dispatched',
      '42',
      'Dispatched',
      null,
      'TRACK42'
    ])
  })

  it('cannot submit when another worker has claimed the order or its payment is refunded', async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [order] })
        .mockResolvedValue({ rows: [] })
    }
    const provider = { find: vi.fn(), submit: vi.fn() }
    await processPrintOrders(db, provider, () => true)
    expect(provider.find).not.toHaveBeenCalled()
    expect(provider.submit).not.toHaveBeenCalled()
  })
})

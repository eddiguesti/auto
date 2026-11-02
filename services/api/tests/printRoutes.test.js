import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { Readable } from 'node:stream'

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  stories: vi.fn(),
  interior: vi.fn(),
  cover: vi.fn(),
  specification: vi.fn(),
  storage: { put: vi.fn(), get: vi.fn(), read: vi.fn() }
}))
vi.mock('../services/bookvault.js', async original => ({
  ...(await original()),
  requirePrintConfiguration: mocks.configured,
  bookvault: { specification: mocks.specification }
}))
vi.mock('../services/memoirPrintPdf.js', () => ({
  generateInterior: mocks.interior,
  generateCover: mocks.cover
}))
vi.mock('../repositories/storyRepository.js', () => ({
  storyRepository: { findWithPhotos: mocks.stories }
}))
vi.mock('../utils/objectStorage.js', () => ({ objectStorage: mocks.storage }))
import printRouter from '../routes/print.js'

let server, base
const id = 'f15e7100-1122-4333-9444-000000000001'
const query = vi.fn(),
  release = vi.fn()
const db = { query, connect: vi.fn(async () => ({ query, release })) }
const address = {
  addressee: 'Alice Smith',
  address1: '10 High Street',
  town: 'London',
  postCode: 'SW1A 1AA',
  countryCode: 'GB',
  email: 'alice@example.com'
}
beforeAll(async () => {
  const app = express()
  app.locals.db = db
  app.use(express.json(), (req, _res, next) => {
    req.user = { id: 7 }
    next()
  })
  app.use('/print', printRouter)
  app.use((error, _req, res, _next) =>
    res.status(error.statusCode || 500).json({ error: error.message })
  )
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = `http://127.0.0.1:${server.address().port}/print`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})
beforeEach(() => {
  vi.resetAllMocks()
  db.connect.mockResolvedValue({ query, release })
  query.mockImplementation(async sql => ({
    rows: sql.includes('SELECT id FROM users') ? [{ id: 7 }] : []
  }))
  mocks.interior.mockResolvedValue({ bytes: Buffer.from('text'), pageCount: 200, colourPages: 1 })
  mocks.cover.mockResolvedValue(Buffer.from('cover'))
  mocks.specification.mockResolvedValue({
    sku: 'supplier-generated-sku',
    coverSizing: { expectedWidth: 350, expectedHeight: 250 },
    spine: 10
  })
  mocks.stories.mockResolvedValue([
    { chapter_id: 'childhood', answer: 'My memories', photos: [{ id: 1, filename: 'owned.jpg' }] }
  ])
})
const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

describe('owned, approved print snapshots', () => {
  it('does not prepare paid print files without an unused entitlement', async () => {
    const response = await post('/proof', { title: 'Memoir', author: 'Alice', photoIds: [1] })
    expect(response.status).toBe(403)
    expect(mocks.interior).not.toHaveBeenCalled()
    expect(mocks.storage.put).not.toHaveBeenCalled()
  })
  it('rejects a photo from another account before rendering or storing anything', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
    const response = await post('/proof', { title: 'Memoir', author: 'Alice', photoIds: [999] })
    expect(response.status).toBe(403)
    expect(mocks.stories).toHaveBeenCalledWith(db, 7)
    expect(mocks.interior).not.toHaveBeenCalled()
  })
  it('stores server-rendered files and ignores injected file URLs, quantities and prices', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockImplementation(async sql => ({
        rows: sql.includes('SELECT id FROM users') ? [{ id: 7 }] : []
      }))
    const response = await post('/proof', {
      title: 'Memoir',
      author: 'Alice',
      photoIds: [1],
      quantity: 1000,
      price: 1,
      coverUrl: 'http://evil.example/file'
    })
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result).toMatchObject({ pageCount: 200, colourPages: 1 })
    expect(mocks.storage.put.mock.calls.map(call => call[0])).toEqual([
      `print/7/${result.id}/text.pdf`,
      `print/7/${result.id}/cover.pdf`
    ])
    expect(
      query.mock.calls.find(([sql]) => sql.includes('INSERT INTO print_orders'))[1].at(-1)
    ).toBe('supplier-generated-sku')
  })
  it('requires explicit proof approval before opening a database transaction', async () => {
    expect((await post(`/${id}/approve`, { address })).status).toBe(400)
    expect(db.connect).not.toHaveBeenCalled()
  })
  it('atomically reserves one paid entitlement and records an immutable proof approval', async () => {
    query.mockImplementation(async sql => ({
      rows: sql.startsWith('SELECT status')
        ? [{ status: 'proof' }]
        : sql.includes('SELECT e.id')
          ? [{ id: 'credit-id' }]
          : []
    }))
    const response = await post(`/${id}/approve`, { approved: true, address, quantity: 1000 })
    expect(response.status).toBe(202)
    const statements = query.mock.calls.map(call => call[0])
    expect(statements[0]).toBe('BEGIN')
    expect(statements[1]).toContain('users WHERE id = $1 FOR UPDATE')
    expect(query.mock.calls.find(([sql]) => sql.startsWith('SELECT status'))[1]).toEqual([id, 7])
    expect(statements.at(-1)).toBe('COMMIT')
    const update = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE print_orders'))
    expect(update[1][0]).toBe('credit-id')
    expect(update[1][2]).toBe(id)
    expect(release).toHaveBeenCalledOnce()
  })
  it('returns the existing state on a repeated approval without consuming another entitlement', async () => {
    query.mockImplementation(async sql => ({
      rows: sql.startsWith('SELECT status') ? [{ status: 'queued' }] : []
    }))
    const response = await post(`/${id}/approve`, { approved: true, address })
    expect(response.status).toBe(200)
    expect(query.mock.calls.some(([sql]) => sql.includes('SELECT e.id'))).toBe(false)
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false)
  })
  it('scopes proof downloads to the signed-in owner', async () => {
    query.mockResolvedValue({ rows: [] })
    expect((await fetch(`${base}/${id}/proof/text`)).status).toBe(404)
    expect(query).toHaveBeenCalledWith(expect.stringContaining('user_id = $2'), [id, 7])
    query.mockResolvedValue({ rows: [{ text_key: 'print/7/text.pdf' }] })
    mocks.storage.get.mockResolvedValue({ body: Readable.from(Buffer.from('private PDF')) })
    expect(await (await fetch(`${base}/${id}/proof/text`)).text()).toBe('private PDF')
  })
})

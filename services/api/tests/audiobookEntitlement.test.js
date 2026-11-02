import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'

const mocks = vi.hoisted(() => ({
  paid: vi.fn(),
  early: vi.fn(),
  voice: vi.fn(),
  stories: vi.fn(),
  send: vi.fn()
}))
vi.mock('../repositories/paymentRepository.js', () => ({
  paymentRepository: {
    hasProductPayment: mocks.paid,
    isEarlyAdopter: mocks.early
  }
}))
vi.mock('../repositories/audiobookRepository.js', () => ({
  audiobookRepository: { findVoiceSampleWithConsent: mocks.voice }
}))
vi.mock('../repositories/storyRepository.js', () => ({
  storyRepository: { findWithContent: mocks.stories }
}))
vi.mock('../jobs/queue.js', () => ({ getQueue: async () => ({ send: mocks.send }) }))
import router from '../routes/audiobook.js'

let server, base, scope
const query = vi.fn(),
  release = vi.fn()
const db = { query, connect: vi.fn(async () => ({ query, release })) }
beforeAll(async () => {
  const app = express()
  app.locals.db = db
  app.use(express.json(), (req, _res, next) => {
    req.user = { id: 7, scope }
    next()
  })
  app.use('/audiobook', router)
  app.use((error, _req, res, _next) =>
    res.status(error.statusCode || 500).json({ error: error.message })
  )
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = `http://127.0.0.1:${server.address().port}/audiobook/generate`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})
beforeEach(() => {
  vi.resetAllMocks()
  scope = undefined
  db.connect.mockResolvedValue({ query, release })
  mocks.paid.mockResolvedValue(false)
  mocks.early.mockResolvedValue(false)
  mocks.stories.mockResolvedValue([
    { chapter_id: 'childhood', question_id: 'q1', answer: 'A memory' }
  ])
  mocks.send.mockResolvedValue('job-1')
  query.mockImplementation(async sql => ({
    rows: sql.includes('FOR UPDATE')
      ? [{ id: 7 }]
      : sql.includes('COUNT(*) AS daily')
        ? [{ daily: 0, recent: 0 }]
        : []
  }))
})
const generate = body =>
  fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })

describe('server enforced audiobook eligibility and bounded provider requests', () => {
  it('rejects an unpaid account before reading manuscript or queuing provider work', async () => {
    expect((await generate()).status).toBe(403)
    expect(mocks.stories).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('rejects a limited magic-link token even for a paid account', async () => {
    scope = 'magic_link'
    mocks.paid.mockResolvedValue(true)
    expect((await generate()).status).toBe(403)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('validates a consented sample before asking a provider to clone a voice', async () => {
    mocks.paid.mockResolvedValue(true)
    mocks.voice.mockResolvedValue(null)
    expect((await generate({ useOwnVoice: true })).status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('reserves a serialized, bounded request for a paid account and returns a pollable job id', async () => {
    mocks.paid.mockResolvedValue(true)
    const response = await generate()
    expect(response.status).toBe(202)
    expect((await response.json()).jobId).toBe('job-1')
    expect(mocks.send).toHaveBeenCalledWith(
      'audiobook-generate',
      { userId: 7, useOwnVoice: false },
      expect.objectContaining({
        singletonKey: 'audiobook:7',
        singletonSeconds: 900,
        expireInSeconds: 900
      })
    )
    expect(query.mock.calls.map(call => call[0])).toContain('COMMIT')
    expect(
      query.mock.calls.some(call => call[0].includes('INSERT INTO audiobook_generation_requests'))
    ).toBe(true)
    expect(release).toHaveBeenCalledOnce()
  })
  it.each([
    { daily: 3, recent: 0 },
    { daily: 1, recent: 1 }
  ])('rejects duplicate or excessive provider requests: %j', async usage => {
    mocks.paid.mockResolvedValue(true)
    query.mockImplementation(async sql => ({
      rows: sql.includes('FOR UPDATE')
        ? [{ id: 7 }]
        : sql.includes('COUNT(*) AS daily')
          ? [usage]
          : []
    }))
    expect((await generate()).status).toBe(429)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(query.mock.calls.map(call => call[0])).toContain('ROLLBACK')
  })
  it('does not report success when the singleton queue rejects a duplicate', async () => {
    mocks.early.mockResolvedValue(true)
    mocks.send.mockResolvedValue(null)
    expect((await generate()).status).toBe(409)
    expect(query.mock.calls.map(call => call[0])).not.toContain('COMMIT')
    expect(release).toHaveBeenCalledOnce()
  })
})

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
const mocks = vi.hoisted(() => ({ rate: vi.fn(), grok: vi.fn() }))
vi.mock('../utils/security.js', async original => ({
  ...(await original()),
  checkRateLimit: mocks.rate
}))
vi.mock('../services/grokService.js', () => ({ grokChat: mocks.grok }))
import router from '../routes/style.js'
let server, base
const query = vi.fn()
beforeAll(async () => {
  const app = express()
  app.locals.db = { query }
  app.use(express.json(), (req, _res, next) => {
    req.user = { id: 7 }
    next()
  })
  app.use('/style', router)
  app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }))
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = `http://127.0.0.1:${server.address().port}/style`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})
beforeEach(() => {
  vi.resetAllMocks()
  mocks.rate.mockResolvedValue({ allowed: true, resetIn: 1000 })
  mocks.grok.mockResolvedValue({ content: 'My transformed memory' })
  query.mockResolvedValue({ rows: [{ id: 1, answer: 'Original memory' }] })
})
const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
describe('asynchronous style request rate limits', () => {
  it('allows an eligible first preview and returns transformed text', async () => {
    const response = await post('/preview', { storyId: 1 })
    expect(response.status).toBe(200)
    expect((await response.json()).transformed).toBe('My transformed memory')
  })
  it('allows apply-all when the asynchronous limiter permits it', async () => {
    expect((await post('/apply-all', {})).status).toBe(200)
    expect(mocks.grok).toHaveBeenCalled()
  })
  it('rejects a genuinely throttled request without calling the provider', async () => {
    mocks.rate.mockResolvedValue({ allowed: false, resetIn: 2000 })
    const response = await post('/preview', { storyId: 1 })
    expect(response.status).toBe(429)
    expect((await response.json()).message).toContain('2 seconds')
    expect(mocks.grok).not.toHaveBeenCalled()
  })
})

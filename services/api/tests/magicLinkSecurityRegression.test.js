import express from 'express'
import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import magicRouter from '../routes/magicLink.js'
let server, base, query
const rawFetch = globalThis.fetch
const link = 'a'.repeat(64)
beforeEach(async () => {
  vi.stubEnv('JWT_SECRET', 'magic-link-test-secret-at-least-32-characters')
  let consumed = false
  query = vi.fn(async (sql, values) => {
    if (sql.includes('UPDATE email_session_tokens est')) {
      if (consumed) return { rows: [] }
      consumed = true
      return {
        rows: [
          {
            id: 21,
            user_id: 7,
            email: 'user@example.com',
            name: 'User',
            prompt_text: 'A family memory'
          }
        ]
      }
    }
    if (sql.includes('FROM token_blacklist') && values[0] === 'revoked') return { rows: [{}] }
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 7 }] }
    return { rows: [] }
  })
  const app = express()
  app.locals.db = { query }
  app.use(express.json())
  app.use('/api/magic', magicRouter)
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}/api/magic/${link}`
})
afterEach(async () => {
  await new Promise(resolve => server.close(resolve))
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
describe('magic voice session authentication', () => {
  it('consumes a link atomically and issues a revocable scoped credential only once', async () => {
    const responses = await Promise.all([rawFetch(base), rawFetch(base)])
    expect(responses.map(r => r.status).sort()).toEqual([200, 404])
    const success = await responses.find(r => r.status === 200).json()
    expect(jwt.verify(success.token, process.env.JWT_SECRET)).toMatchObject({
      id: 7,
      session_token_id: 21,
      scope: 'magic_link',
      jti: expect.any(String)
    })
    expect(query.mock.calls[0][0]).toContain('AND est.used_at IS NULL')
    expect(query.mock.calls[0][0]).toContain('UPDATE email_session_tokens')
  })
  it('rejects a revoked token before requesting paid ephemeral credentials', async () => {
    const token = jwt.sign(
      { id: 7, jti: 'revoked', scope: 'magic_link', session_token_id: 21 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
    const provider = vi.spyOn(globalThis, 'fetch')
    const response = await rawFetch(base + '/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}'
    })
    expect(response.status).toBe(401)
    expect(provider).not.toHaveBeenCalled()
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(false)
  })
})

import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'
import { createApp } from '../app.js'
import {
  blacklistAllUserTokens,
  blacklistToken,
  isTokenBlacklisted,
  isUserTokenBlacklisted,
  tokenRevocationKey
} from '../infrastructure/tokenBlacklist.js'
import { verifyToken } from '../../../cloudflare/api/auth.js'

const state = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../db/index.js', () => ({ default: { query: state.query } }))
const secret = 'revocation-compatibility-test-secret-more-than-32-characters'
const revoked = new Set()
let server
let base

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', secret)
  const app = createApp({ database: { query: state.query }, serveStatic: false })
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
  vi.unstubAllEnvs()
})
beforeEach(() => {
  revoked.clear()
  state.query.mockReset()
  state.query.mockImplementation(async (sql, values) => {
    if (sql === 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL')
      return { rows: [{ id: 7 }] }
    if (sql.includes('INSERT INTO token_blacklist')) revoked.add(values[0])
    if (sql.includes('SELECT 1 FROM token_blacklist'))
      return { rows: revoked.has(values[0]) ? [{ found: 1 }] : [] }
    if (sql.includes('SELECT id, email, name, birth_year'))
      return { rows: [{ id: 7, email: 'user@example.com', name: 'Test' }] }
    return { rows: [] }
  })
})

function sign(claims = {}) {
  return jwt.sign({ id: 7, email: 'user@example.com', ...claims }, secret, { expiresIn: '1h' })
}
function call(path, token, method = 'GET') {
  return fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
}

it.each([{ jti: 'ordinary-session' }, { scope: 'magic_link' }])(
  'logout revokes real signed tokens while preserving the public response: %j',
  async claims => {
    const token = sign(claims)
    expect((await call('/api/auth/me', token)).status).toBe(200)
    const logout = await call('/api/auth/logout', token, 'POST')
    expect(logout.status).toBe(200)
    expect(await logout.json()).toEqual({ success: true, message: 'Logged out successfully' })
    const denied = await call('/api/v1/auth/me', token)
    expect(denied.status).toBe(401)
    expect(await denied.json()).toEqual({ error: 'Token revoked' })
  }
)

it('the native and Node verifiers use the identical canonical legacy-token fingerprint', async () => {
  const token = sign({ scope: 'magic_link' })
  const decoded = jwt.verify(token, secret)
  const native = await verifyToken(
    new Request('https://test.invalid', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    secret
  )
  const expected = `sha256:${createHash('sha256').update(token).digest('hex')}`
  expect(tokenRevocationKey(decoded, token)).toBe(expected)
  expect(native.revocationKey).toBe(expected)
  await blacklistToken(decoded, token)
  expect(revoked.has(native.revocationKey)).toBe(true)
})

it('rejects alternate signature pad bits before checking revocation', async () => {
  const token = sign({ scope: 'magic_link' })
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const last = alphabet.indexOf(token.at(-1))
  const alternate = token.slice(0, -1) + alphabet[last + 1]
  expect(Buffer.from(alternate.split('.')[2], 'base64url')).toEqual(
    Buffer.from(token.split('.')[2], 'base64url')
  )
  const response = await call('/api/auth/me', alternate)
  expect(response.status).toBe(403)
  expect(state.query).not.toHaveBeenCalled()
  await expect(
    verifyToken(
      new Request('https://test.invalid', {
        headers: { Authorization: `Bearer ${alternate}` }
      }),
      secret
    )
  ).rejects.toMatchObject({ status: 403 })
})

it.each(['token_blacklist', 'user_token_invalidation'])(
  'a %s read outage blocks protected payment mutations with retryable503',
  async table => {
    const token = sign({ jti: 'outage-session' })
    state.query.mockImplementation(async sql => {
      if (sql.includes(table)) throw new Error('database unavailable')
      return { rows: [] }
    })
    const response = await call('/api/payments/create-checkout', token, 'POST')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: 'Token revocation service unavailable',
      code: 'REVOCATION_UNAVAILABLE'
    })
  }
)

it('a failed logout write returns503 and the same JWT remains usable after recovery', async () => {
  const token = sign({ scope: 'magic_link' })
  state.query.mockImplementation(async sql => {
    if (sql === 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL')
      return { rows: [{ id: 7 }] }
    if (sql.includes('INSERT INTO token_blacklist')) throw new Error('database unavailable')
    return { rows: [] }
  })
  const response = await call('/api/auth/logout', token, 'POST')
  expect(response.status).toBe(503)
  expect((await response.json()).code).toBe('REVOCATION_UNAVAILABLE')
  state.query.mockImplementation(async sql => ({
    rows:
      sql.includes('SELECT id, email') ||
      sql === 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL'
        ? [{ id: 7 }]
        : []
  }))
  expect((await call('/api/auth/me', token)).status).toBe(200)
})

it('both read/write revocation APIs reject DB failures instead of returning false', async () => {
  state.query.mockRejectedValue(new Error('database unavailable'))
  for (const operation of [
    () => isTokenBlacklisted('session'),
    () => isUserTokenBlacklisted(7, Math.floor(Date.now() / 1000)),
    () => blacklistToken(jwt.verify(sign({ jti: 'session' }), secret)),
    () => blacklistAllUserTokens(7)
  ])
    await expect(operation()).rejects.toMatchObject({
      statusCode: 503,
      code: 'REVOCATION_UNAVAILABLE'
    })
})

it('an absent revocation database and corrupt invalidation timestamp fail closed', async () => {
  await expect(isTokenBlacklisted('session', null)).rejects.toMatchObject({ statusCode: 503 })
  state.query.mockResolvedValue({ rows: [{ invalidated_at: 'not-a-date' }] })
  await expect(isUserTokenBlacklisted(7, 100)).rejects.toMatchObject({ statusCode: 503 })
})

it('rejects all still-signed sessions after the account is deleted', async () => {
  const token = sign({ jti: 'older-session' })
  state.query.mockResolvedValue({ rows: [] })
  const response = await call('/api/auth/me', token)
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'Account no longer available' })
})

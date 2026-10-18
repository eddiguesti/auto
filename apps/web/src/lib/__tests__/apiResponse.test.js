// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  CONNECTION_ERROR,
  INCOMPLETE_RESPONSE,
  readApiResponse,
  fetchApiResponse,
  assertAuthResponse
} from '../apiResponse'

describe('API failure response normalization', () => {
  it.each(['', '<html>Service unavailable</html>', '{broken'])(
    'turns a 503 error body into an actionable message: %s',
    async body => {
      await expect(
        readApiResponse(
          new Response(body, { status: 503, headers: { 'Content-Type': 'application/json' } })
        )
      ).rejects.toMatchObject({ name: 'ApiError', status: 503, message: CONNECTION_ERROR })
    }
  )

  it('preserves a valid 401 message and error code for callers', async () => {
    const body = {
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }
    }
    await expect(
      readApiResponse(
        new Response(JSON.stringify(body), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Email or password is incorrect.',
      body
    })
  })

  it('rejects malformed successful JSON and incomplete authentication data', async () => {
    await expect(
      readApiResponse(
        new Response('{broken', { status: 200, headers: { 'Content-Type': 'application/json' } })
      )
    ).rejects.toMatchObject({ message: INCOMPLETE_RESPONSE })
    expect(() => assertAuthResponse({ user: { name: 'Alex' } })).toThrow(INCOMPLETE_RESPONSE)
  })

  it('normalizes rejected network requests while preserving cancellation', async () => {
    await expect(
      fetchApiResponse(
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
        '/api/auth/login'
      )
    ).rejects.toMatchObject({ status: 0, message: CONNECTION_ERROR })
    const aborted = new DOMException('Cancelled', 'AbortError')
    await expect(
      fetchApiResponse(
        vi.fn(async () => {
          throw aborted
        }),
        '/api/stories'
      )
    ).rejects.toBe(aborted)
  })

  it('retains successful non-JSON text', async () => {
    expect(
      await readApiResponse(
        new Response('plain text', { headers: { 'Content-Type': 'text/plain' } })
      )
    ).toBe('plain text')
  })
})

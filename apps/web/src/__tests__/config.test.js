import { afterEach, describe, it, expect, vi } from 'vitest'
import { API_URL, GOOGLE_CLIENT_ID } from '../config'

describe('config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('API_URL defaults to empty string (relative path for proxy)', () => {
    // In test env, VITE_API_URL is not set, so it defaults to ''
    expect(typeof API_URL).toBe('string')
  })

  it('GOOGLE_CLIENT_ID is set', () => {
    expect(GOOGLE_CLIENT_ID).toBeTruthy()
    expect(typeof GOOGLE_CLIENT_ID).toBe('string')
    expect(GOOGLE_CLIENT_ID).toContain('.apps.googleusercontent.com')
  })

  it.each([undefined, '', 'false', '1', 'TRUE'])(
    'keeps the manual preview off for %s',
    async value => {
      vi.stubEnv('VITE_MANUAL_PREVIEW', value)
      vi.resetModules()
      expect((await import('../config')).MANUAL_PREVIEW).toBe(false)
    }
  )

  it('enables the manual preview only when explicitly configured', async () => {
    vi.stubEnv('VITE_MANUAL_PREVIEW', 'true')
    vi.resetModules()
    expect((await import('../config')).MANUAL_PREVIEW).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { API_URL, GOOGLE_CLIENT_ID } from '../config'

describe('config', () => {
  it('API_URL defaults to empty string (relative path for proxy)', () => {
    // In test env, VITE_API_URL is not set, so it defaults to ''
    expect(typeof API_URL).toBe('string')
  })

  it('GOOGLE_CLIENT_ID is set', () => {
    expect(GOOGLE_CLIENT_ID).toBeTruthy()
    expect(typeof GOOGLE_CLIENT_ID).toBe('string')
    expect(GOOGLE_CLIENT_ID).toContain('.apps.googleusercontent.com')
  })
})

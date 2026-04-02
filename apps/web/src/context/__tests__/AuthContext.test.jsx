import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock config
vi.mock('../../config', () => ({ API_URL: '' }))

// Mock fetch globally
const mockFetch = vi.fn()
// eslint-disable-next-line no-undef
global.fetch = mockFetch

// Helper component to access auth context
function AuthConsumer({ onRender }) {
  const auth = useAuth()
  onRender(auth)
  return <div data-testid="consumer">{auth.user?.email || 'no-user'}</div>
}

function renderWithAuth(onRender = vi.fn()) {
  return render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  try {
    localStorage.clear()
  } catch {
    /* jsdom may not support localStorage */
  }
  // Default: no token stored, fetchUser won't be called
  mockFetch.mockResolvedValue({ ok: false })
})

describe('AuthContext', () => {
  it('provides auth context to children', () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)
    expect(onRender).toHaveBeenCalled()
    const auth = onRender.mock.calls[0][0]
    expect(auth).toHaveProperty('login')
    expect(auth).toHaveProperty('logout')
    expect(auth).toHaveProperty('authFetch')
    expect(auth).toHaveProperty('user')
    expect(auth).toHaveProperty('token')
  })

  it('login() stores token in sessionStorage and sets user state', async () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)

    // Wait for initial loading to finish
    await waitFor(() => {
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(lastCall.loading).toBe(false)
    })

    const auth = onRender.mock.calls[onRender.mock.calls.length - 1][0]

    await act(async () => {
      auth.login({ id: 1, email: 'test@test.com' }, 'my-token')
    })

    expect(sessionStorage.getItem('token')).toBe('my-token')

    await waitFor(() => {
      const latest = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(latest.user).toEqual({ id: 1, email: 'test@test.com' })
      expect(latest.token).toBe('my-token')
    })
  })

  it('logout() clears token and user state', async () => {
    sessionStorage.setItem('token', 'existing-token')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, email: 'test@test.com' } })
    })

    const onRender = vi.fn()
    renderWithAuth(onRender)

    await waitFor(() => {
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(lastCall.loading).toBe(false)
    })

    const auth = onRender.mock.calls[onRender.mock.calls.length - 1][0]

    await act(async () => {
      await auth.logout()
    })

    expect(sessionStorage.getItem('token')).toBeNull()

    await waitFor(() => {
      const latest = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(latest.user).toBeNull()
      expect(latest.token).toBeNull()
    })
  })

  it('authFetch() adds Authorization header', async () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)

    await waitFor(() => {
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(lastCall.loading).toBe(false)
    })

    const auth = onRender.mock.calls[onRender.mock.calls.length - 1][0]

    // Login first so we have a token
    await act(async () => {
      auth.login({ id: 1, email: 'test@test.com' }, 'bearer-token')
    })

    const latestAuth = onRender.mock.calls[onRender.mock.calls.length - 1][0]

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await act(async () => {
      await latestAuth.authFetch('/api/test')
    })

    const fetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
    expect(fetchCall[1].headers.Authorization).toBe('Bearer bearer-token')
  })

  it('loading eventually becomes false after mount', async () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)

    // Whether loading starts true or false depends on token availability,
    // but it should always settle to false
    await waitFor(() => {
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1][0]
      expect(lastCall.loading).toBe(false)
    })
  })

  it('useAuth() throws when used outside AuthProvider', () => {
    // Suppress React error boundary console errors for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BadComponent() {
      useAuth()
      return null
    }

    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within an AuthProvider')

    spy.mockRestore()
  })
})

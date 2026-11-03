import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import { queryClient } from '../../lib/queryClient'

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
  const latest = onRender => onRender.mock.calls.at(-1)[0]
  const verifiedReply = () => ({
    ok: true,
    status: 200,
    json: async () => ({ user: { id: 1, email: 'test@test.com' } })
  })

  it('does not restore identity from a late verification response after explicit logout', async () => {
    sessionStorage.setItem('token', 'saved-token')
    let finishVerification
    mockFetch.mockReturnValueOnce(
      new Promise(resolve => {
        finishVerification = resolve
      })
    )
    const onRender = vi.fn()
    renderWithAuth(onRender)
    mockFetch.mockResolvedValue({ ok: false, status: 503 })
    await act(async () => {
      await latest(onRender).logout()
    })
    await act(async () => {
      finishVerification(verifiedReply())
    })
    expect(latest(onRender)).toMatchObject({ user: null, token: null, loading: false })
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('invalidates an authenticated API request rejected as revoked with401', async () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)
    await waitFor(() => expect(latest(onRender).loading).toBe(false))
    await act(async () => {
      latest(onRender).login({ id: 1 }, 'saved-token')
    })
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false })
    await act(async () => {
      await latest(onRender).authFetch('/api/stories')
    })
    expect(latest(onRender)).toMatchObject({ user: null, token: null })
  })

  it.each([503, 429, 500])(
    'keeps an unverified saved token after a transient HTTP %s and offers safe retry',
    async status => {
      sessionStorage.setItem('token', 'saved-token')
      mockFetch.mockResolvedValue({ ok: false, status })
      const onRender = vi.fn()
      renderWithAuth(onRender)
      await waitFor(() => expect(latest(onRender).loading).toBe(false))
      expect(sessionStorage.getItem('token')).toBe('saved-token')
      expect(latest(onRender).user).toBeNull()
      expect(latest(onRender).authError).toMatch(/try again/i)
      mockFetch.mockResolvedValueOnce(verifiedReply())
      await act(async () => {
        await latest(onRender).refreshUser()
      })
      expect(latest(onRender).user.email).toBe('test@test.com')
      expect(latest(onRender).authError).toBeNull()
    }
  )

  it('retains a saved credential after a network failure without accepting an identity', async () => {
    sessionStorage.setItem('token', 'saved-token')
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const onRender = vi.fn()
    renderWithAuth(onRender)
    await waitFor(() => expect(latest(onRender).loading).toBe(false))
    expect(latest(onRender)).toMatchObject({ token: 'saved-token', user: null })
    expect(sessionStorage.getItem('token')).toBe('saved-token')
  })

  it.each([401, 403])(
    'clears a credential explicitly rejected by auth/me with HTTP %s',
    async status => {
      sessionStorage.setItem('token', 'revoked-token')
      mockFetch.mockResolvedValue({ ok: false, status })
      const onRender = vi.fn()
      renderWithAuth(onRender)
      await waitFor(() => expect(latest(onRender).loading).toBe(false))
      expect(latest(onRender)).toMatchObject({ token: null, user: null, authError: null })
      expect(sessionStorage.getItem('token')).toBeNull()
    }
  )

  it('does not accept a malformed successful auth payload or destroy its retry credential', async () => {
    sessionStorage.setItem('token', 'saved-token')
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: {} }) })
    const onRender = vi.fn()
    renderWithAuth(onRender)
    await waitFor(() => expect(latest(onRender).loading).toBe(false))
    expect(latest(onRender).user).toBeNull()
    expect(latest(onRender).authError).toMatch(/try again/i)
    expect(sessionStorage.getItem('token')).toBe('saved-token')
  })

  it('preserves a previously verified user on refresh outage and clears locally even if logout is offline', async () => {
    sessionStorage.setItem('token', 'saved-token')
    mockFetch.mockResolvedValueOnce(verifiedReply())
    const onRender = vi.fn()
    renderWithAuth(onRender)
    await waitFor(() => expect(latest(onRender).user?.id).toBe(1))
    mockFetch.mockRejectedValue(new TypeError('Offline'))
    await act(async () => {
      await latest(onRender).refreshUser()
    })
    expect(latest(onRender).user.id).toBe(1)
    expect(latest(onRender).token).toBe('saved-token')
    await act(async () => {
      await latest(onRender).logout()
    })
    expect(latest(onRender).user).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('shows a recoverable protected-route check instead of treating a JWT as a verified user', async () => {
    sessionStorage.setItem('token', 'saved-token')
    mockFetch.mockResolvedValue({ ok: false, status: 503 })
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <p>Private memoir</p>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('sign-in has been kept')
    expect(screen.queryByText('Private memoir')).toBeNull()
    mockFetch.mockResolvedValueOnce(verifiedReply())
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Private memoir')).toBeInTheDocument()
  })

  it('keeps scope-denied and transient API calls signed in but invalidates an expired token without consuming the reply', async () => {
    const onRender = vi.fn()
    renderWithAuth(onRender)
    await waitFor(() => expect(latest(onRender).loading).toBe(false))
    await act(async () => {
      latest(onRender).login({ id: 1 }, 'saved-token')
    })
    const response = (status, error) => ({
      status,
      ok: false,
      json: async () => ({ error }),
      clone: () => ({ json: async () => ({ error }) })
    })
    mockFetch.mockResolvedValueOnce(response(403, 'Insufficient permissions'))
    await act(async () => {
      await latest(onRender).authFetch('/api/chapters')
    })
    expect(latest(onRender).token).toBe('saved-token')
    mockFetch.mockResolvedValueOnce(response(503, 'Token revocation service unavailable'))
    await act(async () => {
      await latest(onRender).authFetch('/api/stories')
    })
    expect(latest(onRender).token).toBe('saved-token')
    mockFetch.mockResolvedValueOnce(response(403, 'Invalid or expired token'))
    let reply
    await act(async () => {
      reply = await latest(onRender).authFetch('/api/stories')
    })
    expect(await reply.json()).toEqual({ error: 'Invalid or expired token' })
    expect(latest(onRender).token).toBeNull()
  })

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

it('clears private cached stories on logout and refuses deferred writes from the previous account', async () => {
  let auth
  renderWithAuth(value => {
    auth = value
  })
  await waitFor(() => expect(auth.loading).toBe(false))
  act(() => auth.login({ id: 1 }, 'account-a-token'))
  const deferredWrite = auth.authFetch
  queryClient.setQueryData(
    ['stories', 1, 'chapter', 'childhood'],
    [{ answer: 'Private account A story' }]
  )
  await act(async () => {
    await auth.logout()
  })
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  act(() => auth.login({ id: 2 }, 'account-b-token'))
  mockFetch.mockClear()
  await expect(deferredWrite('/api/stories', { method: 'POST', body: '{}' })).rejects.toThrow(
    'Sign-in changed'
  )
  expect(mockFetch).not.toHaveBeenCalled()
})

it('cleans current-owner and legacy AI drafts on logout and invalidates old UI work synchronously', async () => {
  let auth
  renderWithAuth(value => {
    auth = value
  })
  await waitFor(() => expect(auth.loading).toBe(false))
  act(() => auth.login({ id: 1 }, 'account-a-token'))
  const oldGuard = auth.isCurrentSession
  localStorage.setItem('ai-chat:v2:1:childhood:first', 'private owner one')
  localStorage.setItem('ai-chat:v2:2:childhood:first', 'private owner two')
  localStorage.setItem('ai-chat-childhood-first', 'unowned legacy private text')
  localStorage.setItem('theme', 'dark')
  expect(oldGuard()).toBe(true)
  await act(async () => {
    const logout = auth.logout()
    expect(oldGuard()).toBe(false)
    await logout
  })
  expect(localStorage.getItem('ai-chat:v2:1:childhood:first')).toBeNull()
  expect(localStorage.getItem('ai-chat-childhood-first')).toBeNull()
  expect(localStorage.getItem('ai-chat:v2:2:childhood:first')).toBe('private owner two')
  expect(localStorage.getItem('theme')).toBe('dark')
})

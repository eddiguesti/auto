import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'
import Register from '../Register'
import { CONNECTION_ERROR, INCOMPLETE_RESPONSE } from '../../../lib/apiResponse'

const mocks = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ login: mocks.login }) }))
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }))

beforeEach(() => {
  cleanup()
  mocks.login.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const reply = (status, text) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => 'application/json' },
  text: async () => text
})

describe('authentication recovery messages', () => {
  it.each([
    [503, '', CONNECTION_ERROR],
    [503, '<html>Bad gateway</html>', CONNECTION_ERROR],
    [
      401,
      JSON.stringify({ message: 'Email or password is incorrect.' }),
      'Email or password is incorrect.'
    ],
    [200, '{broken', INCOMPLETE_RESPONSE]
  ])('keeps login recoverable for HTTP %s', async (status, body, expected) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply(status, body))
    )
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'fixture@example.invalid' }
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Fixture123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(mocks.login).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled()
  })

  it('offers a retry after a network rejection during registration without storing invalid auth', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now - 4000)
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )
    clock.mockReturnValue(now)
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Alex Example' } })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'fixture@example.invalid' }
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Fixture123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(CONNECTION_ERROR)
    expect(mocks.login).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled()
  })
})

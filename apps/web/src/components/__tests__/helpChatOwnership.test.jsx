import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import HelpChatbot from '../HelpChatbot'

const { authFetch, identity } = vi.hoisted(() => ({ authFetch: vi.fn(), identity: { user: null } }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authFetch, user: identity.user })
}))
const reply = () =>
  new Response(JSON.stringify({ response: 'Your message has been saved.', escalated: true }))
beforeEach(() => {
  identity.user = null
  authFetch.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => reply())
  )
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
async function send(text) {
  fireEvent.click(screen.getByRole('button', { name: 'Open help chat' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
    target: { value: text }
  })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send question' })))
}

it('keeps anonymous help available and sends signed-in support with verified account authorization', async () => {
  const view = render(<HelpChatbot />)
  await send('Anonymous help')
  expect(fetch).toHaveBeenCalledWith(
    '/api/support/chat',
    expect.objectContaining({ method: 'POST' })
  )
  expect(authFetch).not.toHaveBeenCalled()
  identity.user = { id: 1, email: 'one@example.com', name: 'One' }
  authFetch.mockResolvedValueOnce(reply())
  view.rerender(<HelpChatbot />)
  await send('Account support question')
  expect(authFetch).toHaveBeenCalledOnce()
  const [, options] = authFetch.mock.calls[0]
  expect(JSON.parse(options.body)).toMatchObject({
    message: 'Account support question',
    userEmail: 'one@example.com'
  })
  expect(
    JSON.parse(options.body).conversationHistory.some(
      message => message.content === 'Anonymous help'
    )
  ).toBe(false)
})

it('clears another account’s conversation and aborts its pending request on account switch', async () => {
  identity.user = { id: 1, email: 'one@example.com' }
  authFetch.mockImplementation(() => new Promise(() => {}))
  const view = render(<HelpChatbot />)
  await send('Private account-one support')
  const signal = authFetch.mock.calls[0][1].signal
  expect(signal.aborted).toBe(false)
  identity.user = { id: 2, email: 'two@example.com' }
  view.rerender(<HelpChatbot />)
  expect(signal.aborted).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Open help chat' }))
  expect(screen.queryByText('Private account-one support')).toBeNull()
  expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('')
})

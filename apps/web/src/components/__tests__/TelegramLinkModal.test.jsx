import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import TelegramLinkModal from '../TelegramLinkModal'
const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ authFetch }) }))
vi.mock('../../hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }))
beforeEach(() => authFetch.mockReset())
it('shows retained Telegram drafts when reopening a connected account', async () => {
  authFetch.mockResolvedValue(
    Response.json({ connected: true, username: 'mary', pendingAnswers: 1 })
  )
  render(<TelegramLinkModal onClose={() => {}} />)
  expect(await screen.findByRole('status')).toHaveTextContent('existing website answers were kept')
  expect(screen.getByRole('status')).toHaveTextContent('Download your account data')
})
it('preserves the successful link response so conflicting guest drafts remain visible', async () => {
  authFetch
    .mockResolvedValueOnce(Response.json({ connected: false }))
    .mockResolvedValueOnce(Response.json({ success: true, pendingAnswers: 2 }))
  render(<TelegramLinkModal onClose={() => {}} />)
  const input = await screen.findByPlaceholderText('Enter 8-character code')
  fireEvent.change(input, { target: { value: 'ABCDEF12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Link Account' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Some Telegram drafts need review')
})

import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickStory from '../QuickStory'
const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 }, authFetch }) }))
const json = value =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
it('lists saved standalone memories and lets the user reopen, edit and persist them', async () => {
  let stories = []
  authFetch.mockImplementation((path, options) => {
    if (options?.method === 'POST') {
      stories = [{ ...JSON.parse(options.body), id: 1 }]
      return Promise.resolve(json({ success: true, data: stories[0] }))
    }
    if (options?.method === 'PUT') {
      stories = [{ ...JSON.parse(options.body), id: 1 }]
      return Promise.resolve(json({ success: true, data: stories[0] }))
    }
    return Promise.resolve(json({ success: true, data: stories }))
  })
  render(
    <MemoryRouter>
      <QuickStory />
    </MemoryRouter>
  )
  fireEvent.change(screen.getByLabelText('Title (optional)'), { target: { value: 'The garden' } })
  fireEvent.change(screen.getByLabelText('Your story'), { target: { value: 'My first memory.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Story' }))
  expect(await screen.findByRole('button', { name: 'Edit The garden' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit The garden' }))
  expect(screen.getByLabelText('Your story')).toHaveValue('My first memory.')
  fireEvent.change(screen.getByLabelText('Your story'), {
    target: { value: 'My corrected memory.' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(screen.getByText('My corrected memory.')).toBeInTheDocument())
  expect(authFetch).toHaveBeenCalledWith(
    '/api/free-stories/1',
    expect.objectContaining({ method: 'PUT' })
  )
})

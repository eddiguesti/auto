import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import PreviewStyle from '../PreviewStyle'

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 }, authFetch }) }))
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
})
function setup({ completed = false, conflicts = [] } = {}) {
  authFetch.mockImplementation(async path => {
    if (path === '/api/stories/all')
      return json([
        {
          id: 1,
          chapter_id: 'earliest-memories',
          question_id: 'first-memory',
          answer: completed ? 'Styled garden memory.' : 'My garden memory.'
        }
      ])
    if (path === '/api/style/preferences') return json({ tones: ['formal'] })
    if (path === '/api/style/apply-all') return json({ jobId: 'style-job', status: 'queued' }, 202)
    if (path === '/api/style/jobs/style-job') {
      completed = true
      return json({ status: 'completed', transformedCount: 1, totalStories: 2, errors: conflicts })
    }
    throw new Error(`Unexpected request: ${path}`)
  })
}
function view() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <PreviewStyle />
      </MemoryRouter>
    </StrictMode>
  )
}

it('waits for a queued style job, refreshes saved stories and surfaces preserved-source conflicts', async () => {
  setup({ conflicts: [{ storyId: 2, error: 'SOURCE_CHANGED' }] })
  view()
  const button = await screen.findByRole('button', { name: 'Apply Style to All Stories' })
  fireEvent.click(button)
  await screen.findByText('Styled garden memory.')
  expect(screen.getByText(/1 memories changed while the style was being applied/)).toBeTruthy()
  expect(sessionStorage.getItem('memoir-style-job:1')).toBeNull()
  const request = authFetch.mock.calls.find(([path]) => path === '/api/style/apply-all')
  expect(request[1].headers['Idempotency-Key']).toMatch(/^[a-f0-9-]{36}$/)
})

it('resumes the owner saved style job after remount without enqueueing or paying again', async () => {
  sessionStorage.setItem('memoir-style-job:1', 'style-job')
  setup()
  view()
  await screen.findByText('Styled garden memory.')
  await waitFor(() => expect(sessionStorage.getItem('memoir-style-job:1')).toBeNull())
  expect(authFetch.mock.calls.some(([path]) => path === '/api/style/apply-all')).toBe(false)
})

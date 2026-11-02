import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ChapterReview from '../ChapterReview'
const { authFetch, isChapterLocked } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  isChapterLocked: () => false
}))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 }, authFetch }) }))
vi.mock('../../../hooks/usePremium', () => ({ usePremium: () => ({ isChapterLocked }) }))
vi.mock('../../../components/Toast', () => ({ useToast: () => ({ error: vi.fn() }) }))
const json = value =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})
it('flushes polished edits before returning to questions and exposes the existing mobile Clio assistant', async () => {
  authFetch.mockImplementation((_path, options) =>
    Promise.resolve(
      json(
        options?.method === 'PUT'
          ? { success: true }
          : { review: { polishedText: 'The original chapter.' }, answeredCount: 3 }
      )
    )
  )
  render(
    <MemoryRouter initialEntries={['/chapter/earliest-memories/review']}>
      <Routes>
        <Route path="/chapter/:chapterId/review" element={<ChapterReview />} />
        <Route path="/chapter/:chapterId" element={<p>Questions loaded</p>} />
      </Routes>
    </MemoryRouter>
  )
  const editor = await screen.findByPlaceholderText('Your polished chapter will appear here...')
  expect(screen.getByRole('region', { name: 'Clio editing assistant' })).toBeInTheDocument()
  fireEvent.change(editor, { target: { value: 'My final corrected chapter.' } })
  fireEvent.click(screen.getByRole('link', { name: 'Back to Questions' }))
  await screen.findByText('Questions loaded')
  expect(authFetch).toHaveBeenCalledWith(
    '/api/chapter-review/earliest-memories/save',
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ polishedText: 'My final corrected chapter.' })
    })
  )
  expect(sessionStorage.getItem('memoir-draft:1:review:earliest-memories')).toBeNull()
})

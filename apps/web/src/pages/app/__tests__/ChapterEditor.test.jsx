import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import Chapter from '../Chapter'
const { authFetch, isChapterLocked } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  isChapterLocked: () => false
}))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 }, authFetch }) }))
vi.mock('../../../hooks/usePremium', () => ({
  usePremium: () => ({ isPremium: true, isChapterLocked })
}))
vi.mock('../../../features/memoir/hooks/useChapterAI', () => ({
  useChapterAI: () => ({ showAI: false })
}))
vi.mock('../../../data/chapters', () => ({
  chapters: [
    {
      id: 'long',
      title: 'Long chapter',
      questions: [
        { id: 'q1', question: 'First?' },
        { id: 'q2', question: 'Second?' },
        { id: 'q3', question: 'Third?' }
      ]
    },
    { id: 'short', title: 'Short chapter', questions: [{ id: 's1', question: 'Short first?' }] }
  ]
}))
vi.mock('../../../components/QuestionCard', () => ({
  default: ({ answer, onAnswerChange, question }) => (
    <label>
      {question.question}
      <textarea aria-label="Answer" value={answer} onChange={e => onAnswerChange(e.target.value)} />
    </label>
  )
}))
vi.mock('../../../components/ChapterIllustration', () => ({ default: () => null }))
vi.mock('../../../components/UpgradeModal', () => ({ default: () => null }))
const json = value =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
function view() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/chapter/long']}>
        <Routes>
          <Route path="/chapter/:chapterId" element={<Chapter />} />
          <Route
            path="/home"
            element={
              <>
                <p>Contents</p>
                <Link to="/chapter/long">Reopen chapter</Link>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return client
}
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
  authFetch.mockImplementation(path =>
    Promise.resolve(json(path.startsWith('/api/stories/') ? [] : {}))
  )
})
describe('chapter editor', () => {
  it('opens the next shorter chapter at its first question instead of retaining an invalid index', async () => {
    view()
    await screen.findByRole('textbox', { name: 'Answer' })
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    expect(screen.getByText('Third?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Next Chapter/ }))
    expect(await screen.findByText('Short first?')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 1')).toBeInTheDocument()
  })
  it('saves before leaving and displays the newly saved text when reopening within cache freshness', async () => {
    authFetch.mockImplementation((path, options) =>
      Promise.resolve(
        json(options?.method === 'POST' ? { id: 9 } : path.startsWith('/api/stories/') ? [] : {})
      )
    )
    view()
    fireEvent.change(await screen.findByRole('textbox', { name: 'Answer' }), {
      target: { value: 'A newly saved memory' }
    })
    fireEvent.click(screen.getByRole('link', { name: /Return to Contents/ }))
    await screen.findByText('Contents')
    expect(authFetch).toHaveBeenCalledWith(
      '/api/stories',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('A newly saved memory')
      })
    )
    fireEvent.click(screen.getByRole('link', { name: 'Reopen chapter' }))
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('A newly saved memory')
    )
  })
})

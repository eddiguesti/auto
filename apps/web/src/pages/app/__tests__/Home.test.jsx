import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { chapters } from '../../../data/chapters'
import Home from '../Home'

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  authFetch: vi.fn(async () => ({ ok: true, json: async () => ({ completed: true }) })),
  refreshUser: vi.fn(),
  isPremium: true,
  query: {}
}))
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'local-fixture', name: 'Alex Example', email_verified: true },
    authFetch: mocks.authFetch,
    refreshUser: mocks.refreshUser
  })
}))
vi.mock('../../../hooks/usePremium', () => ({
  usePremium: () => ({
    isPremium: mocks.isPremium,
    isChapterLocked: id => !mocks.isPremium && id !== 'earliest-memories'
  })
}))
vi.mock('../../../features/memoir/queries/storyQueries', () => ({
  useDashboardProgress: () => ({ refetch: mocks.refetch, ...mocks.query })
}))
vi.mock('../../../components/EmailVerificationBanner', () => ({ default: () => null }))

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.query = { data: {}, isLoading: false, error: null, isFetching: false }
  mocks.isPremium = true
  window.history.replaceState({}, '', '/home')
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

describe('memoir dashboard states', () => {
  it('starts a free account in the available chapter instead of sending typing into a paywall', () => {
    mocks.isPremium = false
    renderHome()
    expect(screen.getByRole('link', { name: /start with a memory/i })).toHaveAttribute(
      'href',
      '/voice?chapter=earliest-memories'
    )
    expect(screen.getByRole('link', { name: /write instead/i })).toHaveAttribute(
      'href',
      '/chapter/earliest-memories'
    )
  })
  it('offers a small first memory and retains every capture route', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /start with a memory/i })).toHaveAttribute(
      'href',
      `/voice?chapter=${chapters[0].id}`
    )
    expect(screen.getByRole('link', { name: /write instead/i })).toHaveAttribute(
      'href',
      `/chapter/${chapters[0].id}`
    )
    expect(screen.getByRole('link', { name: /add a photograph/i })).toHaveAttribute(
      'href',
      '/photo'
    )
    expect(screen.getByRole('link', { name: /phone call/i })).toHaveAttribute('href', '/call-me')
    expect(screen.getByRole('link', { name: /a quick memory/i })).toHaveAttribute(
      'href',
      '/quick-story'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows a recoverable load failure instead of pretending the story is empty', () => {
    mocks.query.error = new Error('Server unavailable')
    renderHome()
    expect(screen.getByRole('alert')).toHaveTextContent('could not load your saved progress')
    expect(screen.queryByRole('link', { name: /start with a memory/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })

  it('keeps a loading state distinct from a new memoir and offers review when finished', () => {
    mocks.query.isLoading = true
    const { unmount } = renderHome()
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading your story')
    expect(screen.queryByRole('progressbar')).toBeNull()
    unmount()
    mocks.query = {
      ...mocks.query,
      isLoading: false,
      data: Object.fromEntries(chapters.map(chapter => [chapter.id, chapter.questions.length]))
    }
    renderHome()
    expect(screen.getByRole('link', { name: /review your chapters/i })).toHaveAttribute(
      'href',
      `/chapter/${chapters[0].id}`
    )
    expect(screen.queryByRole('link', { name: /continue your story/i })).toBeNull()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      screen.getByRole('progressbar').getAttribute('aria-valuemax')
    )
  })
})

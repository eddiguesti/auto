import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSaveStory } from '../../features/memoir/queries/storyMutations'
import { usePremiumStatus } from '../../features/payments/queries/paymentQueries'
import MemoryMap from '../../components/MemoryMap'

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ authFetch }) }))

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
const reply = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'Content-Type': 'application/json' }),
  text: async () => JSON.stringify(body)
})
beforeEach(() => {
  authFetch.mockReset()
})

describe('API request contracts', () => {
  it('saves an answer to the canonical route with source field names and optional chapter total', async () => {
    authFetch.mockResolvedValue(reply({ success: true, id: 42 }))
    const { result } = renderHook(() => useSaveStory(), { wrapper: wrapper() })
    await act(async () => {
      const saved = await result.current.mutateAsync({
        chapterId: 'childhood',
        questionId: 'school',
        answer: 'A memory',
        totalQuestions: 6
      })
      expect(saved.id).toBe(42)
    })
    expect(authFetch).toHaveBeenCalledWith(
      '/api/stories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chapter_id: 'childhood',
          question_id: 'school',
          answer: 'A memory',
          total_questions: 6
        })
      })
    )
  })

  it('reads premium entitlement from the verified user without inventing a subscription plan', async () => {
    authFetch.mockResolvedValue(
      reply({ user: { id: 1, isPremium: true, premium_until: '2027-01-01T00:00:00.000Z' } })
    )
    const { result } = renderHook(() => usePremiumStatus(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(authFetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.current.data).toEqual({ isPremium: true, expiresAt: '2027-01-01T00:00:00.000Z' })
    expect(result.current.data).not.toHaveProperty('plan')
  })

  it('keeps an unavailable entitlement check as an error instead of claiming a free or paid plan', async () => {
    authFetch.mockResolvedValue(reply({ error: 'Service unavailable' }, 503))
    const { result } = renderHook(() => usePremiumStatus(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('renders source entity responses for people and places', async () => {
    authFetch.mockImplementation(path =>
      Promise.resolve(
        reply({
          entities: [
            {
              id: path.endsWith('person') ? 1 : 2,
              name: path.endsWith('person') ? 'Aunt Ada' : 'York',
              mention_count: 3
            }
          ]
        })
      )
    )
    render(<MemoryMap />)
    expect(await screen.findByText('Aunt Ada')).toBeInTheDocument()
    expect(screen.getByText('York')).toBeInTheDocument()
    expect(authFetch).toHaveBeenCalledWith('/api/memory/entities/person', expect.any(Object))
    expect(authFetch).toHaveBeenCalledWith('/api/memory/entities/place', expect.any(Object))
  })

  it('shows and retries a memory service failure without presenting an empty map', async () => {
    authFetch.mockResolvedValue(reply({ error: 'Memory service unavailable' }, 503))
    render(<MemoryMap />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Memory service unavailable')
    expect(screen.queryByText(/As you write memories/)).not.toBeInTheDocument()
    authFetch.mockResolvedValue(reply({ entities: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/As you write memories/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

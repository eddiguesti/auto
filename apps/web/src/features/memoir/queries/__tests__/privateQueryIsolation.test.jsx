import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { useChapterStories } from '../storyQueries'
const state = vi.hoisted(() => ({ user: { id: 1 }, authFetch: vi.fn() }))
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: state.user, authFetch: state.authFetch })
}))
it("never supplies the previous account's fresh chapter cache to the next account", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 300000 } }
  })
  state.authFetch.mockImplementation(
    async () =>
      new Response(JSON.stringify([{ answer: `Private story for account ${state.user.id}` }]), {
        headers: { 'content-type': 'application/json' }
      })
  )
  const { result, rerender } = renderHook(() => useChapterStories('childhood'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  })
  await waitFor(() => expect(result.current.data?.[0].answer).toBe('Private story for account 1'))
  act(() => {
    state.user = { id: 2 }
    rerender()
  })
  expect(result.current.data?.[0].answer).not.toBe('Private story for account 1')
  await waitFor(() => expect(result.current.data?.[0].answer).toBe('Private story for account 2'))
  expect(state.authFetch).toHaveBeenCalledTimes(2)
})

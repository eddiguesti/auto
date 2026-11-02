import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useVoiceSession } from '../useVoiceSession'
const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authFetch, user: { id: 1 }, token: 'saved-token' })
}))
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ getPaceSettings: () => ({}), getVoice: () => 'Ara' })
}))
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
const key = 'memoir-draft:1:voice:childhood'
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
})
it('retains a recovered voice transcript after save failure and retries it before marking the interview ended', async () => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      history: [{ role: 'user', content: 'A precious voice memory.' }],
      sessionId: 42,
      questionIndex: 0
    })
  )
  let failed = true
  authFetch.mockImplementation(path =>
    Promise.resolve(
      path === '/api/voice/transcript'
        ? failed
          ? json({ error: 'offline' }, 503)
          : json({ questions_answered: ['q1'] })
        : json({})
    )
  )
  const { result } = renderHook(() =>
    useVoiceSession({
      chapter: { id: 'childhood', questions: [{ id: 'q1', question: 'Tell me?' }] }
    })
  )
  await act(async () => result.current.endConversation())
  expect(result.current.phase).not.toBe('ended')
  expect(result.current.error).toMatch(/kept in this tab/)
  expect(JSON.parse(sessionStorage.getItem(key)).history[0].content).toBe(
    'A precious voice memory.'
  )
  expect(authFetch.mock.calls.filter(([path]) => path === '/api/voice/end-session')).toHaveLength(0)
  failed = false
  await act(async () => result.current.endConversation())
  await waitFor(() => expect(result.current.phase).toBe('ended'))
  expect(sessionStorage.getItem(key)).toBeNull()
  expect(authFetch).toHaveBeenCalledWith(
    '/api/voice/transcript',
    expect.objectContaining({ body: expect.stringContaining('A precious voice memory.') })
  )
})

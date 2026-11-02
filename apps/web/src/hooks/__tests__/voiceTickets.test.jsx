import { act, render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { useVoiceSession } from '../useVoiceSession'
import TourOverlay from '../../components/TourOverlay'
import OnboardingVoiceInterview from '../../components/onboarding/OnboardingVoiceInterview'
import { voiceSocketUrl } from '../../lib/voiceSocket'

const { authFetch, sockets } = vi.hoisted(() => ({ authFetch: vi.fn(), sockets: [] }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authFetch, user: { id: 1 }, token: 'account-bearer-must-not-be-in-url' })
}))
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ getPaceSettings: () => ({}), getVoice: () => 'Ara' })
}))
const json = body =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
const chapter = {
  id: 'earliest-memories',
  questions: [{ id: 'first-memory', question: 'Tell me?' }]
}
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  sessionStorage.clear()
  sockets.length = 0
  authFetch.mockReset()
  authFetch.mockImplementation(path =>
    Promise.resolve(
      json(path === '/api/voice/session' ? { session_id: 42, ticket: 'short/ticket?+&=' } : {})
    )
  )
  class Socket {
    static OPEN = 1
    static CLOSED = 3
    constructor(url) {
      this.url = url
      this.readyState = 0
      sockets.push(this)
    }
    close() {
      this.readyState = 3
    }
    send() {}
  }
  vi.stubGlobal('WebSocket', Socket)
  class AudioContext {
    constructor() {
      this.state = 'running'
    }
    async resume() {}
    async close() {
      this.state = 'closed'
    }
  }
  vi.stubGlobal('AudioContext', AudioContext)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('uses the returned opaque ticket for the main voice session and never places the account JWT in its URL', async () => {
  const { result } = renderHook(() => useVoiceSession({ chapter }))
  await act(async () => result.current.startConversation())
  expect(sockets).toHaveLength(1)
  const url = new URL(sockets[0].url)
  expect(url.searchParams.get('ticket')).toBe('short/ticket?+&=')
  expect(url.searchParams.has('token')).toBe(false)
  expect(url.toString()).not.toContain('account-bearer')
  expect(authFetch).toHaveBeenCalledWith(
    '/api/voice/session',
    expect.objectContaining({ body: JSON.stringify({ chapterId: 'earliest-memories' }) })
  )
})

it('refuses a voice response with no connection ticket instead of falling back to an account JWT', async () => {
  authFetch.mockImplementation(() => Promise.resolve(json({ session_id: 42 })))
  const { result } = renderHook(() => useVoiceSession({ chapter }))
  await act(async () => result.current.startConversation())
  expect(sockets).toHaveLength(0)
  expect(result.current.error).toContain('ticket')
})

it('requests a valid native chapter session for the tour before opening its ticket WebSocket', async () => {
  vi.useFakeTimers()
  render(<TourOverlay onComplete={() => {}} onSkip={() => {}} />)
  await act(async () => vi.advanceTimersByTimeAsync(650))
  expect(authFetch).toHaveBeenCalledWith(
    '/api/voice/session',
    expect.objectContaining({ body: JSON.stringify({ chapterId: 'earliest-memories' }) })
  )
  expect(new URL(sockets[0].url).searchParams.get('ticket')).toBe('short/ticket?+&=')
})

it('mints an onboarding session ticket before connecting and encodes demo tickets safely', async () => {
  class AudioContext {
    constructor() {
      this.state = 'running'
    }
    async resume() {}
    async close() {
      this.state = 'closed'
    }
  }
  vi.stubGlobal('AudioContext', AudioContext)
  const original = navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => Promise.reject(new Error('Test microphone unavailable')) }
  })
  try {
    render(<OnboardingVoiceInterview onComplete={() => {}} onBack={() => {}} />)
    await waitFor(() => expect(sockets).toHaveLength(1))
    expect(authFetch).toHaveBeenCalledWith(
      '/api/voice/session',
      expect.objectContaining({ body: JSON.stringify({ chapterId: 'earliest-memories' }) })
    )
    expect(new URL(sockets[0].url).searchParams.has('token')).toBe(false)
    const demo = new URL(voiceSocketUrl('demo?ticket&+', 'https://memoir.example'))
    expect(demo.protocol).toBe('wss:')
    expect(demo.searchParams.get('ticket')).toBe('demo?ticket&+')
  } finally {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original })
  }
})

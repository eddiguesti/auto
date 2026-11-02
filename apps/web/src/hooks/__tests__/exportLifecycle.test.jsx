import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useExport } from '../useExport'
const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ authFetch, user: { id: 1 } }) }))
const json = value =>
  new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  sessionStorage.clear()
  authFetch.mockReset()
})
it('fetches entitlements under StrictMode and downloads completed job audio', async () => {
  let download
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(blob => {
      download = blob
      return 'blob:audio'
    })
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  authFetch.mockImplementation(path =>
    Promise.resolve(
      path.endsWith('/generate')
        ? json({ jobId: 'job-id' })
        : path.includes('/jobs/')
          ? json({ status: 'completed', filename: 'my.mp3' })
          : path.includes('/download/')
            ? new Response('real audio bytes', { headers: { 'content-type': 'audio/mpeg' } })
            : json({ canExport: true, canGenerate: true })
    )
  )
  const { result } = renderHook(() => useExport(), { wrapper: StrictMode })
  await waitFor(() => expect(result.current.audiobookStatus?.canGenerate).toBe(true))
  await act(async () => result.current.handleGenerateAudiobook())
  expect(download.type).toBe('audio/mpeg')
  expect(await download.text()).toBe('real audio bytes')
  expect(sessionStorage.getItem('memoir-audiobook-job:1')).toBeNull()
})

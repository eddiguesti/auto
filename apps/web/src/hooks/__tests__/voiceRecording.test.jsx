import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useVoiceRecording } from '../useVoiceRecording'
afterEach(() => vi.unstubAllGlobals())
it('preserves real browser audio format and delivers recording after StrictMode replay', async () => {
  const stop = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) }
  })
  class Recorder {
    mimeType = 'audio/webm;codecs=opus'
    state = 'inactive'
    start() {
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      this.ondataavailable({ data: new Blob(['webm'], { type: this.mimeType }) })
      this.onstop()
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder)
  const completed = vi.fn()
  const { result } = renderHook(() => useVoiceRecording({ onRecordingComplete: completed }), {
    wrapper: StrictMode
  })
  await act(async () => result.current.startRecording())
  act(() => result.current.stopRecording())
  expect(result.current.recordedAudio.type).toBe('audio/webm;codecs=opus')
  expect(completed).toHaveBeenCalledOnce()
  expect(stop).toHaveBeenCalledOnce()
})

// @vitest-environment node
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { describe, expect, it, vi } from 'vitest'

function mobileApi(fetch) {
  const source = readFileSync(
    new URL('../../../../mobile/src/services/api.ts', import.meta.url),
    'utf8'
  )
  const code = transformSync(source, { loader: 'ts', format: 'cjs' }).code
  const module = { exports: {} }
  const secureStore = {
    getItemAsync: vi.fn().mockResolvedValue('account-token'),
    setItemAsync: vi.fn(),
    deleteItemAsync: vi.fn()
  }
  class NativeFormData {
    entries = []
    append(...entry) {
      this.entries.push(entry)
    }
  }
  const require = name =>
    name === 'expo-secure-store'
      ? secureStore
      : { default: { getItem: vi.fn().mockResolvedValue(null) } }
  // Execute the actual TypeScript service with native storage/transport boundaries mocked.
  new Function(
    'require',
    'module',
    'exports',
    '__DEV__',
    'process',
    'fetch',
    'FormData',
    'URL',
    code
  )(
    require,
    module,
    module.exports,
    true,
    { env: { EXPO_PUBLIC_API_URL: 'http://192.168.1.50:3001/api/' } },
    fetch,
    NativeFormData,
    URL
  )
  return module.exports.default
}

describe('mobile audio contract', () => {
  it('uses the configured device URL, uploads once and returns the payload without a second data wrapper', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { audioUrl: '/api/voice/uploads/file-id', transcript: 'A memory.' }
      })
    })
    const api = mobileApi(fetch)
    expect(api.baseUrl).toBe('http://192.168.1.50:3001/api')
    expect(await api.uploadAudio('file:///recording.m4a')).toEqual({
      audioUrl: '/api/voice/uploads/file-id',
      transcript: 'A memory.'
    })
    expect(fetch).toHaveBeenCalledOnce()
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe('http://192.168.1.50:3001/api/voice/upload')
    expect(request.headers).toEqual({ Authorization: 'Bearer account-token' })
    expect(request.body.entries[0][0]).toBe('audio')
  })
  it('rejects failed uploads instead of treating an error body as successful audio', async () => {
    const api = mobileApi(
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Quota exceeded' }) })
    )
    await expect(api.uploadAudio('file:///recording.m4a')).rejects.toThrow('Quota exceeded')
  })
  it('authenticates private relative playback without sending credentials to third-party hosts', async () => {
    const api = mobileApi(vi.fn())
    expect(await api.audioSource('/api/voice/uploads/file-id')).toEqual({
      uri: 'http://192.168.1.50:3001/api/voice/uploads/file-id',
      headers: { Authorization: 'Bearer account-token' }
    })
    expect(await api.audioSource('https://media.example.test/audio.mp3')).toEqual({
      uri: 'https://media.example.test/audio.mp3'
    })
    expect(await api.audioSource('file:///recording.m4a')).toEqual({ uri: 'file:///recording.m4a' })
  })
})

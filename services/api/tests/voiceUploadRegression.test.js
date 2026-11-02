import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest'
import express from 'express'
import { Readable } from 'node:stream'
import { errorHandler } from '../middleware/errorHandler.js'
const state = vi.hoisted(() => ({
  query: vi.fn(),
  storage: { put: vi.fn(), get: vi.fn(), delete: vi.fn() }
}))
vi.mock('../utils/objectStorage.js', () => ({ objectStorage: state.storage }))
import router from '../routes/voiceUpload.js'
import { detectAudioType } from '../utils/mediaType.js'
let server, base
const httpFetch = globalThis.fetch
beforeAll(async () => {
  const app = express()
  app.locals.db = {
    query: state.query,
    connect: async () => ({ query: state.query, release() {} })
  }
  app.use((req, _res, next) => {
    req.user = { id: 7 }
    next()
  })
  app.use('/api/voice', router)
  app.use(errorHandler)
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await new Promise(resolve => server.close(resolve))
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GROK_API_KEY', 'test-provider-key')
  state.query.mockImplementation(async sql => ({
    rows: sql.includes('premium_until')
      ? [{ premium_until: '2099-01-01' }]
      : sql.includes('SELECT id FROM users')
        ? [{ id: 7 }]
        : []
  }))
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ text: 'My first memory', duration: 12.2 }), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
  )
})
function form(bytes = Buffer.from('RIFF1234WAVEdata')) {
  const f = new FormData()
  f.append('audio', new Blob([bytes], { type: 'application/octet-stream' }), 'arbitrary.bin')
  return f
}
it('uploads real-format bytes, transcribes with bounded request, and persists a private owner record', async () => {
  const response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(201)
  const data = (await response.json()).data
  expect(data.transcript).toBe('My first memory')
  expect(data.audioUrl).toMatch(/^\/api\/voice\/uploads\/[a-f0-9-]{36}$/)
  expect(state.storage.put).toHaveBeenCalledWith(
    expect.stringMatching(/^recordings\/7\/.*\.wav$/),
    expect.any(Buffer),
    'audio/wav'
  )
  expect(globalThis.fetch).toHaveBeenCalledWith(
    'https://api.x.ai/v1/stt',
    expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) })
  )
  expect(state.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO voice_uploads'),
    expect.arrayContaining([7, 'audio/wav', 'My first memory', 13])
  )
})
it('rejects disguised non-audio bytes before contacting the provider', async () => {
  const response = await httpFetch(`${base}/api/voice/upload`, {
    method: 'POST',
    body: form(Buffer.from('<script>not audio</script>'))
  })
  expect(response.status).toBe(400)
  expect(globalThis.fetch).not.toHaveBeenCalled()
  expect(state.storage.put).not.toHaveBeenCalled()
})
it('does not claim success or persist a recording when transcription fails', async () => {
  globalThis.fetch.mockResolvedValue(new Response('unavailable', { status: 503 }))
  const response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(502)
  expect(state.storage.put).not.toHaveBeenCalled()
})
it('rolls back stored bytes if the ownership record cannot be saved', async () => {
  state.query.mockImplementation(async sql => {
    if (sql.includes('INSERT INTO voice_uploads')) throw new Error('database unavailable')
    return { rows: [{ premium_until: '2099-01-01' }] }
  })
  const response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(500)
  expect(state.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/^recordings\/7\//))
})
it('never serves another account recording and streams owned recordings without public caching', async () => {
  const id = '12345678-1234-1234-1234-123456789abc'
  let response = await httpFetch(`${base}/api/voice/uploads/${id}`)
  expect(response.status).toBe(404)
  expect(state.storage.get).not.toHaveBeenCalled()
  expect(state.query).toHaveBeenCalledWith(expect.stringContaining('AND user_id=$2'), [id, 7])
  state.query.mockResolvedValue({
    rows: [{ object_key: 'recordings/7/file.wav', content_type: 'audio/wav' }]
  })
  state.storage.get.mockResolvedValue({ body: Readable.from([Buffer.from('audio')]) })
  response = await httpFetch(`${base}/api/voice/uploads/${id}`)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.text()).toBe('audio')
})
it('accepts WebM doc type but not arbitrary EBML or a MIME relabel', () => {
  expect(
    detectAudioType(Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('webm')]))
  ).toEqual({ extension: 'webm', contentType: 'audio/webm' })
  expect(detectAudioType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]))).toBeNull()
})
it('does not consume free AI usage for invalid audio or missing provider configuration', async () => {
  state.query.mockImplementation(async sql => ({
    rows: sql.includes('premium_until') ? [{ premium_until: null }] : [{ id: 7 }]
  }))
  let response = await httpFetch(`${base}/api/voice/upload`, {
    method: 'POST',
    body: form(Buffer.from('not audio'))
  })
  expect(response.status).toBe(400)
  expect(state.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(false)
  vi.stubEnv('GROK_API_KEY', '')
  response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(500)
  expect(state.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ai_usage'))).toBe(false)
})
it('rejects malformed UUID paths before sending them to PostgreSQL', async () => {
  const response = await httpFetch(`${base}/api/voice/uploads/${'-'.repeat(36)}`)
  expect(response.status).toBe(404)
  expect(state.query).not.toHaveBeenCalled()
})
it('returns normalized duration and omits invalid provider durations', async () => {
  let response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect((await response.json()).data.duration).toBe(13)
  globalThis.fetch.mockResolvedValue(
    new Response(JSON.stringify({ text: 'My memory', duration: -1 }))
  )
  response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect((await response.json()).data).not.toHaveProperty('duration')
  expect(
    state.query.mock.calls
      .filter(([sql]) => sql.includes('INSERT INTO voice_uploads'))
      .at(-1)[1]
      .at(-1)
  ).toBeNull()
})
it('cleans up a partially written object when storage fails before returning success', async () => {
  state.storage.put.mockRejectedValue(new Error('Upload interrupted after writing bytes'))
  const response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(500)
  expect(state.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/^recordings\/7\//))
  expect(state.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true)
})
it('still erases uploaded bytes when the database connection also fails during rollback', async () => {
  state.query.mockImplementation(async sql => {
    if (sql.includes('INSERT INTO voice_uploads') || sql === 'ROLLBACK')
      throw new Error('connection lost')
    return { rows: [{ id: 7, premium_until: '2099-01-01' }] }
  })
  const response = await httpFetch(`${base}/api/voice/upload`, { method: 'POST', body: form() })
  expect(response.status).toBe(500)
  expect(state.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/^recordings\/7\//))
})

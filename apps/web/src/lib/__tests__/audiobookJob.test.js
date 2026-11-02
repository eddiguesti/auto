import { describe, expect, it, vi } from 'vitest'
import { waitForAudiobook } from '../audiobookJob'
const json = body =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
describe('queued audiobook download', () => {
  it('polls the job and downloads actual audio rather than the queue JSON', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ status: 'active' }))
      .mockResolvedValueOnce(json({ status: 'completed', filename: 'memoir.mp3' }))
      .mockResolvedValueOnce(
        new Response('MP3 bytes', { headers: { 'content-type': 'audio/mpeg' } })
      )
    const audio = await waitForAudiobook(fetch, 'job-1', { delayMs: 0 })
    expect(audio.type).toBe('audio/mpeg')
    expect(await audio.text()).toBe('MP3 bytes')
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      '/api/audiobook/jobs/job-1',
      '/api/audiobook/jobs/job-1',
      '/api/audiobook/download/memoir.mp3'
    ])
  })
  it('surfaces terminal failure and never offers a fake audio download', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ status: 'failed', error: 'Provider failed' }))
    await expect(waitForAudiobook(fetch, 'job-2')).rejects.toMatchObject({
      message: 'Provider failed',
      terminal: true
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects an HTML or JSON download even after job completion', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ status: 'completed', filename: 'memoir.mp3' }))
      .mockResolvedValueOnce(json({ error: 'wrong response' }))
    await expect(waitForAudiobook(fetch, 'job-3')).rejects.toThrow('Could not download')
  })
})

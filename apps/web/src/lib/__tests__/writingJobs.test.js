import { describe, expect, it, vi } from 'vitest'
import { waitForEpub, waitForStyle } from '../writingJobs'
const json = body =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

describe('durable writing jobs', () => {
  it('polls an EPUB job and downloads EPUB bytes after completion', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ status: 'active' }))
      .mockResolvedValueOnce(json({ status: 'completed', filename: 'my memoir.epub' }))
      .mockResolvedValueOnce(
        new Response('EPUB bytes', { headers: { 'content-type': 'application/epub+zip' } })
      )
    const blob = await waitForEpub(fetch, 'job-1', { delayMs: 0 })
    expect(await blob.text()).toBe('EPUB bytes')
    expect(fetch.mock.calls.map(row => row[0])).toEqual([
      '/api/export/jobs/job-1',
      '/api/export/jobs/job-1',
      '/api/export/download/my%20memoir.epub'
    ])
  })
  it('keeps provider ambiguity terminal and refuses JSON pretending to be a finished EPUB', async () => {
    await expect(
      waitForStyle(
        vi
          .fn()
          .mockResolvedValue(
            json({ status: 'needs_reconciliation', error: 'Could not confirm provider request' })
          ),
        'job'
      )
    ).rejects.toMatchObject({ terminal: true, message: 'Could not confirm provider request' })
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ status: 'completed', filename: 'memoir.epub' }))
      .mockResolvedValueOnce(json({ error: 'Unavailable' }))
    await expect(waitForEpub(fetch, 'job')).rejects.toThrow('Could not download')
  })
  it('reports checkpoint progress and preserves partial source conflicts on completion', async () => {
    const progress = vi.fn()
    const result = {
      status: 'completed',
      transformedCount: 3,
      totalStories: 4,
      errors: [{ storyId: 1, error: 'SOURCE_CHANGED' }]
    }
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ status: 'queued', transformedCount: 0, totalStories: 4 }))
      .mockResolvedValueOnce(json(result))
    await expect(waitForStyle(fetch, 'job', { delayMs: 0, onProgress: progress })).resolves.toEqual(
      result
    )
    expect(progress).toHaveBeenCalledTimes(2)
  })
  it('aborts polling without another request when the page is left', async () => {
    const controller = new AbortController()
    const fetch = vi.fn().mockResolvedValue(json({ status: 'queued' }))
    const pending = waitForStyle(fetch, 'job', {
      signal: controller.signal,
      delayMs: 10000,
      onProgress: () => controller.abort()
    })
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

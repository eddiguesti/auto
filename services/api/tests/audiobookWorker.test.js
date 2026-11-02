import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  storage: { put: vi.fn(), read: vi.fn() },
  books: { findVoiceSampleWithConsent: vi.fn(), saveAudiobook: vi.fn() },
  stories: { getSettings: vi.fn(), findWithContent: vi.fn() }
}))
vi.mock('../utils/objectStorage.js', () => ({ objectStorage: mocks.storage }))
vi.mock('../repositories/audiobookRepository.js', () => ({ audiobookRepository: mocks.books }))
vi.mock('../repositories/storyRepository.js', () => ({ storyRepository: mocks.stories }))
import { processAudiobookJobs } from '../jobs/audiobookWorker.js'
import { JOB } from '../jobs/jobNames.js'

let boss
let fetchMock
const createDb = () => {
  const db = {
    query: vi.fn(async sql => ({ rows: sql.includes('FOR UPDATE') ? [{ id: 7 }] : [] })),
    release: vi.fn()
  }
  db.connect = vi.fn(async () => db)
  return db
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('FISH_AUDIO_API_KEY', 'test-only')
  fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
  vi.stubGlobal('fetch', fetchMock)
  boss = { complete: vi.fn(), fail: vi.fn() }
  mocks.stories.getSettings.mockResolvedValue({ name: 'Mary' })
  mocks.stories.findWithContent.mockResolvedValue([
    { chapter_id: 'earliest-memories', answer: 'A childhood memory.' }
  ])
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('durable audiobook generation', () => {
  it('stores output in R2 before recording and completing the job', async () => {
    const database = createDb()
    await processAudiobookJobs(
      [{ id: 'job-1', data: { userId: 7, useOwnVoice: false } }],
      boss,
      database
    )
    expect(boss.fail).not.toHaveBeenCalled()
    const filename = boss.complete.mock.calls[0][2].filename
    expect(mocks.storage.put).toHaveBeenCalledWith(
      `audiobooks/${filename}`,
      Buffer.from([1, 2, 3]),
      'audio/mpeg'
    )
    expect(mocks.books.saveAudiobook).toHaveBeenCalledWith(database, 7, filename, 'default')
    expect(mocks.storage.put.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.books.saveAudiobook.mock.invocationCallOrder[0]
    )
    expect(boss.complete).toHaveBeenCalledWith(JOB.AUDIOBOOK_GENERATE, 'job-1', { filename })
  })

  it('does not record a successful audiobook after an R2 write failure', async () => {
    mocks.storage.put.mockRejectedValue(new Error('R2 unavailable'))
    await processAudiobookJobs(
      [{ id: 'job-1', data: { userId: 7, useOwnVoice: false } }],
      boss,
      createDb()
    )
    expect(mocks.books.saveAudiobook).not.toHaveBeenCalled()
    expect(boss.complete).not.toHaveBeenCalled()
    expect(boss.fail).toHaveBeenCalledWith(JOB.AUDIOBOOK_GENERATE, 'job-1', {
      error: 'R2 unavailable'
    })
  })

  it('requires a consented sample when the user requests their own voice', async () => {
    mocks.books.findVoiceSampleWithConsent.mockResolvedValue(null)
    await processAudiobookJobs(
      [{ id: 'job-1', data: { userId: 7, useOwnVoice: true } }],
      boss,
      createDb()
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(boss.complete).not.toHaveBeenCalled()
    expect(boss.fail).toHaveBeenCalledWith(JOB.AUDIOBOOK_GENERATE, 'job-1', {
      error: 'Consented voice sample required'
    })
  })

  it('rejects an account deleted during provider generation before writing output', async () => {
    const db = createDb()
    db.query.mockResolvedValue({ rows: [] })
    await processAudiobookJobs([{ id: 'job-1', data: { userId: 7, useOwnVoice: false } }], boss, db)
    expect(mocks.storage.put).not.toHaveBeenCalled()
    expect(boss.complete).not.toHaveBeenCalled()
    expect(boss.fail).toHaveBeenCalledWith(JOB.AUDIOBOOK_GENERATE, 'job-1', {
      error: 'Account no longer exists'
    })
  })

  it('keeps a durable erasure marker when recording a generated file fails', async () => {
    const db = createDb()
    mocks.books.saveAudiobook.mockRejectedValue(new Error('Database unavailable'))
    await processAudiobookJobs([{ id: 'job-1', data: { userId: 7, useOwnVoice: false } }], boss, db)
    expect(
      db.query.mock.calls.some(call => call[0].includes('INSERT INTO media_deletion_jobs'))
    ).toBe(true)
    expect(
      db.query.mock.calls.some(call => call[0].includes('DELETE FROM media_deletion_jobs'))
    ).toBe(false)
    expect(boss.complete).not.toHaveBeenCalled()
  })

  it('passes the sample actual audio format to the voice provider', async () => {
    mocks.books.findVoiceSampleWithConsent.mockResolvedValue({
      fish_model_id: 'old_mislabeled_sample.wav'
    })
    mocks.storage.read.mockResolvedValue(Buffer.from('ID3audio'))
    await processAudiobookJobs(
      [{ id: 'job-1', data: { userId: 7, useOwnVoice: true } }],
      boss,
      createDb()
    )
    const audio = fetchMock.mock.calls[0][1].body.get('reference_audio')
    expect(audio.name).toBe('reference.mp3')
    expect(audio.type).toBe('audio/mpeg')
    expect(boss.fail).not.toHaveBeenCalled()
  })
})

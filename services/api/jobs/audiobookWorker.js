// @ts-check
/**
 * Audiobook job worker — handles the 'audiobook:generate' queue.
 *
 * Registered by services/worker/index.js via boss.work().
 * The API process only enqueues (boss.send()) and polls status.
 *
 * Job data: { userId, useOwnVoice }
 * Job output: { filename } — stored in pg-boss for status polling
 *
 * @typedef {import('../types/index.js').DbClient} DbClient
 */

import { randomUUID } from 'node:crypto'
import { objectStorage } from '../utils/objectStorage.js'
import { detectAudioType } from '../utils/mediaType.js'
import { resolveManuscript, manuscriptChapters } from '../services/manuscript.js'
import { audiobookRepository } from '../repositories/audiobookRepository.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { createLogger } from '../utils/logger.js'
import { JOB } from './jobNames.js'

const logger = createLogger('audiobook-worker')
const FISH_API_URL = 'https://api.fish.audio/v1'

/**
 * Process a batch of audiobook:generate jobs.
 * pg-boss v12 passes an array; batchSize defaults to 1.
 * Explicitly calls boss.complete() to store the filename in job output.
 *
 * @param {Array<import('pg-boss').Job<{userId: number, useOwnVoice: boolean}>>} jobs
 * @param {import('pg-boss').PgBoss} boss
 * @param {DbClient} db
 * @returns {Promise<void>}
 */
export async function processAudiobookJobs(jobs, boss, db) {
  for (const job of jobs) {
    try {
      const output = await _processOne(job, db)
      await boss.complete(JOB.AUDIOBOOK_GENERATE, job.id, output)
    } catch (err) {
      logger.error('Audiobook job failed', { jobId: job.id, error: err.message })
      await boss.fail(JOB.AUDIOBOOK_GENERATE, job.id, { error: err.message })
    }
  }
}

/**
 * @param {import('pg-boss').Job<{userId: number, useOwnVoice: boolean}>} job
 * @param {DbClient} db
 * @returns {Promise<{filename: string}>}
 */
async function _processOne(job, db) {
  const { userId, useOwnVoice } = job.data

  const apiKey = process.env.FISH_AUDIO_API_KEY
  if (!apiKey) {
    throw new Error('FISH_AUDIO_API_KEY not configured')
  }

  logger.info('Processing audiobook job', { jobId: job.id, userId })

  // Get user settings for name
  const settings = await storyRepository.getSettings(db, userId)
  const userName = settings?.name || 'My'

  // Get voice sample if using own voice
  let voiceSampleBuffer = null
  let voiceSampleType = null
  if (useOwnVoice) {
    const voiceModel = await audiobookRepository.findVoiceSampleWithConsent(db, userId)
    if (!voiceModel?.fish_model_id) throw new Error('Consented voice sample required')
    voiceSampleBuffer = await objectStorage.read(`voices/${voiceModel.fish_model_id}`)
    if (!voiceSampleBuffer) throw new Error('Voice sample file not found')
    voiceSampleType = detectAudioType(voiceSampleBuffer)
    if (!voiceSampleType) throw new Error('Voice sample format is invalid')
  }

  // Get all stories with content
  const storyRows = await resolveManuscript(
    db,
    userId,
    await storyRepository.findWithContent(db, userId)
  )
  if (storyRows.length === 0) {
    throw new Error('No stories to convert to audiobook')
  }

  // Organize stories by chapter
  /** @type {Record<string, string[]>} */
  const stories = {}
  storyRows.forEach(story => {
    if (!stories[story.chapter_id]) stories[story.chapter_id] = []
    stories[story.chapter_id].push(story.answer)
  })

  // Build full text for TTS
  let fullText = `${userName}'s Life Story. An Autobiography.\n\n`
  for (const chapter of manuscriptChapters(storyRows)) {
    const chapterStories = stories[chapter.id]
    if (!chapterStories || chapterStories.length === 0) continue
    fullText += `Chapter: ${chapter.title}. ${chapter.subtitle}.\n\n`
    for (const storyText of chapterStories) {
      fullText += storyText.trim() + '\n\n'
    }
  }
  fullText += `The End. Created with Easy Memoir.`

  // Call Fish.audio TTS API
  let audioResponse
  if (voiceSampleBuffer) {
    const formData = new FormData()
    formData.append('text', fullText)
    formData.append(
      'reference_audio',
      new Blob([voiceSampleBuffer], { type: voiceSampleType.contentType }),
      `reference.${voiceSampleType.extension}`
    )
    audioResponse = await fetch(`${FISH_API_URL}/tts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, model: 's1' },
      body: formData,
      signal: AbortSignal.timeout(120000)
    })
  } else {
    audioResponse = await fetch(`${FISH_API_URL}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's1'
      },
      body: JSON.stringify({ text: fullText, format: 'mp3' }),
      signal: AbortSignal.timeout(120000)
    })
  }

  if (!audioResponse.ok) {
    const errText = await audioResponse.text()
    logger.error('Fish.audio TTS failed', { jobId: job.id, status: audioResponse.status, errText })
    throw new Error('Fish.audio TTS request failed')
  }

  const audioBuffer = await audioResponse.arrayBuffer()

  const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `${userId}_${safeName}_Life_Story_${randomUUID()}.mp3`
  // Account deletion locks this same row before capturing media keys. The
  // result is either recorded before deletion's snapshot or never written.
  // Reserve erasure before the object write. A crash or DB failure after the
  // upload leaves a durable cleanup marker instead of an untracked private file.
  const objectKey = `audiobooks/${filename}`
  await db.query(
    "INSERT INTO media_deletion_jobs (object_key,next_attempt_at) VALUES ($1,NOW()+INTERVAL '1 hour') ON CONFLICT (object_key) DO NOTHING",
    [objectKey]
  )
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const owner = await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId])
    if (!owner.rows.length) throw new Error('Account no longer exists')
    await objectStorage.put(`audiobooks/${filename}`, Buffer.from(audioBuffer), 'audio/mpeg')
    await audiobookRepository.saveAudiobook(
      client,
      userId,
      filename,
      useOwnVoice ? 'custom' : 'default'
    )
    await client.query('INSERT INTO generated_exports (user_id, format) VALUES ($1, $2)', [
      userId,
      'audiobook'
    ])
    await client.query('DELETE FROM media_deletion_jobs WHERE object_key=$1', [objectKey])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  logger.info('Audiobook job complete', { jobId: job.id, filename })
  return { filename }
}

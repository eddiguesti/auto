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

import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chapters } from '@easy-memoir/shared/chapters'
import { audiobookRepository } from '../repositories/audiobookRepository.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { createLogger } from '../utils/logger.js'
import { JOB } from './jobNames.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  if (useOwnVoice) {
    const voiceModel = await audiobookRepository.findVoiceSampleWithConsent(db, userId)
    if (voiceModel?.fish_model_id) {
      const voicePath = join(
        __dirname,
        '..',
        '..',
        '..',
        'uploads',
        'voices',
        voiceModel.fish_model_id
      )
      if (existsSync(voicePath)) {
        voiceSampleBuffer = await readFile(voicePath)
      }
    }
  }

  // Get all stories with content
  const storyRows = await storyRepository.findWithContent(db, userId)
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
  for (const chapter of chapters) {
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
      new Blob([voiceSampleBuffer], { type: 'audio/wav' }),
      'reference.wav'
    )
    audioResponse = await fetch(`${FISH_API_URL}/tts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, model: 's1' },
      body: formData
    })
  } else {
    audioResponse = await fetch(`${FISH_API_URL}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's1'
      },
      body: JSON.stringify({ text: fullText, format: 'mp3' })
    })
  }

  if (!audioResponse.ok) {
    const errText = await audioResponse.text()
    logger.error('Fish.audio TTS failed', { jobId: job.id, status: audioResponse.status, errText })
    throw new Error('Fish.audio TTS request failed')
  }

  const audioBuffer = await audioResponse.arrayBuffer()

  // Save to uploads/audiobooks/
  const uploadsDir = join(__dirname, '..', '..', '..', 'uploads', 'audiobooks')
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `${safeName}_Life_Story_${Date.now()}.mp3`
  const filepath = join(uploadsDir, basename(filename))
  await writeFile(filepath, Buffer.from(audioBuffer))

  await audiobookRepository.saveAudiobook(db, userId, filename, useOwnVoice ? 'custom' : 'default')

  logger.info('Audiobook job complete', { jobId: job.id, filename })
  return { filename }
}

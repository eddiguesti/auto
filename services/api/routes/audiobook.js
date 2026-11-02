import { Router } from 'express'
import { pipeline } from 'node:stream/promises'
import { objectStorage, validateObjectKey } from '../utils/objectStorage.js'
import { detectAudioType } from '../utils/mediaType.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { audiobookUploadSchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'
import { ExternalServiceError } from '../utils/errors.js'
import { audiobookRepository } from '../repositories/audiobookRepository.js'
import { paymentRepository } from '../repositories/paymentRepository.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { getQueue } from '../jobs/queue.js'
import { JOB } from '../jobs/jobNames.js'
import { checkAIQuota } from '../middleware/aiQuota.js'
import { resolveManuscript } from '../services/manuscript.js'

const router = Router()
const logger = createLogger('audiobook')

// Email interview links do not grant access to voice samples or paid exports.
router.use((req, res, next) => {
  if (req.user?.scope) return res.status(403).json({ error: 'Full account access required' })
  next()
})

const FISH_API_URL = 'https://api.fish.audio/v1'

// Upload voice sample for cloning
router.post(
  '/voice-sample',
  requireDb,
  validate(audiobookUploadSchemas.voiceSample),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { audioData, consentGiven } = req.validatedBody

    if (!consentGiven) {
      return res.status(400).json({ error: 'Voice cloning requires explicit consent' })
    }

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data required' })
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64')

    // Size limit: reject files over 50MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (audioBuffer.length > MAX_SIZE) {
      return res
        .status(400)
        .json({ error: `Audio file too large (max ${MAX_SIZE / 1024 / 1024}MB)` })
    }

    // Magic byte validation — ensure this is actually an audio file
    const audioType = detectAudioType(audioBuffer)
    if (!audioType) {
      return res
        .status(400)
        .json({ error: 'Invalid audio format. Supported: WAV, MP3, OGG, FLAC, M4A' })
    }

    // Sanitize filename to prevent path traversal
    const safeUserId = String(userId).replace(/[^0-9]/g, '')
    const filename = `voice_${safeUserId}_${Date.now()}.${audioType.extension}`
    await objectStorage.put(`voices/${filename}`, audioBuffer, audioType.contentType)

    await audiobookRepository.saveVoiceSample(db, userId, filename, consentGiven)

    res.json({
      success: true,
      message: 'Voice sample saved successfully'
    })
  })
)

// Delete user's voice model
router.delete(
  '/voice-sample',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const voiceModel = await audiobookRepository.findVoiceSample(db, userId)
    if (voiceModel?.fish_model_id) {
      await objectStorage.delete(`voices/${voiceModel.fish_model_id}`)
    }
    await audiobookRepository.deleteVoiceSample(db, userId)

    res.json({ success: true, message: 'Voice model deleted' })
  })
)

// Get voice model status
router.get(
  '/voice-status',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const voiceModel = await audiobookRepository.findVoiceSample(db, userId)

    if (!voiceModel) {
      return res.json({ hasVoiceModel: false })
    }

    res.json({
      hasVoiceModel: true,
      consentGiven: voiceModel.consent_given,
      createdAt: voiceModel.created_at
    })
  })
)

// Enqueue an audiobook generation job.
// Returns 202 Accepted with { jobId } — client polls GET /jobs/:jobId for status.
router.post(
  '/generate',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { useOwnVoice } = req.body

    const [paid, earlyAdopter] = await Promise.all([
      paymentRepository.hasProductPayment(db, userId, 'audiobook'),
      paymentRepository.isEarlyAdopter(db, userId)
    ])
    if (!paid && !earlyAdopter) {
      return res
        .status(403)
        .json({ error: 'Payment required for audiobook', code: 'PAYMENT_REQUIRED' })
    }
    if (useOwnVoice && !(await audiobookRepository.findVoiceSampleWithConsent(db, userId))) {
      return res.status(400).json({ error: 'A consented voice sample is required' })
    }
    const storyRows = await resolveManuscript(
      db,
      userId,
      await storyRepository.findWithContent(db, userId)
    )
    if (!storyRows.some(row => row.answer?.trim())) {
      return res.status(400).json({ error: 'No stories to convert to audiobook' })
    }

    const boss = await getQueue()
    const client = await db.connect()
    let jobId
    try {
      await client.query('BEGIN')
      const owner = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])
      if (!owner.rows.length) {
        await client.query('ROLLBACK')
        return res.status(401).json({ error: 'Account unavailable' })
      }
      const usage = await client.query(
        `SELECT COUNT(*) AS daily, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes') AS recent
         FROM audiobook_generation_requests WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day'`,
        [userId]
      )
      if (Number(usage.rows[0].recent) > 0 || Number(usage.rows[0].daily) >= 3) {
        await client.query('ROLLBACK')
        return res.status(429).json({
          error: 'Please wait before generating another audiobook. Maximum three per day.'
        })
      }
      jobId = await boss.send(
        JOB.AUDIOBOOK_GENERATE,
        { userId, useOwnVoice: Boolean(useOwnVoice) },
        {
          retryLimit: 2,
          retryDelay: 60,
          expireInSeconds: 900,
          singletonKey: `audiobook:${userId}`,
          singletonSeconds: 900
        }
      )
      if (!jobId) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'An audiobook request is already queued' })
      }
      await client.query(
        'INSERT INTO audiobook_generation_requests (user_id, job_id) VALUES ($1, $2)',
        [userId, jobId]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    logger.info('Audiobook job enqueued', { jobId, userId, requestId: req.id })
    res.status(202).json({ jobId, message: 'Audiobook generation started' })
  })
)

// Poll status of a background job.
// Returns { status: 'created'|'active'|'completed'|'failed', filename? }
router.get(
  '/jobs/:jobId',
  requireDb,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params
    const userId = req.user.id

    const boss = await getQueue()
    const job = await boss.getJobById(JOB.AUDIOBOOK_GENERATE, jobId)

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Ensure job belongs to this user
    if (job.data?.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const response = { status: job.state }
    if (job.state === 'completed' && job.output?.filename) {
      response.filename = job.output.filename
    }
    if (job.state === 'failed') {
      response.error = 'Audiobook generation failed. Please try again.'
    }

    res.json(response)
  })
)

// Get audiobook generation status and history
router.get(
  '/status',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const [hasPaid, isEarlyAdopter, voiceModel, previousAudiobooks] = await Promise.all([
      paymentRepository.hasProductPayment(db, userId, 'audiobook'),
      paymentRepository.isEarlyAdopter(db, userId),
      audiobookRepository.findVoiceSample(db, userId),
      audiobookRepository.findRecentByUser(db, userId)
    ])

    res.json({
      canGenerate: hasPaid || isEarlyAdopter,
      isEarlyAdopter,
      hasPaid,
      hasVoiceModel: !!voiceModel?.fish_model_id,
      voiceConsentGiven: voiceModel?.consent_given || false,
      previousAudiobooks,
      audiobookPrice: 14.99
    })
  })
)

// Simple TTS for landing page (no auth required)
router.post(
  '/tts',
  checkAIQuota,
  asyncHandler(async (req, res) => {
    const { text } = req.body

    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'Text required (max 500 chars)' })
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY
    if (!apiKey) throw new Error('FISH_AUDIO_API_KEY not configured')

    const audioResponse = await fetch(`${FISH_API_URL}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's1'
      },
      body: JSON.stringify({
        text,
        format: 'mp3'
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!audioResponse.ok) {
      logger.error('Fish.audio TTS error', { requestId: req.id })
      throw new ExternalServiceError('Fish.audio')
    }

    const audioBuffer = await audioResponse.arrayBuffer()

    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(audioBuffer))
  })
)

// Download previous audiobook
router.get(
  '/download/:filename',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { filename } = req.params

    try {
      validateObjectKey(filename)
      if (filename.includes('/')) throw new TypeError('Invalid filename')
    } catch {
      return res.status(400).json({ error: 'Invalid filename' })
    }

    const audiobook = await audiobookRepository.findByFilenameForUser(db, userId, filename)

    if (!audiobook) {
      return res.status(404).json({ error: 'Audiobook not found' })
    }

    const audiobookFile = await objectStorage.get(`audiobooks/${filename}`)
    if (!audiobookFile) {
      return res.status(404).json({ error: 'Audiobook file not found' })
    }

    res.attachment(filename)
    res.type('audio/mpeg')
    res.set('Cache-Control', 'private, no-store')
    await pipeline(audiobookFile.body, res)
  })
)

export default router

import { Router } from 'express'
import { basename } from 'path'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { audiobookUploadSchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'
import { ExternalServiceError } from '../utils/errors.js'
import { audiobookRepository } from '../repositories/audiobookRepository.js'
import { paymentRepository } from '../repositories/paymentRepository.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { enqueueAudiobook, getAudiobookJob } from '../jobs/audiobookQueue.js'
import { r2Delete, r2GetBuffer, r2Upload } from '../utils/r2.js'
import { priceInPounds } from '@easy-memoir/shared/products'

const router = Router()
const logger = createLogger('audiobook')

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
    const isWav = audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF'
    const isMp3Id3 = audioBuffer.length >= 3 && audioBuffer.toString('ascii', 0, 3) === 'ID3'
    const isMp3Sync =
      audioBuffer.length >= 2 && audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0
    const isOgg = audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'OggS'
    const isFlac = audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'fLaC'
    const isM4a = audioBuffer.length >= 8 && audioBuffer.toString('ascii', 4, 8) === 'ftyp'

    if (!isWav && !isMp3Id3 && !isMp3Sync && !isOgg && !isFlac && !isM4a) {
      return res
        .status(400)
        .json({ error: 'Invalid audio format. Supported: WAV, MP3, OGG, FLAC, M4A' })
    }

    // Sanitize filename to prevent path traversal
    const safeUserId = String(userId).replace(/[^0-9]/g, '')
    const filename = `voice_${safeUserId}_${Date.now()}.wav`
    await r2Upload(`voices/${filename}`, audioBuffer, 'audio/wav')

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

    const filename = await audiobookRepository.deleteVoiceSample(db, userId)

    if (filename) {
      await r2Delete(`voices/${filename}`)
    }

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

    // Validate user has content before queuing (fail fast)
    const storyRows = await storyRepository.findWithContent(db, userId)
    if (storyRows.length === 0) {
      return res.status(400).json({ error: 'No stories to convert to audiobook' })
    }

    const jobId = await enqueueAudiobook(db, {
      userId,
      useOwnVoice: Boolean(useOwnVoice)
    })

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
    const db = req.app.locals.db
    const { jobId } = req.params
    const userId = req.user.id

    const job = await getAudiobookJob(db, jobId)

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
      audiobookPrice: priceInPounds('export_audiobook')
    })
  })
)

// Simple TTS for landing page (no auth required)
router.post(
  '/tts',
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
      })
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

    const audiobook = await audiobookRepository.findByFilenameForUser(db, userId, filename)

    if (!audiobook) {
      return res.status(404).json({ error: 'Audiobook not found' })
    }

    const stored = await r2GetBuffer(`audiobooks/${filename}`)
    if (stored) {
      res.setHeader('Content-Type', stored.contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${basename(filename)}"`)
      return res.send(stored.body)
    }

    return res.status(404).json({ error: 'Audiobook file not found' })
  })
)

export default router

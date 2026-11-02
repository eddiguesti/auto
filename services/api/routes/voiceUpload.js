import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { requireScope } from '../middleware/auth.js'
import { reserveAIUsage } from '../middleware/aiQuota.js'
import { objectStorage } from '../utils/objectStorage.js'
import { detectAudioType } from '../utils/mediaType.js'
import {
  ConfigurationError,
  ExternalServiceError,
  ValidationError,
  NotFoundError
} from '../utils/errors.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 3 }
})
router.post(
  '/upload',
  requireScope(),
  requireDb,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer.length) throw new ValidationError('Provide an audio recording.')
    const type = detectAudioType(req.file.buffer)
    if (!type) throw new ValidationError('Unsupported audio recording format.')
    if (!process.env.GROK_API_KEY) throw new ConfigurationError('GROK_API_KEY')
    const form = new FormData()
    form.append('model', 'grok-voice-transcribe-2.0')
    // xAI requires the file field last. Do not send the client-provided MIME type.
    form.append(
      'file',
      new Blob([req.file.buffer], { type: type.contentType }),
      `recording.${type.extension}`
    )
    await reserveAIUsage(req.app.locals.db, req.user.id)
    let result
    try {
      const response = await fetch('https://api.x.ai/v1/stt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROK_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(60000)
      })
      if (!response.ok) throw new Error('Transcription provider failed')
      result = await response.json()
      if (typeof result.text !== 'string' || result.text.length > 100000)
        throw new Error('Invalid transcription response')
    } catch {
      throw new ExternalServiceError('Audio transcription')
    }
    const duration =
      Number.isFinite(result.duration) && result.duration >= 0 && result.duration <= 36000
        ? Math.ceil(result.duration)
        : null
    const id = randomUUID(),
      key = `recordings/${req.user.id}/${id}.${type.extension}`
    const client = await req.app.locals.db.connect()
    let attemptedStore = false
    try {
      await client.query('BEGIN')
      // Account deletion locks this same row. Either it captures this recording,
      // or the deleted account cannot create a new private object afterwards.
      const owner = await client.query(
        'SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
        [req.user.id]
      )
      if (!owner.rows.length) throw new NotFoundError('Account')
      attemptedStore = true
      await objectStorage.put(key, req.file.buffer, type.contentType)
      await client.query(
        'INSERT INTO voice_uploads (id,user_id,object_key,content_type,transcript,duration) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, req.user.id, key, type.contentType, result.text, duration]
      )
      await client.query('COMMIT')
    } catch (error) {
      // A broken connection must not prevent compensating storage cleanup.
      await client.query('ROLLBACK').catch(() => {})
      if (attemptedStore) {
        try {
          await objectStorage.delete(key)
        } catch {
          // The erasure record is independent of user rows and survives deletion.
          await req.app.locals.db
            .query(
              'INSERT INTO media_deletion_jobs(object_key) VALUES($1) ON CONFLICT (object_key) DO NOTHING',
              [key]
            )
            .catch(() => {})
        }
      }
      throw error
    } finally {
      client.release()
    }
    res.status(201).json({
      success: true,
      data: {
        audioUrl: `/api/voice/uploads/${id}`,
        transcript: result.text,
        ...(duration !== null ? { duration } : {})
      }
    })
  })
)
router.get(
  '/uploads/:id',
  requireDb,
  asyncHandler(async (req, res) => {
    if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(req.params.id))
      throw new NotFoundError('Recording')
    const { rows } = await req.app.locals.db.query(
      'SELECT object_key,content_type FROM voice_uploads WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    )
    if (!rows[0]) throw new NotFoundError('Recording')
    const object = await objectStorage.get(rows[0].object_key)
    if (!object) throw new NotFoundError('Recording')
    res.setHeader('Content-Type', rows[0].content_type)
    res.setHeader('Cache-Control', 'private, no-store')
    await pipeline(object.body, res)
  })
)
export default router

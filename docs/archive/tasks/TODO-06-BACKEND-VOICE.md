# TODO-06: Backend Voice API

## Objective

Add backend endpoints for voice upload, storage, and transcription.

## Duration: 1-2 weeks

## Dependencies

- TODO-01 through TODO-05 (Mobile app foundation)

---

## Tasks

### Task 6.1: Install Backend Dependencies

```bash
cd /life-story/server
npm install multer @aws-sdk/client-s3 openai
```

- [ ] Install multer for file uploads
- [ ] Install AWS S3 SDK
- [ ] Install OpenAI SDK (for Whisper)

---

### Task 6.2: Configure S3 for Audio Storage

**Create:** `/life-story/server/services/s3.js`

```javascript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const BUCKET_NAME = process.env.S3_AUDIO_BUCKET || 'memory-quest-audio'

export async function uploadAudio(buffer, key, contentType = 'audio/m4a') {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  })

  await s3Client.send(command)
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
}

export async function getSignedAudioUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function deleteAudio(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  await s3Client.send(command)
}
```

- [ ] Create S3 service
- [ ] Configure AWS credentials in .env
- [ ] Create S3 bucket for audio

---

### Task 6.3: Create Whisper Transcription Service

**Create:** `/life-story/server/services/whisper.js`

```javascript
import OpenAI from 'openai'
import fs from 'fs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function transcribeAudio(audioPath, language = 'en') {
  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language,
      response_format: 'json'
    })

    return {
      transcript: response.text,
      success: true
    }
  } catch (error) {
    console.error('Whisper transcription error:', error)
    return {
      transcript: '',
      success: false,
      error: error.message
    }
  }
}

export async function transcribeAudioBuffer(buffer, filename = 'audio.m4a', language = 'en') {
  try {
    // Create a File-like object from buffer
    const file = new File([buffer], filename, { type: 'audio/m4a' })

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'json'
    })

    return {
      transcript: response.text,
      success: true
    }
  } catch (error) {
    console.error('Whisper transcription error:', error)
    return {
      transcript: '',
      success: false,
      error: error.message
    }
  }
}
```

- [ ] Create Whisper service
- [ ] Add OpenAI API key to .env
- [ ] Test transcription with sample audio

---

### Task 6.4: Create Voice Routes

**Create:** `/life-story/server/routes/voice.js` (or add to existing)

```javascript
import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { uploadAudio, getSignedAudioUrl, deleteAudio } from '../services/s3.js'
import { transcribeAudioBuffer } from '../services/whisper.js'
import pool from '../db/index.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticateToken)

/**
 * POST /api/voice/upload
 * Upload audio file and get URL
 */
router.post(
  '/upload',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' })
    }

    const key = `users/${userId}/audio/${Date.now()}.m4a`
    const audioUrl = await uploadAudio(file.buffer, key, file.mimetype)

    res.json({
      success: true,
      data: { audioUrl, key }
    })
  })
)

/**
 * POST /api/voice/transcribe
 * Upload audio and get transcription
 */
router.post(
  '/transcribe',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const file = req.file
    const { liveTranscript } = req.body

    if (!file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' })
    }

    // Try Whisper transcription
    const result = await transcribeAudioBuffer(file.buffer, file.originalname)

    if (result.success) {
      res.json({
        success: true,
        data: {
          transcript: result.transcript,
          source: 'whisper',
          confidence: 0.95
        }
      })
    } else {
      // Fallback to live transcript
      res.json({
        success: true,
        data: {
          transcript: liveTranscript || '',
          source: 'live',
          confidence: 0.8
        }
      })
    }
  })
)

/**
 * GET /api/voice/:promptId
 * Get signed URL for audio playback
 */
router.get(
  '/:promptId',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.params

    const result = await pool.query(
      `SELECT audio_url FROM daily_prompts
     WHERE id = $1 AND user_id = $2`,
      [promptId, userId]
    )

    if (!result.rows[0]?.audio_url) {
      return res.status(404).json({ success: false, message: 'Audio not found' })
    }

    // Extract key from URL and get signed URL
    const url = result.rows[0].audio_url
    const key = url.split('.amazonaws.com/')[1]
    const signedUrl = await getSignedAudioUrl(key)

    res.json({
      success: true,
      data: { audioUrl: signedUrl }
    })
  })
)

/**
 * DELETE /api/voice/:promptId
 * Delete audio recording
 */
router.delete(
  '/:promptId',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { promptId } = req.params

    const result = await pool.query(
      `SELECT audio_url FROM daily_prompts
     WHERE id = $1 AND user_id = $2`,
      [promptId, userId]
    )

    if (result.rows[0]?.audio_url) {
      const url = result.rows[0].audio_url
      const key = url.split('.amazonaws.com/')[1]
      await deleteAudio(key)

      await pool.query(`UPDATE daily_prompts SET audio_url = NULL WHERE id = $1`, [promptId])
    }

    res.json({ success: true })
  })
)

/**
 * GET /api/voice/status
 * Check if voice services are available
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        available: true,
        whisperEnabled: !!process.env.OPENAI_API_KEY,
        s3Enabled: !!process.env.AWS_ACCESS_KEY_ID
      }
    })
  })
)

export default router
```

- [ ] Create voice routes
- [ ] Register routes in index.js
- [ ] Test upload endpoint
- [ ] Test transcribe endpoint

---

### Task 6.5: Update Database Schema

```sql
-- Add audio columns to daily_prompts
ALTER TABLE daily_prompts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE daily_prompts ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE daily_prompts ADD COLUMN IF NOT EXISTS transcription_source VARCHAR(20);
-- 'voice' = from voice recording, 'typed' = from text input, 'whisper' = from Whisper API
```

- [ ] Add audio_url column
- [ ] Add audio_duration column
- [ ] Add transcription_source column

---

### Task 6.6: Update Prompt Complete Endpoint

**Modify:** `/life-story/server/routes/game.js`

Update the `POST /api/game/prompt/:id/complete` endpoint:

```javascript
router.post(
  '/prompt/:id/complete',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const promptId = req.params.id
    const { answer, audioUrl, audioDuration, transcriptionSource } = req.body

    // Update prompt with answer and audio info
    await pool.query(
      `UPDATE daily_prompts
     SET answer = $1,
         audio_url = $2,
         audio_duration = $3,
         transcription_source = $4,
         status = 'completed',
         completed_at = NOW(),
         word_count = $5
     WHERE id = $6 AND user_id = $7`,
      [
        answer,
        audioUrl || null,
        audioDuration || null,
        transcriptionSource || (audioUrl ? 'voice' : 'typed'),
        answer.split(/\s+/).filter(Boolean).length,
        promptId,
        userId
      ]
    )

    // ... rest of completion logic (streaks, achievements, etc)
  })
)
```

- [ ] Update complete endpoint to accept audio info
- [ ] Track transcription source
- [ ] Store audio duration

---

### Task 6.7: Add Environment Variables

Add to `.env`:

```
# AWS S3 for audio storage
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_AUDIO_BUCKET=memory-quest-audio

# OpenAI for Whisper transcription
OPENAI_API_KEY=your_openai_key
```

- [ ] Add AWS credentials
- [ ] Add OpenAI API key
- [ ] Test in development

---

## Verification Checklist

- [ ] Audio upload works
- [ ] Whisper transcription returns text
- [ ] Signed URLs work for playback
- [ ] Audio deletion works
- [ ] Database stores audio info
- [ ] Environment variables configured

---

## Next Step

When complete, proceed to **TODO-07-GAMIFICATION.md**

import { Router } from 'express'
import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chapters } from '../shared/chapters.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

const FISH_API_URL = 'https://api.fish.audio/v1'

// Get Fish.audio API key
const getFishApiKey = () => {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) {
    throw new Error('FISH_AUDIO_API_KEY not configured')
  }
  return key
}

// Upload voice sample for cloning
router.post('/voice-sample', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { audioData, consentGiven } = req.body

  if (!consentGiven) {
    return res.status(400).json({ error: 'Voice cloning requires explicit consent' })
  }

  if (!audioData) {
    return res.status(400).json({ error: 'Audio data required' })
  }

  // Decode base64 audio
  const audioBuffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64')

  // Save voice sample locally
  const voicesDir = join(__dirname, '..', '..', 'uploads', 'voices')
  if (!existsSync(voicesDir)) {
    await mkdir(voicesDir, { recursive: true })
  }

  const filename = `voice_${userId}_${Date.now()}.wav`
  const filepath = join(voicesDir, filename)
  await writeFile(filepath, audioBuffer)

  // Store reference in database
  await db.query(`
    INSERT INTO voice_models (user_id, fish_model_id, consent_given, created_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      fish_model_id = $2,
      consent_given = $3,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, filename, consentGiven])

  res.json({
    success: true,
    message: 'Voice sample saved successfully'
  })
}))

// Delete user's voice model
router.delete('/voice-sample', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Get existing model
  const result = await db.query(
    'SELECT fish_model_id FROM voice_models WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length > 0 && result.rows[0].fish_model_id) {
    // Delete local file
    const filepath = join(__dirname, '..', '..', 'uploads', 'voices', result.rows[0].fish_model_id)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  }

  // Remove from database
  await db.query('DELETE FROM voice_models WHERE user_id = $1', [userId])

  res.json({ success: true, message: 'Voice model deleted' })
}))

// Get voice model status
router.get('/voice-status', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  const result = await db.query(`
    SELECT fish_model_id, consent_given, created_at
    FROM voice_models
    WHERE user_id = $1
  `, [userId])

  if (result.rows.length === 0) {
    return res.json({ hasVoiceModel: false })
  }

  res.json({
    hasVoiceModel: true,
    consentGiven: result.rows[0].consent_given,
    createdAt: result.rows[0].created_at
  })
}))

// Generate audiobook
router.post('/generate', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { useOwnVoice } = req.body

  const apiKey = getFishApiKey()

    // Get user settings
    const settingsResult = await db.query('SELECT name FROM settings WHERE user_id = $1', [userId])
    const userName = settingsResult.rows[0]?.name || 'My'

    // Get voice sample if using own voice
    let voiceSampleBuffer = null
    if (useOwnVoice) {
      const voiceResult = await db.query(
        'SELECT fish_model_id FROM voice_models WHERE user_id = $1 AND consent_given = true',
        [userId]
      )
      if (voiceResult.rows.length > 0 && voiceResult.rows[0].fish_model_id) {
        const voicePath = join(__dirname, '..', '..', 'uploads', 'voices', voiceResult.rows[0].fish_model_id)
        if (existsSync(voicePath)) {
          voiceSampleBuffer = await readFile(voicePath)
        }
      }
    }

    // Get all stories
    const storiesResult = await db.query(`
      SELECT chapter_id, question_id, answer
      FROM stories
      WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
      ORDER BY chapter_id, question_id
    `, [userId])

    if (storiesResult.rows.length === 0) {
      return res.status(400).json({ error: 'No stories to convert to audiobook' })
    }

    // Organize stories by chapter
    const stories = {}
    storiesResult.rows.forEach(story => {
      if (!stories[story.chapter_id]) {
        stories[story.chapter_id] = []
      }
      stories[story.chapter_id].push(story.answer)
    })

    // Build the full text for TTS
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

    // Generate audio via Fish.audio API
    let audioResponse

    if (voiceSampleBuffer) {
      // Use reference audio for voice cloning
      const formData = new FormData()
      formData.append('text', fullText)
      formData.append('reference_audio', new Blob([voiceSampleBuffer], { type: 'audio/wav' }), 'reference.wav')

      audioResponse = await fetch(`${FISH_API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'model': 's1'
        },
        body: formData
      })
    } else {
      // Use default voice with JSON body
      audioResponse = await fetch(`${FISH_API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'model': 's1'
        },
        body: JSON.stringify({
          text: fullText,
          format: 'mp3'
        })
      })
    }

    if (!audioResponse.ok) {
      const error = await audioResponse.text()
      console.error('Fish.audio TTS error:', error)
      throw new Error('Failed to generate audiobook')
    }

    // Get the audio as buffer
    const audioBuffer = await audioResponse.arrayBuffer()

    // Save to uploads folder for download
    const uploadsDir = join(__dirname, '..', '..', 'uploads', 'audiobooks')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filename = `${userName.replace(/[^a-zA-Z0-9]/g, '_')}_Life_Story_${Date.now()}.mp3`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, Buffer.from(audioBuffer))

    // Store audiobook record
    await db.query(`
      INSERT INTO audiobooks (user_id, filename, voice_type, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [userId, filename, useOwnVoice ? 'custom' : 'default'])

  // Send the audio file
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(Buffer.from(audioBuffer))
}))

// Get audiobook generation status and history
router.get('/status', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Check if user has paid for audiobook
  const paymentResult = await db.query(`
    SELECT * FROM payments
    WHERE user_id = $1 AND product_type = 'audiobook' AND status = 'completed'
    ORDER BY created_at DESC LIMIT 1
  `, [userId])

    const hasPaid = paymentResult.rows.length > 0

    // Check early adopter status
    const earlyAdopterResult = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE id <= $1
    `, [userId])
    const isEarlyAdopter = parseInt(earlyAdopterResult.rows[0].count) <= 100

    // Get voice model status
    const voiceResult = await db.query(
      'SELECT fish_model_id, consent_given FROM voice_models WHERE user_id = $1',
      [userId]
    )

    // Get previous audiobooks
    const audiobooksResult = await db.query(`
      SELECT filename, voice_type, created_at
      FROM audiobooks
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId])

    res.json({
      canGenerate: hasPaid || isEarlyAdopter,
      isEarlyAdopter,
      hasPaid,
      hasVoiceModel: voiceResult.rows.length > 0 && voiceResult.rows[0].fish_model_id,
      voiceConsentGiven: voiceResult.rows[0]?.consent_given || false,
      previousAudiobooks: audiobooksResult.rows,
      audiobookPrice: 14.99
    })
  } catch (err) {
    console.error('Audiobook status error:', err)
    res.status(500).json({ error: 'Failed to check audiobook status' })
  }
})

// Download previous audiobook
router.get('/download/:filename', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { filename } = req.params

  try {
    // Verify ownership
    const result = await db.query(
      'SELECT filename FROM audiobooks WHERE user_id = $1 AND filename = $2',
      [userId, filename]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audiobook not found' })
    }

    const filepath = join(__dirname, '..', '..', 'uploads', 'audiobooks', filename)
    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'Audiobook file not found' })
    }

    res.download(filepath, filename)
  } catch (err) {
    console.error('Audiobook download error:', err)
    res.status(500).json({ error: 'Failed to download audiobook' })
  }
})

export default router

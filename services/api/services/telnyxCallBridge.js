import WebSocket from 'ws'
import { resample16kTo24k, resample24kTo16k } from './audioConverter.js'
import { compileTranscripts } from './transcriptService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('telnyx-bridge')

// Track all active bridges for cleanup
const activeBridges = new Map()

/**
 * TelnyxCallBridge - Bridges Telnyx phone audio ↔ xAI Realtime
 *
 * Audio flow:
 *   Telnyx (L16 16kHz) → resample to 24kHz → xAI Realtime (PCM16 24kHz)
 *   xAI Realtime (PCM16 24kHz) → resample to 16kHz → Telnyx (L16 16kHz)
 *
 * Transcript flow:
 *   xAI sends transcript events → accumulated here → saved to stories table on call end
 */
export class TelnyxCallBridge {
  constructor({ callId, userId, prompt, db }) {
    this.callId = callId
    this.userId = userId
    this.prompt = prompt // { text, chapter_id, question_id }
    this.db = db

    this.telnyxWs = null
    this.xaiWs = null
    this.streamId = null

    // Transcript accumulation
    this.userTranscript = ''
    this.aiTranscript = ''
    this.currentAiChunk = ''

    this.closed = false
    this.startedAt = Date.now()

    activeBridges.set(callId, this)
    logger.info('Bridge created', { callId, userId })
  }

  /**
   * Accept the Telnyx media stream WebSocket and start the bridge
   */
  async start(telnyxWs) {
    this.telnyxWs = telnyxWs

    // Open xAI Realtime WebSocket
    try {
      await this.connectXai()
    } catch (err) {
      logger.error('Failed to connect to xAI', { callId: this.callId, error: err.message })
      this.cleanup()
      return
    }

    // Handle Telnyx WebSocket messages
    this.telnyxWs.on('message', data => {
      try {
        const msg = JSON.parse(data)
        this.handleTelnyxMessage(msg)
      } catch (err) {
        logger.error('Telnyx message parse error', { callId: this.callId, error: err.message })
      }
    })

    this.telnyxWs.on('close', () => {
      logger.info('Telnyx WebSocket closed', { callId: this.callId })
      this.handleCallEnd()
    })

    this.telnyxWs.on('error', err => {
      logger.error('Telnyx WebSocket error', { callId: this.callId, error: err.message })
    })
  }

  /**
   * Connect to xAI Realtime WebSocket
   */
  async connectXai() {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) throw new Error('GROK_API_KEY not configured')

    return new Promise((resolve, reject) => {
      this.xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', [
        'realtime',
        `openai-insecure-api-key.${apiKey}`
      ])

      const timeout = setTimeout(() => {
        reject(new Error('xAI connection timeout'))
        this.xaiWs.close()
      }, 10000)

      this.xaiWs.on('open', () => {
        clearTimeout(timeout)
        logger.info('xAI WebSocket connected', { callId: this.callId })

        // Configure session for phone call
        this.xaiWs.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: this.buildPhoneInstructions(),
              voice: 'Sage',
              temperature: 0.75,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.85,
                prefix_padding_ms: 2000,
                silence_duration_ms: 25000 // Very patient for phone (25s)
              }
            }
          })
        )

        // Ask xAI to greet the caller
        this.xaiWs.send(JSON.stringify({ type: 'response.create' }))

        resolve()
      })

      this.xaiWs.on('message', data => {
        try {
          const msg = JSON.parse(data)
          this.handleXaiMessage(msg)
        } catch (err) {
          logger.error('xAI message parse error', { callId: this.callId, error: err.message })
        }
      })

      this.xaiWs.on('close', () => {
        logger.info('xAI WebSocket closed', { callId: this.callId })
        if (!this.closed) this.handleCallEnd()
      })

      this.xaiWs.on('error', err => {
        clearTimeout(timeout)
        logger.error('xAI WebSocket error', { callId: this.callId, error: err.message })
        reject(err)
      })
    })
  }

  /**
   * Handle incoming Telnyx media stream messages
   */
  handleTelnyxMessage(msg) {
    switch (msg.event) {
      case 'connected':
        logger.info('Telnyx stream connected', { callId: this.callId })
        break

      case 'start':
        this.streamId = msg.stream_id
        logger.info('Telnyx stream started', {
          callId: this.callId,
          streamId: this.streamId,
          mediaFormat: msg.start?.media_format
        })
        break

      case 'media': {
        // Telnyx sends L16 16kHz audio as base64
        if (!this.xaiWs || this.xaiWs.readyState !== WebSocket.OPEN) return

        const audioBuffer = Buffer.from(msg.media.payload, 'base64')
        // Resample 16kHz → 24kHz for xAI
        const resampled = resample16kTo24k(audioBuffer)

        // Send to xAI as base64 PCM16 24kHz
        this.xaiWs.send(
          JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: resampled.toString('base64')
          })
        )
        break
      }

      case 'stop':
        logger.info('Telnyx stream stopped', { callId: this.callId })
        break
    }
  }

  /**
   * Handle incoming xAI Realtime messages
   */
  handleXaiMessage(msg) {
    switch (msg.type) {
      // AI response audio → send to Telnyx phone
      case 'response.audio.delta':
      case 'response.output_audio.delta': {
        if (!this.telnyxWs || this.telnyxWs.readyState !== WebSocket.OPEN) return
        if (!msg.delta) return

        const audioBuffer = Buffer.from(msg.delta, 'base64')
        // Resample 24kHz → 16kHz for Telnyx
        const resampled = resample24kTo16k(audioBuffer)

        // Send back to Telnyx
        this.telnyxWs.send(
          JSON.stringify({
            event: 'media',
            stream_id: this.streamId,
            media: {
              payload: resampled.toString('base64')
            }
          })
        )
        break
      }

      // AI transcript text (streaming)
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        if (msg.delta) this.currentAiChunk += msg.delta
        break

      // AI transcript complete
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (this.currentAiChunk) {
          this.aiTranscript += (this.aiTranscript ? '\n' : '') + 'Clio: ' + this.currentAiChunk
          this.currentAiChunk = ''
        }
        break

      // User's speech transcribed
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          this.userTranscript += (this.userTranscript ? '\n' : '') + msg.transcript
        }
        break

      case 'response.done':
        // Response complete, nothing to do
        break

      case 'error':
        logger.error('xAI error', { callId: this.callId, error: msg.error?.message })
        break
    }
  }

  /**
   * Build phone-optimised instructions for Clio
   */
  buildPhoneInstructions() {
    const topicIntro = this.prompt?.text
      ? `\n\nThis week's topic for them: "${this.prompt.text}"\nStart by greeting them warmly and introducing this topic.`
      : ''

    return `You're Clio from Easy Memoir, calling someone to help them record a chapter of their life story. This is a PHONE CALL — they picked up their phone to talk to you.

HOW TO BEHAVE ON THE PHONE:
- Start with: "Hello! This is Clio from Easy Memoir. Thanks for picking up — I'd love to hear a bit of your story today."
- Talk naturally, like a friendly person on the phone
- Keep your responses SHORT — 1-2 sentences max. Phone conversations need to flow.
- Give them plenty of time. Seniors may take longer to respond. Be patient.
- Ask ONE question at a time. Wait for the answer.

PHONE-SPECIFIC NOTES:
- They can't see anything — no visual cues. Use verbal encouragement like "Mm-hm", "Right", "I see" to show you're listening.
- If there's silence, wait at least 10 seconds before gently prompting
- If they seem confused, calmly explain you're the memoir service they signed up for
- Aim for about 10-15 minutes of conversation
- When wrapping up, say something like "That was lovely, thank you so much for sharing. We'll have this written up for you. Have a wonderful day!"

HOW TO INTERVIEW — CONTENT-DRIVEN DEPTH:
Your job is to gather content that's rich enough to write a vivid chapter of a memoir. Before you even think about moving on from a topic, mentally check whether you have ALL of the following:

1. THE FACTS: Who, what, where, when. (Names, places, dates, what happened.)
2. THE SENSORY DETAIL: What did it look, sound, smell, taste, feel like? Can a reader picture the scene?
3. THE EMOTION: How did they feel? What was the mood? Were they scared, proud, excited, sad?
4. THE STORY: Is there a specific moment or anecdote — not just a summary? A real scene with a beginning, middle, and end.
5. THE MEANING: Why does this matter to them? What did they learn? How did it shape who they are?

Start with a simple opener to get the topic going: "Where did you grow up?" "What was your mum's name?"
Then follow up based on what's MISSING from the checklist above:
- If you only have facts → ask for a specific memory or scene: "Can you tell me about a particular time...?"
- If you have the story but no sensory detail → "What did that place actually look like? Can you describe it?"
- If you have the scene but no emotion → "How did that make you feel at the time?"
- If you have all the detail but no meaning → "Looking back, what does that mean to you now?"

Keep pulling the thread. If they mention a person, find out about the relationship AND a specific memory with that person. If they mention a place, find out what happened there AND what it looked like.

WHEN TO MOVE ON:
- ONLY move on when you could hand your notes to an author and they'd have enough to write a rich, vivid passage. If you couldn't write a full paragraph of memoir from what you've gathered — you're not done yet.
- If their answers are still opening up new threads, KEEP GOING. Don't cut short a good story.
- If they give a short answer, that's not a signal to move on — it's a signal to ask a better follow-up.
- When a topic truly feels explored (you have facts + detail + emotion + story), transition naturally: "That's really helpful, thank you. Now tell me about..."

NEVER:
- Be fake or gushing
- Give long responses
- Ask multiple questions at once
- Rush them
- Move on because someone has answered several times — the number of responses is irrelevant, only the QUALITY and DEPTH of content matters
- Accept a surface-level answer and move on. Always dig deeper.${topicIntro}`
  }

  /**
   * Handle call ending — save transcripts and clean up
   */
  async handleCallEnd() {
    if (this.closed) return
    this.closed = true

    const duration = Math.floor((Date.now() - this.startedAt) / 1000)
    logger.info('Call ended', { callId: this.callId, userId: this.userId, duration })

    // Close xAI WebSocket if still open
    if (this.xaiWs && this.xaiWs.readyState === WebSocket.OPEN) {
      this.xaiWs.close()
    }

    // Save transcript if we have content
    if (this.userTranscript && this.db) {
      try {
        await this.saveTranscript(duration)
      } catch (err) {
        logger.error('Failed to save transcript', { callId: this.callId, error: err.message })
      }
    }

    // Update telnyx_calls record
    if (this.db) {
      try {
        await this.db.query(
          `UPDATE telnyx_calls
           SET call_status = 'completed', duration_seconds = $1, ended_at = NOW(), updated_at = NOW()
           WHERE call_control_id = $2`,
          [duration, this.callId]
        )
      } catch (err) {
        logger.error('Failed to update call record', { callId: this.callId, error: err.message })
      }
    }

    this.cleanup()
  }

  /**
   * Save the phone call transcript as a story entry
   */
  async saveTranscript(duration) {
    const chapterId = this.prompt?.chapter_id || 'phone-calls'
    const questionId = this.prompt?.question_id || `phone-${Date.now()}`

    // Create a voice session for this call
    const sessionResult = await this.db.query(
      `INSERT INTO voice_sessions (user_id, chapter_id, session_status, questions_answered)
       VALUES ($1, $2, 'completed', ARRAY[$3])
       RETURNING id`,
      [this.userId, chapterId, questionId]
    )
    const sessionId = sessionResult.rows[0].id

    // Build combined transcript
    const fullTranscript = this.userTranscript

    // Save as story
    await this.db.query(
      `INSERT INTO stories (user_id, chapter_id, question_id, answer, voice_session_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, chapter_id, question_id)
       DO UPDATE SET answer = $4, voice_session_id = $5, updated_at = CURRENT_TIMESTAMP`,
      [this.userId, chapterId, questionId, fullTranscript, sessionId]
    )

    // Mark call as transcript saved
    await this.db.query(
      `UPDATE telnyx_calls SET transcript_saved = true, updated_at = NOW() WHERE call_control_id = $1`,
      [this.callId]
    )

    logger.info('Transcript saved', {
      callId: this.callId,
      userId: this.userId,
      sessionId,
      transcriptLength: fullTranscript.length
    })

    // Compile transcript into polished prose (async, don't block)
    compileTranscripts(this.db, this.userId, sessionId, [questionId]).catch(err =>
      logger.error('Post-call compile failed', { callId: this.callId, error: err.message })
    )
  }

  /**
   * Clean up resources
   */
  cleanup() {
    activeBridges.delete(this.callId)

    if (this.telnyxWs) {
      try {
        this.telnyxWs.close()
      } catch {}
      this.telnyxWs = null
    }
    if (this.xaiWs) {
      try {
        this.xaiWs.close()
      } catch {}
      this.xaiWs = null
    }

    logger.info('Bridge cleaned up', { callId: this.callId })
  }
}

/**
 * Get an active bridge by call ID
 */
export function getBridge(callId) {
  return activeBridges.get(callId)
}

/**
 * Get count of active bridges
 */
export function getActiveBridgeCount() {
  return activeBridges.size
}

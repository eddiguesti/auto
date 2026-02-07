import { Router } from 'express'
import { getCompactMemoryContext, getMemoryContext } from '../utils/memoryContext.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'
import { grokChat } from '../services/grokService.js'
import { sanitizeForPrompt } from '../utils/security.js'
import { extractAndStoreEntities } from '../services/entityExtractionService.js'

const router = Router()
const logger = createLogger('voice')

// Helper: Get or create active voice session
async function getOrCreateSession(db, userId, chapterId) {
  // Check for existing active session
  const existing = await db.query(
    `SELECT * FROM voice_sessions
     WHERE user_id = $1 AND chapter_id = $2 AND session_status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId, chapterId]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0]
  }

  // Create new session
  const result = await db.query(
    `INSERT INTO voice_sessions (user_id, chapter_id, session_status)
     VALUES ($1, $2, 'active')
     RETURNING *`,
    [userId, chapterId]
  )

  return result.rows[0]
}

// Helper: Compile transcripts into polished book content
async function compileTranscripts(db, userId, sessionId, questionIds) {
  const memoryContext = await getMemoryContext(db, userId)

  for (const questionId of questionIds) {
    try {
      // Get raw transcript for this question
      const storyResult = await db.query(
        `SELECT id, answer, chapter_id FROM stories
         WHERE user_id = $1 AND voice_session_id = $2 AND question_id = $3
         AND compiled_content IS NULL`,
        [userId, sessionId, questionId]
      )

      if (!storyResult.rows[0]?.answer) continue

      const story = storyResult.rows[0]
      const safeAnswer = sanitizeForPrompt(story.answer, 5000)

      // Compile using AI
      const result = await grokChat({
        systemPrompt: `You are helping compile voice interview transcripts into polished memoir prose.

GUIDELINES:
1. Write in FIRST PERSON (I, me, my) - this is THEIR story
2. Keep their authentic voice and vocabulary - don't impose literary style
3. Organize the raw transcript into flowing narrative
4. Fill in natural transitions between thoughts
5. Keep it genuine - don't invent facts not mentioned
6. Aim for 150-300 words
7. Write ONLY the story - no meta-commentary or introductions

${memoryContext ? `Known context about their story: ${memoryContext}` : ''}`,
        userPrompt: `Raw voice transcript:\n\n${safeAnswer}\n\nPlease write the polished memoir passage.`,
        maxTokens: 600,
        temperature: 0.7
      })

      if (result.content) {
        // Save compiled content
        await db.query(
          `UPDATE stories
           SET compiled_content = $1, compiled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [result.content, story.id]
        )

        logger.info('Compiled transcript', { userId, sessionId, questionId })
      }
    } catch (err) {
      logger.error('Failed to compile transcript', {
        userId,
        sessionId,
        questionId,
        error: err.message
      })
    }
  }

  // Update session
  await db.query(
    `UPDATE voice_sessions
     SET questions_since_compile = 0, last_compile_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sessionId]
  )
}

// Generate ephemeral token for client-side WebSocket connection
// Also creates/resumes voice session in database
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const apiKey = process.env.GROK_API_KEY
    const db = req.app.locals.db
    const userId = req.user.id
    const { chapterId } = req.body

    if (!apiKey) {
      return res.status(500).json({ error: 'GROK_API_KEY not configured' })
    }

    // Create ephemeral token via xAI API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 } // 5 minute token
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      logger.error('xAI session error', { status: response.status, requestId: req.id })
      return res.status(response.status).json({ error: 'Failed to create voice session' })
    }

    const data = await response.json()

    // Get or create voice session if chapter provided
    let session = null
    if (db && chapterId) {
      try {
        session = await getOrCreateSession(db, userId, chapterId)
      } catch (err) {
        logger.error('Failed to create voice session', { userId, chapterId, error: err.message })
      }
    }

    res.json({
      ...data,
      session_id: session?.id,
      questions_answered: session?.questions_answered || [],
      current_question_id: session?.current_question_id
    })
  })
)

// Get voice configuration with memory context and session state
router.get(
  '/config',
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const chapterId = req.query.chapter
    const memoryContext = await getCompactMemoryContext(db, userId)

    // Fetch onboarding data to avoid re-asking questions already answered during signup
    let onboardingNote = ''
    if (db) {
      try {
        const obResult = await db.query(
          'SELECT birth_place, birth_country, birth_year FROM user_onboarding WHERE user_id = $1 AND onboarding_completed = true',
          [userId]
        )
        if (obResult.rows.length > 0) {
          const ob = obResult.rows[0]
          const parts = []
          if (ob.birth_place) parts.push(`born in ${ob.birth_place}`)
          if (ob.birth_country) parts.push(ob.birth_country)
          if (ob.birth_year) parts.push(`in ${ob.birth_year}`)
          if (parts.length > 0) {
            onboardingNote = `\n\nALREADY KNOWN FROM SIGNUP: The user is ${parts.join(', ')}. Do NOT re-ask where they were born or what year. Go straight to deeper questions.`
          }
        }
      } catch (err) {
        // Non-critical
      }
    }

    // Get active session for continuation
    let session = null
    let compiledSummary = null
    if (db && chapterId) {
      try {
        const sessionResult = await db.query(
          `SELECT * FROM voice_sessions
           WHERE user_id = $1 AND chapter_id = $2 AND session_status = 'active'
           ORDER BY created_at DESC LIMIT 1`,
          [userId, chapterId]
        )
        if (sessionResult.rows.length > 0) {
          session = sessionResult.rows[0]

          // Get summary of compiled content for continuation context
          if (session.questions_answered && session.questions_answered.length > 0) {
            const storiesResult = await db.query(
              `SELECT compiled_content FROM stories
               WHERE user_id = $1 AND chapter_id = $2 AND compiled_content IS NOT NULL
               ORDER BY created_at`,
              [userId, chapterId]
            )
            if (storiesResult.rows.length > 0) {
              const content = storiesResult.rows.map(r => r.compiled_content).join('\n\n')
              if (content.length > 100) {
                // Create brief summary for AI context
                try {
                  const summaryResult = await grokChat({
                    systemPrompt:
                      'Summarize these memoir excerpts in 2-3 sentences for context. Be brief.',
                    userPrompt: content.substring(0, 2000),
                    maxTokens: 150,
                    temperature: 0.5
                  })
                  compiledSummary = summaryResult.content
                } catch (err) {
                  // Non-critical
                }
              }
            }
          }
        }
      } catch (err) {
        logger.error('Failed to get voice session', { userId, chapterId, error: err.message })
      }
    }

    const baseInstructions = `You're chatting with someone to help them record their life story. Be natural - like a friend catching up, not a formal interview.

HOW TO BEHAVE:
- Talk like a normal person. No fake enthusiasm. Don't say "Oh how wonderful!" or "That's amazing!" - it sounds insincere.
- Simple acknowledgments: "Right", "Yeah", "I see", "Okay" - then move on.
- Give them plenty of time to think. Don't rush.
- Keep responses SHORT. One or two sentences max.

QUESTION STYLE:
- Start simple: basic facts they don't have to think about
- "Where did you grow up?" "What was your mum's name?" "What did your dad do?"
- Then go deeper: "What was she like?" "Tell me about that"
- Ask ONE question at a time. Wait for the answer.
- Follow up naturally on what they actually say

TOPIC TRANSITIONS:
- When you have gathered 3-4 good responses on the current topic, signal you're ready to move on
- Say something like "Lovely, that's really helpful. Let's move on to..." or "Got it, that's great. Now tell me about..."
- The system will detect these transitions to save progress

NEVER:
- Be fake or gushing
- Give long responses
- Ask multiple questions at once`

    let instructions = baseInstructions
    if (memoryContext) {
      instructions += `\n\nContext from their story so far: ${memoryContext}\nYou can reference these people and places naturally in conversation.`
    }
    if (compiledSummary) {
      instructions += `\n\nWhat they've already shared in this chapter: ${compiledSummary}`
    }
    instructions += onboardingNote

    res.json({
      websocketUrl: 'wss://api.x.ai/v1/realtime',
      voice: 'Ara',
      model: 'grok-2-public',
      instructions,
      session: session
        ? {
            id: session.id,
            questionsAnswered: session.questions_answered || [],
            currentQuestionIndex: (session.questions_answered || []).length,
            compiledSummary
          }
        : null
    })
  })
)

// Save transcript after each question completion
router.post(
  '/transcript',
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { session_id, chapter_id, question_id, user_transcript, ai_transcript } = req.body

    if (!db) {
      return res.status(500).json({ error: 'Database not available' })
    }

    if (!session_id || !question_id || !user_transcript) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const safeTranscript = sanitizeForPrompt(user_transcript, 10000)

    // Upsert story with raw transcript
    const storyResult = await db.query(
      `INSERT INTO stories (user_id, chapter_id, question_id, answer, voice_session_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, chapter_id, question_id)
       DO UPDATE SET answer = $4, voice_session_id = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [userId, chapter_id, question_id, safeTranscript, session_id]
    )

    const storyId = storyResult.rows[0].id

    // Update session
    await db.query(
      `UPDATE voice_sessions
       SET questions_answered = array_append(
         CASE WHEN $2 = ANY(questions_answered) THEN questions_answered ELSE questions_answered END,
         CASE WHEN $2 = ANY(questions_answered) THEN NULL ELSE $2 END
       ),
       questions_since_compile = questions_since_compile + 1,
       current_question_id = $2,
       session_transcripts = session_transcripts || $3::jsonb,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        session_id,
        question_id,
        JSON.stringify({
          question_id,
          user_transcript: safeTranscript,
          ai_transcript: ai_transcript || '',
          timestamp: new Date().toISOString()
        })
      ]
    )

    // Check if auto-compile should trigger (every 5 questions)
    const sessionResult = await db.query(
      `SELECT questions_since_compile, questions_answered FROM voice_sessions WHERE id = $1`,
      [session_id]
    )

    const questionsSinceCompile = sessionResult.rows[0]?.questions_since_compile || 0
    let compilationTriggered = false

    if (questionsSinceCompile >= 5) {
      // Get uncompiled question IDs
      const uncompiled = await db.query(
        `SELECT question_id FROM stories
         WHERE voice_session_id = $1 AND compiled_content IS NULL`,
        [session_id]
      )

      if (uncompiled.rows.length > 0) {
        compilationTriggered = true
        // Compile async (don't block response)
        compileTranscripts(
          db,
          userId,
          session_id,
          uncompiled.rows.map(r => r.question_id)
        ).catch(err => logger.error('Auto-compile failed', { session_id, error: err.message }))
      }
    }

    // Extract entities async (existing pattern)
    extractAndStoreEntities({
      db,
      userId,
      text: safeTranscript,
      chapterId: chapter_id,
      questionId: question_id,
      storyId
    }).catch(err => logger.error('Entity extraction failed', { storyId, error: err.message }))

    res.json({
      success: true,
      story_id: storyId,
      questions_answered: sessionResult.rows[0]?.questions_answered || [],
      compilation_triggered: compilationTriggered
    })
  })
)

// Manually trigger compilation
router.post(
  '/compile',
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { session_id } = req.body

    if (!db) {
      return res.status(500).json({ error: 'Database not available' })
    }

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' })
    }

    // Verify session belongs to user
    const sessionResult = await db.query(
      `SELECT * FROM voice_sessions WHERE id = $1 AND user_id = $2`,
      [session_id, userId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get uncompiled question IDs
    const uncompiled = await db.query(
      `SELECT question_id FROM stories
       WHERE voice_session_id = $1 AND compiled_content IS NULL`,
      [session_id]
    )

    if (uncompiled.rows.length === 0) {
      return res.json({ success: true, message: 'No transcripts to compile' })
    }

    // Update session status
    await db.query(
      `UPDATE voice_sessions SET session_status = 'compiling', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [session_id]
    )

    // Compile (this may take a while)
    await compileTranscripts(
      db,
      userId,
      session_id,
      uncompiled.rows.map(r => r.question_id)
    )

    // Restore status
    await db.query(
      `UPDATE voice_sessions SET session_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [session_id]
    )

    res.json({ success: true, compiled_count: uncompiled.rows.length })
  })
)

// End voice session
router.post(
  '/end-session',
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { session_id } = req.body

    if (!db) {
      return res.status(500).json({ error: 'Database not available' })
    }

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' })
    }

    // Verify session belongs to user
    const sessionResult = await db.query(
      `SELECT * FROM voice_sessions WHERE id = $1 AND user_id = $2`,
      [session_id, userId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get uncompiled question IDs for final compilation
    const uncompiled = await db.query(
      `SELECT question_id FROM stories
       WHERE voice_session_id = $1 AND compiled_content IS NULL`,
      [session_id]
    )

    // Update session status to compiling
    await db.query(
      `UPDATE voice_sessions SET session_status = 'compiling', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [session_id]
    )

    // Final compilation
    if (uncompiled.rows.length > 0) {
      await compileTranscripts(
        db,
        userId,
        session_id,
        uncompiled.rows.map(r => r.question_id)
      )
    }

    // Mark session as completed
    await db.query(
      `UPDATE voice_sessions
       SET session_status = 'completed', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [session_id]
    )

    res.json({ success: true, compiled_count: uncompiled.rows.length })
  })
)

export default router

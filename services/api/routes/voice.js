import { Router } from 'express'
import { getCompactMemoryContext } from '../utils/memoryContext.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('voice')

// Generate ephemeral token for client-side WebSocket connection
router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const apiKey = process.env.GROK_API_KEY

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
    res.json(data)
  })
)

// Get voice configuration with memory context
router.get(
  '/config',
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
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

NEVER:
- Be fake or gushing
- Give long responses
- Ask multiple questions at once`

    let instructions = baseInstructions
    if (memoryContext) {
      instructions += `\n\nContext from their story so far: ${memoryContext}\nYou can reference these people and places naturally in conversation.`
    }
    instructions += onboardingNote

    res.json({
      websocketUrl: 'wss://api.x.ai/v1/realtime',
      voice: 'Ara',
      model: 'grok-2-public',
      instructions
    })
  })
)

export default router

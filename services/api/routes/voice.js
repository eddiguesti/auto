import { Router } from 'express'
import { getCompactMemoryContext } from '../utils/memoryContext.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('voice')

// Generate ephemeral token for client-side WebSocket connection
router.post('/session', asyncHandler(async (req, res) => {
  const apiKey = process.env.GROK_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'GROK_API_KEY not configured' })
  }

  // Create ephemeral token via xAI API
  const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expires_after: { seconds: 300 } // 5 minute token
    })
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('xAI session error', { status: response.status, requestId: req.id })
    return res.status(response.status).json({ error: 'Failed to create voice session' })
  }

  const data = await response.json()
  res.json(data)
}))

// Get voice configuration with memory context
router.get('/config', asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const memoryContext = await getCompactMemoryContext(db, userId)

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

  const instructions = memoryContext
    ? `${baseInstructions}\n\nContext from their story so far: ${memoryContext}\nYou can reference these people and places naturally in conversation.`
    : baseInstructions

  res.json({
    websocketUrl: 'wss://api.x.ai/v1/realtime',
    voice: 'Ara',
    model: 'grok-2-public',
    instructions
  })
}))

export default router

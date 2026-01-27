import { Router } from 'express'

const router = Router()

// Fetch memory context for voice prompts
async function getMemoryContext(db) {
  if (!db) return ''

  try {
    const people = await db.query(`
      SELECT name FROM memory_entities
      WHERE entity_type = 'person'
      ORDER BY mention_count DESC LIMIT 8
    `)

    const places = await db.query(`
      SELECT name FROM memory_entities
      WHERE entity_type = 'place'
      ORDER BY mention_count DESC LIMIT 6
    `)

    let context = ''
    if (people.rows.length > 0) {
      context += `People in their story: ${people.rows.map(p => p.name).join(', ')}. `
    }
    if (places.rows.length > 0) {
      context += `Places mentioned: ${places.rows.map(p => p.name).join(', ')}.`
    }
    return context
  } catch (err) {
    return ''
  }
}

// Generate ephemeral token for client-side WebSocket connection
router.post('/session', async (req, res) => {
  const apiKey = process.env.GROK_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'GROK_API_KEY not configured' })
  }

  try {
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
      console.error('xAI session error:', error)
      return res.status(response.status).json({ error: 'Failed to create voice session', details: error })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Voice session error:', err)
    res.status(500).json({ error: 'Failed to create voice session' })
  }
})

// Get voice configuration with memory context
router.get('/config', async (req, res) => {
  const db = req.app.locals.db
  const memoryContext = await getMemoryContext(db)

  const baseInstructions = `You're helping someone record their life story. Have a warm, natural conversation - like chatting with a friend who's genuinely interested in their memories.

Your role:
- Ask thoughtful follow-up questions about their memories
- Draw out sensory details: what things looked, sounded, felt like
- Ask about the people involved and their relationships
- Explore emotions and how experiences shaped them
- Keep questions conversational and one at a time
- Give them time to think - don't rush

Style:
- Be warm but not gushing
- Use natural speech patterns
- Keep responses brief - you're interviewing, not lecturing
- Match their energy and pace`

  const instructions = memoryContext
    ? `${baseInstructions}\n\nContext from their story so far: ${memoryContext}\nYou can reference these people and places naturally in conversation.`
    : baseInstructions

  res.json({
    websocketUrl: 'wss://api.x.ai/v1/realtime',
    voice: 'Ara',
    model: 'grok-2-public',
    instructions
  })
})

export default router

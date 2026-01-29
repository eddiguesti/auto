import { Router } from 'express'
import OpenAI from 'openai'
import { sanitizeForPrompt, createSafeContentBlock, checkRateLimit } from '../utils/security.js'

const router = Router()

// Fetch memory context for AI prompts
async function getMemoryContext(db, userId) {
  if (!db || !userId) return ''

  try {
    // Get top mentioned people
    const people = await db.query(`
      SELECT name, mention_count FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'person'
      ORDER BY mention_count DESC LIMIT 8
    `, [userId])

    // Get top mentioned places
    const places = await db.query(`
      SELECT name FROM memory_entities
      WHERE user_id = $1 AND entity_type = 'place'
      ORDER BY mention_count DESC LIMIT 8
    `, [userId])

    // Get key relationships
    const relationships = await db.query(`
      SELECT e1.name as person1, e2.name as person2, r.relationship_type
      FROM memory_relationships r
      JOIN memory_entities e1 ON r.entity1_id = e1.id
      JOIN memory_entities e2 ON r.entity2_id = e2.id
      WHERE e1.user_id = $1 AND (e1.entity_type = 'person' OR e2.entity_type = 'person')
      LIMIT 10
    `, [userId])

    let context = ''

    if (people.rows.length > 0) {
      context += `\nPeople in their story: ${people.rows.map(p => p.name).join(', ')}`
    }

    if (places.rows.length > 0) {
      context += `\nPlaces mentioned: ${places.rows.map(p => p.name).join(', ')}`
    }

    if (relationships.rows.length > 0) {
      context += `\nRelationships: ${relationships.rows.map(r =>
        `${r.person1} - ${r.relationship_type} - ${r.person2}`
      ).join('; ')}`
    }

    return context
  } catch (err) {
    console.error('Error fetching memory context:', err.message)
    return ''
  }
}

// Initialize Grok client (OpenAI-compatible)
const getClient = () => {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new Error('GROK_API_KEY not set in environment')
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  })
}

// Interview endpoint - asks follow-up questions to gather content
router.post('/interview', async (req, res) => {
  const { question, prompt, existingAnswer, gatheredContent = [], lastResponse, history = [], action } = req.body
  const db = req.app.locals.db
  const userId = req.user.id

  // Rate limiting
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  try {
    const client = getClient()
    const memoryContext = await getMemoryContext(db, userId)

    // Sanitize all user inputs to prevent prompt injection
    const safeQuestion = sanitizeForPrompt(question, 500)
    const safePrompt = sanitizeForPrompt(prompt, 500)
    const safeExistingAnswer = sanitizeForPrompt(existingAnswer, 2000)
    const safeLastResponse = sanitizeForPrompt(lastResponse, 2000)
    const safeGatheredContent = gatheredContent.map(g => ({
      ...g,
      content: sanitizeForPrompt(g.content, 1000)
    }))

    // Count how much content we have (using sanitized content)
    const totalContent = safeGatheredContent.map(g => g.content).join(' ')
    const wordCount = totalContent.split(/\s+/).filter(w => w).length
    const responseCount = safeGatheredContent.filter(g => g.type === 'response').length

    // Determine if we have enough content (at least 100 words or 4+ responses)
    const hasEnoughContent = wordCount >= 100 || responseCount >= 4

    let systemPrompt
    if (action === 'start') {
      // Starting the interview - using sanitized inputs
      systemPrompt = `You're helping someone jot down their memories. Keep it casual and brief - like texting a mate, not writing a greeting card.

The question they're answering: ${safeQuestion}
Context: ${safePrompt}
${memoryContext ? `\nWhat you know about their story so far:${memoryContext}` : ''}

${safeExistingAnswer ? `They wrote: ${safeExistingAnswer.substring(0, 500)}

Just ask 1-2 quick follow-up questions to get more details. Things like:
- What did it look/sound/smell like?
- What happened next?
- Who else was there?` :
`Quick intro - you're here to help them capture this memory. Ask one simple question to get them started.`}

IMPORTANT TONE RULES:
- Be casual and brief. No gushing or over-enthusiasm
- Don't say things like "what a heartwarming memory!" or "that's so special!"
- Just chat normally. Ask your question and move on
- No emojis
- 2-3 sentences max`
    } else {
      // Continuing the interview - using sanitized inputs
      systemPrompt = `You're chatting with someone about their memories. Keep it casual and brief.

Question they're answering: ${safeQuestion}
Context: ${safePrompt}
${memoryContext ? `\nWhat you know about their story so far:${memoryContext}` : ''}

${safeExistingAnswer ? `Their original notes: ${safeExistingAnswer.substring(0, 300)}...` : ''}

What they've shared so far:
${safeGatheredContent.map((g, i) => `${i + 1}. ${g.content.substring(0, 200)}...`).join('\n')}

Their latest response: ${safeLastResponse}

${hasEnoughContent ?
`Got enough to work with now. Just let them know they can add more if they want, or hit "Write My Story" when ready. Keep it brief.` :
`Need more detail. Ask 1-2 quick follow-up questions about:
- What things looked/sounded/felt like
- What people said
- What happened before or after
- How they felt`}

TONE RULES:
- Casual and direct. No gushing ("what a lovely memory!", "how special!")
- Just acknowledge briefly and ask your question
- No emojis
- 2-3 sentences max
- Don't repeat questions you've already asked`
    }

    const messages = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history (filter out any empty content, sanitize user messages)
    if (history.length > 0) {
      history.forEach(h => {
        if (h.content && h.content.trim()) {
          // Sanitize user messages to prevent injection via conversation history
          const safeContent = h.role === 'user' ? sanitizeForPrompt(h.content, 2000) : h.content
          messages.push({ role: h.role, content: safeContent })
        }
      })
    }

    // Always need a user message at the end for the API
    if (action === 'start') {
      messages.push({ role: 'user', content: 'Please start the interview.' })
    } else if (safeLastResponse && safeLastResponse.trim()) {
      // For continue action, add the user's latest response if not already in history
      const lastMsg = messages[messages.length - 1]
      if (!lastMsg || lastMsg.role !== 'user') {
        messages.push({ role: 'user', content: safeLastResponse })
      }
    } else {
      // Fallback - ensure we have a user message
      messages.push({ role: 'user', content: 'Please continue.' })
    }

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages,
      max_tokens: 400,
      temperature: 0.8
    })

    const response = completion.choices[0]?.message?.content || "That's wonderful! Can you tell me more about that moment?"

    res.json({
      response,
      readyToWrite: hasEnoughContent
    })
  } catch (err) {
    console.error('Interview error:', err.message)
    res.status(500).json({ error: 'AI service error', message: err.message })
  }
})

// Write the polished story from gathered content
router.post('/write-story', async (req, res) => {
  const { question, prompt, existingAnswer, gatheredContent = [], conversationHistory = [] } = req.body
  const db = req.app.locals.db
  const userId = req.user.id

  // Rate limiting
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  try {
    const client = getClient()
    const memoryContext = await getMemoryContext(db, userId)

    // Sanitize all user inputs
    const safeQuestion = sanitizeForPrompt(question, 500)
    const safePrompt = sanitizeForPrompt(prompt, 500)
    const safeExistingAnswer = sanitizeForPrompt(existingAnswer, 5000)
    const safeGatheredContent = gatheredContent.map(g => ({
      ...g,
      content: sanitizeForPrompt(g.content, 2000)
    }))

    // Compile all the raw material (sanitized)
    const rawMaterial = []
    if (safeExistingAnswer) {
      rawMaterial.push(`Original notes: ${safeExistingAnswer}`)
    }
    safeGatheredContent.forEach((g, i) => {
      rawMaterial.push(`Detail ${i + 1}: ${g.content}`)
    })

    // Extract just the user's responses from conversation (sanitized)
    const userResponses = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => sanitizeForPrompt(m.content, 2000))
      .join('\n\n')

    const systemPrompt = `You are helping someone capture their life story. Your task is to take their raw memories and notes and tidy them up into a cohesive passage - BUT you must write in THEIR voice, not yours.

CRITICAL - MATCH THEIR WRITING STYLE:
Before writing, analyze their original notes and responses for:
- Their vocabulary choices (simple/complex, casual/formal)
- Their sentence structure (short and punchy, or longer flowing sentences)
- Their tone (humorous, reflective, matter-of-fact, emotional)
- Their speech patterns and expressions
- How they describe things (direct, poetic, understated)

IMPORTANT GUIDELINES:
1. Write in FIRST PERSON (I, me, my) - this is THEIR story
2. MIRROR their writing style - if they write simply, write simply. If they're wordy, be wordy
3. Keep their authentic voice - don't make a casual storyteller sound literary
4. Embellish and add flow, but use the KIND of language THEY would use
5. Include all the specific details, names, and moments they shared
6. You can add sensory details, but phrase them how THEY would phrase them
7. Create a narrative flow with a beginning, middle, and close
8. Keep it genuine - don't invent facts they didn't mention
9. Aim for 200-400 words
10. Think of yourself as a ghostwriter who disappears into their voice

WHAT NOT TO DO:
- Don't impose flowery or literary language on someone who writes plainly
- Don't add dramatic flair if they're understated
- Don't use sophisticated vocabulary if they use simple words
- Don't "elevate" their prose - just organise and polish it

The autobiography question was: ${safeQuestion}
Context: ${safePrompt}
${memoryContext ? `\nKnown people/places in their story:${memoryContext}` : ''}

THEIR ORIGINAL WRITING (study their style carefully):
${rawMaterial.join('\n\n')}

MORE OF THEIR WORDS FROM CONVERSATION:
${userResponses}

Now write a tidied-up, flowing version of their story IN THEIR VOICE AND STYLE. Write ONLY the story - no introductions, explanations, or meta-commentary.`

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please write my story now.' }
      ],
      max_tokens: 800,
      temperature: 0.7
    })

    const story = completion.choices[0]?.message?.content || "I couldn't generate the story. Please try again."

    res.json({ story })
  } catch (err) {
    console.error('Write story error:', err.message)
    res.status(500).json({ error: 'AI service error', message: err.message })
  }
})

// Original chat endpoint (kept for backward compatibility)
router.post('/chat', async (req, res) => {
  const { mode, question, prompt, answer, userMessage, history = [] } = req.body
  const userId = req.user?.id

  // Rate limiting (if authenticated)
  if (userId) {
    const rateCheck = checkRateLimit(userId)
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
      })
    }
  }

  try {
    const client = getClient()

    // Sanitize all user inputs
    const safeQuestion = sanitizeForPrompt(question, 500)
    const safePrompt = sanitizeForPrompt(prompt, 500)
    const safeAnswer = sanitizeForPrompt(answer, 2000)
    const safeUserMessage = sanitizeForPrompt(userMessage, 2000)

    const systemPrompts = {
      followup: `You are helping someone write their autobiography. Ask 1-2 thoughtful follow-up questions about their memory. Focus on sensory details, emotions, and specific moments.`,
      expand: `You are a memoir editor. Help expand their brief notes into richer prose while keeping their voice authentic.`,
      stuck: `You are a memory coach. Suggest specific prompts to help trigger memories related to this topic.`,
      chat: `You are a friendly writing assistant helping with an autobiography. Be warm and encouraging.`
    }

    const systemMessage = `${systemPrompts[mode] || systemPrompts.chat}

Context - The autobiography question: ${safeQuestion}
Hint: ${safePrompt}
${safeAnswer ? `Their answer so far: ${safeAnswer}` : '(No answer yet)'}`

    const messages = [
      { role: 'system', content: systemMessage },
      ...history.map(m => ({
        role: m.role,
        content: m.role === 'user' ? sanitizeForPrompt(m.content, 2000) : m.content
      })),
      { role: 'user', content: safeUserMessage }
    ]

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages,
      max_tokens: 500,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || 'I had trouble generating a response.'
    res.json({ response })
  } catch (err) {
    console.error('AI error:', err.message)
    res.status(500).json({ error: 'AI service error', message: err.message })
  }
})

export default router

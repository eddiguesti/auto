import { Router } from 'express'
import { sanitizeForPrompt, checkRateLimit } from '../utils/security.js'
import { getGrokClient } from '../utils/grokClient.js'
import { getMemoryContext } from '../utils/memoryContext.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

// Interview endpoint - asks follow-up questions to gather content
router.post('/interview', asyncHandler(async (req, res) => {
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

  const client = getGrokClient()
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
}))

// Write the polished story from gathered content
router.post('/write-story', asyncHandler(async (req, res) => {
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

  const client = getGrokClient()
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
}))

// Original chat endpoint (kept for backward compatibility)
router.post('/chat', asyncHandler(async (req, res) => {
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

  const client = getGrokClient()

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
}))

// Generate illustration prompt for a chapter based on stories
router.post('/generate-illustration', asyncHandler(async (req, res) => {
  const { chapterId, stories } = req.body
  const userId = req.user.id

  // Rate limiting
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  const client = getGrokClient()

  // Sanitize story content
  const safeStories = (stories || []).map(s => sanitizeForPrompt(s, 500)).join('\n\n')

  const systemPrompt = `You are an art director creating illustration prompts for a memoir book. Based on the user's stories, create a single illustration prompt that would capture the essence of their memories.

GUIDELINES:
- Create a warm, nostalgic illustration in a gentle watercolor or soft pencil sketch style
- Focus on a specific memorable scene or moment from their stories
- Include specific details they mentioned (places, objects, people silhouettes)
- Make it feel personal and intimate, not generic
- Avoid faces - use silhouettes or back views of people
- Use a warm, sepia-toned or vintage colour palette
- The style should be suitable for a printed memoir book

Stories to illustrate:
${safeStories || 'No stories provided yet - create a placeholder scene for this chapter.'}

Respond with ONLY the illustration prompt, no explanations. Keep it under 100 words.`

  const completion = await client.chat.completions.create({
    model: 'grok-3-mini-beta',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate an illustration prompt for these memories.' }
    ],
    max_tokens: 200,
    temperature: 0.7
  })

  const illustrationPrompt = completion.choices[0]?.message?.content || 'A warm, nostalgic scene with gentle watercolor tones.'

  // For now, return the prompt - actual image generation would need integration with DALL-E, Midjourney, or similar
  res.json({
    prompt: illustrationPrompt,
    // Placeholder URL - replace with actual generated image when integrated
    placeholderUrl: null,
    note: 'Image generation coming soon'
  })
}))

export default router

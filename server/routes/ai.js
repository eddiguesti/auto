import { Router } from 'express'
import OpenAI from 'openai'

const router = Router()

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

  try {
    const client = getClient()

    // Count how much content we have
    const totalContent = gatheredContent.map(g => g.content).join(' ')
    const wordCount = totalContent.split(/\s+/).filter(w => w).length
    const responseCount = gatheredContent.filter(g => g.type === 'response').length

    // Determine if we have enough content (at least 100 words or 4+ responses)
    const hasEnoughContent = wordCount >= 100 || responseCount >= 4

    let systemPrompt
    if (action === 'start') {
      // Starting the interview
      systemPrompt = `You're helping someone jot down their memories. Keep it casual and brief - like texting a mate, not writing a greeting card.

The question they're answering: "${question}"
Context: ${prompt}

${existingAnswer ? `They wrote: "${existingAnswer.substring(0, 500)}"

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
      // Continuing the interview
      systemPrompt = `You're chatting with someone about their memories. Keep it casual and brief.

Question they're answering: "${question}"
Context: ${prompt}

${existingAnswer ? `Their original notes: "${existingAnswer.substring(0, 300)}..."` : ''}

What they've shared so far:
${gatheredContent.map((g, i) => `${i + 1}. ${g.content.substring(0, 200)}...`).join('\n')}

Their latest response: "${lastResponse}"

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

    // Add conversation history
    if (history.length > 0) {
      history.forEach(h => {
        messages.push({ role: h.role, content: h.content })
      })
    }

    // For continue action, the user's response is already in history, just need AI to respond
    if (action === 'start') {
      messages.push({ role: 'user', content: 'Please start the interview.' })
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

  try {
    const client = getClient()

    // Compile all the raw material
    const rawMaterial = []
    if (existingAnswer) {
      rawMaterial.push(`Original notes: ${existingAnswer}`)
    }
    gatheredContent.forEach((g, i) => {
      rawMaterial.push(`Detail ${i + 1}: ${g.content}`)
    })

    // Extract just the user's responses from conversation
    const userResponses = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
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

The autobiography question was: "${question}"
Context: ${prompt}

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

  try {
    const client = getClient()

    const systemPrompts = {
      followup: `You are helping someone write their autobiography. Ask 1-2 thoughtful follow-up questions about their memory. Focus on sensory details, emotions, and specific moments.`,
      expand: `You are a memoir editor. Help expand their brief notes into richer prose while keeping their voice authentic.`,
      stuck: `You are a memory coach. Suggest specific prompts to help trigger memories related to this topic.`,
      chat: `You are a friendly writing assistant helping with an autobiography. Be warm and encouraging.`
    }

    const systemMessage = `${systemPrompts[mode] || systemPrompts.chat}

Context - The autobiography question: "${question}"
Hint: "${prompt}"
${answer ? `Their answer so far: "${answer}"` : '(No answer yet)'}`

    const messages = [
      { role: 'system', content: systemMessage },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
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

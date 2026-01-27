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
      systemPrompt = `You are a warm, skilled interviewer helping someone write their autobiography. Your goal is to draw out rich, vivid details about their memories through thoughtful questions.

The person is answering this autobiography question: "${question}"
Context hint: ${prompt}

${existingAnswer ? `They've already written: "${existingAnswer.substring(0, 500)}"

Acknowledge what they've written briefly, then ask 1-2 specific follow-up questions to get MORE details. Focus on:
- Sensory details (what did it look like, sound like, smell like?)
- Specific moments or dialogue
- How they felt emotionally
- Who else was there and what were they like?` :
`Start by warmly introducing yourself as their story writing partner. Then ask an engaging opening question to get them started on this topic. Make it specific and easy to answer - not overwhelming.`}

Keep your response conversational and encouraging. Ask only 1-2 questions at a time.`
    } else {
      // Continuing the interview
      systemPrompt = `You are a warm, skilled interviewer helping someone write their autobiography. You've been having a conversation to gather details about their memory.

The autobiography question is: "${question}"
Context: ${prompt}

${existingAnswer ? `Their original written answer: "${existingAnswer.substring(0, 300)}..."` : ''}

Content gathered so far:
${gatheredContent.map((g, i) => `${i + 1}. ${g.content.substring(0, 200)}...`).join('\n')}

Their latest response: "${lastResponse}"

${hasEnoughContent ?
`You now have enough rich detail to write a beautiful story!

Respond with enthusiasm about what they've shared. Tell them they've given you wonderful material to work with. Let them know they can share more if they want, OR they can click "Write My Story" whenever they're ready.

End your response with something like: "I have plenty of wonderful details to craft your story now! Feel free to add more, or when you're ready, click 'Write My Story' to see how it all comes together."` :
`You need MORE details to write a compelling story.

Briefly acknowledge their response with genuine interest, then ask 1-2 NEW follow-up questions to dig deeper. Focus on:
- Specific sensory details they haven't mentioned
- Emotions and feelings
- Dialogue or what people said
- The setting and atmosphere
- What happened before or after

Be encouraging but keep drawing out more memories. Each question should help paint a more vivid picture.`}

Keep your response conversational and warm. Never repeat questions you've already asked.`
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

    const systemPrompt = `You are a gifted memoir writer helping someone capture their life story. Your task is to take their raw memories and notes and transform them into a beautifully written, engaging autobiographical passage.

IMPORTANT GUIDELINES:
1. Write in FIRST PERSON (I, me, my) - this is THEIR story
2. Preserve their authentic voice and personality
3. Include all the specific details, names, and moments they shared
4. Add sensory richness - sights, sounds, smells, textures
5. Weave in emotions naturally
6. Create a narrative flow with a beginning, middle, and satisfying close
7. Keep it genuine - don't invent facts they didn't mention
8. Aim for 200-400 words - substantial but not overwhelming
9. Make it read like a passage from a published memoir
10. Use vivid, evocative language that brings the memory to life

The autobiography question was: "${question}"
Context: ${prompt}

RAW MATERIAL TO TRANSFORM:
${rawMaterial.join('\n\n')}

ADDITIONAL DETAILS FROM CONVERSATION:
${userResponses}

Now write a beautiful, polished autobiographical passage using all of this material. Write ONLY the story - no introductions, explanations, or meta-commentary.`

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

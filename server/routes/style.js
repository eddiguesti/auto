import { Router } from 'express'
import OpenAI from 'openai'
import { sanitizeForPrompt, checkRateLimit } from '../utils/security.js'

const router = Router()

// Style options data (mirrored from client for prompt building)
const styleOptions = {
  tones: {
    formal: 'Use formal, dignified language with proper grammar and sophisticated vocabulary. Avoid contractions and casual expressions.',
    conversational: 'Write as if speaking directly to a close friend. Use natural speech patterns, contractions, and occasional asides.',
    nostalgic: 'Infuse the writing with warm remembrance and wistful reflection. Evoke sensory details that bring the past to life.',
    humorous: 'Include light-hearted observations, gentle self-deprecation, and witty remarks while maintaining the emotional core of the story.'
  },
  narratives: {
    'first-person-reflective': 'Write in first person with reflective, mature insight. Balance memory with present-day understanding.',
    'third-person': "Write in third person as if describing someone else's life story. Maintain emotional intimacy while using objective narrative distance.",
    'present-tense': 'Write in present tense to create immediacy and immersion. Make readers feel they are experiencing the moment as it happens.'
  },
  authors: {
    hemingway: 'Write in the style of Ernest Hemingway: short, declarative sentences. Simple words. No unnecessary adjectives. Let the facts speak. The emotion lives in what is not said.',
    austen: 'Write in the style of Jane Austen: elegant sentence structure, gentle irony, keen social observation, and refined vocabulary. Balance wit with genuine sentiment.',
    angelou: 'Write in the style of Maya Angelou: poetic rhythm, rich imagery, spiritual depth. Use metaphor and repetition for emphasis. Let the prose sing with dignity and soul.',
    twain: "Write in the style of Mark Twain: folksy American voice, dry humor, vernacular expressions, and sharp observations about human nature. Be warm but never sentimental."
  }
}

// Build style transformation prompt
function buildStylePrompt(tones = [], narrative = null, authorStyle = null) {
  const parts = []

  parts.push('Transform this autobiography passage while preserving ALL facts, names, dates, and specific details exactly as stated.')
  parts.push('')
  parts.push('STYLE REQUIREMENTS:')

  // Add tone instructions
  if (tones && tones.length > 0) {
    parts.push('')
    parts.push('TONES:')
    tones.forEach(toneId => {
      if (styleOptions.tones[toneId]) {
        parts.push(`- ${toneId}: ${styleOptions.tones[toneId]}`)
      }
    })
  }

  // Add narrative instruction
  if (narrative && styleOptions.narratives[narrative]) {
    parts.push('')
    parts.push('NARRATIVE STYLE:')
    parts.push(`- ${narrative}: ${styleOptions.narratives[narrative]}`)
  }

  // Add author style instruction
  if (authorStyle && styleOptions.authors[authorStyle]) {
    parts.push('')
    parts.push('AUTHOR INSPIRATION:')
    parts.push(`- ${authorStyle}: ${styleOptions.authors[authorStyle]}`)
  }

  parts.push('')
  parts.push('CRITICAL RULES:')
  parts.push('- Preserve ALL facts, names, dates, and specific details exactly')
  parts.push('- Output should be roughly the same length as the input')
  parts.push('- Do not add fictional details or embellishments')
  parts.push('- Do not remove any factual information')
  parts.push('- Maintain the original meaning and emotional intent')
  parts.push('')
  parts.push('Return ONLY the transformed text, no explanations or commentary.')
  parts.push('')
  parts.push('ORIGINAL TEXT:')

  return parts.join('\n')
}

// Initialize Grok client
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

// GET /api/style/preferences - Get saved style preferences
router.get('/preferences', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    const result = await db.query(
      'SELECT * FROM user_style_preferences WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({
        tones: [],
        narrative: null,
        authorStyle: null,
        appliedAt: null
      })
    }

    const prefs = result.rows[0]
    res.json({
      tones: prefs.tones || [],
      narrative: prefs.narrative,
      authorStyle: prefs.author_style,
      appliedAt: prefs.applied_at
    })
  } catch (err) {
    console.error('Error fetching style preferences:', err)
    res.status(500).json({ error: 'Failed to fetch style preferences' })
  }
})

// POST /api/style/preferences - Save style preferences
router.post('/preferences', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { tones, narrative, authorStyle } = req.body

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    // Upsert preferences
    await db.query(`
      INSERT INTO user_style_preferences (user_id, tones, narrative, author_style, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET tones = $2, narrative = $3, author_style = $4, updated_at = CURRENT_TIMESTAMP
    `, [userId, tones || [], narrative, authorStyle])

    res.json({ success: true })
  } catch (err) {
    console.error('Error saving style preferences:', err)
    res.status(500).json({ error: 'Failed to save style preferences' })
  }
})

// POST /api/style/preview - Preview a single story in selected style
router.post('/preview', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { storyId, tones, narrative, authorStyle } = req.body

  // Rate limiting
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    // Get the story
    const storyResult = await db.query(
      'SELECT * FROM stories WHERE id = $1 AND user_id = $2',
      [storyId, userId]
    )

    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' })
    }

    const story = storyResult.rows[0]
    const originalText = story.original_answer || story.answer

    if (!originalText || !originalText.trim()) {
      return res.status(400).json({ error: 'Story has no content to transform' })
    }

    // Build the prompt and transform
    const client = getClient()
    const stylePrompt = buildStylePrompt(tones, narrative, authorStyle)
    const safeText = sanitizeForPrompt(originalText, 5000)

    const completion = await client.chat.completions.create({
      model: 'grok-3-mini-beta',
      messages: [
        { role: 'system', content: stylePrompt },
        { role: 'user', content: safeText }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })

    const transformedText = completion.choices[0]?.message?.content || originalText

    res.json({
      original: originalText,
      transformed: transformedText,
      storyId: story.id
    })
  } catch (err) {
    console.error('Style preview error:', err)
    res.status(500).json({ error: 'Failed to preview style transformation' })
  }
})

// POST /api/style/apply-all - Apply style to all stories permanently
router.post('/apply-all', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { tones, narrative, authorStyle } = req.body

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  // Rate limiting (stricter for batch operations)
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before trying again.`
    })
  }

  try {
    // Get all stories with content
    const storiesResult = await db.query(
      "SELECT * FROM stories WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''",
      [userId]
    )

    const stories = storiesResult.rows
    if (stories.length === 0) {
      return res.status(400).json({ error: 'No stories to transform' })
    }

    const client = getClient()
    const stylePrompt = buildStylePrompt(tones, narrative, authorStyle)
    const styleDescription = [
      ...(tones || []),
      narrative,
      authorStyle
    ].filter(Boolean).join(', ')

    let transformedCount = 0
    const errors = []

    // Transform each story
    for (const story of stories) {
      try {
        // Use original_answer if it exists (for re-styling), otherwise use current answer
        const originalText = story.original_answer || story.answer

        if (!originalText || !originalText.trim()) continue

        const safeText = sanitizeForPrompt(originalText, 5000)

        const completion = await client.chat.completions.create({
          model: 'grok-3-mini-beta',
          messages: [
            { role: 'system', content: stylePrompt },
            { role: 'user', content: safeText }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })

        const transformedText = completion.choices[0]?.message?.content

        if (transformedText && transformedText.trim()) {
          // Save original (only if not already saved) and update with transformed
          await db.query(`
            UPDATE stories
            SET original_answer = COALESCE(original_answer, answer),
                answer = $1,
                style_applied = $2,
                style_applied_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [transformedText, styleDescription, story.id])

          transformedCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (storyErr) {
        console.error(`Error transforming story ${story.id}:`, storyErr.message)
        errors.push({ storyId: story.id, error: storyErr.message })
      }
    }

    // Update preferences with applied timestamp
    await db.query(`
      INSERT INTO user_style_preferences (user_id, tones, narrative, author_style, applied_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET tones = $2, narrative = $3, author_style = $4, applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    `, [userId, tones || [], narrative, authorStyle])

    res.json({
      success: true,
      transformedCount,
      totalStories: stories.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err) {
    console.error('Apply all styles error:', err)
    res.status(500).json({ error: 'Failed to apply style to stories' })
  }
})

// POST /api/style/revert - Revert all stories to original
router.post('/revert', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    // Revert all stories that have original_answer saved
    const result = await db.query(`
      UPDATE stories
      SET answer = original_answer,
          style_applied = NULL,
          style_applied_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND original_answer IS NOT NULL
      RETURNING id
    `, [userId])

    // Clear applied_at from preferences
    await db.query(`
      UPDATE user_style_preferences
      SET applied_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId])

    res.json({
      success: true,
      revertedCount: result.rows.length
    })
  } catch (err) {
    console.error('Revert styles error:', err)
    res.status(500).json({ error: 'Failed to revert stories' })
  }
})

export default router

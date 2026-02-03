import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { grokChat, parseGrokJson } from '../services/grokService.js'
import Replicate from 'replicate'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('onboarding')

// Chapter image prompt templates - Fine art quality for memoir books
const CHAPTER_PROMPTS = {
  'earliest-memories': (ctx) => {
    const place = ctx.birth_place || 'a small town'
    const country = ctx.birth_country || ''
    const year = ctx.birth_year || 1960
    const decade = Math.floor(year / 10) * 10
    const location = country ? `${place}, ${country}` : place
    return `Stunning aerial or wide establishing shot of ${location} in ${year}. Iconic skyline, famous landmarks, and distinctive ${decade}s architecture of ${place}. Vintage ${decade}s automobiles on empty streets, classic buildings, historic monuments. Beautiful golden hour lighting, cinematic color grading. CRITICAL: The year "${year}" must be displayed as large, elegant typography in the exact CENTER of the image - premium serif font with subtle gold foil effect, professionally kerned like a luxury magazine cover by Pentagram or Sagmeister. The text should be the hero element. NEGATIVE PROMPT: no people, no pedestrians, no crowds, no faces, no interior, no window, no toys, no teddy bear. Style: award-winning architectural photography, 8K, Hasselblad quality, editorial design`
  },

  'childhood': (ctx) => {
    const place = ctx.birth_place || 'a quiet village'
    const year = ctx.birth_year ? ctx.birth_year + 8 : 1968
    return `A stunning fine art painting of childhood in ${place}, circa ${year}. Children playing in a sun-drenched neighborhood street, golden summer afternoon, bicycles leaning against fences, laughter frozen in time. Dappled light through old trees, period-accurate clothing and architecture. Painted in the masterful style of Winslow Homer and Claude Monet - impressionistic warmth with photorealistic emotion. Exquisite detail, gallery-worthy composition`
  },

  'school-days': (ctx) => {
    const country = ctx.birth_country || 'England'
    const year = ctx.birth_year ? ctx.birth_year + 10 : 1970
    return `A magnificent oil painting of a traditional ${country} school in autumn, ${year}. Children with leather satchels walking through fallen golden leaves, historic brick building with tall windows, morning mist lifting. Painted in the luminous style of John Constable and Andrew Wyeth - atmospheric, deeply nostalgic, capturing the bittersweet beauty of youth. Rich autumn palette, masterful light rendering`
  },

  'teenage-years': (ctx) => {
    const year = ctx.birth_year ? ctx.birth_year + 16 : 1976
    return `An evocative fine art painting of a teenager's bedroom, ${year}. Vinyl records scattered, band posters on walls, soft evening light through curtains, a moment of quiet reflection. The threshold between childhood and adulthood. Painted in the intimate style of Edward Hopper meets Vermeer - profound emotional depth, masterful use of light and shadow, capturing the universal experience of adolescence`
  },

  'key-people': (ctx) => {
    const country = ctx.birth_country || 'British'
    return `A magnificent group portrait painting in a warm ${country} home, multiple generations gathered around a table. Grandmother's knowing smile, grandfather's weathered hands, children's innocent joy. Golden afternoon light streaming through windows, family heirlooms visible. Painted in the tradition of Rembrandt and John Singer Sargent - profound emotional connection, masterful portraiture, warm intimate lighting. A painting that tells the story of love across generations`
  },

  'young-adulthood': (ctx) => {
    const year = ctx.birth_year ? ctx.birth_year + 22 : 1982
    return `A cinematic fine art painting of young adulthood, ${year}. A young person gazing out at a city awakening at dawn, standing at the threshold of independence and possibility. Period architecture, morning golden light breaking through, sense of optimism and adventure. Painted in the romantic realism style of Caspar David Friedrich meets Edward Hopper - epic yet intimate, capturing the courage of starting one's own journey`
  },

  'family-career': (ctx) => {
    const year = ctx.birth_year ? ctx.birth_year + 35 : 1995
    return `A heartwarming fine art painting of family life, ${year}. A comfortable home filled with evidence of children - toys, drawings on the fridge, afternoon sunlight in a garden. The quiet pride of building a life. Painted in the warm domestic style of Carl Larsson meets Norman Rockwell - celebrating everyday beauty, rich in detail and emotion, golden afternoon light`
  },

  'world-around-you': (ctx) => {
    const country = ctx.birth_country || 'British'
    return `An artistic fine art painting depicting the flow of history and change through one lifetime. A ${country} perspective on world events - newspapers, television moments, technological evolution woven together. Painted as a sophisticated visual narrative in the style of Diego Rivera's murals meets Ben Shahn - historically evocative, deeply personal yet universal, sepia and muted documentary tones`
  },

  'passions-beliefs': (ctx) => {
    return `A contemplative fine art painting of personal passion and meaning. A quiet corner dedicated to what matters most - perhaps books, art supplies, garden tools, travel mementos, or musical instruments. Natural light, sense of peace and purpose. Painted in the meditative style of Vermeer meets Andrew Wyeth - profound stillness, masterful light, celebrating the quiet things that give life meaning`
  },

  'wisdom-reflections': (ctx) => {
    return `A masterpiece painting of peaceful reflection in life's golden years. An elegant armchair by a window, sunset light streaming in golden and amber, photographs and books nearby, a cup of tea. The earned serenity of a life well-lived. Painted in the transcendent style of Rembrandt's late works meets Vilhelm Hammershøi - profound depth, luminous light, dignity and wisdom, emotionally moving`
  }
}

const STYLE_SUFFIX = '. Photorealistic fine art oil painting, museum gallery quality, 8K resolution, masterful brushwork, emotionally evocative, suitable for a prestigious memoir book. No text, no watermarks, no signatures.'

// Get onboarding status
router.get('/status', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  const result = await db.query(`
    SELECT onboarding_completed, input_preference, birth_place, birth_country, birth_year
    FROM user_onboarding
    WHERE user_id = $1
  `, [userId])

  if (result.rows.length === 0) {
    return res.json({
      completed: false,
      isNewUser: true
    })
  }

  const row = result.rows[0]
  return res.json({
    completed: row.onboarding_completed,
    preference: row.input_preference,
    birthPlace: row.birth_place,
    birthCountry: row.birth_country,
    birthYear: row.birth_year,
    isNewUser: false
  })
}))

// Save input preference (voice or type)
router.post('/preference', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { preference } = req.body

  if (!preference || !['voice', 'type'].includes(preference)) {
    return res.status(400).json({ error: 'Invalid preference. Must be "voice" or "type"' })
  }

  await db.query(`
    INSERT INTO user_onboarding (user_id, input_preference, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      input_preference = $2,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, preference])

  res.json({ success: true, preference })
}))

// Get xAI voice session for onboarding interview
router.post('/voice-session', asyncHandler(async (req, res) => {
  logger.info('Voice session requested', { userId: req.user?.id, requestId: req.id })

  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    logger.error('GROK_API_KEY not configured', { requestId: req.id })
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Create ephemeral token via xAI API
  const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expires_after: { seconds: 600 } // 10 minute token for onboarding
    })
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('xAI session error', { status: response.status, requestId: req.id })
    return res.status(response.status).json({ error: 'Failed to create voice session' })
  }

  const data = await response.json()
  logger.info('Voice session created', { requestId: req.id })
  res.json(data)
}))

// Save context from voice interview (with AI extraction)
router.post('/context', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { transcripts } = req.body

  if (!transcripts || !Array.isArray(transcripts)) {
    return res.status(400).json({ error: 'Transcripts array required' })
  }

  // Use Grok to extract structured data from conversation
  const conversationText = transcripts.map(t => `${t.role}: ${t.content}`).join('\n')

  const systemPrompt = `You are extracting key biographical information from a conversation transcript.
Extract the following and return ONLY valid JSON (no markdown, no explanation):
{
  "user_name": "the person's full name (or null if not mentioned)",
  "birth_place": "city or town name (or null if not mentioned)",
  "birth_country": "country name (or null if not mentioned)",
  "birth_year": 1955 (as number, or null if not mentioned),
  "wants_tour": true or false (did the user say yes to a tour/walkthrough/show me around?),
  "additional_details": ["array of other notable facts mentioned"]
}

Be smart about extracting context. If someone says "I'm John Smith" or "My name is Mary", extract the name.
If someone says "I was born in Manchester in 1952", extract both place and year.
If they say "I grew up in Kent", that's additional context but birth_place might be different.
For wants_tour: Look for responses to "would you like a tour" or similar. "yes", "sure", "show me" = true. "no", "dive in", "let's go" = false. Default to false if unclear.`

  const result = await grokChat({
    systemPrompt,
    userPrompt: `Extract biographical info from this conversation:\n\n${conversationText}`,
    temperature: 0.3,
    maxTokens: 500
  })

  const defaultExtracted = {
    user_name: null,
    birth_place: null,
    birth_country: null,
    birth_year: null,
    wants_tour: false,
    additional_details: []
  }

  const extracted = { ...defaultExtracted, ...parseGrokJson(result.content) }

  // Update user's name if extracted
  if (extracted.user_name) {
    await db.query(`UPDATE users SET name = $1 WHERE id = $2`, [extracted.user_name, userId])
  }

  // Save to database
  await db.query(`
    INSERT INTO user_onboarding (user_id, birth_place, birth_country, birth_year, additional_context, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      birth_place = COALESCE($2, user_onboarding.birth_place),
      birth_country = COALESCE($3, user_onboarding.birth_country),
      birth_year = COALESCE($4, user_onboarding.birth_year),
      additional_context = $5,
      updated_at = CURRENT_TIMESTAMP
  `, [
    userId,
    extracted.birth_place,
    extracted.birth_country,
    extracted.birth_year,
    JSON.stringify({ details: extracted.additional_details, transcripts })
  ])

  res.json({
    success: true,
    extracted,
    userName: extracted.user_name
  })
}))

// Save context from type form (direct input)
router.post('/context-form', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { name, birthPlace, birthCountry, birthYear, additionalContext } = req.body

  // Update user name if provided
  if (name) {
    await db.query(`UPDATE users SET name = $1 WHERE id = $2`, [name, userId])
  }

  await db.query(`
    INSERT INTO user_onboarding (user_id, birth_place, birth_country, birth_year, additional_context, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      birth_place = COALESCE($2, user_onboarding.birth_place),
      birth_country = COALESCE($3, user_onboarding.birth_country),
      birth_year = COALESCE($4, user_onboarding.birth_year),
      additional_context = COALESCE($5, user_onboarding.additional_context),
      updated_at = CURRENT_TIMESTAMP
  `, [
    userId,
    birthPlace || null,
    birthCountry || null,
    birthYear ? parseInt(birthYear) : null,
    JSON.stringify({ additionalContext: additionalContext || '' })
  ])

  res.json({ success: true, userName: name || null })
}))

// Reset onboarding (for testing)
router.delete('/reset', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Delete onboarding data
  await db.query(`DELETE FROM user_onboarding WHERE user_id = $1`, [userId])

  // Delete all chapter images
  await db.query(`DELETE FROM chapter_images WHERE user_id = $1`, [userId])

  res.json({ success: true, message: 'Onboarding reset. You can start fresh.' })
}))

// Complete onboarding and trigger image generation
router.post('/complete', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Mark onboarding as complete
  await db.query(`
    UPDATE user_onboarding
    SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
  `, [userId])

  // Get user context for image generation
  const contextResult = await db.query(`
    SELECT birth_place, birth_country, birth_year, additional_context
    FROM user_onboarding
    WHERE user_id = $1
  `, [userId])

  const context = contextResult.rows[0] || {}

  // Generate earliest-memories image based on birthplace/year from interview
  // Other chapters get personalized images when they are 100% completed
  generateChapterImagesAsync(db, userId, context).catch(err => {
    logger.error('Background image generation error', { userId, error: err.message })
  })

  res.json({
    success: true,
    message: 'Onboarding complete! Your first chapter artwork is being created.'
  })
}))

// Async function to generate ONLY the first chapter image (earliest-memories)
// Other chapters get images when user starts working on them
async function generateChapterImagesAsync(db, userId, context) {
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    logger.warn('REPLICATE_API_TOKEN not configured - skipping image generation')
    return
  }

  // Only generate earliest-memories on onboarding - it's based on birthplace/year
  const chapterId = 'earliest-memories'
  const promptFn = CHAPTER_PROMPTS[chapterId]
  if (!promptFn) return

  const replicate = new Replicate({ auth: replicateToken })

  try {
    // Mark as generating
    await db.query(`
      INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
      VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, chapter_id) DO UPDATE SET
        generation_status = 'generating',
        updated_at = CURRENT_TIMESTAMP
    `, [userId, chapterId])

    // Build personalized prompt based on interview context
    const prompt = promptFn(context) + STYLE_SUFFIX
    logger.info('Generating personalized image', {
      chapterId,
      userId,
      birthPlace: context.birth_place,
      birthCountry: context.birth_country,
      birthYear: context.birth_year
    })

    // Generate image via Replicate/Flux Pro (highest quality)
    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 100,
        safety_tolerance: 2,
        prompt_upsampling: true
      }
    })

    // Get the image URL from output (handle different response formats)
    let imageUrl = null
    if (typeof output === 'string') {
      imageUrl = output
    } else if (Array.isArray(output) && output[0]) {
      imageUrl = typeof output[0] === 'string' ? output[0] : output[0]?.url?.() || null
    } else if (output?.url) {
      imageUrl = typeof output.url === 'function' ? output.url() : output.url
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from Replicate')
    }

    // Update with success
    await db.query(`
      UPDATE chapter_images
      SET image_url = $1, prompt_used = $2, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3 AND chapter_id = $4
    `, [imageUrl, prompt, userId, chapterId])

    logger.info('Successfully generated personalized image', { chapterId, userId })

  } catch (err) {
    logger.error('Image generation failed', { chapterId, userId, error: err.message })
    await db.query(`
      UPDATE chapter_images
      SET generation_status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND chapter_id = $2
    `, [userId, chapterId])
  }
}

export default router

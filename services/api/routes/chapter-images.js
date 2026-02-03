import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import Replicate from 'replicate'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('chapter-images')

// Get all chapter images for user
router.get('/', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  const result = await db.query(`
    SELECT chapter_id, image_url, generation_status, created_at, updated_at
    FROM chapter_images
    WHERE user_id = $1
    ORDER BY created_at
  `, [userId])

  // Convert to object keyed by chapter_id for easier frontend usage
  const images = {}
  for (const row of result.rows) {
    images[row.chapter_id] = {
      imageUrl: row.image_url,
      status: row.generation_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  res.json({ images })
}))

// Get image status for all chapters (lighter endpoint for polling)
router.get('/status', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  const result = await db.query(`
    SELECT chapter_id, generation_status, image_url
    FROM chapter_images
    WHERE user_id = $1
  `, [userId])

  const status = {}
  let pendingCount = 0
  let generatingCount = 0
  let completedCount = 0
  let failedCount = 0

  for (const row of result.rows) {
    status[row.chapter_id] = {
      status: row.generation_status,
      hasImage: !!row.image_url
    }

    switch (row.generation_status) {
      case 'pending': pendingCount++; break
      case 'generating': generatingCount++; break
      case 'completed': completedCount++; break
      case 'failed': failedCount++; break
    }
  }

  res.json({
    status,
    summary: {
      pending: pendingCount,
      generating: generatingCount,
      completed: completedCount,
      failed: failedCount,
      total: result.rows.length
    }
  })
}))

// Regenerate a specific chapter image
router.post('/generate/:chapterId', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id
  const { chapterId } = req.params

  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    return res.status(500).json({ error: 'Image generation not configured' })
  }

  // Get user context
  const contextResult = await db.query(`
    SELECT birth_place, birth_country, birth_year
    FROM user_onboarding
    WHERE user_id = $1
  `, [userId])

  const context = contextResult.rows[0] || {}

  // Chapter prompt templates - Fine art quality for memoir books
  const CHAPTER_PROMPTS = {
    'earliest-memories': (ctx) => {
      const place = ctx.birth_place || 'a small town'
      const year = ctx.birth_year || 1960
      return `A breathtaking fine art painting of ${place} in ${year}, capturing the essence of early childhood memories. Golden morning light filters through vintage lace curtains into a cozy nursery. Iconic architecture of ${place} visible through the window. Antique wooden toys, a worn teddy bear, soft blankets. IMPORTANT: The year "${year}" must appear as elegant gold serif typography, professionally designed, centered in the middle of the composition like a luxury memoir book cover. Painted in the style of Norman Rockwell meets John Singer Sargent - masterful brushwork, rich warm tones, deeply nostalgic and emotionally evocative. Museum quality oil painting, 8K detail`
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

  const promptFn = CHAPTER_PROMPTS[chapterId]
  if (!promptFn) {
    return res.status(400).json({ error: 'Invalid chapter ID' })
  }

  // Mark as generating
  await db.query(`
    INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
    VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, chapter_id) DO UPDATE SET
      generation_status = 'generating',
      updated_at = CURRENT_TIMESTAMP
  `, [userId, chapterId])

  // Return immediately - generation happens async
  res.json({
    success: true,
    message: 'Image generation started',
    chapterId
  })

  // Generate in background
  try {
    const replicate = new Replicate({ auth: replicateToken })
    const prompt = promptFn(context) + STYLE_SUFFIX

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

    const imageUrl = typeof output === 'string' ? output :
                     (Array.isArray(output) ? output[0] : null) ||
                     output?.url?.()

    if (imageUrl) {
      await db.query(`
        UPDATE chapter_images
        SET image_url = $1, prompt_used = $2, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND chapter_id = $4
      `, [imageUrl, prompt, userId, chapterId])
    } else {
      throw new Error('No image URL returned')
    }
  } catch (err) {
    logger.error('Regeneration failed', { chapterId, userId, error: err.message, requestId: req.id })
    await db.query(`
      UPDATE chapter_images
      SET generation_status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND chapter_id = $2
    `, [userId, chapterId])
  }
}))

// Clear all chapter images except earliest-memories (for testing new flow)
router.delete('/reset', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  await db.query(`
    DELETE FROM chapter_images
    WHERE user_id = $1 AND chapter_id != 'earliest-memories'
  `, [userId])

  res.json({ success: true, message: 'Cleared all chapter images except earliest-memories' })
}))

export default router

import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import Replicate from 'replicate'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('chapter-images')

// Get all chapter images for user
router.get(
  '/',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `
    SELECT chapter_id, image_url, generation_status, created_at, updated_at
    FROM chapter_images
    WHERE user_id = $1
    ORDER BY created_at
  `,
      [userId]
    )

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
  })
)

// Get image status for all chapters (lighter endpoint for polling)
router.get(
  '/status',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `
    SELECT chapter_id, generation_status, image_url
    FROM chapter_images
    WHERE user_id = $1
  `,
      [userId]
    )

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
        case 'pending':
          pendingCount++
          break
        case 'generating':
          generatingCount++
          break
        case 'completed':
          completedCount++
          break
        case 'failed':
          failedCount++
          break
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
  })
)

// Regenerate a specific chapter image
router.post(
  '/generate/:chapterId',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { chapterId } = req.params

    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) {
      return res.status(500).json({ error: 'Image generation not configured' })
    }

    // Get user context
    const contextResult = await db.query(
      `
    SELECT birth_place, birth_country, birth_year
    FROM user_onboarding
    WHERE user_id = $1
  `,
      [userId]
    )

    const context = contextResult.rows[0] || {}

    // Chapter prompt templates - Fine art quality for memoir books
    const CHAPTER_PROMPTS = {
      'heritage-roots': ctx => {
        const country = ctx.birth_country || 'England'
        const year = ctx.birth_year ? ctx.birth_year - 30 : 1930
        return `A magnificent fine art painting of family heritage and roots, circa ${year}. An old sepia-toned family photograph come to life - grandparents standing proudly outside a ${country} home, period clothing, weathered hands, dignified expressions. Old documents, immigration papers, and faded letters scattered artfully. Painted in the rich documentary style of Thomas Eakins meets August Sander - profound historical depth, warm sepia and earth tones, connecting past to present`
      },
      'earliest-memories': ctx => {
        const place = ctx.birth_place || 'a small town'
        const year = ctx.birth_year || 1960
        return `A breathtaking fine art painting of ${place} in ${year}, capturing the essence of early childhood memories. Golden morning light filters through vintage lace curtains into a cozy nursery. Iconic architecture of ${place} visible through the window. Antique wooden toys, a worn teddy bear, soft blankets. IMPORTANT: The year "${year}" must appear as elegant gold serif typography, professionally designed, centered in the middle of the composition like a luxury memoir book cover. Painted in the style of Norman Rockwell meets John Singer Sargent - masterful brushwork, rich warm tones, deeply nostalgic and emotionally evocative. Museum quality oil painting, 8K detail`
      },
      childhood: ctx => {
        const place = ctx.birth_place || 'a quiet village'
        const year = ctx.birth_year ? ctx.birth_year + 8 : 1968
        return `A stunning fine art painting of childhood in ${place}, circa ${year}. Children playing in a sun-drenched neighborhood street, golden summer afternoon, bicycles leaning against fences, laughter frozen in time. Dappled light through old trees, period-accurate clothing and architecture. Painted in the masterful style of Winslow Homer and Claude Monet - impressionistic warmth with photorealistic emotion. Exquisite detail, gallery-worthy composition`
      },
      'school-days': ctx => {
        const country = ctx.birth_country || 'England'
        const year = ctx.birth_year ? ctx.birth_year + 10 : 1970
        return `A magnificent oil painting of a traditional ${country} school in autumn, ${year}. Children with leather satchels walking through fallen golden leaves, historic brick building with tall windows, morning mist lifting. Painted in the luminous style of John Constable and Andrew Wyeth - atmospheric, deeply nostalgic, capturing the bittersweet beauty of youth. Rich autumn palette, masterful light rendering`
      },
      'teenage-years': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 16 : 1976
        return `An evocative fine art painting of a teenager's bedroom, ${year}. Vinyl records scattered, band posters on walls, soft evening light through curtains, a moment of quiet reflection. The threshold between childhood and adulthood. Painted in the intimate style of Edward Hopper meets Vermeer - profound emotional depth, masterful use of light and shadow, capturing the universal experience of adolescence`
      },
      'key-people': ctx => {
        const country = ctx.birth_country || 'British'
        return `A magnificent group portrait painting in a warm ${country} home, multiple generations gathered around a table. Grandmother's knowing smile, grandfather's weathered hands, children's innocent joy. Golden afternoon light streaming through windows, family heirlooms visible. Painted in the tradition of Rembrandt and John Singer Sargent - profound emotional connection, masterful portraiture, warm intimate lighting. A painting that tells the story of love across generations`
      },
      'young-adulthood': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 22 : 1982
        return `A cinematic fine art painting of young adulthood, ${year}. A young person gazing out at a city awakening at dawn, standing at the threshold of independence and possibility. Period architecture, morning golden light breaking through, sense of optimism and adventure. Painted in the romantic realism style of Caspar David Friedrich meets Edward Hopper - epic yet intimate, capturing the courage of starting one's own journey`
      },
      'love-relationships': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 25 : 1985
        return `A romantic fine art painting of love and courtship, ${year}. A couple walking together through a beautiful setting, hands intertwined, soft golden evening light. Period-accurate clothing and scenery. Flowers, a handwritten letter, a sense of tenderness and devotion. Painted in the romantic style of John William Waterhouse meets Pierre-Auguste Renoir - luminous skin tones, flowing composition, capturing the timeless beauty of falling in love`
      },
      'family-career': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 35 : 1995
        return `A heartwarming fine art painting of family life, ${year}. A comfortable home filled with evidence of children - toys, drawings on the fridge, afternoon sunlight in a garden. The quiet pride of building a life. Painted in the warm domestic style of Carl Larsson meets Norman Rockwell - celebrating everyday beauty, rich in detail and emotion, golden afternoon light`
      },
      'home-places': ctx => {
        const country = ctx.birth_country || 'English'
        return `A nostalgic fine art painting of home and place. A row of ${country} houses through the seasons - spring blossom, summer gardens, autumn leaves, winter frost. Washing lines, garden gates, children's bicycles, warm lights in windows. A lifetime of homes captured in one scene. Painted in the warm narrative style of L.S. Lowry meets Edward Hopper - intimate domestic beauty, golden light, the quiet poetry of everyday places`
      },
      'traditions-celebrations': ctx => {
        const country = ctx.birth_country || 'British'
        return `A joyous fine art painting of ${country} family celebrations through the decades. A Christmas table laden with food, crackers, and candles. Party hats, birthday cakes, wedding confetti, seasonal decorations. Multiple generations gathered in celebration. Painted in the festive warmth of Norman Rockwell meets Jan Steen - rich colour, abundant detail, capturing the joy and ritual of family traditions`
      },
      'world-around-you': ctx => {
        const country = ctx.birth_country || 'British'
        return `An artistic fine art painting depicting the flow of history and change through one lifetime. A ${country} perspective on world events - newspapers, television moments, technological evolution woven together. Painted as a sophisticated visual narrative in the style of Diego Rivera's murals meets Ben Shahn - historically evocative, deeply personal yet universal, sepia and muted documentary tones`
      },
      'travel-adventure': ctx => {
        return `A breathtaking fine art painting of travel and adventure. A vintage suitcase covered in travel stickers, an open passport, a compass, and a world map spread on a table by a window overlooking a stunning landscape. Warm golden light, sense of wanderlust and discovery. Painted in the adventurous romantic style of Delacroix meets Winslow Homer - vivid colours, sweeping composition, capturing the thrill of exploration and the beauty of distant places`
      },
      'passions-beliefs': ctx => {
        return `A contemplative fine art painting of personal passion and meaning. A quiet corner dedicated to what matters most - perhaps books, art supplies, garden tools, travel mementos, or musical instruments. Natural light, sense of peace and purpose. Painted in the meditative style of Vermeer meets Andrew Wyeth - profound stillness, masterful light, celebrating the quiet things that give life meaning`
      },
      'challenges-resilience': ctx => {
        return `A powerful fine art painting of human resilience and strength. A lone figure standing firm against a dramatic sky, wind in their hair, hands weathered but strong. Behind them, a path through a storm-torn landscape leading to golden light on the horizon. Painted in the dramatic emotional style of Caspar David Friedrich meets Kathe Kollwitz - profound depth, contrast between darkness and light, capturing the courage of the human spirit`
      },
      'later-life': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 65 : 2025
        return `A warm, dignified fine art painting of later life, circa ${year}. A grandparent with grandchildren in a sunlit garden, laughter and connection across generations. Comfortable home in background, well-tended flowers, a sense of earned peace and contentment. Painted in the tender style of Mary Cassatt meets Joaquín Sorolla - beautiful light, human warmth, celebrating the richness of life's later chapters`
      },
      'wisdom-reflections': ctx => {
        return `A masterpiece painting of peaceful reflection in life's golden years. An elegant armchair by a window, sunset light streaming in golden and amber, photographs and books nearby, a cup of tea. The earned serenity of a life well-lived. Painted in the transcendent style of Rembrandt's late works meets Vilhelm Hammershøi - profound depth, luminous light, dignity and wisdom, emotionally moving`
      },
      'letters-loved-ones': ctx => {
        return `A deeply moving fine art painting of handwritten letters on a writing desk. Beautiful fountain pen, cream stationery, pressed flowers, old photographs scattered nearby. Soft candlelight and golden afternoon sun. Ink still wet on the page, words of love visible. Painted in the intimate tender style of Vermeer meets Mary Cassatt - profound emotional warmth, exquisite detail, capturing the sacred act of writing words from the heart to those you love most`
      },
      // Optional bonus chapters
      'bonus-working-life': ctx => {
        const country = ctx.birth_country || 'British'
        const year = ctx.birth_year ? ctx.birth_year + 25 : 1985
        return `A magnificent fine art painting of ${country} working life, circa ${year}. A bustling workplace scene - factory floor, office, workshop, or shop counter - filled with the energy of honest labour. Workers in period clothing, tea mugs, lunchboxes, time clocks, morning light through industrial windows. The dignity and camaraderie of the working day. Painted in the proud documentary style of L.S. Lowry meets Ford Madox Brown - celebrating the beauty of work, warm industrial tones, rich human detail`
      },
      'bonus-food-table': ctx => {
        const country = ctx.birth_country || 'British'
        return `A sumptuous fine art still life painting of ${country} home cooking through the decades. A laden kitchen table with a golden Sunday roast, steaming vegetables, homemade pudding, a pot of tea. Vintage crockery, a well-worn recipe book, flour-dusted hands, warm oven light. Painted in the rich domestic tradition of Chardin meets Carl Larsson - celebrating the warmth and nourishment of home cooking, golden light, abundant detail, the love that goes into feeding a family`
      },
      'bonus-service-duty': ctx => {
        const year = ctx.birth_year ? ctx.birth_year + 20 : 1980
        return `A powerful fine art painting of service and duty, circa ${year}. A young person in uniform - military, nursing, emergency services - standing tall with quiet determination. Parade grounds, barracks, or station in background, morning light breaking through clouds. Comrades nearby, sense of purpose and belonging. Painted in the heroic documentary style of John Singer Sargent's war paintings meets Stanley Spencer - dignity, courage, the bonds forged through shared service`
      },
      'bonus-pets-companions': ctx => {
        return `A heartwarming fine art painting of beloved pets across a lifetime. A faithful dog resting by a fireside, a cat curled on an armchair, family photos on the mantelpiece showing different pets through the years. Golden afternoon light, cosy home setting, the unconditional love between humans and animals. Painted in the tender style of Edwin Landseer meets Briton Riviere - capturing the profound bond between people and their animal companions, warm tones, emotional depth`
      },
      'bonus-extraordinary': ctx => {
        return `A dramatic cinematic fine art painting of an extraordinary moment frozen in time. A figure standing at the edge of something remarkable - a mountain summit, a stage, a historic event, a moment of discovery. Dramatic golden light breaking through clouds, sense of awe and wonder, the feeling of witnessing something you will never forget. Painted in the epic romantic style of J.M.W. Turner meets Caspar David Friedrich - sublime, breathtaking, capturing the moments that make a life extraordinary`
      },
      'bonus-own-words': ctx => {
        return `A contemplative fine art painting of an open blank book on a beautiful writing desk, awaiting a story. A fountain pen rests beside it, golden light streaming through a window onto the pristine pages. Around the desk, fragments of a life - photographs, pressed flowers, a cup of tea, spectacles, a handwritten note. The promise of a story yet to be told. Painted in the intimate meditative style of Vilhelm Hammershoi meets Vermeer - profound stillness, luminous light, the sacred space of personal expression`
      }
    }

    const STYLE_SUFFIX =
      '. Photorealistic fine art oil painting, museum gallery quality, 8K resolution, masterful brushwork, emotionally evocative, suitable for a prestigious memoir book. No text, no watermarks, no signatures.'

    const promptFn = CHAPTER_PROMPTS[chapterId]
    if (!promptFn) {
      return res.status(400).json({ error: 'Invalid chapter ID' })
    }

    // Mark as generating
    await db.query(
      `
    INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
    VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, chapter_id) DO UPDATE SET
      generation_status = 'generating',
      updated_at = CURRENT_TIMESTAMP
  `,
      [userId, chapterId]
    )

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

      const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 100,
          safety_tolerance: 2,
          prompt_upsampling: true
        }
      })

      let imageUrl = null
      if (output?.url && typeof output.url === 'function') {
        imageUrl = output.url()
      } else if (Array.isArray(output) && output[0]) {
        imageUrl = typeof output[0].url === 'function' ? output[0].url() : output[0]
      } else if (typeof output === 'string') {
        imageUrl = output
      }

      // Clean up JSON-stringified URLs (Replicate sometimes wraps in quotes)
      if (typeof imageUrl === 'string') {
        imageUrl = imageUrl.replace(/^"|"$/g, '')
      }

      if (imageUrl) {
        await db.query(
          `
        UPDATE chapter_images
        SET image_url = $1, prompt_used = $2, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND chapter_id = $4
      `,
          [imageUrl, prompt, userId, chapterId]
        )
      } else {
        throw new Error('No image URL returned')
      }
    } catch (err) {
      logger.error('Regeneration failed', {
        chapterId,
        userId,
        error: err.message,
        requestId: req.id
      })
      await db.query(
        `
      UPDATE chapter_images
      SET generation_status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND chapter_id = $2
    `,
        [userId, chapterId]
      )
    }
  })
)

// Clear all chapter images except earliest-memories (for testing new flow)
router.delete(
  '/reset',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    await db.query(
      `
    DELETE FROM chapter_images
    WHERE user_id = $1 AND chapter_id != 'earliest-memories'
  `,
      [userId]
    )

    res.json({ success: true, message: 'Cleared all chapter images except earliest-memories' })
  })
)

export default router

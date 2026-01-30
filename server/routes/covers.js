import { Router } from 'express'
import Replicate from 'replicate'

const router = Router()

// Cover style presets - VERY DIFFERENT graphic design styles (abstract, NOT literal imagery)
const COVER_STYLES = {
  classic: {
    id: 'classic',
    name: 'Classic & Elegant',
    description: 'Timeless design with subtle textures',
    icon: 'classic',
    styleGuide: 'STYLE: luxurious cream and gold color scheme, elegant marbled paper texture background, thin decorative gold border frame, subtle art deco geometric corner ornaments, soft ivory and champagne gradients, timeless sophisticated book design reminiscent of classic literature',
    colors: ['#f5e6d3', '#d4a574', '#8b6914']
  },
  modern: {
    id: 'modern',
    name: 'Modern & Clean',
    description: 'Minimalist with bold design',
    icon: 'modern',
    styleGuide: 'STYLE: stark minimalist design, pure white background with single bold black geometric shape, dramatic use of negative space, one striking accent color splash, swiss design inspired, clean sharp edges, ultra-contemporary editorial aesthetic',
    colors: ['#2d3748', '#4a5568', '#e2e8f0']
  },
  nature: {
    id: 'nature',
    name: 'Nature & Peaceful',
    description: 'Soft organic patterns',
    icon: 'nature',
    styleGuide: 'STYLE: soft watercolor wash background in sage greens and dusty blues, delicate abstract botanical line drawings, flowing organic curves and shapes, dreamy ethereal gradients, japanese zen inspired minimalism, peaceful meditative feeling',
    colors: ['#4a7c59', '#87a878', '#f0e6d3']
  },
  family: {
    id: 'family',
    name: 'Family & Warmth',
    description: 'Warm tones and textures',
    icon: 'family',
    styleGuide: 'STYLE: warm sunset gradient from deep orange to soft pink, soft focus bokeh light orbs, vintage film grain texture overlay, rich amber and honey golden tones, nostalgic polaroid photograph aesthetic, cozy intimate feeling',
    colors: ['#b45309', '#f59e0b', '#fef3c7']
  },
  artistic: {
    id: 'artistic',
    name: 'Artistic & Colorful',
    description: 'Vibrant abstract patterns',
    icon: 'artistic',
    styleGuide: 'STYLE: bold abstract expressionist splashes, vibrant clashing colors - hot pink magenta electric blue lime green, dynamic paint drips and thick brushstroke textures, energetic chaotic composition, gallery contemporary art, kandinsky rothko inspired',
    colors: ['#7c3aed', '#ec4899', '#06b6d4']
  },
  heritage: {
    id: 'heritage',
    name: 'Heritage & Tradition',
    description: 'Rich vintage textures',
    icon: 'heritage',
    styleGuide: 'STYLE: deep burgundy and forest green with gold accents, ornate victorian decorative borders, rich embossed leather texture, intricate gold filigree patterns, royal crest inspired design elements, distinguished antique book aesthetic',
    colors: ['#7c2d12', '#d4a574', '#1c1917']
  }
}

// Book format presets - simplified from full options
const BOOK_FORMATS = {
  paperback: {
    id: 'paperback',
    name: 'Paperback',
    description: 'Classic softcover memoir',
    icon: 'paperback',
    price: '£29',
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'PB',
      paper: '060UC',
      color: 'FC',
      finish: 'M'
    }
  },
  hardcover: {
    id: 'hardcover',
    name: 'Hardcover',
    description: 'Premium quality keepsake',
    icon: 'hardcover',
    price: '£49',
    popular: true,
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'CW',
      paper: '080CW',
      color: 'FC',
      finish: 'G'
    }
  },
  deluxe: {
    id: 'deluxe',
    name: 'Deluxe Heirloom',
    description: 'Linen cover with gold foil',
    icon: 'deluxe',
    price: '£79',
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'LW',
      paper: '080CW',
      color: 'FC',
      finish: 'M',
      linen: 'N',
      foil: 'G'
    }
  }
}

// Initialize Replicate client
function getReplicateClient() {
  const apiKey = process.env.REPLICATE_API_TOKEN
  if (!apiKey) {
    throw new Error('REPLICATE_API_TOKEN not set')
  }
  return new Replicate({ auth: apiKey })
}

// Get available cover styles and book formats
router.get('/options', (req, res) => {
  res.json({
    coverStyles: Object.values(COVER_STYLES),
    bookFormats: Object.values(BOOK_FORMATS)
  })
})

// Extract key themes and imagery from user's stories
async function extractStoryContext(db, userId) {
  if (!db) return null

  try {
    // Get user's stories
    const result = await db.query(
      `SELECT answer FROM stories WHERE user_id = $1 AND answer IS NOT NULL AND answer != '' LIMIT 10`,
      [userId]
    )

    if (result.rows.length === 0) return null

    // Combine all story text
    const allText = result.rows.map(r => r.answer).join(' ').toLowerCase()

    // Extract potential locations
    const locationPatterns = [
      /(?:grew up|lived|born|raised|home|house|flat|apartment)\s+(?:in|at|near|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /(?:london|manchester|birmingham|liverpool|edinburgh|glasgow|cardiff|belfast|dublin|new york|california|seaside|countryside|village|town|city|coast|beach|mountains|hills|farm|urban|rural)/gi
    ]

    const locations = new Set()
    for (const pattern of locationPatterns) {
      const matches = allText.match(pattern)
      if (matches) matches.forEach(m => locations.add(m.trim()))
    }

    // Extract themes and imagery
    const themes = {
      sea: /\b(sea|ocean|beach|coast|waves|shore|sailing|boat|fishing|harbour|pier|lighthouse)\b/i.test(allText),
      nature: /\b(garden|trees|forest|woods|flowers|meadow|fields|farm|countryside|hills|mountains|river|lake)\b/i.test(allText),
      city: /\b(city|urban|streets|buildings|shops|market|busy|traffic|flat|apartment|terrace)\b/i.test(allText),
      family: /\b(family|mother|father|grandmother|grandfather|siblings|brother|sister|children|home|kitchen|dinner)\b/i.test(allText),
      childhood: /\b(childhood|playing|games|school|toys|young|memories|remember)\b/i.test(allText),
      music: /\b(music|singing|piano|guitar|dance|radio|songs|band|concert)\b/i.test(allText),
      travel: /\b(travel|holiday|journey|abroad|flying|train|adventure|explore)\b/i.test(allText),
      books: /\b(reading|books|library|stories|writing|literature)\b/i.test(allText),
      war: /\b(war|military|soldier|service|veteran|wartime)\b/i.test(allText),
      work: /\b(work|career|office|job|profession|business|factory|shop)\b/i.test(allText)
    }

    // Build abstract color/mood suggestions based on themes (NOT literal imagery)
    const imagery = []
    if (themes.sea) imagery.push('deep ocean blue gradients', 'flowing wave-like abstract curves')
    if (themes.nature) imagery.push('organic flowing shapes', 'soft sage and forest green palette')
    if (themes.city) imagery.push('geometric angular patterns', 'urban grey and amber tones')
    if (themes.family) imagery.push('warm amber and golden hues', 'soft rounded abstract forms')
    if (themes.childhood) imagery.push('playful bright color accents', 'whimsical circular patterns')
    if (themes.music) imagery.push('rhythmic repeating patterns', 'dynamic flowing lines')
    if (themes.travel) imagery.push('bold adventurous color blocks', 'dynamic diagonal compositions')

    return {
      locations: Array.from(locations).slice(0, 3),
      themes: Object.entries(themes).filter(([_, v]) => v).map(([k]) => k),
      imagery: imagery.slice(0, 4)
    }
  } catch (err) {
    console.error('Error extracting story context:', err)
    return null
  }
}

// Build a clean book cover prompt
function buildCoverPrompt(style, storyContext, bookTitle) {
  const base = `Professional book cover, full wrap design, landscape 3:2 ratio. Left side is back cover, right side is front cover. ${style.styleGuide}. High-end modern graphic design.`

  if (bookTitle) {
    return `${base} Display the title '${bookTitle}' prominently on the right side (front cover). Only include this exact title text, nothing else.`
  }
  return `${base} No text on the cover.`
}

// Generate AI book cover
router.post('/generate', async (req, res) => {
  const { styleId, bookTitle, customPrompt } = req.body
  const db = req.app.locals.db

  const style = COVER_STYLES[styleId]
  if (!style && !customPrompt) {
    return res.status(400).json({ error: 'Invalid style or no custom prompt provided' })
  }

  try {
    const replicate = getReplicateClient()

    // Extract context from user's stories
    const storyContext = await extractStoryContext(db, req.user.id)
    console.log('Story context:', storyContext)

    // Build the cover prompt
    const fullPrompt = customPrompt || buildCoverPrompt(style, storyContext, bookTitle)
    console.log('Cover prompt:', fullPrompt)

    // Use Ideogram V3 Turbo for text rendering on book covers
    // Landscape 3:2 ratio for full-wrap book cover (back | spine | front)
    const output = await replicate.run(
      "ideogram-ai/ideogram-v3-turbo",
      {
        input: {
          prompt: fullPrompt,
          aspect_ratio: "3:2",
          magic_prompt_option: "On"
        }
      }
    )

    // Ideogram returns a FileOutput object with url() method
    const imageUrl = output?.url ? output.url() : (Array.isArray(output) ? output[0] : output)

    res.json({
      success: true,
      imageUrl,
      prompt: fullPrompt,
      storyContext,
      style: style?.id || 'custom'
    })
  } catch (err) {
    console.error('Cover generation error:', err.message)
    res.status(500).json({
      error: 'Failed to generate cover',
      message: err.message
    })
  }
})

// Generate multiple cover variations with different compositions
router.post('/generate-variations', async (req, res) => {
  const { styleId, userName, bookTitle, authorName } = req.body
  const db = req.app.locals.db

  const style = COVER_STYLES[styleId]
  if (!style) {
    return res.status(400).json({ error: 'Invalid style' })
  }

  try {
    const replicate = getReplicateClient()

    // Extract context from user's stories
    const storyContext = await extractStoryContext(db, req.user.id)

    // Base prompt with story context, title, and author
    const basePrompt = buildCoverPrompt(style, storyContext, bookTitle)

    // Generate variations with different compositions
    const variationModifiers = [
      'centered symmetrical composition',
      'dramatic diagonal composition with depth',
      'soft focus background with sharp foreground element'
    ]

    const promises = variationModifiers.map(async (modifier, index) => {
      const fullPrompt = `${basePrompt}, ${modifier}`

      const output = await replicate.run(
        "ideogram-ai/ideogram-v3-turbo",
        {
          input: {
            prompt: fullPrompt,
            aspect_ratio: "3:2",
            output_format: "png"
          }
        }
      )

      const imageUrl = output?.url ? output.url() : (Array.isArray(output) ? output[0] : output)

      return {
        imageUrl,
        variationIndex: index
      }
    })

    const results = await Promise.all(promises)

    res.json({
      success: true,
      variations: results,
      style: style.id
    })
  } catch (err) {
    console.error('Cover variations error:', err.message)
    res.status(500).json({
      error: 'Failed to generate cover variations',
      message: err.message
    })
  }
})

export default router
export { COVER_STYLES, BOOK_FORMATS }

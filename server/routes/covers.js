import { Router } from 'express'
import Replicate from 'replicate'

const router = Router()

// Style presets for image generation
const COVER_STYLES = {
  classic: {
    id: 'classic',
    name: 'Classic & Elegant',
    description: 'Timeless design with subtle textures',
    icon: 'classic',
    styleGuide: 'cream and gold abstract pattern, smooth gradient background',
    colors: ['#f5e6d3', '#d4a574', '#8b6914']
  },
  modern: {
    id: 'modern',
    name: 'Modern & Clean',
    description: 'Minimalist with bold design',
    icon: 'modern',
    styleGuide: 'minimalist white background with bold black shape, negative space',
    colors: ['#2d3748', '#4a5568', '#e2e8f0']
  },
  nature: {
    id: 'nature',
    name: 'Nature & Peaceful',
    description: 'Soft organic patterns',
    icon: 'nature',
    styleGuide: 'watercolor greens and blues, flowing organic shapes, soft gradients',
    colors: ['#4a7c59', '#87a878', '#f0e6d3']
  },
  family: {
    id: 'family',
    name: 'Family & Warmth',
    description: 'Warm tones and textures',
    icon: 'family',
    styleGuide: 'warm orange to pink gradient, soft light orbs, amber tones',
    colors: ['#b45309', '#f59e0b', '#fef3c7']
  },
  artistic: {
    id: 'artistic',
    name: 'Artistic & Colorful',
    description: 'Vibrant abstract patterns',
    icon: 'artistic',
    styleGuide: 'abstract paint splashes, bright pink blue green colors, energetic',
    colors: ['#7c3aed', '#ec4899', '#06b6d4']
  },
  heritage: {
    id: 'heritage',
    name: 'Heritage & Tradition',
    description: 'Rich vintage textures',
    icon: 'heritage',
    styleGuide: 'deep burgundy and green, gold accents, vintage style',
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
router.get('/options', (_req, res) => {
  res.json({
    coverStyles: Object.values(COVER_STYLES),
    bookFormats: Object.values(BOOK_FORMATS)
  })
})

// Build prompt for image generation
function buildImagePrompt(style, bookTitle) {
  if (bookTitle) {
    return {
      prompt: `Create a high end graphic design image, ${style.styleGuide}. Text "${bookTitle}" on the right. No other text.`,
      negative_prompt: 'book, pages, spine, 3d, mockup, photo, realistic'
    }
  }
  return {
    prompt: `Create a high end graphic design image, ${style.styleGuide}.`,
    negative_prompt: 'book, pages, 3d, mockup, photo, realistic, text'
  }
}

// Generate image
router.post('/generate', async (req, res) => {
  const { styleId, bookTitle, customPrompt } = req.body

  const style = COVER_STYLES[styleId]
  if (!style && !customPrompt) {
    return res.status(400).json({ error: 'Invalid style or no custom prompt provided' })
  }

  try {
    const replicate = getReplicateClient()

    // Build the prompt
    const promptData = customPrompt
      ? { prompt: customPrompt, negative_prompt: '' }
      : buildImagePrompt(style, bookTitle)
    console.log('Prompt:', promptData.prompt)

    // Generate image with Ideogram
    const output = await replicate.run(
      "ideogram-ai/ideogram-v3-turbo",
      {
        input: {
          prompt: promptData.prompt,
          negative_prompt: promptData.negative_prompt,
          aspect_ratio: "3:2",
          magic_prompt_option: "Off"
        }
      }
    )

    // Ideogram returns a FileOutput object with url() method
    const imageUrl = output?.url ? output.url() : (Array.isArray(output) ? output[0] : output)

    res.json({
      success: true,
      imageUrl,
      prompt: promptData.prompt,
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

// Generate multiple variations
router.post('/generate-variations', async (req, res) => {
  const { styleId, bookTitle } = req.body

  const style = COVER_STYLES[styleId]
  if (!style) {
    return res.status(400).json({ error: 'Invalid style' })
  }

  try {
    const replicate = getReplicateClient()

    // Build prompt
    const promptData = buildImagePrompt(style, bookTitle)

    // Generate variations with different compositions
    const variationModifiers = [
      'centered symmetrical composition',
      'dramatic diagonal composition with depth',
      'soft focus background with sharp foreground element'
    ]

    const promises = variationModifiers.map(async (modifier, index) => {
      const fullPrompt = `${promptData.prompt}, ${modifier}`

      const output = await replicate.run(
        "ideogram-ai/ideogram-v3-turbo",
        {
          input: {
            prompt: fullPrompt,
            negative_prompt: promptData.negative_prompt,
            aspect_ratio: "3:2",
            magic_prompt_option: "Off"
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

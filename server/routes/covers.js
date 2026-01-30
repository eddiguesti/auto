import { Router } from 'express'
import Replicate from 'replicate'

const router = Router()

// Style presets for image generation
const COVER_STYLES = {
  classic: {
    id: 'classic',
    name: 'Classic & Elegant',
    description: 'Timeless and refined',
    icon: 'classic',
    styleGuide: 'elegant oil painting style, soft golden hour lighting, rich cream and gold tones',
    colors: ['#1e3a5f', '#d4a574', '#8b6914']
  },
  modern: {
    id: 'modern',
    name: 'Modern & Clean',
    description: 'Contemporary design',
    icon: 'modern',
    styleGuide: 'minimalist illustration, clean lines, bold shapes, modern graphic design, black white and one accent color',
    colors: ['#2d3748', '#4a5568', '#e2e8f0']
  },
  nature: {
    id: 'nature',
    name: 'Nature & Peaceful',
    description: 'Organic and serene',
    icon: 'nature',
    styleGuide: 'watercolor illustration, soft natural colors, botanical elements, peaceful landscape, sage green and soft blue',
    colors: ['#4a7c59', '#87a878', '#f0e6d3']
  },
  family: {
    id: 'family',
    name: 'Family & Warmth',
    description: 'Warm and nostalgic',
    icon: 'family',
    styleGuide: 'warm nostalgic illustration, golden sunset colors, cozy atmosphere, amber and soft orange tones',
    colors: ['#b45309', '#f59e0b', '#fef3c7']
  },
  artistic: {
    id: 'artistic',
    name: 'Artistic & Colorful',
    description: 'Bold and expressive',
    icon: 'artistic',
    styleGuide: 'expressive artistic illustration, vibrant colors, creative brushwork, magenta cyan purple palette',
    colors: ['#7c3aed', '#ec4899', '#06b6d4']
  },
  heritage: {
    id: 'heritage',
    name: 'Heritage & Tradition',
    description: 'Classic and timeless',
    icon: 'heritage',
    styleGuide: 'vintage illustration style, sepia and burgundy tones, classic engraving aesthetic, rich detailed artwork',
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
  // Use the title to inspire the imagery
  const titleInspiration = bookTitle
    ? `Create an evocative illustration inspired by the theme "${bookTitle}". Include meaningful imagery - perhaps a path, doorway, landscape, silhouette, or symbolic scene that captures a life journey.`
    : `Create an evocative illustration about life and memories. Include meaningful imagery - a winding path, old tree, distant horizon, or symbolic scene.`

  if (bookTitle) {
    return {
      prompt: `${titleInspiration} Style: ${style.styleGuide}. Place the text "${bookTitle}" elegantly on the right side. Only this text, nothing else.`,
      negative_prompt: 'book cover mockup, 3d render, photo frame, multiple text, subtitle, author name, ugly, blurry'
    }
  }
  return {
    prompt: `${titleInspiration} Style: ${style.styleGuide}. Beautiful composition with space on the right for text.`,
    negative_prompt: 'book cover mockup, 3d render, photo frame, text, words, letters, ugly, blurry'
  }
}

// Generate image
router.post('/generate', async (req, res) => {
  const { styleId, bookTitle, customPrompt } = req.body
  console.log('Generate request:', { styleId, bookTitle })

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
    console.log('Calling Replicate API...')
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
    console.log('Replicate output type:', typeof output, output)

    // Ideogram returns a FileOutput object with url() method
    let imageUrl
    if (output?.url && typeof output.url === 'function') {
      imageUrl = output.url()
    } else if (Array.isArray(output) && output[0]) {
      imageUrl = typeof output[0].url === 'function' ? output[0].url() : output[0]
    } else if (typeof output === 'string') {
      imageUrl = output
    } else {
      console.error('Unexpected output format:', output)
      throw new Error('Unexpected response format from image generator')
    }

    console.log('Image URL:', imageUrl)

    res.json({
      success: true,
      imageUrl,
      prompt: promptData.prompt,
      style: style?.id || 'custom'
    })
  } catch (err) {
    console.error('Cover generation error:', err)
    res.status(500).json({
      error: 'Failed to generate cover',
      message: err.message || 'Unknown error'
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

// Generate image for a specific region (template-based editor)
router.post('/generate-region', async (req, res) => {
  const { prompt, width, height, templateId } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const replicate = getReplicateClient()

    // Determine aspect ratio based on dimensions
    let aspectRatio = '1:1'
    const ratio = width / height
    if (ratio > 1.4) aspectRatio = '3:2'
    else if (ratio > 1.1) aspectRatio = '4:3'
    else if (ratio < 0.7) aspectRatio = '2:3'
    else if (ratio < 0.9) aspectRatio = '3:4'

    console.log('Generating region:', { prompt, aspectRatio, templateId })

    const output = await replicate.run(
      "ideogram-ai/ideogram-v3-turbo",
      {
        input: {
          prompt: `${prompt}, high quality, detailed`,
          negative_prompt: 'text, words, letters, watermark, ugly, blurry, low quality',
          aspect_ratio: aspectRatio,
          magic_prompt_option: "Off"
        }
      }
    )

    // Extract URL from output
    let imageUrl
    if (output?.url && typeof output.url === 'function') {
      imageUrl = output.url()
    } else if (Array.isArray(output) && output[0]) {
      imageUrl = typeof output[0].url === 'function' ? output[0].url() : output[0]
    } else if (typeof output === 'string') {
      imageUrl = output
    } else {
      throw new Error('Unexpected response format')
    }

    res.json({
      success: true,
      imageUrl,
      prompt
    })
  } catch (err) {
    console.error('Region generation error:', err)
    res.status(500).json({
      error: 'Failed to generate image',
      message: err.message || 'Unknown error'
    })
  }
})

export default router
export { COVER_STYLES, BOOK_FORMATS }

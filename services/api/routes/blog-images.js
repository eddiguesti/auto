import { Router } from 'express'
import { createLogger } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const router = Router()
const logger = createLogger('blog-images')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Output directory for generated images (web app's public folder)
const IMAGES_DIR = path.resolve(__dirname, '../../..', 'apps/web/public/blog-images')

// Ensure the output directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
}

// Blog post image prompts — each crafted to produce a stunning, relevant editorial illustration
const BLOG_IMAGE_PROMPTS = {
  'how-to-write-memoir-complete-guide':
    'An elegant editorial illustration: an open leather-bound journal on a mahogany desk with a vintage fountain pen, golden morning light streaming through tall windows, scattered old photographs and handwritten pages, dried flowers as bookmark. Warm sepia tones with rich amber highlights. Fine art quality, atmospheric, deeply literary and nostalgic. Style of classical still life painting.',

  'memoir-vs-autobiography-difference':
    'An artistic editorial illustration showing two beautiful books side by side on an antique wooden table — one slim and intimate (memoir), one thick and comprehensive (autobiography). Soft library lighting, reading glasses resting nearby, warm golden tones. Elegant typography-friendly composition with space at top. Fine art quality, warm and inviting.',

  'therapeutic-benefits-writing-life-story':
    'A serene, healing editorial illustration: hands writing in a journal beside a sunlit window, a cup of herbal tea steaming gently, soft rain outside, green plants on the windowsill. Peaceful, therapeutic atmosphere. Watercolor style with soft blues, greens, and warm golds. Emotionally soothing and contemplative. Fine art quality.',

  'writing-prompts-unlock-memories':
    'A magical editorial illustration: an antique key unlocking a glowing treasure chest overflowing with golden light, floating photographs, handwritten letters, and small mementos. Dark background with warm golden illumination. Whimsical yet elegant. Style of classical fantasy illustration meets fine art still life.',

  'interview-parents-grandparents-guide':
    'A heartwarming editorial illustration: an elderly grandmother and young adult grandchild sitting together in a cozy living room, sharing stories over tea. Warm afternoon light, family photos on the mantle, comfortable armchairs. Painted in warm impressionistic style with rich emotional depth. Norman Rockwell meets contemporary illustration.',

  'memoir-writing-seniors-guide':
    'An inspiring editorial illustration: elegant elderly hands holding a beautifully written manuscript page, reading glasses nearby, a vase of garden roses on the desk. Warm golden light suggesting wisdom and accomplishment. Dignified, warm, celebrating age and experience. Fine art portrait style with rich textures.',

  'common-memoir-mistakes-avoid':
    'An editorial illustration: a vintage compass and roadmap on a writing desk, with a quill pen making corrections to a manuscript. Red ink marks showing edits. Warm amber lighting, scholarly atmosphere. Clean composition suggesting guidance and improvement. Classical still life style.',

  'memoir-structure-outline-guide':
    'An architectural editorial illustration: a blueprint-style layout of a memoir structure, drawn with elegant calligraphy on cream parchment paper. Chapter markers connected by golden threads, ink bottles and rulers nearby. Beautiful technical illustration meets fine art. Warm tones, precise yet artistic.',

  'finding-your-authentic-voice':
    'A poetic editorial illustration: a microphone transforming into blooming wildflowers, with sound waves becoming flowing script text. Soft gradient background from deep navy to warm gold. Creative and inspiring. Modern editorial art style with botanical elements.',

  'writing-dialogue-memoir':
    'An elegant editorial illustration: two vintage speech bubbles rendered as ornate picture frames, each containing a different scene from the past. Old-fashioned telephone between them. Warm sepia palette with touches of gold. Nostalgic and conversational. Fine art collage style.',

  'best-memoirs-read-inspiration':
    'A stunning editorial illustration: a towering stack of beautifully bound books in an atmospheric library, soft lamplight casting warm shadows, leather spines with gold lettering. A comfortable reading chair nearby with a throw blanket. Rich browns, golds, and deep greens. Classical library painting style.',

  'ethical-writing-about-family':
    'A thoughtful editorial illustration: an open journal with a delicate lace veil partially covering some pages, a family photograph face-down nearby. Soft natural light, muted tones of cream, grey, and dusty rose. Suggesting the tension between truth and privacy. Contemplative fine art style.',

  'gift-memoir-parents-grandparents':
    'A festive editorial illustration: a beautifully wrapped gift box opening to reveal a gorgeous hardcover memoir book, with golden light emanating from within. Ribbon and tissue paper, family photos tucked inside. Warm holiday colors — rich reds, golds, and creams. Celebratory and meaningful.',

  'using-photos-memoir':
    'An editorial illustration: a beautiful collage of old Polaroid photographs, faded film negatives, and a vintage camera arranged artistically on a wooden table. Some photos overlapping a handwritten manuscript. Warm nostalgic tones, golden afternoon light. Fine art photography meets still life painting.',

  'ai-memoir-writing-future':
    'A futuristic yet warm editorial illustration: a glowing AI assistant (represented as gentle golden light) illuminating handwritten pages, transforming spoken words (shown as flowing sound waves) into elegant printed text. Human warmth meets technology. Warm gold and soft blue palette. Modern and hopeful.',

  'overcoming-writers-block-memoir':
    "An editorial illustration: a winding path through fog leading to a bright, sunlit clearing with a writing desk. The fog represents writer's block, the clearing represents breakthrough. Atmospheric, dramatic lighting. Rich landscape painting style with metaphorical depth.",

  'self-publishing-memoir-guide':
    'An editorial illustration: the journey from manuscript to printed book — showing a handwritten draft transforming into a professionally designed hardcover book. Printing press elements in the background. Warm industrial tones with touches of gold. Celebrating the transformation from words to physical book.',

  'writing-about-trauma-responsibly':
    'A gentle, sensitive editorial illustration: a cracked piece of Japanese kintsugi pottery — broken and repaired with gold — sitting beside an open journal. Symbolizing how trauma, when written about with care, becomes something beautiful. Soft, respectful lighting. Muted tones with gold accents. Contemplative and healing.',

  'memoir-life-chapters-approach':
    'An editorial illustration: an open book viewed from above, with each chapter shown as a different season — spring childhood, summer youth, autumn maturity, winter wisdom. Beautiful miniature landscapes within each section. Rich seasonal colors. Illuminated manuscript style meets modern editorial.',

  'preserving-family-stories':
    'An editorial illustration: a magnificent ancient tree with deep roots, its branches holding small frames containing family scenes from different eras. Sunset light filtering through leaves. Rich greens, golds, and warm browns. Family heritage and continuity. Magical realism style.',

  'memoir-book-design-tips':
    "An editorial illustration: a designer's workspace with book cover mockups, typography samples, color swatches, and a beautifully designed memoir book cover in progress. Warm creative studio lighting. Clean, professional aesthetic with artistic touches. Modern design meets traditional craftsmanship.",

  'short-memoir-vs-full-book':
    'An editorial illustration: two books on a simple wooden shelf — one slim and elegant, one thick and comprehensive — both equally beautiful. A single spotlight illuminating both. Minimalist composition suggesting that quality matters more than quantity. Clean, modern fine art style.',

  'legacy-letters-alternative-memoir':
    'An editorial illustration: a beautiful handwritten letter sealed with red wax, placed alongside a vintage pocket watch and dried lavender. Soft candlelight atmosphere. Intimate, personal, timeless. Classical still life painting with rich textures and warm romanticism.',

  'memoir-questions-family-ask':
    'An editorial illustration: a warm family gathering around a dinner table, animated conversation, generations together. Question marks floating like fireflies above in warm golden light. Celebrating the art of asking and listening. Warm impressionistic style with rich emotional depth.',

  'why-your-story-matters':
    'A powerful, inspiring editorial illustration: a single candle illuminating an open book, with the warm light expanding outward to reveal silhouettes of ordinary life moments — a handshake, a sunset walk, a family meal, a quiet reflection. Every life radiates meaning. Warm golden palette. Emotional and universal. Fine art quality.'
}

// Category-based fallback color gradients for immediate display
const CATEGORY_GRADIENTS = {
  Guide: 'from-amber-800 to-amber-950',
  'Tips & Guides': 'from-emerald-800 to-emerald-950',
  Family: 'from-rose-800 to-rose-950',
  Inspiration: 'from-purple-800 to-purple-950',
  Wellness: 'from-teal-800 to-teal-950',
  Craft: 'from-indigo-800 to-indigo-950',
  Publishing: 'from-slate-700 to-slate-950',
  Technology: 'from-cyan-800 to-cyan-950',
  Education: 'from-blue-800 to-blue-950',
  Ethics: 'from-stone-700 to-stone-950',
  'Gift Ideas': 'from-red-800 to-red-950',
  Seniors: 'from-orange-800 to-orange-950',
  Alternatives: 'from-violet-800 to-violet-950'
}

/**
 * Download an image from a URL and save it to disk.
 * Returns the local filename.
 */
async function downloadAndSaveImage(imageUrl, slug) {
  const filename = `${slug}.jpg`
  const filepath = path.join(IMAGES_DIR, filename)

  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)

  const fileStream = fs.createWriteStream(filepath)
  await pipeline(Readable.fromWeb(response.body), fileStream)

  logger.info(`Saved image to ${filepath}`)
  return filename
}

/**
 * Save a base64 image to disk.
 */
function saveBase64Image(b64Data, slug) {
  const filename = `${slug}.jpg`
  const filepath = path.join(IMAGES_DIR, filename)

  const buffer = Buffer.from(b64Data, 'base64')
  fs.writeFileSync(filepath, buffer)

  logger.info(`Saved base64 image to ${filepath}`)
  return filename
}

// Generate image for a blog post using xAI Grok image generation
router.post('/generate/:slug', async (req, res) => {
  const { slug } = req.params
  const apiKey = process.env.GROK_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Image generation not configured — set GROK_API_KEY' })
  }

  const prompt = BLOG_IMAGE_PROMPTS[slug]
  if (!prompt) {
    return res.status(400).json({ error: 'Unknown blog post slug' })
  }

  try {
    logger.info(`Generating image for blog post: ${slug}`)

    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt: prompt + ' Editorial quality, suitable as blog hero image. No text overlays.',
        n: 1,
        aspect_ratio: '16:9',
        response_format: 'url'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`xAI API error: ${response.status} - ${errorText}`)
      return res.status(502).json({ error: 'Image generation failed' })
    }

    const data = await response.json()

    if (!data.data || !data.data[0]) {
      return res.status(502).json({ error: 'No image returned from API' })
    }

    // Download and save the image permanently
    let filename
    if (data.data[0].url) {
      filename = await downloadAndSaveImage(data.data[0].url, slug)
    } else if (data.data[0].b64_json) {
      filename = saveBase64Image(data.data[0].b64_json, slug)
    } else {
      return res.status(502).json({ error: 'Unexpected API response format' })
    }

    const publicPath = `/blog-images/${filename}`

    logger.info(`Image generated and saved for ${slug}: ${publicPath}`)

    res.json({
      slug,
      imagePath: publicPath,
      prompt,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    logger.error(`Image generation error for ${slug}:`, err)
    res.status(500).json({ error: 'Image generation failed' })
  }
})

// Generate images for ALL blog posts (batch)
router.post('/generate-all', async (req, res) => {
  const apiKey = process.env.GROK_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Image generation not configured — set GROK_API_KEY' })
  }

  const slugs = Object.keys(BLOG_IMAGE_PROMPTS)
  const results = []

  // Skip already-generated images unless force=true
  const force = req.query.force === 'true'

  for (const slug of slugs) {
    // Check if image already exists
    const filepath = path.join(IMAGES_DIR, `${slug}.jpg`)
    if (!force && fs.existsSync(filepath)) {
      results.push({ slug, status: 'skipped', imagePath: `/blog-images/${slug}.jpg` })
      logger.info(`Skipping ${slug} — image already exists`)
      continue
    }

    try {
      const prompt = BLOG_IMAGE_PROMPTS[slug]

      const response = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-imagine-image',
          prompt:
            prompt +
            ' Wide 16:9 aspect ratio, editorial quality, suitable as blog hero image. No text overlays.',
          n: 1,
          response_format: 'url'
        })
      })

      if (response.ok) {
        const data = await response.json()
        let filename
        if (data.data?.[0]?.url) {
          filename = await downloadAndSaveImage(data.data[0].url, slug)
        } else if (data.data?.[0]?.b64_json) {
          filename = saveBase64Image(data.data[0].b64_json, slug)
        }
        if (filename) {
          results.push({ slug, status: 'success', imagePath: `/blog-images/${filename}` })
          logger.info(`Generated and saved image for ${slug}`)
        } else {
          results.push({ slug, status: 'failed', error: 'No image data in response' })
        }
      } else {
        results.push({ slug, status: 'failed', error: `API ${response.status}` })
        logger.warn(`Failed to generate image for ${slug}: ${response.status}`)
      }

      // Rate limit: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (err) {
      results.push({ slug, status: 'failed', error: err.message })
    }
  }

  res.json({
    total: slugs.length,
    success: results.filter(r => r.status === 'success').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    failed: results.filter(r => r.status === 'failed').length,
    results
  })
})

// Check which images exist
router.get('/status', (req, res) => {
  const slugs = Object.keys(BLOG_IMAGE_PROMPTS)
  const status = slugs.map(slug => {
    const filepath = path.join(IMAGES_DIR, `${slug}.jpg`)
    const exists = fs.existsSync(filepath)
    return {
      slug,
      hasImage: exists,
      imagePath: exists ? `/blog-images/${slug}.jpg` : null
    }
  })

  res.json({
    total: slugs.length,
    generated: status.filter(s => s.hasImage).length,
    missing: status.filter(s => !s.hasImage).length,
    images: status
  })
})

// Get image prompt for a blog post (useful for debugging)
router.get('/prompt/:slug', (req, res) => {
  const { slug } = req.params
  const prompt = BLOG_IMAGE_PROMPTS[slug]

  if (!prompt) {
    return res.status(404).json({ error: 'Unknown blog post slug' })
  }

  res.json({ slug, prompt })
})

// Get all available prompts
router.get('/prompts', (req, res) => {
  const prompts = Object.entries(BLOG_IMAGE_PROMPTS).map(([slug, prompt]) => ({
    slug,
    prompt: prompt.substring(0, 100) + '...'
  }))

  res.json({ total: prompts.length, prompts })
})

export default router
export { BLOG_IMAGE_PROMPTS, CATEGORY_GRADIENTS }

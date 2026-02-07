import { Router } from 'express'
import { grokChat, isGrokConfigured } from '../services/grokService.js'
import { extractAndStoreEntities } from '../services/entityExtractionService.js'
import { getStoriesWithPhotos, getChapterStoriesWithPhotos } from '../utils/storyRepository.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { storySchemas } from '../schemas/index.js'
import Replicate from 'replicate'
import cache, { cacheKeys, invalidateUserCache } from '../utils/cache.js'
import { createLogger } from '../utils/logger.js'
import { scheduleUpgradeDrip } from '../utils/notifications.js'

const logger = createLogger('stories')

const router = Router()

// Chapter image prompts (same as onboarding.js)
const CHAPTER_PROMPTS = {
  'earliest-memories': ctx =>
    `Nostalgic soft watercolor illustration of early childhood in ${ctx.birth_place || 'a small town'}${ctx.birth_country ? `, ${ctx.birth_country}` : ''}, circa ${ctx.birth_year ? ctx.birth_year + 3 : '1960s'}, warm morning light, vintage toys, cozy nursery`,
  childhood: ctx =>
    `Joyful childhood scene, neighborhood in ${ctx.birth_place || 'a village'}${ctx.birth_country ? `, ${ctx.birth_country}` : ''}, children playing outside, ${ctx.birth_year ? ctx.birth_year + 8 : '1960s'} era, golden summer afternoon`,
  'school-days': ctx =>
    `Traditional school building in ${ctx.birth_country || 'England'}, ${ctx.birth_year ? ctx.birth_year + 10 : '1960s'} era, autumn leaves, children with satchels, nostalgic`,
  'teenage-years': ctx =>
    `Teen bedroom scene, ${ctx.birth_year ? ctx.birth_year + 15 : '1970s'} era, vinyl records, posters, coming of age, ${ctx.birth_country || 'British'} setting`,
  'key-people': ctx =>
    `Warm family gathering, multiple generations around a table, ${ctx.birth_country || 'British'} home, soft golden lighting, nostalgic portrait`,
  'young-adulthood': ctx =>
    `Young adult starting out, ${ctx.birth_year ? ctx.birth_year + 20 : '1970s'} era, first apartment, optimism, morning light`,
  'family-career': ctx =>
    `Family life, home with children, ${ctx.birth_year ? ctx.birth_year + 35 : '1980s'} era, warmth, garden or living room`,
  'world-around-you': ctx =>
    `Historical moments collage, newspaper clippings style, world events, ${ctx.birth_country || 'British'} perspective, sepia tones`,
  'passions-beliefs': ctx =>
    `Personal hobby scene, artistic expression, nature, books, peaceful and meaningful atmosphere`,
  'wisdom-reflections': ctx =>
    `Peaceful reflection, comfortable armchair by window, golden sunset, books and photographs, wisdom and contentment`
}

const STYLE_SUFFIX =
  '. Style: soft nostalgic illustration, warm sepia and golden tones, painterly watercolor, no text, memoir book art.'

// Check if chapter is complete and generate personalized image
async function checkAndGenerateChapterImage(db, userId, chapterId, totalQuestions) {
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) return

  // Check if image already exists
  const existing = await db.query(
    'SELECT id FROM chapter_images WHERE user_id = $1 AND chapter_id = $2',
    [userId, chapterId]
  )
  if (existing.rows.length > 0) return // Already has image

  // Count answered questions for this chapter
  const countResult = await db.query(
    `SELECT COUNT(*) as count FROM stories WHERE user_id = $1 AND chapter_id = $2 AND answer IS NOT NULL AND answer != ''`,
    [userId, chapterId]
  )
  const answeredCount = parseInt(countResult.rows[0].count)

  // Only generate if chapter is 100% complete
  if (answeredCount < totalQuestions) return

  // Schedule upgrade drip emails when free chapter is completed
  if (chapterId === 'earliest-memories') {
    scheduleUpgradeDrip(userId).catch(err => {
      logger.error('Failed to schedule upgrade drip', { userId, error: err.message })
    })
  }

  logger.info('Chapter completed, generating artwork', { chapterId, userId })

  // Get user's answers for this chapter to create personalized prompt
  const storiesResult = await db.query(
    `SELECT answer FROM stories WHERE user_id = $1 AND chapter_id = $2 AND answer IS NOT NULL ORDER BY question_id`,
    [userId, chapterId]
  )
  const chapterContent = storiesResult.rows
    .map(r => r.answer)
    .join(' ')
    .substring(0, 2000)

  // Get user context (birth info)
  const ctxResult = await db.query(
    'SELECT birth_place, birth_country, birth_year FROM user_onboarding WHERE user_id = $1',
    [userId]
  )
  const context = ctxResult.rows[0] || {}

  try {
    await db.query(
      `
      INSERT INTO chapter_images (user_id, chapter_id, generation_status, created_at, updated_at)
      VALUES ($1, $2, 'generating', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [userId, chapterId]
    )

    // Use Grok to create a personalized image prompt based on their actual stories
    let personalizedPrompt = ''
    if (isGrokConfigured() && chapterContent.length > 50) {
      try {
        const result = await grokChat({
          systemPrompt: `Create a single image prompt (max 100 words) for a nostalgic watercolor illustration based on someone's memoir chapter. Focus on the key visual elements: places, time period, emotions, objects mentioned. Do NOT include any text/words in the image. Style: warm sepia tones, painterly, evocative memoir book art.`,
          userPrompt: `Chapter theme: ${chapterId.replace(/-/g, ' ')}
Birth place: ${context.birth_place || 'unknown'}, ${context.birth_country || ''}
Birth year: ${context.birth_year || 'unknown'}

Their stories:
${chapterContent}

Create an image prompt:`,
          maxTokens: 150,
          temperature: 0.7
        })
        personalizedPrompt = result.content || ''
      } catch (err) {
        logger.error('Grok prompt generation failed', { error: err.message, chapterId })
      }
    }

    // Fallback to template prompt if Grok failed
    const promptFn = CHAPTER_PROMPTS[chapterId]
    const prompt = personalizedPrompt || (promptFn ? promptFn(context) + STYLE_SUFFIX : '')
    if (!prompt) return

    const replicate = new Replicate({ auth: replicateToken })

    logger.info('Generating personalized image', { chapterId, userId })

    const output = await replicate.run('ideogram-ai/ideogram-v3-turbo', {
      input: { prompt, aspect_ratio: '16:9', magic_prompt_option: 'Auto' }
    })

    let imageUrl = null
    if (output?.url && typeof output.url === 'function') {
      imageUrl = output.url()
    } else if (Array.isArray(output) && output[0]) {
      imageUrl = typeof output[0].url === 'function' ? output[0].url() : output[0]
    } else if (typeof output === 'string') {
      imageUrl = output
    }

    if (imageUrl) {
      await db.query(
        `
        UPDATE chapter_images SET image_url = $1, prompt_used = $2, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND chapter_id = $4
      `,
        [imageUrl, prompt, userId, chapterId]
      )
      logger.info('Generated personalized image', { chapterId, userId })
    }
  } catch (err) {
    logger.error('Image generation failed', { chapterId, userId, error: err.message })
    await db.query(
      `
      UPDATE chapter_images SET generation_status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND chapter_id = $2
    `,
      [userId, chapterId]
    )
  }
}

// Extract entities asynchronously after saving
async function extractEntitiesAsync(db, userId, text, chapterId, questionId, storyId) {
  try {
    await extractAndStoreEntities({ db, userId, text, chapterId, questionId, storyId })
    logger.debug('Extracted entities', { storyId, userId })
  } catch (err) {
    logger.error('Entity extraction failed', { storyId, error: err.message })
  }
}

// Get all stories (must be before /:chapterId to avoid conflicts)
router.get(
  '/all',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const stories = await getStoriesWithPhotos(db, userId)
    res.json(stories)
  })
)

// Get progress (count of answered questions per chapter) - cached for 60s
router.get(
  '/progress',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const progress = await cache.getOrSet(
      cacheKeys.userProgress(userId),
      async () => {
        const result = await db.query(
          `
        SELECT chapter_id, COUNT(*) as count
        FROM stories
        WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''
        GROUP BY chapter_id
      `,
          [userId]
        )

        const progressMap = {}
        result.rows.forEach(p => {
          progressMap[p.chapter_id] = parseInt(p.count)
        })
        return progressMap
      },
      60 // 60 second TTL
    )

    res.json(progress)
  })
)

// Get settings
router.get(
  '/settings',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query('SELECT * FROM settings WHERE user_id = $1', [userId])
    res.json(result.rows[0] || {})
  })
)

// Save settings
router.post(
  '/settings',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { name } = req.body

    await db.query(
      `
    INSERT INTO settings (user_id, name, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET name = $2, updated_at = CURRENT_TIMESTAMP
  `,
      [userId, name]
    )

    res.json({ success: true })
  })
)

// Check if user has premium access (for chapter gating)
async function requirePremiumForChapter(db, userId, chapterId) {
  if (chapterId === 'earliest-memories') return true
  const result = await db.query('SELECT premium_until FROM users WHERE id = $1', [userId])
  const premiumUntil = result.rows[0]?.premium_until
  return premiumUntil && new Date(premiumUntil) > new Date()
}

// Get all stories for a chapter
router.get(
  '/:chapterId',
  validate(storySchemas.getChapter),
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { chapterId } = req.validatedParams

    const hasPremium = await requirePremiumForChapter(db, userId, chapterId)
    if (!hasPremium) {
      return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' })
    }

    const stories = await getChapterStoriesWithPhotos(db, userId, chapterId)
    res.json(stories)
  })
)

// Save/update a story
router.post(
  '/',
  validate(storySchemas.saveStory),
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { chapter_id, question_id, answer, total_questions } = req.validatedBody

    const hasPremium = await requirePremiumForChapter(db, userId, chapter_id)
    if (!hasPremium) {
      return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' })
    }

    await db.query(
      `
    INSERT INTO stories (user_id, chapter_id, question_id, answer, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, chapter_id, question_id)
    DO UPDATE SET answer = $4, updated_at = CURRENT_TIMESTAMP
  `,
      [userId, chapter_id, question_id, answer]
    )

    // Get the story ID
    const result = await db.query(
      `
    SELECT id FROM stories WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
  `,
      [userId, chapter_id, question_id]
    )

    const storyId = result.rows[0].id

    // Invalidate user's cached data since progress changed
    invalidateUserCache(userId)

    // Extract entities asynchronously (don't wait for it)
    extractEntitiesAsync(db, userId, answer, chapter_id, question_id, storyId).catch(err => {
      logger.error('Background entity extraction error', {
        storyId,
        chapterId: chapter_id,
        error: err.message
      })
    })

    // Check if chapter is now complete and generate personalized artwork (don't wait)
    const totalQuestions = total_questions || 5 // Default assumption
    checkAndGenerateChapterImage(db, userId, chapter_id, totalQuestions).catch(err => {
      logger.error('Background image generation error', {
        chapterId: chapter_id,
        error: err.message
      })
    })

    res.json({ success: true, id: storyId })
  })
)

export default router

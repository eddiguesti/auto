import { Router } from 'express'
import { grokChat, isGrokConfigured } from '../services/grokService.js'
import { extractAndStoreEntities } from '../services/entityExtractionService.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { storySchemas } from '../schemas/index.js'
import Replicate from 'replicate'
import cache, { cacheKeys, invalidateUserCache } from '../utils/cache.js'
import { createLogger } from '../utils/logger.js'
import { scheduleUpgradeDrip } from '../utils/notifications.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { userRepository } from '../repositories/userRepository.js'
import { onboardingRepository } from '../repositories/onboardingRepository.js'

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
  'passions-beliefs': () =>
    `Personal hobby scene, artistic expression, nature, books, peaceful and meaningful atmosphere`,
  'wisdom-reflections': () =>
    `Peaceful reflection, comfortable armchair by window, golden sunset, books and photographs, wisdom and contentment`
}

const STYLE_SUFFIX =
  '. Style: soft nostalgic illustration, warm sepia and golden tones, painterly watercolor, no text, memoir book art.'

// Check if chapter is complete and generate personalized image
async function checkAndGenerateChapterImage(db, userId, chapterId, totalQuestions) {
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) return

  const answeredCount = await storyRepository.countAnsweredInChapter(db, userId, chapterId)

  // Only generate if chapter is 100% complete
  if (answeredCount < totalQuestions) return

  // Schedule upgrade drip emails when free chapter is completed
  if (chapterId === 'earliest-memories') {
    scheduleUpgradeDrip(userId).catch(err => {
      logger.error('Failed to schedule upgrade drip', { userId, error: err.message })
    })
  }

  logger.info('Chapter completed, generating artwork', { chapterId, userId })

  const [answers, context] = await Promise.all([
    storyRepository.getAnswersByChapter(db, userId, chapterId),
    onboardingRepository.findContext(db, userId)
  ])

  const chapterContent = answers.join(' ').substring(0, 2000)
  const ctx = context || {}

  try {
    const started = await onboardingRepository.startChapterImageGeneration(db, userId, chapterId)

    // Another request already started generation
    if (!started) return

    // Use Grok to create a personalized image prompt based on their actual stories
    let personalizedPrompt = ''
    if (isGrokConfigured() && chapterContent.length > 50) {
      try {
        const result = await grokChat({
          systemPrompt: `Create a single image prompt (max 100 words) for a nostalgic watercolor illustration based on someone's memoir chapter. Focus on the key visual elements: places, time period, emotions, objects mentioned. Do NOT include any text/words in the image. Style: warm sepia tones, painterly, evocative memoir book art.`,
          userPrompt: `Chapter theme: ${chapterId.replace(/-/g, ' ')}
Birth place: ${ctx.birth_place || 'unknown'}, ${ctx.birth_country || ''}
Birth year: ${ctx.birth_year || 'unknown'}

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
    const prompt = personalizedPrompt || (promptFn ? promptFn(ctx) + STYLE_SUFFIX : '')
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

    // Clean up JSON-stringified URLs (Replicate sometimes wraps in quotes)
    if (typeof imageUrl === 'string') {
      imageUrl = imageUrl.replace(/^"|"$/g, '')
    }

    if (imageUrl) {
      await onboardingRepository.completeChapterImage(db, userId, chapterId, imageUrl, prompt)
      logger.info('Generated personalized image', { chapterId, userId })
    }
  } catch (err) {
    logger.error('Image generation failed', { chapterId, userId, error: err.message })
    await onboardingRepository.failChapterImage(db, userId, chapterId)
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

/**
 * @swagger
 * /stories/all:
 *   get:
 *     tags: [Stories]
 *     summary: Get all of the user's stories with associated photos
 *     responses:
 *       200:
 *         description: Array of story objects grouped by chapter
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Story'
 *                   - type: object
 *                     properties:
 *                       photos: { type: array, items: { type: object } }
 */
// Get all stories (must be before /:chapterId to avoid conflicts)
router.get(
  '/all',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const stories = await storyRepository.findWithPhotos(db, userId)
    res.json(stories)
  })
)

/**
 * @swagger
 * /stories/progress:
 *   get:
 *     tags: [Stories]
 *     summary: Get answered question counts per chapter
 *     description: Returns a map of chapterId → answeredCount. Cached for 60 seconds.
 *     responses:
 *       200:
 *         description: Progress map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: { type: integer }
 *               example: { "childhood": 5, "earliest-memories": 3 }
 */
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
        const rows = await storyRepository.getProgress(db, userId)
        const progressMap = {}
        rows.forEach(p => {
          progressMap[p.chapter_id] = parseInt(p.answered)
        })
        return progressMap
      },
      60 // 60 second TTL
    )

    res.json(progress)
  })
)

/**
 * @swagger
 * /stories/settings:
 *   get:
 *     tags: [Stories]
 *     summary: Get user story settings (display name)
 *     responses:
 *       200:
 *         description: Settings object (empty object if not set)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, nullable: true }
 */
// Get settings
router.get(
  '/settings',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const settings = await storyRepository.getSettings(db, userId)
    res.json(settings || {})
  })
)

/**
 * @swagger
 * /stories/settings:
 *   post:
 *     tags: [Stories]
 *     summary: Save user story settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               birth_year: { type: integer, minimum: 1900 }
 *     responses:
 *       200:
 *         description: Settings saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 */
// Save settings
router.post(
  '/settings',
  validate(storySchemas.saveSettings),
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { name } = req.validatedBody

    await storyRepository.saveSettings(db, userId, name)

    res.json({ success: true })
  })
)

// Check if user has premium access (for chapter gating)
async function requirePremiumForChapter(db, userId, chapterId) {
  if (chapterId === 'earliest-memories') return true
  const user = await userRepository.findById(db, userId)
  return user?.premium_until && new Date(user.premium_until) > new Date()
}

/**
 * @swagger
 * /stories/{chapterId}:
 *   get:
 *     tags: [Stories]
 *     summary: Get all stories (answers + photos) for a chapter
 *     description: Requires premium for all chapters except 'earliest-memories'.
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema: { type: string }
 *         example: childhood
 *     responses:
 *       200:
 *         description: Array of story objects with photos
 *       403:
 *         description: Premium required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *                 code: { type: string, example: PREMIUM_REQUIRED }
 */
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

    const stories = await storyRepository.findWithPhotosByChapter(db, userId, chapterId)
    res.json(stories)
  })
)

/**
 * @swagger
 * /stories:
 *   post:
 *     tags: [Stories]
 *     summary: Save or update a story answer
 *     description: Upserts the answer for a chapter/question pair. Triggers chapter-image generation when a chapter is fully answered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chapter_id, question_id]
 *             properties:
 *               chapter_id: { type: string, example: childhood }
 *               question_id: { type: string, example: first-memory }
 *               answer: { type: string, maxLength: 100000 }
 *               total_questions: { type: integer, description: "Total questions in chapter — used to detect chapter completion" }
 *     responses:
 *       200:
 *         description: Story saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 story_id: { type: integer }
 *       403:
 *         description: Premium required
 */
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

    const saved = await storyRepository.upsert(db, userId, {
      chapterId: chapter_id,
      questionId: question_id,
      answer
    })

    const storyId = saved.id

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

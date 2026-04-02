/**
 * StoryService — domain facade for story operations.
 * Orchestrates repositories and side-effect services so route handlers
 * stay thin. All methods accept a `db` pool connection so the service
 * remains stateless and testable.
 */

import { storyRepository } from '../repositories/storyRepository.js'
import { onboardingRepository } from '../repositories/onboardingRepository.js'
import { extractAndStoreEntities } from '../services/entityExtractionService.js'
import { grokChat } from '../services/grokService.js'
import { invalidateUserCache } from '../utils/cache.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('StoryService')

/**
 * Save or update a story answer, then trigger style application and
 * entity extraction as background side-effects.
 *
 * @param {object} db  - pg pool / client
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.chapterId
 * @param {string} opts.questionId
 * @param {string} opts.answer
 * @returns {Promise<object>} saved story row
 */
export async function saveAnswer(db, { userId, chapterId, questionId, answer }) {
  const story = await storyRepository.upsertAnswer(db, { userId, chapterId, questionId, answer })

  invalidateUserCache(userId).catch(err =>
    logger.warn('Cache invalidation failed', { userId, error: err.message })
  )

  extractAndStoreEntities(db, userId, questionId, answer).catch(err =>
    logger.warn('Entity extraction failed', { userId, questionId, error: err.message })
  )

  return story
}

/**
 * Apply an AI writing style to an existing answer text.
 *
 * @param {object} db
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.questionId
 * @param {string} opts.style  - e.g. 'formal', 'poetic', 'concise'
 * @returns {Promise<{ styledText: string }>}
 */
export async function applyStyle(db, { userId, questionId, style }) {
  const story = await storyRepository.findByQuestion(db, userId, questionId)
  if (!story) {
    const err = new Error('Story answer not found')
    err.statusCode = 404
    throw err
  }

  const prompt = `Rewrite the following memoir passage in a ${style} style, preserving all facts:\n\n${story.answer}`
  const styledText = await grokChat([{ role: 'user', content: prompt }])

  await storyRepository.updateStyledAnswer(db, story.id, styledText)

  return { styledText }
}

/**
 * Retrieve all answers for a user, grouped by chapter.
 *
 * @param {object} db
 * @param {number} userId
 * @returns {Promise<object>} map of chapterId → answer[]
 */
export async function getStoriesByChapter(db, userId) {
  const rows = await storyRepository.findAllByUser(db, userId)
  return rows.reduce((acc, row) => {
    const chapter = row.chapter_id || 'unknown'
    if (!acc[chapter]) acc[chapter] = []
    return { ...acc, [chapter]: [...acc[chapter], row] }
  }, {})
}

/**
 * Get the onboarding context used for personalised image prompts.
 *
 * @param {object} db
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
export async function getUserContext(db, userId) {
  return onboardingRepository.findContext(db, userId)
}

import { PHOTO_ANALYSIS_PROMPT } from '../../../packages/shared/photo-analysis-prompt.js'
/**
 * Photo analysis service — uses Grok vision to describe uploaded photos
 * and generate memoir interview questions based on what it sees.
 */

import { grokCompletion, parseGrokJson } from './grokService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('photo-analysis')

/**
 * Analyse a photo using Grok vision and return structured memoir prompts.
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {string} mimeType - MIME type (image/jpeg, image/png, etc.)
 * @returns {Promise<{description: string, era: string, people_count: number, setting: string, questions: string[]}>}
 */
export async function analyzePhoto(imageBuffer, mimeType) {
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: PHOTO_ANALYSIS_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }
  ]

  const result = await grokCompletion({
    messages,
    maxTokens: 800,
    temperature: 0.6,
    model: 'grok-4-1-fast-non-reasoning'
  })

  const parsed = parseGrokJson(result.content)

  if (!parsed.description || !parsed.questions) {
    logger.warn('Incomplete photo analysis response', { hasDescription: !!parsed.description })
    return {
      description: parsed.description || 'A personal photograph.',
      era: parsed.era || 'unknown',
      people_count: parsed.people_count || 0,
      setting: parsed.setting || 'unknown',
      questions: parsed.questions || [
        'Tell me about this photo.',
        'Who is in this picture?',
        'When was this taken?'
      ]
    }
  }

  return {
    description: parsed.description,
    era: parsed.era || 'unknown',
    people_count: parsed.people_count || 0,
    setting: parsed.setting || 'unknown',
    questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : []
  }
}

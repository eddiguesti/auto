/**
 * Photo analysis service — uses Grok vision to describe uploaded photos
 * and generate memoir interview questions based on what it sees.
 */

import { grokCompletion, parseGrokJson } from './grokService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('photo-analysis')

const ANALYSIS_PROMPT = `You are an expert memoir interviewer analysing a personal photograph.

Look at this photo carefully and return a JSON object with these fields:

{
  "description": "A warm, 2-3 sentence description of what you see — people, setting, clothing, mood. Write it like you're describing the photo to the person who owns it.",
  "era": "Your best estimate of the decade or time period (e.g. '1960s', 'early 1980s', '2000s'). Base this on clothing, hairstyles, photo quality, vehicles, or architecture. If unclear, say 'unknown'.",
  "people_count": number of people visible (0 if none),
  "setting": "Brief setting description (e.g. 'garden', 'beach', 'living room', 'school', 'street')",
  "questions": [
    "5 thoughtful, open-ended interview questions a memoir interviewer would ask about this specific photo.",
    "Questions should follow the Who-What-When-Where-Why framework.",
    "Ask about the people, the occasion, the feelings, and what happened before/after.",
    "Make them warm and conversational, not clinical.",
    "At least one question should ask about sensory details (sounds, smells, textures)."
  ]
}

Return ONLY valid JSON. No markdown, no explanation.`

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
        { type: 'text', text: ANALYSIS_PROMPT },
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

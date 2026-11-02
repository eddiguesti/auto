import { PHOTO_ANALYSIS_PROMPT } from '../../packages/shared/photo-analysis-prompt.js'
import { ApiError } from './errors.js'
import { grokWriting } from './writing-provider.js'

export async function analyzePhoto(env, bytes, type) {
  if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Photo analysis not configured' })
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 16384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384))
  try {
    const text = await grokWriting(env, {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: PHOTO_ANALYSIS_PROMPT },
            { type: 'input_image', image_url: `data:${type};base64,${btoa(binary)}` }
          ]
        }
      ],
      maxTokens: 1600,
      temperature: 0.6
    })
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    if (
      !parsed ||
      typeof parsed.description !== 'string' ||
      !parsed.description.trim() ||
      !Array.isArray(parsed.questions) ||
      !parsed.questions.length ||
      parsed.questions.some(value => typeof value !== 'string' || !value.trim())
    )
      throw new Error('Invalid provider analysis')
    return {
      description: parsed.description,
      era: typeof parsed.era === 'string' && parsed.era ? parsed.era : 'unknown',
      people_count:
        Number.isInteger(parsed.people_count) && parsed.people_count >= 0 ? parsed.people_count : 0,
      setting: typeof parsed.setting === 'string' && parsed.setting ? parsed.setting : 'unknown',
      questions: parsed.questions.slice(0, 5)
    }
  } catch {
    throw new ApiError(502, { error: 'Photo analysis temporarily unavailable' })
  }
}

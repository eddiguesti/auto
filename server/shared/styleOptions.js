/**
 * Shared style options for memoir writing style transformations.
 * Used by the style routes for AI prompt building.
 */

export const styleOptions = {
  tones: {
    formal: 'Use formal, dignified language with proper grammar and sophisticated vocabulary. Avoid contractions and casual expressions.',
    conversational: 'Write as if speaking directly to a close friend. Use natural speech patterns, contractions, and occasional asides.',
    nostalgic: 'Infuse the writing with warm remembrance and wistful reflection. Evoke sensory details that bring the past to life.',
    humorous: 'Include light-hearted observations, gentle self-deprecation, and witty remarks while maintaining the emotional core of the story.'
  },
  narratives: {
    'first-person-reflective': 'Write in first person with reflective, mature insight. Balance memory with present-day understanding.',
    'third-person': "Write in third person as if describing someone else's life story. Maintain emotional intimacy while using objective narrative distance.",
    'present-tense': 'Write in present tense to create immediacy and immersion. Make readers feel they are experiencing the moment as it happens.'
  },
  authors: {
    hemingway: 'Write in the style of Ernest Hemingway: short, declarative sentences. Simple words. No unnecessary adjectives. Let the facts speak. The emotion lives in what is not said.',
    austen: 'Write in the style of Jane Austen: elegant sentence structure, gentle irony, keen social observation, and refined vocabulary. Balance wit with genuine sentiment.',
    angelou: 'Write in the style of Maya Angelou: poetic rhythm, rich imagery, spiritual depth. Use metaphor and repetition for emphasis. Let the prose sing with dignity and soul.',
    twain: "Write in the style of Mark Twain: folksy American voice, dry humor, vernacular expressions, and sharp observations about human nature. Be warm but never sentimental."
  }
}

/**
 * Build a style transformation prompt based on selected options
 *
 * @param {string[]} tones - Array of tone IDs
 * @param {string|null} narrative - Narrative style ID
 * @param {string|null} authorStyle - Author style ID
 * @returns {string} Complete prompt for AI style transformation
 */
export function buildStylePrompt(tones = [], narrative = null, authorStyle = null) {
  const parts = []

  parts.push('Transform this autobiography passage while preserving ALL facts, names, dates, and specific details exactly as stated.')
  parts.push('')
  parts.push('STYLE REQUIREMENTS:')

  // Add tone instructions
  if (tones && tones.length > 0) {
    parts.push('')
    parts.push('TONES:')
    tones.forEach(toneId => {
      if (styleOptions.tones[toneId]) {
        parts.push(`- ${toneId}: ${styleOptions.tones[toneId]}`)
      }
    })
  }

  // Add narrative instruction
  if (narrative && styleOptions.narratives[narrative]) {
    parts.push('')
    parts.push('NARRATIVE STYLE:')
    parts.push(`- ${narrative}: ${styleOptions.narratives[narrative]}`)
  }

  // Add author style instruction
  if (authorStyle && styleOptions.authors[authorStyle]) {
    parts.push('')
    parts.push('AUTHOR INSPIRATION:')
    parts.push(`- ${authorStyle}: ${styleOptions.authors[authorStyle]}`)
  }

  parts.push('')
  parts.push('CRITICAL RULES:')
  parts.push('- Preserve ALL facts, names, dates, and specific details exactly')
  parts.push('- Output should be roughly the same length as the input')
  parts.push('- Do not add fictional details or embellishments')
  parts.push('- Do not remove any factual information')
  parts.push('- Maintain the original meaning and emotional intent')
  parts.push('')
  parts.push('Return ONLY the transformed text, no explanations or commentary.')
  parts.push('')
  parts.push('ORIGINAL TEXT:')

  return parts.join('\n')
}

export default styleOptions

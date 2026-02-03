import { getGrokClient, isGrokConfigured } from '../utils/grokClient.js'
import { recordGrokCall, recordExternalError } from '../utils/metrics.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('grok')

/**
 * @typedef {Object} GrokChatOptions
 * @property {string} systemPrompt - System prompt for the AI
 * @property {string} userPrompt - User message
 * @property {number} [maxTokens=500] - Maximum tokens in response
 * @property {number} [temperature=0.7] - Temperature (0.0-1.0)
 * @property {string} [model='grok-3-mini-beta'] - Model to use
 * @property {Array<{role: string, content: string}>} [history] - Conversation history
 */

/**
 * @typedef {Object} GrokCompletionOptions
 * @property {Array<{role: string, content: string}>} messages - Pre-built messages array
 * @property {number} [maxTokens=500] - Maximum tokens in response
 * @property {number} [temperature=0.7] - Temperature (0.0-1.0)
 * @property {string} [model='grok-3-mini-beta'] - Model to use
 */

/**
 * @typedef {Object} GrokChatResult
 * @property {string} content - The response content
 * @property {boolean} success - Whether the request succeeded
 */

/**
 * Send a chat completion with pre-built messages array (for complex message handling)
 * @param {GrokCompletionOptions} options
 * @returns {Promise<GrokChatResult>}
 */
export async function grokCompletion({
  messages,
  maxTokens = 500,
  temperature = 0.7,
  model = 'grok-3-mini-beta'
}) {
  const client = getGrokClient()
  const startTime = Date.now()

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    })

    const durationMs = Date.now() - startTime
    const content = completion.choices[0]?.message?.content || ''

    recordGrokCall(durationMs, Boolean(content))

    if (durationMs > 5000) {
      logger.warn('Slow Grok API call', { durationMs, model, maxTokens })
    }

    return {
      content,
      success: Boolean(content)
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    recordGrokCall(durationMs, false)
    recordExternalError('grok', err.message)
    logger.error('Grok API error', { error: err.message, model, durationMs })
    throw err
  }
}

/**
 * Send a chat completion request to Grok API (simple interface)
 * @param {GrokChatOptions} options
 * @returns {Promise<GrokChatResult>}
 */
export async function grokChat({
  systemPrompt,
  userPrompt,
  maxTokens = 500,
  temperature = 0.7,
  model = 'grok-3-mini-beta',
  history = []
}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userPrompt }
  ]

  return grokCompletion({ messages, maxTokens, temperature, model })
}

/**
 * Extract JSON from Grok response (handles markdown code blocks and extra text)
 * @param {string} response - Raw response from Grok
 * @returns {Object} Parsed JSON or empty object on failure
 */
export function parseGrokJson(response) {
  if (!response) return {}

  try {
    // Try to extract JSON object from response (handles markdown, extra text, etc.)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch (parseErr) {
    logger.warn('Failed to parse Grok JSON response', { error: parseErr.message })
    return {}
  }
}

/**
 * Send a chat request and parse JSON response
 * @param {GrokChatOptions} options
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function grokChatJson(options) {
  const result = await grokChat(options)
  return parseGrokJson(result.content)
}

// Re-export for convenience
export { isGrokConfigured }

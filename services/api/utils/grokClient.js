import OpenAI from 'openai'

let clientInstance = null

/**
 * Get a singleton instance of the Grok API client (OpenAI-compatible)
 * @returns {OpenAI} OpenAI client configured for Grok API
 * @throws {Error} If GROK_API_KEY is not set
 */
export function getGrokClient() {
  if (clientInstance) return clientInstance

  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    throw new Error('GROK_API_KEY not set in environment')
  }

  clientInstance = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  })

  return clientInstance
}

/**
 * Check if Grok API is configured
 * @returns {boolean}
 */
export function isGrokConfigured() {
  return Boolean(process.env.GROK_API_KEY)
}

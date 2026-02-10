/**
 * Security utilities for the life-story application
 */

/**
 * Sanitize user input before including in AI prompts to prevent prompt injection.
 *
 * This function:
 * 1. Removes characters that could be used to break out of quoted strings
 * 2. Truncates to a maximum length to prevent token exhaustion attacks
 * 3. Escapes patterns that look like instruction overrides
 *
 * @param {string} input - User-provided text
 * @param {number} maxLength - Maximum allowed length (default 5000)
 * @returns {string} Sanitized input safe for AI prompts
 */
export function sanitizeForPrompt(input, maxLength = 5000) {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Truncate to prevent token exhaustion
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... [truncated]'
  }

  // Remove null bytes and other control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape patterns that could be used for prompt injection
  // These patterns attempt to override or escape the prompt context
  const injectionPatterns = [
    // Instruction override attempts
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)/gi,
    /new\s+instructions?:/gi,
    /system\s*prompt:/gi,
    /you\s+are\s+now/gi,
    /act\s+as\s+if/gi,
    /pretend\s+(you('re|are)|to\s+be)/gi,
    /from\s+now\s+on/gi,
    // Role manipulation
    /\[system\]/gi,
    /\[assistant\]/gi,
    /\[user\]/gi,
    // Delimiter escapes
    /```\s*(system|assistant|user)/gi,
    /<\|im_(start|end)\|>/gi,
    /<\|(system|user|assistant)\|>/gi
  ]

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[filtered]')
  }

  return sanitized
}

/**
 * Create a safely delimited user content block for AI prompts.
 * Uses a unique delimiter that's unlikely to appear in normal text.
 *
 * @param {string} label - Label for the content (e.g., "User's Answer")
 * @param {string} content - The user content to include
 * @param {number} maxLength - Maximum length for content
 * @returns {string} Safely formatted content block
 */
export function createSafeContentBlock(label, content, maxLength = 5000) {
  const sanitized = sanitizeForPrompt(content, maxLength)
  const delimiter = '═══════════════════════'

  return `
${delimiter}
${label.toUpperCase()}:
${delimiter}
${sanitized}
${delimiter}
END ${label.toUpperCase()}
${delimiter}`
}

/**
 * Validate that a string doesn't exceed reasonable limits
 * @param {string} input - Input to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} Whether input is valid
 */
export function validateLength(input, maxLength = 50000) {
  return typeof input === 'string' && input.length <= maxLength
}

/**
 * Rate limiting helper - tracks request counts per user.
 * Uses Redis when available (survives restarts, works across instances).
 * Falls back to in-memory when Redis is unavailable.
 */
import { redisIncr } from './redis.js'

const RATE_LIMIT_WINDOW_SEC = 60 // 1 minute in seconds
const MAX_REQUESTS = 30 // Max AI requests per minute per user

// In-memory fallback for when Redis is unavailable
const requestCounts = new Map()
const MAX_CACHE_SIZE = 10000

setInterval(
  () => {
    const now = Date.now()
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW_SEC * 2 * 1000) {
        requestCounts.delete(key)
      }
    }
  },
  RATE_LIMIT_WINDOW_SEC * 2 * 1000
)

function checkRateLimitMemory(userId) {
  const now = Date.now()
  const userKey = `user:${userId}`

  const userData = requestCounts.get(userKey) || { count: 0, windowStart: now }

  if (now - userData.windowStart > RATE_LIMIT_WINDOW_SEC * 1000) {
    userData.count = 0
    userData.windowStart = now
  }

  userData.count++
  requestCounts.set(userKey, userData)

  if (requestCounts.size > MAX_CACHE_SIZE) {
    const toDelete = requestCounts.size - MAX_CACHE_SIZE
    const iter = requestCounts.keys()
    for (let i = 0; i < toDelete; i++) {
      requestCounts.delete(iter.next().value)
    }
  }

  return {
    allowed: userData.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - userData.count),
    resetIn: RATE_LIMIT_WINDOW_SEC * 1000 - (now - userData.windowStart)
  }
}

export async function checkRateLimit(userId) {
  const key = `ratelimit:ai:${userId}`
  const count = await redisIncr(key, RATE_LIMIT_WINDOW_SEC)

  if (count === null) {
    // Redis unavailable — fall back to in-memory
    return checkRateLimitMemory(userId)
  }

  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
    resetIn: RATE_LIMIT_WINDOW_SEC * 1000
  }
}

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
    /<\|(system|user|assistant)\|>/gi,
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
 * Rate limiting helper - tracks request counts per user
 */
const requestCounts = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 30 // Max AI requests per minute per user

export function checkRateLimit(userId) {
  const now = Date.now()
  const userKey = `user:${userId}`

  const userData = requestCounts.get(userKey) || { count: 0, windowStart: now }

  // Reset window if expired
  if (now - userData.windowStart > RATE_LIMIT_WINDOW) {
    userData.count = 0
    userData.windowStart = now
  }

  userData.count++
  requestCounts.set(userKey, userData)

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
        requestCounts.delete(key)
      }
    }
  }

  return {
    allowed: userData.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - userData.count),
    resetIn: RATE_LIMIT_WINDOW - (now - userData.windowStart)
  }
}

/**
 * Error message sanitizer to prevent secret leakage
 * Detects and redacts sensitive information from error messages
 */

const SENSITIVE_PATTERNS = [
  // Connection strings
  /postgresql:\/\/[^\s]+/gi,
  /postgres:\/\/[^\s]+/gi,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /redis:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,

  // API keys and tokens (including Stripe sk_live_, sk_test_, etc.)
  /sk[-_][a-zA-Z0-9_]{20,}/g,
  /pk[-_][a-zA-Z0-9_]{20,}/g,
  /xai[-_][a-zA-Z0-9_]{20,}/g,
  /gsk_[a-zA-Z0-9_]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /api[_-]?key[=:]\s*['"]?[a-zA-Z0-9]{16,}['"]?/gi,
  /secret[=:]\s*['"]?[a-zA-Z0-9]{16,}['"]?/gi,

  // Environment variables in messages
  /process\.env\.[A-Z_]+/g,

  // File paths that reveal structure
  /\/Users\/[^\s]+/g,
  /\/home\/[^\s]+/g,
  /\/var\/[^\s]+/g,
  /\/etc\/[^\s]+/g,
  /C:\\Users\\[^\s]+/gi,

  // Internal IP addresses
  /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g,
  /\b(172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
  /\b(192\.168\.\d{1,3}\.\d{1,3})\b/g,

  // JWT tokens
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,

  // Password-like patterns
  /password[=:]\s*['"]?[^\s'"]+['"]?/gi
]

// Known safe error messages that can pass through unchanged
const SAFE_MESSAGES = new Set([
  // Auth errors
  'Authentication required',
  'Invalid or expired token',
  'User not found',
  'Email already registered',
  'Invalid email or password',
  'Please use Google Sign-In for this account',
  'Registration failed',
  'Login failed',
  'Account not found',

  // Validation errors
  'Validation failed',
  'Invalid input',
  'Missing required fields',

  // Resource errors
  'Not found',
  'Resource not found',
  'Story not found',
  'Photo not found',
  'Chapter not found',

  // Permission errors
  'Access denied',
  'Forbidden',
  'Not authorized',
  'Admin only',

  // Rate limiting
  'Too many requests',
  'Too many requests, please try again later',
  'Too many login attempts, please try again in 15 minutes',

  // Service errors
  'Database not available',
  'Service unavailable',
  'Server configuration error',
  'Something went wrong',
  'An unexpected error occurred',
  'Internal server error',

  // Payment errors
  'Payment failed',
  'Payment required',

  // File errors
  'File too large',
  'Invalid file type',
  'Failed to upload photo. Please try again.',
  'Failed to delete photo. Please try again.',

  // AI/Export errors
  'AI service temporarily unavailable',
  'Failed to generate content',
  'Export failed',
  'Voice session failed'
])

/**
 * Check if a message contains sensitive patterns
 * @param {string} message - Message to check
 * @returns {boolean} True if message contains sensitive data
 */
function containsSensitiveData(message) {
  if (!message || typeof message !== 'string') return false

  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0
    if (pattern.test(message)) {
      return true
    }
  }
  return false
}

/**
 * Sanitize an error message to prevent secret leakage
 * @param {string} message - Original error message
 * @param {string} fallback - Fallback message if original contains secrets
 * @returns {string} Sanitized message
 */
export function sanitizeErrorMessage(message, fallback = 'An unexpected error occurred') {
  if (!message || typeof message !== 'string') {
    return fallback
  }

  // Known safe messages pass through unchanged
  if (SAFE_MESSAGES.has(message)) {
    return message
  }

  // Check for sensitive patterns
  if (containsSensitiveData(message)) {
    return fallback
  }

  // Additional safety: reject very long messages (may contain dumps)
  if (message.length > 500) {
    return fallback
  }

  return message
}

/**
 * Check if a message is known to be safe
 * @param {string} message - Message to check
 * @returns {boolean} True if message is in safe list
 */
export function isSafeMessage(message) {
  return message && SAFE_MESSAGES.has(message)
}

/**
 * Add a message to the safe list (useful for testing or extending)
 * @param {string} message - Message to add
 */
export function addSafeMessage(message) {
  if (message && typeof message === 'string') {
    SAFE_MESSAGES.add(message)
  }
}

export default sanitizeErrorMessage

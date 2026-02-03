/**
 * Structured logger utility
 * Provides consistent logging with context and levels
 * Includes automatic secret redaction to prevent accidental exposure
 */

import { SECRET_ENV_VARS } from './validateEnv.js'

/**
 * Patterns that indicate sensitive data (case-insensitive matching)
 */
const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'apikey', 'api_key',
  'authorization', 'auth', 'bearer', 'credential', 'private',
  'jwt', 'session', 'cookie', 'key', 'cert', 'certificate'
]

/**
 * Build regex patterns for known secret values at startup
 * This allows us to redact actual secret values if they appear in logs
 */
function buildSecretPatterns() {
  const patterns = []
  for (const envVar of SECRET_ENV_VARS) {
    const value = process.env[envVar]
    // Only create pattern if value exists and is long enough to be meaningful
    if (value && value.length >= 8) {
      // Escape special regex characters and create pattern
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      patterns.push(new RegExp(escaped, 'g'))
    }
  }
  return patterns
}

// Build patterns once at startup
let secretPatterns = null
function getSecretPatterns() {
  if (secretPatterns === null) {
    secretPatterns = buildSecretPatterns()
  }
  return secretPatterns
}

/**
 * Redact sensitive values from an object
 * @param {any} obj - Object to redact
 * @param {number} depth - Current recursion depth
 * @returns {any} - Redacted object
 */
function redactObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]'

  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') {
    // Redact string values that match secret patterns
    if (typeof obj === 'string') {
      return redactString(obj)
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, depth + 1))
  }

  const redacted = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    // Check if key name indicates sensitive data
    const isSensitiveKey = SENSITIVE_KEYS.some(pattern => lowerKey.includes(pattern))

    if (isSensitiveKey && value) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1)
    } else if (typeof value === 'string') {
      redacted[key] = redactString(value)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

/**
 * Redact known secret values from a string
 * @param {string} str - String to redact
 * @returns {string} - Redacted string
 */
function redactString(str) {
  if (!str || typeof str !== 'string') return str

  let result = str
  for (const pattern of getSecretPatterns()) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

// Get log level from environment (default to 'info' in production, 'debug' in development)
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug)

/**
 * Format log message with timestamp and context
 * Automatically redacts sensitive data from context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {string}
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString()
  // Redact sensitive data from context before logging
  const safeContext = redactObject(context)
  const contextStr = Object.keys(safeContext).length > 0
    ? ` ${JSON.stringify(safeContext)}`
    : ''
  // Also redact the message itself in case secrets are passed directly
  const safeMessage = redactString(message)
  return `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}${contextStr}`
}

/**
 * Create a logger with optional namespace
 * @param {string} namespace - Logger namespace (e.g., 'auth', 'api', 'db')
 * @returns {Object} Logger instance
 */
export function createLogger(namespace = '') {
  const prefix = namespace ? `[${namespace}] ` : ''

  return {
    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object|Error} context - Error object or additional context
     */
    error(message, context = {}) {
      if (currentLevel >= LOG_LEVELS.error) {
        const ctx = context instanceof Error
          ? { error: context.message, stack: context.stack }
          : context
        console.error(formatLog('error', prefix + message, ctx))
      }
    },

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    warn(message, context = {}) {
      if (currentLevel >= LOG_LEVELS.warn) {
        console.warn(formatLog('warn', prefix + message, context))
      }
    },

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} context - Additional context
     */
    info(message, context = {}) {
      if (currentLevel >= LOG_LEVELS.info) {
        console.log(formatLog('info', prefix + message, context))
      }
    },

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} context - Additional context
     */
    debug(message, context = {}) {
      if (currentLevel >= LOG_LEVELS.debug) {
        console.log(formatLog('debug', prefix + message, context))
      }
    },

    /**
     * Create a child logger with additional namespace
     * @param {string} childNamespace - Child namespace
     * @returns {Object} Child logger instance
     */
    child(childNamespace) {
      const newNamespace = namespace
        ? `${namespace}:${childNamespace}`
        : childNamespace
      return createLogger(newNamespace)
    }
  }
}

// Default logger instance
export const logger = createLogger()

// Pre-configured loggers for common modules
export const authLogger = createLogger('auth')
export const dbLogger = createLogger('db')
export const apiLogger = createLogger('api')
export const aiLogger = createLogger('ai')
export const errorLogger = createLogger('error')

/**
 * Create a request-scoped logger that auto-includes correlation ID
 * @param {import('express').Request} req - Express request object
 * @param {string} namespace - Logger namespace
 * @returns {Object} Logger instance with requestId context
 */
export function createRequestLogger(req, namespace = '') {
  const baseLogger = createLogger(namespace)
  const requestId = req?.id || 'no-request-id'

  return {
    error: (msg, ctx = {}) => baseLogger.error(msg, { ...ctx, requestId }),
    warn: (msg, ctx = {}) => baseLogger.warn(msg, { ...ctx, requestId }),
    info: (msg, ctx = {}) => baseLogger.info(msg, { ...ctx, requestId }),
    debug: (msg, ctx = {}) => baseLogger.debug(msg, { ...ctx, requestId })
  }
}

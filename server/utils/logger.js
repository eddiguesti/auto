/**
 * Structured logger utility
 * Provides consistent logging with context and levels
 */

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
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {string}
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString()
  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
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

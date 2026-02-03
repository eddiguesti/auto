/**
 * Centralized configuration with secure defaults
 * All environment variable access should go through this module
 */

import { isProduction } from './validateEnv.js'

/**
 * Get a required environment variable
 * Throws if not set in production, returns fallback in development
 * @param {string} name - Environment variable name
 * @param {string} devFallback - Fallback value for development only
 * @returns {string}
 */
function getRequired(name, devFallback = null) {
  const value = process.env[name]
  if (value) return value

  if (isProduction()) {
    throw new Error(`Required environment variable ${name} is not set`)
  }

  if (devFallback !== null) {
    console.warn(`[config] Using development fallback for ${name}`)
    return devFallback
  }

  throw new Error(`Required environment variable ${name} is not set`)
}

/**
 * Get an optional environment variable with a default
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string}
 */
function getOptional(name, defaultValue) {
  return process.env[name] || defaultValue
}

/**
 * Get an integer environment variable
 * @param {string} name - Environment variable name
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number}
 */
function getInt(name, defaultValue) {
  const value = process.env[name]
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Get a boolean environment variable
 * @param {string} name - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function getBool(name, defaultValue) {
  const value = process.env[name]
  if (!value) return defaultValue

  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Server configuration
 */
export const server = {
  port: getInt('PORT', 3001),
  nodeEnv: getOptional('NODE_ENV', 'development'),
  isProduction: isProduction(),
  appUrl: getOptional('APP_URL', 'http://localhost:3001')
}

/**
 * Database configuration with secure defaults
 */
export const database = {
  // Connection URL (required)
  get url() {
    return getRequired('DATABASE_URL')
  },

  // Connection pool settings with secure defaults
  pool: {
    max: getInt('DATABASE_POOL_MAX', 20),
    min: getInt('DATABASE_POOL_MIN', 2),
    idleTimeoutMillis: getInt('DATABASE_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: getInt('DATABASE_CONNECTION_TIMEOUT', 10000)
  },

  // SSL configuration - secure by default in production
  ssl: {
    // In production, reject unauthorized certificates by default
    rejectUnauthorized: isProduction()
      ? getBool('DATABASE_SSL_REJECT_UNAUTHORIZED', true)
      : getBool('DATABASE_SSL_REJECT_UNAUTHORIZED', false)
  }
}

/**
 * Authentication configuration
 */
export const auth = {
  // JWT secret (required)
  get jwtSecret() {
    return getRequired('JWT_SECRET')
  },

  // JWT expiration - secure default of 7 days
  jwtExpiresIn: getOptional('JWT_EXPIRES_IN', '7d'),

  // Google OAuth
  get googleClientSecret() {
    return getRequired('GOOGLE_CLIENT_SECRET')
  },

  // Dev bypass - disabled by default, only works in development
  devBypass: !isProduction() && getBool('DEV_BYPASS', false)
}

/**
 * Rate limiting configuration
 */
export const rateLimit = {
  // Global rate limit
  global: {
    windowMs: getInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    max: getInt('RATE_LIMIT_MAX', 500) // 500 requests per window
  },

  // Auth rate limit (stricter)
  auth: {
    windowMs: getInt('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    max: getInt('AUTH_RATE_LIMIT_MAX', 10) // 10 attempts per window
  }
}

/**
 * Logging configuration
 */
export const logging = {
  level: getOptional('LOG_LEVEL', isProduction() ? 'info' : 'debug')
}

/**
 * External API configurations (lazy-loaded to avoid errors for unused features)
 */
export const apis = {
  get grokApiKey() {
    return process.env.GROK_API_KEY || null
  },

  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY || null
  },

  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET || null
  },

  get replicateApiToken() {
    return process.env.REPLICATE_API_TOKEN || null
  },

  get fishAudioApiKey() {
    return process.env.FISH_AUDIO_API_KEY || null
  },

  get luluClientKey() {
    return process.env.LULU_CLIENT_KEY || null
  },

  get luluClientSecret() {
    return process.env.LULU_CLIENT_SECRET || null
  },

  get luluSandbox() {
    return getBool('LULU_SANDBOX', !isProduction())
  },

  get telegramBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN || null
  },

  get telegramWebhookSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET || null
  }
}

/**
 * Export all config as default
 */
export default {
  server,
  database,
  auth,
  rateLimit,
  logging,
  apis
}

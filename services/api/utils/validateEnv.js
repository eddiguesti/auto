/**
 * Environment variable validation utility
 * Validates required environment variables at startup
 */

/**
 * Required environment variables by feature
 */
/**
 * List of known secret environment variable names (for redaction)
 */
export const SECRET_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GROK_API_KEY',
  'REPLICATE_API_TOKEN',
  'FISH_AUDIO_API_KEY',
  'LULU_CLIENT_KEY',
  'LULU_CLIENT_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET'
]

const ENV_REQUIREMENTS = {
  // Core database (always required)
  database: {
    required: ['DATABASE_URL'],
    optional: []
  },
  // Google OAuth and JWT
  auth: {
    required: ['JWT_SECRET', 'GOOGLE_CLIENT_SECRET'],
    optional: []
  },
  // Grok AI features
  ai: {
    required: ['GROK_API_KEY'],
    optional: []
  },
  // Stripe payments
  payments: {
    required: ['STRIPE_SECRET_KEY'],
    optional: ['STRIPE_WEBHOOK_SECRET']
  },
  // Fish.audio TTS
  audiobook: {
    required: ['FISH_AUDIO_API_KEY'],
    optional: []
  },
  // Replicate image generation
  covers: {
    required: ['REPLICATE_API_TOKEN'],
    optional: []
  },
  // Lulu print on demand
  printing: {
    required: ['LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET'],
    optional: ['LULU_SANDBOX']
  },
  // Telegram support bot
  telegram: {
    required: ['TELEGRAM_BOT_TOKEN'],
    optional: ['TELEGRAM_WEBHOOK_SECRET']
  }
}

/**
 * Check if running in production mode
 * @returns {boolean}
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

/**
 * Validate that critical security settings are properly configured for production
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateSecurityConfig() {
  const issues = []

  // In production, ensure no dev bypass is enabled
  if (isProduction() && process.env.DEV_BYPASS === 'true') {
    issues.push('DEV_BYPASS must not be enabled in production')
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      issues.push('JWT_SECRET must be at least 32 characters')
    }
    if (jwtSecret.includes('CHANGE_ME') || jwtSecret.includes('changeme')) {
      issues.push('JWT_SECRET contains placeholder value - generate a secure secret')
    }
    if (jwtSecret === 'development-secret' || jwtSecret === 'secret') {
      issues.push('JWT_SECRET is using an insecure default value')
    }
  }

  // In production, ensure HTTPS-related settings
  if (isProduction()) {
    if (!process.env.APP_URL?.startsWith('https://')) {
      issues.push('APP_URL should use HTTPS in production')
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Validate environment variables for specified features
 * @param {string[]} features - Features to validate (e.g., ['database', 'auth', 'ai'])
 * @returns {{ valid: boolean, missing: string[], warnings: string[] }}
 */
export function validateEnv(features = ['database']) {
  const missing = []
  const warnings = []

  for (const feature of features) {
    const requirements = ENV_REQUIREMENTS[feature]
    if (!requirements) {
      warnings.push(`Unknown feature: ${feature}`)
      continue
    }

    // Check required vars
    for (const envVar of requirements.required) {
      if (!process.env[envVar]) {
        missing.push(`${envVar} (required for ${feature})`)
      }
    }

    // Check optional vars
    for (const envVar of requirements.optional) {
      if (!process.env[envVar]) {
        warnings.push(`${envVar} not set (optional for ${feature})`)
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Validate all environment variables and exit if required ones are missing
 * @param {string[]} features - Features to validate
 */
export function validateEnvOrExit(features = ['database']) {
  const result = validateEnv(features)

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:')
    result.warnings.forEach(w => console.warn(`  - ${w}`))
  }

  if (!result.valid) {
    console.error('Missing required environment variables:')
    result.missing.forEach(m => console.error(`  - ${m}`))
    console.error('\nPlease set these environment variables and restart the server.')
    process.exit(1)
  }
}

/**
 * Check if a specific feature's environment is configured
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export function isFeatureConfigured(feature) {
  const requirements = ENV_REQUIREMENTS[feature]
  if (!requirements) return false

  return requirements.required.every(envVar => !!process.env[envVar])
}

/**
 * Get list of all available features and their configuration status
 * @returns {Object<string, { configured: boolean, missing: string[] }>}
 */
export function getFeatureStatus() {
  const status = {}

  for (const [feature, requirements] of Object.entries(ENV_REQUIREMENTS)) {
    const missing = requirements.required.filter(envVar => !process.env[envVar])
    status[feature] = {
      configured: missing.length === 0,
      missing
    }
  }

  return status
}

/**
 * Environment variable validation utility
 * Validates required environment variables at startup
 */

/**
 * Required environment variables by feature
 */
const ENV_REQUIREMENTS = {
  // Core database (always required)
  database: {
    required: ['DATABASE_URL'],
    optional: []
  },
  // Google OAuth
  auth: {
    required: ['GOOGLE_CLIENT_SECRET'],
    optional: ['JWT_SECRET'] // Falls back to a default in dev
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

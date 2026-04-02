// @ts-check
/**
 * @fileoverview Shared JSDoc type definitions for the Easy Memoir API.
 * Import these with @typedef imports in other files, e.g.:
 *   @typedef {import('../types/index.js').User} User
 */

// ─── Database ──────────────────────────────────────────────────────────────

/**
 * @typedef {import('pg').PoolClient | import('pg').Pool} DbClient
 * A pg Pool or PoolClient — both expose .query()
 */

// ─── Users ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} email
 * @property {string} name
 * @property {number|null} birth_year
 * @property {string|null} avatar_url
 * @property {Date|null} premium_until
 * @property {boolean} email_verified
 * @property {string|null} google_id
 * @property {boolean} is_admin
 */

/**
 * @typedef {Object} UserAuth
 * @property {number} id
 * @property {string} email
 * @property {string} name
 * @property {string|null} password_hash
 * @property {string|null} google_id
 * @property {string|null} avatar_url
 */

// ─── Stories ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Story
 * @property {number} id
 * @property {number} user_id
 * @property {string} chapter_id
 * @property {string} question_id
 * @property {string|null} answer
 * @property {string|null} original_answer
 * @property {boolean} style_applied
 * @property {Date|null} style_applied_at
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Story & { photos: PhotoRef[] }} StoryWithPhotos
 */

/**
 * @typedef {Object} PhotoRef
 * @property {number} id
 * @property {string} filename
 * @property {string|null} caption
 */

// ─── Photos ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Photo
 * @property {number} id
 * @property {number} story_id
 * @property {string} filename
 * @property {string} original_name
 * @property {string|null} caption
 * @property {Date} created_at
 */

// ─── Payments ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Payment
 * @property {number} id
 * @property {string} product_id
 * @property {string} product_type
 * @property {number} amount
 * @property {string} currency
 * @property {string} status
 * @property {Date} created_at
 */

// ─── Onboarding ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OnboardingStatus
 * @property {boolean} onboarding_completed
 * @property {string|null} input_preference
 * @property {string|null} birth_place
 * @property {string|null} birth_country
 * @property {number|null} birth_year
 */

/**
 * @typedef {Object} OnboardingContext
 * @property {string|null} birth_place
 * @property {string|null} birth_country
 * @property {number|null} birth_year
 * @property {string|null} additional_context
 */

// ─── Audiobook ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} VoiceModel
 * @property {string} fish_model_id  Local filename of the voice sample
 * @property {boolean} consent_given
 * @property {Date} created_at
 */

/**
 * @typedef {Object} Audiobook
 * @property {string} filename
 * @property {string} voice_type  'custom' | 'default'
 * @property {Date} created_at
 */

// ─── Cover ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BookCover
 * @property {number} id
 * @property {number} user_id
 * @property {string} template_id
 * @property {string|null} title
 * @property {string|null} author
 * @property {string|null} front_cover_url
 * @property {string|null} back_cover_url
 * @property {string|null} spine_text
 * @property {object} color_scheme
 * @property {object} custom_settings
 * @property {Date} created_at
 * @property {Date} updated_at
 */

// ─── Game ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GameState
 * @property {number} user_id
 * @property {boolean} game_mode_enabled
 * @property {number} current_streak
 * @property {number} longest_streak
 * @property {Date|null} last_activity_date
 * @property {number} streak_shields_available
 * @property {number} streak_shields_used_this_week
 * @property {number} prompts_completed_this_week
 * @property {object} notification_preferences
 * @property {string|null} preferred_prompt_time
 * @property {string|null} timezone
 */

/**
 * @typedef {Object} StreakHistory
 * @property {string} date  ISO date string YYYY-MM-DD
 * @property {boolean} had_activity
 * @property {number} streak_on_this_day
 * @property {boolean} shield_used
 * @property {boolean} prompt_completed
 */

// ─── API ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ApiError
 * @property {string} error  Human-readable message
 * @property {string} [message]  Alias for error
 * @property {string} [code]  Machine-readable code e.g. 'PREMIUM_REQUIRED'
 * @property {string} [requestId]
 */

export {}

/**
 * Named column constants for database queries.
 * Use these instead of SELECT * to prevent leaking sensitive columns
 * and to make queries explicit about what data they need.
 */

// Users — NEVER include password_hash or google_id in non-auth queries
export const USER_PUBLIC =
  'id, email, name, birth_year, avatar_url, premium_until, is_admin, created_at'
export const USER_AUTH = 'id, email, name, password_hash, google_id, avatar_url'
export const USER_PROFILE =
  'id, email, name, birth_year, avatar_url, premium_until, email_verified, google_id, is_admin'

// Stories
export const STORY =
  'id, user_id, chapter_id, question_id, answer, original_answer, style_applied, style_applied_at, created_at, updated_at'
export const STORY_CONTENT = 'id, answer, original_answer'

// Photos — uses table alias p because queries JOIN to stories
export const PHOTO = 'p.id, p.story_id, p.filename, p.original_name, p.caption, p.created_at'

// Payments — exclude stripe_session_id from user-facing queries
export const PAYMENT_PUBLIC = 'id, product_id, product_type, amount, currency, status, created_at'
export const PAYMENT_INTERNAL =
  'id, user_id, stripe_session_id, stripe_subscription_id, product_id, product_type, amount, currency, status, created_at, updated_at'
export const PAYMENT_EXISTS = 'id'

// Voice Sessions
export const VOICE_SESSION =
  'id, user_id, chapter_id, session_status, questions_answered, current_question_id, questions_since_compile, session_transcripts, started_at, ended_at, last_compile_at, created_at, updated_at'

// Style Preferences
export const STYLE_PREFS =
  'id, user_id, tones, narrative, author_style, applied_at, created_at, updated_at'

// Chapter Reviews
export const CHAPTER_REVIEW =
  'id, user_id, chapter_id, polished_text, raw_source_text, version, clio_history, created_at, updated_at'

// Settings
export const SETTINGS = 'id, user_id, name, created_at, updated_at'

// Book Covers
export const BOOK_COVER =
  'id, user_id, template_id, title, author, front_cover_url, back_cover_url, spine_text, color_scheme, custom_settings, created_at, updated_at'

// Telegram
export const TELEGRAM_USER =
  'id, telegram_chat_id, telegram_username, telegram_first_name, telegram_last_name, user_id, guest_name, guest_email, is_registered, link_code, link_code_expires, created_at, updated_at'
export const TELEGRAM_SESSION =
  'id, telegram_user_id, session_state, current_chapter_id, current_question_id, context, created_at, updated_at'

// Memory Entities
export const MEMORY_ENTITY =
  'id, user_id, entity_type, name, description, first_mentioned_chapter, first_mentioned_question, mention_count, created_at, updated_at'

// Prompt Library
export const PROMPT_LIBRARY =
  'id, prompt_text, prompt_type, chapter_hint, question_hint, is_active, times_used, min_streak_days, tags, personality_tags, created_at'

// Daily Prompts
export const DAILY_PROMPT =
  'id, user_id, prompt_date, prompt_text, prompt_type, chapter_id, question_id, is_completed, completed_at, xp_awarded, created_at'

// Collection Items
export const COLLECTION_ITEM =
  'id, collection_id, item_key, display_name, description, icon, check_type, check_value, display_order, created_at'

// Family Prompts
export const FAMILY_PROMPT =
  'id, for_user_id, from_member_id, prompt_text, answer, is_completed, created_at, updated_at'

// Memory Circles
export const MEMORY_CIRCLE =
  'id, user_id, name, description, invite_code, invite_code_expires, created_at, updated_at'

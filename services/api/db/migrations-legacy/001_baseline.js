/**
 * Baseline migration — documents the existing schema.
 * All tables already exist via CREATE TABLE IF NOT EXISTS in db/index.js.
 * This migration serves as the starting point for future migrations.
 */

export async function up(pgm) {
  // No-op: all tables already exist in production.
  // This migration exists to establish a baseline so future migrations
  // can be applied incrementally via node-pg-migrate.
  //
  // Tables documented as of this baseline:
  // users, settings, stories, photos, followups, memory_entities,
  // memory_mentions, memory_relationships, payments, voice_models,
  // audiobooks, user_style_preferences, chapter_reviews,
  // telegram_users, telegram_sessions, telegram_messages,
  // user_onboarding, chapter_images, book_covers, voice_sessions,
  // user_game_state, daily_prompts, achievements, collections,
  // collection_items, user_collection_progress, memory_circles,
  // memory_circle_members, family_prompts, family_encouragements,
  // streak_history, prompt_library, notification_queue,
  // newsletter_subscribers, password_reset_tokens, memos,
  // free_stories, email_session_tokens, email_verification_tokens,
  // telnyx_calls, ai_usage, refund_requests, lulu_orders
}

export async function down(pgm) {
  // Cannot reverse baseline — would drop all tables
}

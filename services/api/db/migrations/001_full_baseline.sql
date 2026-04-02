-- ============================================================
-- 001_full_baseline.sql
-- Complete baseline schema for Easy Memoir.
-- Safe to run on both fresh installs and existing databases.
-- All statements use IF NOT EXISTS / IF NOT EXISTS guards.
-- ============================================================

-- Core users table (all columns including those added by later ALTER TABLE)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  name TEXT,
  birth_year INTEGER,
  avatar_url TEXT,
  premium_until TIMESTAMP,
  premium_activated_at TIMESTAMP,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  phone_number TEXT,
  phone_call_consent BOOLEAN DEFAULT false,
  contact_preference TEXT DEFAULT 'email',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompt library (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS prompt_library (
  id SERIAL PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  prompt_category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_hint TEXT,
  linked_chapter_id TEXT,
  linked_question_id TEXT,
  era_specific BOOLEAN DEFAULT false,
  requires_person_mention BOOLEAN DEFAULT false,
  requires_place_mention BOOLEAN DEFAULT false,
  personalization_template TEXT,
  preferred_day_of_week INTEGER,
  min_streak_days INTEGER DEFAULT 0,
  max_uses_per_user INTEGER,
  difficulty_level INTEGER DEFAULT 1,
  estimated_minutes INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection definitions (seeded data, no foreign key dependencies)
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  collection_key TEXT UNIQUE NOT NULL,
  collection_name TEXT NOT NULL,
  collection_description TEXT,
  collection_icon TEXT,
  required_items INTEGER DEFAULT 5,
  reward_artwork_prompt TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  completion_type TEXT NOT NULL,
  completion_criteria JSONB NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(collection_id, item_key)
);

-- Voice sessions (defined before stories because stories references it)
CREATE TABLE IF NOT EXISTS voice_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  session_status TEXT DEFAULT 'active',
  questions_answered TEXT[] DEFAULT '{}',
  current_question_id TEXT,
  questions_since_compile INTEGER DEFAULT 0,
  session_transcripts JSONB DEFAULT '[]',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  last_compile_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Stories (all columns including those added by later ALTER TABLE migrations)
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT,
  original_answer TEXT,
  style_applied TEXT,
  style_applied_at TIMESTAMP,
  compiled_content TEXT,
  compiled_at TIMESTAMP,
  voice_session_id INTEGER REFERENCES voice_sessions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chapter_id, question_id)
);

CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followups (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memory graph
CREATE TABLE IF NOT EXISTS memory_entities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  first_mentioned_chapter TEXT,
  first_mentioned_question TEXT,
  mention_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entity_type, name)
);

CREATE TABLE IF NOT EXISTS memory_mentions (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  context TEXT,
  sentiment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_relationships (
  id SERIAL PRIMARY KEY,
  entity1_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
  entity2_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
  relationship_type TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity1_id, entity2_id, relationship_type)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments audit log — immutable, append-only payment event history
CREATE TABLE IF NOT EXISTS payments_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  amount INTEGER,
  product_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice models for audiobook voice cloning
CREATE TABLE IF NOT EXISTS voice_models (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  fish_model_id TEXT,
  consent_given BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audiobooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  voice_type TEXT DEFAULT 'default',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Style preferences
CREATE TABLE IF NOT EXISTS user_style_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tones TEXT[],
  narrative TEXT,
  author_style TEXT,
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chapter reviews
CREATE TABLE IF NOT EXISTS chapter_reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  polished_text TEXT NOT NULL,
  raw_source_text TEXT,
  version INTEGER DEFAULT 1,
  clio_history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chapter_id)
);

-- Telegram integration
CREATE TABLE IF NOT EXISTS telegram_users (
  id SERIAL PRIMARY KEY,
  telegram_chat_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  is_registered BOOLEAN DEFAULT false,
  link_code TEXT UNIQUE,
  link_code_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_sessions (
  id SERIAL PRIMARY KEY,
  telegram_user_id INTEGER REFERENCES telegram_users(id) ON DELETE CASCADE,
  session_state TEXT DEFAULT 'idle',
  current_chapter_id TEXT,
  current_question_id TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(telegram_user_id)
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id SERIAL PRIMARY KEY,
  telegram_user_id INTEGER REFERENCES telegram_users(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding
CREATE TABLE IF NOT EXISTS user_onboarding (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  input_preference TEXT,
  birth_place TEXT,
  birth_country TEXT,
  birth_year INTEGER,
  additional_context JSONB DEFAULT '{}',
  channel_preferences JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chapter images
CREATE TABLE IF NOT EXISTS chapter_images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  image_url TEXT,
  prompt_used TEXT,
  generation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chapter_id)
);

-- Book covers
CREATE TABLE IF NOT EXISTS book_covers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  template_id TEXT NOT NULL DEFAULT 'classic',
  title TEXT,
  author TEXT,
  front_cover_url TEXT,
  back_cover_url TEXT,
  spine_text TEXT,
  color_scheme JSONB DEFAULT '{}',
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gamification
CREATE TABLE IF NOT EXISTS user_game_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_shields_available INTEGER DEFAULT 1,
  streak_shields_used_this_week INTEGER DEFAULT 0,
  last_shield_reset DATE,
  total_memories INTEGER DEFAULT 0,
  total_people_mentioned INTEGER DEFAULT 0,
  total_places_mentioned INTEGER DEFAULT 0,
  daily_prompt_completed_today BOOLEAN DEFAULT false,
  prompts_completed_this_week INTEGER DEFAULT 0,
  game_mode_enabled BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"daily_reminder": true, "streak_warning": true, "weekly_digest": true, "family_activity": true}',
  preferred_prompt_time TEXT DEFAULT '09:00',
  timezone TEXT DEFAULT 'Europe/London',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_prompts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prompt_date DATE NOT NULL,
  prompt_type TEXT NOT NULL,
  prompt_category TEXT,
  prompt_text TEXT NOT NULL,
  prompt_hint TEXT,
  linked_chapter_id TEXT,
  linked_question_id TEXT,
  personalization_context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  answered_at TIMESTAMP,
  answer_story_id INTEGER REFERENCES stories(id),
  time_to_complete_seconds INTEGER,
  word_count INTEGER,
  skipped_at TIMESTAMP,
  skip_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, prompt_date)
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  seen_by_user BOOLEAN DEFAULT false,
  trigger_data JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS user_collection_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  items_completed INTEGER DEFAULT 0,
  completed_items JSONB DEFAULT '[]',
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  reward_artwork_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, collection_id)
);

-- Memory circles (family groups)
CREATE TABLE IF NOT EXISTS memory_circles (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  circle_name TEXT DEFAULT 'My Memory Circle',
  invite_code TEXT UNIQUE,
  invite_code_expires TIMESTAMP,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_circle_members (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'helper',
  display_name TEXT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP,
  UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_prompts (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  for_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_note TEXT,
  status TEXT DEFAULT 'pending',
  answered_story_id INTEGER REFERENCES stories(id),
  answered_at TIMESTAMP,
  declined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_encouragements (
  id SERIAL PRIMARY KEY,
  circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  for_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  encouragement_type TEXT DEFAULT 'heart',
  message TEXT,
  related_story_id INTEGER REFERENCES stories(id),
  seen_by_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Streak history
CREATE TABLE IF NOT EXISTS streak_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  had_activity BOOLEAN DEFAULT false,
  streak_on_this_day INTEGER DEFAULT 0,
  shield_used BOOLEAN DEFAULT false,
  prompt_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, date)
);

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers (no user FK — public signups)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  source TEXT DEFAULT 'blog',
  ip_address TEXT,
  user_agent TEXT
);

-- Auth tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_session_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_chapter_id TEXT,
  prompt_question_id TEXT,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quick voice memos
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Free-form text stories
CREATE TABLE IF NOT EXISTS free_stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telnyx phone calls
CREATE TABLE IF NOT EXISTS telnyx_calls (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  call_control_id TEXT,
  stream_id TEXT,
  call_status TEXT DEFAULT 'initiated',
  prompt_text TEXT,
  prompt_chapter_id TEXT,
  prompt_question_id TEXT,
  duration_seconds INTEGER,
  transcript_saved BOOLEAN DEFAULT false,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Refund requests
CREATE TABLE IF NOT EXISTS refund_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT,
  amount INTEGER,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  stripe_refund_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lulu print orders
CREATE TABLE IF NOT EXISTS lulu_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lulu_order_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JWT token blacklist — durable revocation (survives restarts)
CREATE TABLE IF NOT EXISTS token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-level token invalidation — invalidates all tokens for a user (password reset)
CREATE TABLE IF NOT EXISTS user_token_invalidation (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  invalidated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cron health — tracks last successful run of each scheduled job
-- IMPORTANT: never purge this table accidentally — it is used for monitoring and alerting
CREATE TABLE IF NOT EXISTS cron_health (
  job_name VARCHAR(100) PRIMARY KEY,
  last_success TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ
);

-- Schema migrations tracking (managed by db/runner.js)
-- IMPORTANT: never purge this table — doing so will cause all migrations to re-run
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_chapter ON stories(user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_photos_story ON photos(story_id);
CREATE INDEX IF NOT EXISTS idx_photos_story_id ON photos(story_id);
CREATE INDEX IF NOT EXISTS idx_followups_story_id ON followups(story_id);
CREATE INDEX IF NOT EXISTS idx_memory_entities_user ON memory_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_entities_user_type ON memory_entities(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_memory_mentions_entity ON memory_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_memory_mentions_story ON memory_mentions(story_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_entity1 ON memory_relationships(entity1_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_entity2 ON memory_relationships(entity2_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reviews_user ON chapter_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reviews_user_chapter ON chapter_reviews(user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session_unique ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_voice_models_user ON voice_models(user_id);
CREATE INDEX IF NOT EXISTS idx_audiobooks_user ON audiobooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_style_preferences_user ON user_style_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_link_code ON telegram_users(link_code);
CREATE INDEX IF NOT EXISTS idx_telegram_sessions_user ON telegram_sessions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_user ON telegram_messages(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_images_user ON chapter_images(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_images_status ON chapter_images(generation_status);
CREATE INDEX IF NOT EXISTS idx_book_covers_user ON book_covers(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_chapter ON voice_sessions(user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_active ON voice_sessions(user_id, chapter_id, session_status);
CREATE INDEX IF NOT EXISTS idx_user_game_state_user ON user_game_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_state_last_activity ON user_game_state(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_prompts_user_date ON daily_prompts(user_id, prompt_date);
CREATE INDEX IF NOT EXISTS idx_daily_prompts_status ON daily_prompts(status);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unseen ON achievements(user_id, seen_by_user) WHERE seen_by_user = false;
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_progress_user ON user_collection_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_circles_owner ON memory_circles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_memory_circles_invite ON memory_circles(invite_code);
CREATE INDEX IF NOT EXISTS idx_memory_circle_members_user ON memory_circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_circle_members_circle ON memory_circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_family_prompts_for_user ON family_prompts(for_user_id, status);
CREATE INDEX IF NOT EXISTS idx_family_encouragements_for_user ON family_encouragements(for_user_id, seen_by_recipient);
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_library_type ON prompt_library(prompt_type, is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_library_category ON prompt_library(prompt_category);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_session_tokens_hash ON email_session_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_session_tokens_user ON email_session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_session_tokens_expires ON email_session_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_created ON memos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_stories_user ON free_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_free_stories_created ON free_stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telnyx_calls_user ON telnyx_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_telnyx_calls_control_id ON telnyx_calls(call_control_id);
CREATE INDEX IF NOT EXISTS idx_telnyx_calls_status ON telnyx_calls(call_status) WHERE call_status IN ('initiated', 'ringing', 'answered', 'streaming');
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lulu_orders_user ON lulu_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_lulu_orders_lulu ON lulu_orders(lulu_order_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_audit_log_user ON payments_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_audit_log_stripe_event ON payments_audit_log(stripe_event_id);

-- ============================================================
-- Safety migrations for existing databases
-- These are no-ops on a fresh install since the columns are
-- already included in the CREATE TABLE statements above.
-- On existing databases they add any columns that are missing.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_activated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_call_consent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS original_answer TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS style_applied TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS style_applied_at TIMESTAMP;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS compiled_content TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS compiled_at TIMESTAMP;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS voice_session_id INTEGER REFERENCES voice_sessions(id);

ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS channel_preferences JSONB DEFAULT '[]';

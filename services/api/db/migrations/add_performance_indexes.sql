-- Performance Indexes Migration
-- Run this to improve query performance on common operations

-- Stories table indexes (most queried table)
CREATE INDEX IF NOT EXISTS idx_stories_user_chapter ON stories(user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_chapter_question ON stories(user_id, chapter_id, question_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_answered ON stories(user_id) WHERE answer IS NOT NULL AND answer != '';

-- Memory entities indexes
CREATE INDEX IF NOT EXISTS idx_memory_entities_user_type ON memory_entities(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_memory_entities_user_name ON memory_entities(user_id, name);
CREATE INDEX IF NOT EXISTS idx_memory_entities_mention_count ON memory_entities(user_id, mention_count DESC);

-- Memory mentions index
CREATE INDEX IF NOT EXISTS idx_memory_mentions_entity ON memory_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_memory_mentions_story ON memory_mentions(story_id);

-- Memory relationships index
CREATE INDEX IF NOT EXISTS idx_memory_relationships_entities ON memory_relationships(entity1_id, entity2_id);

-- Daily prompts indexes
CREATE INDEX IF NOT EXISTS idx_daily_prompts_user_date ON daily_prompts(user_id, prompt_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_prompts_user_status ON daily_prompts(user_id, status);

-- Game state index
CREATE INDEX IF NOT EXISTS idx_game_state_user ON user_game_state(user_id);

-- Collections progress index
CREATE INDEX IF NOT EXISTS idx_collection_progress_user ON user_collection_progress(user_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, display_order);

-- Achievements index
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, achievement_key);
CREATE INDEX IF NOT EXISTS idx_achievements_user_unseen ON achievements(user_id) WHERE seen_by_user = false;

-- Photos index
CREATE INDEX IF NOT EXISTS idx_photos_story ON photos(story_id);

-- Payments index
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

-- User onboarding index
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON user_onboarding(user_id);

-- Settings index
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);

-- Analyze tables to update statistics
ANALYZE stories;
ANALYZE memory_entities;
ANALYZE daily_prompts;
ANALYZE user_game_state;
ANALYZE collections;
ANALYZE collection_items;
ANALYZE achievements;

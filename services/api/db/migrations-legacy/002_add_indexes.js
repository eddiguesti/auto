/**
 * Add missing database indexes for query performance.
 * These indexes cover common query patterns identified in route handlers.
 */

export async function up(pgm) {
  // Followups are frequently joined to stories
  pgm.sql('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_story_id ON followups(story_id)')

  // Photos are queried by story_id with user ownership verification
  pgm.sql('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_story_id ON photos(story_id)')

  // Memory relationships are queried by both entity IDs
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_relationships_entity1 ON memory_relationships(entity1_id)'
  )
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_relationships_entity2 ON memory_relationships(entity2_id)'
  )

  // AI usage is queried by user + date for quota checks
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date)'
  )

  // Stories are frequently filtered by user + chapter
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_user_chapter ON stories(user_id, chapter_id)'
  )

  // Daily prompts are queried by user + date
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_prompts_user_date ON daily_prompts(user_id, prompt_date)'
  )

  // Notification queue is queried by user + scheduled time
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id, scheduled_for)'
  )
}

export async function down(pgm) {
  pgm.sql('DROP INDEX IF EXISTS idx_followups_story_id')
  pgm.sql('DROP INDEX IF EXISTS idx_photos_story_id')
  pgm.sql('DROP INDEX IF EXISTS idx_memory_relationships_entity1')
  pgm.sql('DROP INDEX IF EXISTS idx_memory_relationships_entity2')
  pgm.sql('DROP INDEX IF EXISTS idx_ai_usage_user_date')
  pgm.sql('DROP INDEX IF EXISTS idx_stories_user_chapter')
  pgm.sql('DROP INDEX IF EXISTS idx_daily_prompts_user_date')
  pgm.sql('DROP INDEX IF EXISTS idx_notification_queue_user')
}

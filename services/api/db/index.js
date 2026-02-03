import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { seedCollections } from './seeds/collections.js'
import { seedPrompts } from './seeds/prompts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { Pool } = pg

// Check for DATABASE_URL
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.error('ERROR: DATABASE_URL environment variable is not set!')
  console.error('Please set DATABASE_URL to your Supabase/Neon PostgreSQL connection string.')
  process.exit(1)
}

// Connection pool configuration
const poolConfig = {
  // Max connections - balance between concurrency and database limits
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  // Min idle connections to keep ready
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  // Close idle connections after 30 seconds
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  // Timeout when acquiring a connection from pool
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 10000,
  // Allow exiting if pool is idle
  allowExitOnIdle: true
}

// Create pool only if we have a database URL or local postgres
let pool = null
if (databaseUrl) {
  // Configure SSL based on environment
  // In production, prefer SSL verification; cloud providers like Supabase/Neon may need rejectUnauthorized: false
  // Set DATABASE_SSL_REJECT_UNAUTHORIZED=false explicitly if needed for your provider
  const sslConfig = process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
      }
    : { rejectUnauthorized: false }

  pool = new Pool({
    ...poolConfig,
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : sslConfig
  })
} else {
  // Try local connection, but don't fail if not available
  try {
    pool = new Pool({
      ...poolConfig,
      connectionString: 'postgresql://localhost:5432/lifestory',
      ssl: false
    })
  } catch (err) {
    console.warn('No local database available - some features will be limited')
  }
}

// Initialize database schema
export async function initDatabase() {
  if (!pool) {
    console.warn('Database not available - running in limited mode')
    return
  }

  let client
  try {
    client = await pool.connect()
  } catch (err) {
    console.warn('Could not connect to database - running in limited mode')
    pool = null
    return
  }
  try {
    // Create users table first
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        name TEXT,
        birth_year INTEGER,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Migration: Add birth_year column if it doesn't exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER
    `)

    // Migration: Drop old tables without user_id and recreate
    // Check if stories table has user_id column
    const checkColumn = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stories' AND column_name = 'user_id'
    `)

    if (checkColumn.rows.length === 0) {
      // Old schema detected - drop and recreate tables
      console.log('Migrating database to new schema with user authentication...')
      await client.query('DROP TABLE IF EXISTS memory_relationships CASCADE')
      await client.query('DROP TABLE IF EXISTS memory_mentions CASCADE')
      await client.query('DROP TABLE IF EXISTS memory_entities CASCADE')
      await client.query('DROP TABLE IF EXISTS followups CASCADE')
      await client.query('DROP TABLE IF EXISTS photos CASCADE')
      await client.query('DROP TABLE IF EXISTS stories CASCADE')
      await client.query('DROP TABLE IF EXISTS settings CASCADE')
      console.log('Old tables dropped, recreating with user_id...')
    }

    // Create settings table with user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `)

    // Create stories table with user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chapter_id, question_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id SERIAL PRIMARY KEY,
        story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Memory Graph tables for tracking people, places, events, etc.
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_entities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL, -- 'person', 'place', 'event', 'time_period', 'emotion'
        name TEXT NOT NULL,
        description TEXT,
        first_mentioned_chapter TEXT,
        first_mentioned_question TEXT,
        mention_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, entity_type, name)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_mentions (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
        story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
        context TEXT, -- The sentence/paragraph where mentioned
        sentiment TEXT, -- 'positive', 'negative', 'neutral', 'mixed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_relationships (
        id SERIAL PRIMARY KEY,
        entity1_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
        entity2_id INTEGER REFERENCES memory_entities(id) ON DELETE CASCADE,
        relationship_type TEXT, -- 'family', 'friend', 'colleague', 'located_at', 'occurred_at', etc.
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity1_id, entity2_id, relationship_type)
      )
    `)

    // Payments table for Stripe transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stripe_session_id TEXT,
        stripe_subscription_id TEXT,
        product_id TEXT NOT NULL,
        product_type TEXT NOT NULL, -- 'export', 'subscription', 'audiobook'
        amount INTEGER, -- in cents
        currency TEXT DEFAULT 'usd',
        status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Voice models for audiobook voice cloning
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_models (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        fish_model_id TEXT,
        consent_given BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Audiobooks generated for users
    await client.query(`
      CREATE TABLE IF NOT EXISTS audiobooks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        voice_type TEXT DEFAULT 'default', -- 'default' or 'custom'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User style preferences for memoir writing style
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_style_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        tones TEXT[], -- Array of selected tones: 'formal', 'conversational', 'nostalgic', 'humorous'
        narrative TEXT, -- Single narrative style: 'first-person-reflective', 'third-person', 'present-tense'
        author_style TEXT, -- Single author inspiration: 'hemingway', 'austen', 'angelou', 'twain'
        applied_at TIMESTAMP, -- When style was last applied to all stories
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Migration: Add style-related columns to stories table
    await client.query(`
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS original_answer TEXT
    `)
    await client.query(`
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS style_applied TEXT
    `)
    await client.query(`
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS style_applied_at TIMESTAMP
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_user_chapter ON stories(user_id, chapter_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_story ON photos(story_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_entities_user ON memory_entities(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_entities_user_type ON memory_entities(user_id, entity_type)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_mentions_entity ON memory_mentions(entity_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_session_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_models_user ON voice_models(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audiobooks_user ON audiobooks(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_style_preferences_user ON user_style_preferences(user_id)
    `)

    // Telegram integration tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_users (
        id SERIAL PRIMARY KEY,
        telegram_chat_id TEXT UNIQUE NOT NULL,
        telegram_username TEXT,
        telegram_first_name TEXT,
        telegram_last_name TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Linked webapp user (null for guests)
        guest_name TEXT, -- For unlinked users
        guest_email TEXT, -- For unlinked users
        is_registered BOOLEAN DEFAULT false, -- Has completed registration/linking
        link_code TEXT UNIQUE, -- Code to link with webapp account
        link_code_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_sessions (
        id SERIAL PRIMARY KEY,
        telegram_user_id INTEGER REFERENCES telegram_users(id) ON DELETE CASCADE,
        session_state TEXT DEFAULT 'idle', -- 'idle', 'registering', 'interviewing', 'waiting_answer'
        current_chapter_id TEXT,
        current_question_id TEXT,
        context JSONB DEFAULT '{}', -- Extra context for conversation
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_user_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id SERIAL PRIMARY KEY,
        telegram_user_id INTEGER REFERENCES telegram_users(id) ON DELETE CASCADE,
        message_id TEXT, -- Telegram message ID
        direction TEXT NOT NULL, -- 'incoming' or 'outgoing'
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(telegram_chat_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_link_code ON telegram_users(link_code)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_sessions_user ON telegram_sessions(telegram_user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_messages_user ON telegram_messages(telegram_user_id)
    `)

    // User onboarding table - tracks onboarding completion and gathered context
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_onboarding (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        onboarding_completed BOOLEAN DEFAULT false,
        input_preference TEXT,  -- 'voice' or 'type'
        birth_place TEXT,
        birth_country TEXT,
        birth_year INTEGER,
        additional_context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Chapter images - AI-generated personalized images for each chapter
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapter_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id TEXT NOT NULL,
        image_url TEXT,
        prompt_used TEXT,
        generation_status TEXT DEFAULT 'pending',  -- 'pending', 'generating', 'completed', 'failed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chapter_id)
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chapter_images_user ON chapter_images(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chapter_images_status ON chapter_images(generation_status)
    `)

    // ==================== MEMORY QUEST TABLES ====================

    // User gamification state
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_game_state (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,

        -- Streak tracking
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date DATE,
        streak_shields_available INTEGER DEFAULT 1,
        streak_shields_used_this_week INTEGER DEFAULT 0,
        last_shield_reset DATE,

        -- Progress counts (denormalized for performance)
        total_memories INTEGER DEFAULT 0,
        total_people_mentioned INTEGER DEFAULT 0,
        total_places_mentioned INTEGER DEFAULT 0,

        -- Daily state
        daily_prompt_completed_today BOOLEAN DEFAULT false,
        prompts_completed_this_week INTEGER DEFAULT 0,

        -- Settings
        game_mode_enabled BOOLEAN DEFAULT true,
        notification_preferences JSONB DEFAULT '{"daily_reminder": true, "streak_warning": true, "weekly_digest": true, "family_activity": true}',
        preferred_prompt_time TEXT DEFAULT '09:00',
        timezone TEXT DEFAULT 'Europe/London',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_game_state_user ON user_game_state(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_game_state_last_activity ON user_game_state(last_activity_date)
    `)

    // Daily prompts shown to users
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_prompts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

        -- Prompt details
        prompt_date DATE NOT NULL,
        prompt_type TEXT NOT NULL,
        prompt_category TEXT,
        prompt_text TEXT NOT NULL,
        prompt_hint TEXT,

        -- Link to existing question system (optional)
        linked_chapter_id TEXT,
        linked_question_id TEXT,

        -- Personalization
        personalization_context JSONB DEFAULT '{}',

        -- Response tracking
        status TEXT DEFAULT 'pending',
        answered_at TIMESTAMP,
        answer_story_id INTEGER REFERENCES stories(id),
        time_to_complete_seconds INTEGER,
        word_count INTEGER,

        -- Skip tracking
        skipped_at TIMESTAMP,
        skip_reason TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, prompt_date)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_prompts_user_date ON daily_prompts(user_id, prompt_date)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_prompts_status ON daily_prompts(status)
    `)

    // Achievements earned by users
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

        achievement_type TEXT NOT NULL,
        achievement_key TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        achievement_description TEXT,
        achievement_icon TEXT,

        -- Metadata
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        seen_by_user BOOLEAN DEFAULT false,
        trigger_data JSONB DEFAULT '{}',

        UNIQUE(user_id, achievement_key)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_unseen ON achievements(user_id, seen_by_user) WHERE seen_by_user = false
    `)

    // Collection definitions (seeded data)
    await client.query(`
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
      )
    `)

    // Items within collections
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_items (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_description TEXT,

        -- Completion criteria
        completion_type TEXT NOT NULL,
        completion_criteria JSONB NOT NULL,

        display_order INTEGER DEFAULT 0,
        UNIQUE(collection_id, item_key)
      )
    `)

    // User progress on collections
    await client.query(`
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
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_collection_progress_user ON user_collection_progress(user_id)
    `)

    // Memory circles (family groups)
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_circles (
        id SERIAL PRIMARY KEY,
        owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        circle_name TEXT DEFAULT 'My Memory Circle',
        invite_code TEXT UNIQUE,
        invite_code_expires TIMESTAMP,
        max_members INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Circle membership
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_circle_members (
        id SERIAL PRIMARY KEY,
        circle_id INTEGER REFERENCES memory_circles(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'helper',
        display_name TEXT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP,
        UNIQUE(circle_id, user_id)
      )
    `)

    // Family-submitted prompts
    await client.query(`
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
      )
    `)

    // Encouragements between family members
    await client.query(`
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
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_circles_owner ON memory_circles(owner_user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_circles_invite ON memory_circles(invite_code)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_circle_members_user ON memory_circle_members(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_circle_members_circle ON memory_circle_members(circle_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_prompts_for_user ON family_prompts(for_user_id, status)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_encouragements_for_user ON family_encouragements(for_user_id, seen_by_recipient)
    `)

    // Historical streak data
    await client.query(`
      CREATE TABLE IF NOT EXISTS streak_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,

        had_activity BOOLEAN DEFAULT false,
        streak_on_this_day INTEGER DEFAULT 0,
        shield_used BOOLEAN DEFAULT false,
        prompt_completed BOOLEAN DEFAULT false,

        UNIQUE(user_id, date)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, date DESC)
    `)

    // Master prompt library
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_library (
        id SERIAL PRIMARY KEY,

        -- Classification
        prompt_type TEXT NOT NULL,
        prompt_category TEXT NOT NULL,

        -- Content
        prompt_text TEXT NOT NULL,
        prompt_hint TEXT,

        -- Linking
        linked_chapter_id TEXT,
        linked_question_id TEXT,

        -- Personalization templates
        era_specific BOOLEAN DEFAULT false,
        requires_person_mention BOOLEAN DEFAULT false,
        requires_place_mention BOOLEAN DEFAULT false,
        personalization_template TEXT,

        -- Scheduling
        preferred_day_of_week INTEGER,
        min_streak_days INTEGER DEFAULT 0,
        max_uses_per_user INTEGER,

        -- Metadata
        difficulty_level INTEGER DEFAULT 1,
        estimated_minutes INTEGER DEFAULT 3,
        is_active BOOLEAN DEFAULT true,
        times_used INTEGER DEFAULT 0,
        avg_completion_rate DECIMAL(3,2),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prompt_library_type ON prompt_library(prompt_type, is_active)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prompt_library_category ON prompt_library(prompt_category)
    `)

    // Notification queue
    await client.query(`
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
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE sent_at IS NULL
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id)
    `)

    // ==================== END MEMORY QUEST TABLES ====================

    // Seed collections data
    await seedCollections(pool);

    // Seed prompt library
    await seedPrompts(pool);

    console.log('Database initialized successfully')
  } catch (err) {
    console.error('Database initialization error:', err)
    pool = null
    console.warn('Running in limited mode without database')
  } finally {
    if (client) client.release()
  }
}

export default pool

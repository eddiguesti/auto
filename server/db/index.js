import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

// Create pool only if we have a database URL or local postgres
let pool = null
if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })
} else {
  // Try local connection, but don't fail if not available
  try {
    pool = new Pool({
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
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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

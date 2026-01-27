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
  console.error('Please add a PostgreSQL database to your Railway project and link it.')
  process.exit(1)
}

// Use DATABASE_URL from Railway or fallback for local dev
const pool = new Pool({
  connectionString: databaseUrl || 'postgresql://localhost:5432/lifestory',
  ssl: databaseUrl ? { rejectUnauthorized: false } : false
})

// Initialize database schema
export async function initDatabase() {
  const client = await pool.connect()
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        chapter_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chapter_id, question_id)
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

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_chapter ON stories(chapter_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_story ON photos(story_id)
    `)

    console.log('Database initialized successfully')
  } catch (err) {
    console.error('Database initialization error:', err)
    throw err
  } finally {
    client.release()
  }
}

export default pool

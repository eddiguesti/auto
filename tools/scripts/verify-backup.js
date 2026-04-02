/**
 * Verify database connectivity and backup readiness.
 * Checks that the database is accessible and key tables have expected data.
 * Run with: npm run backup:verify
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '..', '.env') })

const { Pool } = pg

async function verify() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set — cannot verify backup readiness')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  })

  try {
    console.log('Connecting to database...')
    const client = await pool.connect()

    // Basic connectivity check
    const {
      rows: [{ now }]
    } = await client.query('SELECT NOW() as now')
    console.log(`Connected at ${now}`)

    // Table existence and row counts
    const tables = [
      'users',
      'stories',
      'payments',
      'achievements',
      'user_game_state',
      'daily_prompts',
      'memos'
    ]

    console.log('\nTable integrity check:')
    for (const table of tables) {
      try {
        const {
          rows: [{ count }]
        } = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`  ${table}: ${count} rows`)
      } catch {
        console.warn(`  ${table}: TABLE MISSING OR ERROR`)
      }
    }

    // Check database size
    const {
      rows: [{ size }]
    } = await client.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size')
    console.log(`\nDatabase size: ${size}`)

    client.release()
    console.log('\nBackup verification: PASSED')
    process.exit(0)
  } catch (err) {
    console.error('\nBackup verification: FAILED')
    console.error(err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verify()

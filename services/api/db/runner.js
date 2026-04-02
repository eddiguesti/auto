/**
 * SQL migration runner.
 * Reads numbered .sql files from db/migrations/ in lexicographic order,
 * applies any that have not yet been recorded in schema_migrations,
 * and runs each in a transaction for atomicity.
 *
 * Tracks applied migrations in the `schema_migrations` table.
 * The `pgmigrations` table (used by node-pg-migrate for .js migrations) is separate.
 */

import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.js'
import { seedCollections } from './seeds/collections.js'
import { seedPrompts } from './seeds/prompts.js'

const logger = createLogger('migrations')
const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

/**
 * Run all pending .sql migrations and reseed reference data.
 * Safe to call on every startup — already-applied migrations are skipped.
 *
 * @param {import('pg').Pool} pool
 */
export async function runMigrations(pool) {
  // Ensure the tracking table exists before we try to query it
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Find all .sql migration files in lexicographic (version) order
  const allFiles = await readdir(MIGRATIONS_DIR)
  const sqlFiles = allFiles.filter(f => f.endsWith('.sql')).sort()

  if (sqlFiles.length === 0) {
    logger.info('No SQL migrations found')
    return
  }

  // Fetch already-applied migration versions
  const { rows } = await pool.query('SELECT version FROM schema_migrations')
  const applied = new Set(rows.map(r => r.version))

  let appliedCount = 0

  for (const filename of sqlFiles) {
    if (applied.has(filename)) continue

    const sqlPath = join(MIGRATIONS_DIR, filename)
    const sql = await readFile(sqlPath, 'utf8')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [filename])
      await client.query('COMMIT')
      logger.info(`Applied migration: ${filename}`)
      appliedCount++
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error(`Migration failed, rolled back: ${filename}`, { error: err.message })
      throw new Error(`Migration ${filename} failed: ${err.message}`)
    } finally {
      client.release()
    }
  }

  if (appliedCount === 0) {
    logger.info('Database schema is up to date')
  } else {
    logger.info(`Applied ${appliedCount} migration(s) successfully`)
  }

  // Seed reference data (idempotent upserts — safe to run on every startup)
  try {
    await seedCollections(pool)
    await seedPrompts(pool)
  } catch (err) {
    logger.error('Seed data failed', { error: err.message })
    // Non-fatal: seeds are reference data, not schema
  }
}

/**
 * Print migration status to stdout (for `npm run migrate:status`).
 *
 * @param {import('pg').Pool} pool
 */
export async function migrationStatus(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const allFiles = await readdir(MIGRATIONS_DIR)
  const sqlFiles = allFiles.filter(f => f.endsWith('.sql')).sort()

  const { rows } = await pool.query(
    'SELECT version, applied_at FROM schema_migrations ORDER BY version'
  )
  const applied = new Map(rows.map(r => [r.version, r.applied_at]))

  console.log('\nMigration status:')
  console.log('─'.repeat(60))

  for (const filename of sqlFiles) {
    const status = applied.has(filename)
      ? `✓ applied  ${applied.get(filename).toISOString().slice(0, 19)}`
      : '✗ pending'
    console.log(`  ${status}  ${filename}`)
  }

  const pending = sqlFiles.filter(f => !applied.has(f))
  console.log('─'.repeat(60))
  console.log(`  ${applied.size} applied, ${pending.length} pending\n`)
}

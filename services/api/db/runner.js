/**
 * SQL migration runner.
 * Reads numbered .sql files from db/migrations/ in lexicographic order,
 * applies any that have not yet been recorded in schema_migrations,
 * and runs each in a transaction for atomicity.
 *
 * Tracks applied migrations in the `schema_migrations` table. Historical
 * node-pg-migrate files are archived in db/migrations-legacy and never run.
 */

import { readdir, readFile } from 'fs/promises'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.js'
import { seedCollections } from './seeds/collections.js'
import { seedPrompts } from './seeds/prompts.js'

const logger = createLogger('migrations')
const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')
const MIGRATION_LOCK_NAME = 'easy-memoir:schema-migrations'

function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex')
}

/**
 * Run all pending .sql migrations and reseed reference data.
 * Safe to call on every startup — already-applied migrations are skipped.
 *
 * @param {import('pg').Pool} pool
 */
export async function runMigrations(pool) {
  const client = await pool.connect()
  let appliedCount = 0
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_NAME])
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        checksum VARCHAR(64),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(
      'ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)'
    )

    const allFiles = await readdir(MIGRATIONS_DIR)
    const sqlFiles = allFiles.filter(f => f.endsWith('.sql')).sort()
    if (sqlFiles.length === 0) {
      logger.info('No SQL migrations found')
      return
    }

    const { rows } = await client.query('SELECT version, checksum FROM schema_migrations')
    const applied = new Map(rows.map(row => [row.version, row.checksum]))

    for (const filename of sqlFiles) {
      const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8')
      const digest = checksum(sql)
      if (applied.has(filename)) {
        const recorded = applied.get(filename)
        if (recorded && recorded !== digest) {
          throw new Error(`Applied migration ${filename} has been modified`)
        }
        if (!recorded) {
          await client.query('UPDATE schema_migrations SET checksum = $1 WHERE version = $2', [
            digest,
            filename
          ])
        }
        continue
      }

      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [
          filename,
          digest
        ])
        await client.query('COMMIT')
        logger.info(`Applied migration: ${filename}`)
        appliedCount++
      } catch (error) {
        await client.query('ROLLBACK')
        logger.error(`Migration failed, rolled back: ${filename}`, { error: error.message })
        throw new Error(`Migration ${filename} failed: ${error.message}`)
      }
    }

    logger.info(
      appliedCount === 0
        ? 'Database schema is up to date'
        : `Applied ${appliedCount} migration(s) successfully`
    )
  } finally {
    await client
      .query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK_NAME])
      .catch(() => {})
    client.release()
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
      checksum VARCHAR(64),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)')

  const allFiles = await readdir(MIGRATIONS_DIR)
  const sqlFiles = allFiles.filter(f => f.endsWith('.sql')).sort()

  const { rows } = await pool.query(
    'SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version'
  )
  const applied = new Map(rows.map(row => [row.version, row]))

  console.log('\nMigration status:')
  console.log('─'.repeat(60))

  for (const filename of sqlFiles) {
    let status = '✗ pending'
    if (applied.has(filename)) {
      const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8')
      const row = applied.get(filename)
      const integrity = row.checksum && row.checksum !== checksum(sql) ? ' MODIFIED' : ''
      status = `✓ applied  ${row.applied_at.toISOString().slice(0, 19)}${integrity}`
    }
    console.log(`  ${status}  ${filename}`)
  }

  const pending = sqlFiles.filter(f => !applied.has(f))
  console.log('─'.repeat(60))
  console.log(`  ${applied.size} applied, ${pending.length} pending\n`)
}

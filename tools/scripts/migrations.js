#!/usr/bin/env node
import 'dotenv/config'
import { readdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const command = process.argv[2] || 'up'
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const migrationsDir = join(root, 'services', 'api', 'db', 'migrations')

async function createMigration(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!slug) throw new Error('Usage: npm run migrate:create -- <migration-name>')

  const files = await readdir(migrationsDir)
  const versions = files.map(file => Number(file.match(/^(\d+)_/)?.[1])).filter(Number.isFinite)
  const version = String(Math.max(0, ...versions) + 1).padStart(3, '0')
  const filename = `${version}_${slug}.sql`
  await writeFile(
    join(migrationsDir, filename),
    `-- ${name}\n-- Forward-only migration; the runner supplies the transaction.\n\n-- Add schema changes here.\n`
  )
  console.log(`Created services/api/db/migrations/${filename}`)
}

let pool
try {
  if (command === 'create') {
    await createMigration(process.argv.slice(3).join(' '))
  } else if (command === 'down') {
    throw new Error('Production migrations are forward-only. Create a compensating migration.')
  } else {
    const database = await import('../../services/api/db/index.js')
    pool = database.default
    const { runMigrations, migrationStatus } = await import('../../services/api/db/runner.js')
    if (command === 'up') await runMigrations(pool)
    else if (command === 'status') await migrationStatus(pool)
    else throw new Error(`Unknown migration command: ${command}`)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (pool) await pool.end()
}

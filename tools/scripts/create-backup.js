import pg from 'pg'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { join, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import dotenv from 'dotenv'
import { fileHash, quoteTable, verifyBackup, postgresEnvironment } from './verify-backup.js'

// One snapshot supplies both the dump and its count manifest, so writes during
// the backup cannot create a misleading mismatch in the restore rehearsal.
export async function createBackup({ sourceUrl, directory, pgDumpPath = 'pg_dump' }) {
  if (!sourceUrl) throw new Error('DATABASE_URL is required')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const filename = `easymemoir_${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`
  const path = join(directory, filename)
  const client = new pg.Client({ connectionString: sourceUrl, connectionTimeoutMillis: 10000 })
  await client.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const snapshot = (await client.query('SELECT pg_export_snapshot() AS snapshot')).rows[0]
      .snapshot
    const tables = (
      await client.query(
        "SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname,tablename"
      )
    ).rows
    const counts = {}
    for (const row of tables) {
      const table = `${row.schemaname}.${row.tablename}`
      counts[table] = (
        await client.query(`SELECT COUNT(*)::text AS count FROM ${quoteTable(table)}`)
      ).rows[0].count
    }
    const child = spawn(pgDumpPath, ['--no-owner', '--no-privileges', `--snapshot=${snapshot}`], {
      env: postgresEnvironment(sourceUrl),
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child.stderr.resume()
    const done = new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('close', code =>
        code === 0
          ? resolve()
          : reject(new Error(`pg_dump failed (exit ${code}); incomplete backup retained`))
      )
    })
    try {
      await Promise.all([
        pipeline(child.stdout, createGzip(), createWriteStream(path, { flags: 'wx', mode: 0o600 })),
        done
      ])
    } catch (error) {
      child.kill()
      throw error
    }
    await client.query('COMMIT')
    const manifestFile = `${path}.manifest.json`
    await writeFile(
      manifestFile,
      JSON.stringify(
        {
          version: 1,
          createdAt: new Date().toISOString(),
          sourceDatabase: decodeURIComponent(new URL(sourceUrl).pathname.slice(1)),
          sha256: await fileHash(path),
          tables: counts
        },
        null,
        2
      ),
      { mode: 0o600, flag: 'wx' }
    )
    return { path, manifestFile }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}
async function main() {
  dotenv.config({ path: new URL('../../.env', import.meta.url) })
  const sourceUrl = process.env.DATABASE_URL
  const backup = await createBackup({
    sourceUrl,
    directory: process.env.BACKUP_DIR || fileURLToPath(new URL('../../backups/', import.meta.url)),
    pgDumpPath: process.env.PG_DUMP_PATH || 'pg_dump'
  })
  console.log(`Backup and count manifest saved: ${basename(backup.path)}`)
  if (process.env.BACKUP_VERIFY_DATABASE_URL) {
    await verifyBackup({
      backupFile: backup.path,
      manifestFile: backup.manifestFile,
      sourceUrl,
      targetUrl: process.env.BACKUP_VERIFY_DATABASE_URL,
      psqlPath: process.env.PSQL_PATH || 'psql'
    })
    console.log('Isolated backup restore verification passed')
  }
  if (process.env.S3_BACKUP_BUCKET) {
    const run = promisify(execFile)
    for (const path of [backup.path, backup.manifestFile]) {
      await run('aws', [
        's3',
        'cp',
        path,
        `s3://${process.env.S3_BACKUP_BUCKET}/daily/${basename(path)}`,
        '--quiet'
      ])
    }
    console.log('Backup and manifest uploaded; local copies retained')
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`Backup failed: ${error.message}. Local backup files have been retained.`)
    process.exitCode = 1
  })
}

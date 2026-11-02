import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import pg from 'pg'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBackup } from '../../../tools/scripts/create-backup.js'
import { validateRestoreTarget, verifyBackup } from '../../../tools/scripts/verify-backup.js'

it('refuses an implicit or source database restore target', () => {
  expect(() => validateRestoreTarget()).toThrow('BACKUP_VERIFY_DATABASE_URL')
  expect(() => validateRestoreTarget('postgres://localhost/production')).toThrow('dedicated')
  expect(() =>
    validateRestoreTarget(
      'postgres://localhost/restore_verify_same',
      'postgres://alias/restore_verify_same'
    )
  ).toThrow('differ')
})
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
suite('backup restore rehearsal against disposable PostgreSQL databases', () => {
  let admin, source, targetUrl, sourceUrl, directory, backup
  const nonce = randomBytes(5).toString('hex')
  const sourceName = `easy_memoir_backup_source_${nonce}`
  const targetName = `easy_memoir_restore_verify_${nonce}`
  const pgDumpPath = process.env.PG_DUMP_PATH || '/opt/homebrew/opt/postgresql@17/bin/pg_dump'
  const psqlPath = process.env.PSQL_PATH || '/opt/homebrew/opt/postgresql@17/bin/psql'
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'memoir-backup-'))
    admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${sourceName}`)
    await admin.query(`CREATE DATABASE ${targetName}`)
    const url = new URL(process.env.TEST_DATABASE_URL)
    url.pathname = `/${sourceName}`
    sourceUrl = url.href
    url.pathname = `/${targetName}`
    targetUrl = url.href
    source = new pg.Client({ connectionString: sourceUrl })
    await source.connect()
    const migrations = new URL('../db/migrations/', import.meta.url)
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
      await source.query(await readFile(new URL(name, migrations), 'utf8'))
    }
    await source.query(
      "INSERT INTO users(email,name) VALUES('backup@example.com','Backed Up Author')"
    )
    await source.query(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer) SELECT id,'childhood','q1','A memory that must survive restore' FROM users"
    )
    backup = await createBackup({ sourceUrl, directory, pgDumpPath })
  }, 30000)
  afterAll(async () => {
    await source?.end()
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${sourceName} WITH (FORCE)`)
      await admin.query(`DROP DATABASE IF EXISTS ${targetName} WITH (FORCE)`)
      await admin.end()
    }
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('creates a matching checksum/count manifest and restores all application tables and memories', async () => {
    const manifest = JSON.parse(await readFile(backup.manifestFile, 'utf8'))
    expect(manifest.tables['public.users']).toBe('1')
    expect(manifest.tables['public.stories']).toBe('1')
    const result = await verifyBackup({
      backupFile: backup.path,
      manifestFile: backup.manifestFile,
      targetUrl,
      sourceUrl,
      psqlPath
    })
    expect(result.verified).toBe(true)
    const restored = new pg.Client({ connectionString: targetUrl })
    await restored.connect()
    try {
      expect((await restored.query('SELECT answer FROM stories')).rows[0].answer).toBe(
        'A memory that must survive restore'
      )
    } finally {
      await restored.end()
    }
  }, 30000)
  it('refuses a nonempty target rather than overwriting a previous restore', async () => {
    await expect(
      verifyBackup({
        backupFile: backup.path,
        manifestFile: backup.manifestFile,
        targetUrl,
        sourceUrl,
        psqlPath
      })
    ).rejects.toThrow('not empty')
  })
  it('rejects a changed checksum and a manifest with missing required tables', async () => {
    const manifest = JSON.parse(await readFile(backup.manifestFile, 'utf8'))
    const bad = join(directory, 'bad.json')
    await writeFile(bad, JSON.stringify({ ...manifest, sha256: 'wrong' }))
    await expect(
      verifyBackup({ backupFile: backup.path, manifestFile: bad, targetUrl, sourceUrl, psqlPath })
    ).rejects.toThrow('checksum')
    delete manifest.tables['public.users']
    await writeFile(bad, JSON.stringify(manifest))
    await expect(
      verifyBackup({ backupFile: backup.path, manifestFile: bad, targetUrl, sourceUrl, psqlPath })
    ).rejects.toThrow('omits required')
  })
})

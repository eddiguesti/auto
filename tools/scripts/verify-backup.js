/** Restore a signed-off backup into an explicitly selected empty verification DB. */
import pg from 'pg'
import { createReadStream } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { createGunzip } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

// libpq does not expand a URI placed directly in PGDATABASE. Pass parsed
// connection fields through the child environment, keeping passwords off argv.
export function postgresEnvironment(connectionString) {
  const url = new URL(connectionString)
  const environment = {
    ...process.env,
    PGHOST: url.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: url.port || '5432',
    PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || '10',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username) || process.env.PGUSER || process.env.USER
  }
  if (url.password) environment.PGPASSWORD = decodeURIComponent(url.password)
  else delete environment.PGPASSWORD
  const options = {
    sslmode: 'PGSSLMODE',
    sslrootcert: 'PGSSLROOTCERT',
    sslcert: 'PGSSLCERT',
    sslkey: 'PGSSLKEY',
    options: 'PGOPTIONS',
    connect_timeout: 'PGCONNECT_TIMEOUT',
    application_name: 'PGAPPNAME',
    channel_binding: 'PGCHANNELBINDING'
  }
  for (const [name, variable] of Object.entries(options)) {
    if (url.searchParams.has(name)) environment[variable] = url.searchParams.get(name)
  }
  return environment
}
export const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`
export const quoteTable = value => value.split('.').map(quoteIdentifier).join('.')
export async function fileHash(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
export async function applicationTables() {
  const directory = new URL('../../services/api/db/migrations/', import.meta.url)
  const names = new Set()
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql'))) {
    const sql = await readFile(new URL(name, directory), 'utf8')
    for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_][a-z0-9_]*)/gi))
      names.add(`public.${match[1]}`)
  }
  return [...names].sort()
}
export function validateRestoreTarget(targetUrl, sourceUrl, sourceDatabase) {
  if (!targetUrl) throw new Error('BACKUP_VERIFY_DATABASE_URL is required')
  const target = new URL(targetUrl)
  if (!['postgres:', 'postgresql:'].includes(target.protocol))
    throw new Error('Restore target must be PostgreSQL')
  const database = decodeURIComponent(target.pathname.slice(1))
  if (!database.includes('restore_verify'))
    throw new Error('Use a dedicated database with restore_verify in its name')
  const source = sourceUrl && decodeURIComponent(new URL(sourceUrl).pathname.slice(1))
  // Refuse even matching names on different hosts: host aliases must not turn a
  // verification run into a restore over the source database.
  if (database === source || database === sourceDatabase)
    throw new Error('Restore target must differ from the source database')
  return database
}
function backupInput(path) {
  const input = createReadStream(path)
  return path.endsWith('.gz') ? input.pipe(createGunzip()) : input
}
async function validateSql(path) {
  let copy = false
  let dollarQuote = null
  for await (const line of createInterface({ input: backupInput(path), crlfDelay: Infinity })) {
    if (copy) {
      if (line === '\\.') copy = false
      continue
    }
    const wasQuoted = dollarQuote !== null
    for (const match of line.matchAll(/\$[A-Za-z_0-9]*\$/g)) {
      if (dollarQuote === match[0]) dollarQuote = null
      else if (dollarQuote === null) dollarQuote = match[0]
    }
    if (wasQuoted || dollarQuote !== null) continue
    if (/^COPY\s.+\sFROM stdin;\s*$/.test(line)) {
      copy = true
      continue
    }
    if (/^\s*\\/.test(line) && !/^\\(?:un)?restrict\s+[A-Za-z0-9]+\s*$/.test(line)) {
      throw new Error('Backup contains a psql command outside the supported dump format')
    }
    if (/^\s*(?:CREATE\s+DATABASE|(?:COMMIT|ROLLBACK|END)\s*;)/i.test(line)) {
      throw new Error('Backup contains a database switch or transaction boundary')
    }
  }
  if (copy) throw new Error('Backup has an incomplete COPY section')
}
export async function restoreSql(path, targetUrl, psqlPath = 'psql') {
  const child = spawn(
    psqlPath,
    ['-X', '--set=ON_ERROR_STOP=1', '--single-transaction', '--file=-'],
    {
      env: postgresEnvironment(targetUrl),
      stdio: ['pipe', 'ignore', 'pipe']
    }
  )
  let diagnostic = ''
  child.stderr.on('data', chunk => {
    diagnostic = (diagnostic + chunk.toString()).slice(-1000)
  })
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `psql restore failed (exit ${code}); inspect the backup and PostgreSQL permissions`
            )
          )
    )
  })
  try {
    await Promise.all([pipeline(backupInput(path), child.stdin), completion])
  } catch (error) {
    child.kill()
    void diagnostic
    throw error
  }
}
export async function verifyBackup({
  backupFile,
  targetUrl,
  sourceUrl,
  manifestFile,
  psqlPath = 'psql',
  Client = pg.Client
}) {
  if (!backupFile || !manifestFile)
    throw new Error('BACKUP_FILE and BACKUP_MANIFEST_FILE are required')
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
  if (
    manifest.version !== 1 ||
    !manifest.sha256 ||
    !manifest.tables ||
    !Object.keys(manifest.tables).length
  ) {
    throw new Error('Backup manifest is incomplete')
  }
  validateRestoreTarget(targetUrl, sourceUrl, manifest.sourceDatabase)
  if ((await fileHash(backupFile)) !== manifest.sha256)
    throw new Error('Backup checksum does not match its manifest')
  for (const [name, expected] of Object.entries(manifest.tables)) {
    if (
      !/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ||
      !/^\d+$/.test(String(expected))
    )
      throw new Error('Invalid table count in backup manifest')
  }
  const expectedTables = await applicationTables()
  if (expectedTables.some(name => !Object.hasOwn(manifest.tables, name)))
    throw new Error('Backup manifest omits required application tables')
  await validateSql(backupFile)
  const client = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    const existing = await client.query(
      "SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S') LIMIT 1"
    )
    if (existing.rows.length) throw new Error('Restore target is not empty; nothing was restored')
    await restoreSql(backupFile, targetUrl, psqlPath)
    for (const [name, expected] of Object.entries(manifest.tables)) {
      const result = await client.query(`SELECT COUNT(*)::text AS count FROM ${quoteTable(name)}`)
      if (result.rows[0].count !== String(expected))
        throw new Error(`Restored row count does not match: ${name}`)
    }
    // PostgreSQL restores and validates the dumped foreign keys/checks under
    // ON_ERROR_STOP. Unvalidated constraints are not accepted as evidence.
    const invalid = await client.query(
      "SELECT conname FROM pg_constraint WHERE NOT convalidated AND connamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema'))"
    )
    if (invalid.rows.length) throw new Error('Restored database contains unvalidated constraints')
    return { tables: Object.keys(manifest.tables).length, verified: true }
  } finally {
    await client.end()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: new URL('../../.env', import.meta.url) })
  verifyBackup({
    backupFile: process.env.BACKUP_FILE,
    targetUrl: process.env.BACKUP_VERIFY_DATABASE_URL,
    sourceUrl: process.env.DATABASE_URL,
    manifestFile: process.env.BACKUP_MANIFEST_FILE,
    psqlPath: process.env.PSQL_PATH || 'psql'
  })
    .then(result =>
      console.log(
        `Backup restore verification passed: ${result.tables} tables and their row counts verified`
      )
    )
    .catch(error => {
      console.error(`Backup verification failed: ${error.message}`)
      process.exitCode = 1
    })
}

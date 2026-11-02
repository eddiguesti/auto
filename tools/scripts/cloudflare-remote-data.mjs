import { readFile, mkdir, mkdtemp, copyFile, chmod, open, rm } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { loadContract } from './cloudflare-data.mjs'
import { verifyBoundArtifact } from './cloudflare-bound-data.mjs'
import { quoteIdentifier as qi, digest } from '../../cloudflare/db/compile-schema.mjs'

// These are conservative importer limits, not claims about the REST service's
// maximum request size. Each SQL statement is also checked against D1's limit.
const MAX_BATCH_BYTES = 4_000_000
const MAX_BATCH_STATEMENTS = 100
const MAX_STATEMENT_BYTES = 100_000
const LEDGER = '__easy_memoir_import'
// Cloudflare documents this precise reserved storage table/definition:
// https://developers.cloudflare.com/d1/best-practices/import-export-data/
// Do not hide arbitrary _cf_* names or a different object using the same name.
const NORMALIZED_SCHEMA_SQL =
  "replace(replace(replace(replace(sql, char(9), ''), char(10), ''), char(13), ''), ' ', '')"
const INTERNAL_KV = `(type = 'table' AND name = '_cf_KV' AND tbl_name = '_cf_KV' AND
  ${NORMALIZED_SCHEMA_SQL} = 'CREATETABLE_cf_KV(keyTEXTPRIMARYKEY,valueBLOB)WITHOUTROWID')`
export const APPLICATION_OBJECTS = `name NOT GLOB 'sqlite_*' AND name <> '_cf_METADATA' AND NOT ${INTERNAL_KV}`
export const INITIALIZATION_LEDGER_SQL = `CREATE TABLE ${qi(LEDGER)} (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), import_id TEXT NOT NULL UNIQUE, artifact_sha256 TEXT NOT NULL, contract_sha256 TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('importing', 'incomplete', 'complete')), started_at TEXT NOT NULL, verified_at TEXT) STRICT`
const SCHEMA_QUERY = `SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE ${APPLICATION_OBJECTS} ORDER BY type, name`
const rowBytes = row => JSON.stringify(row) + '\n'
const hash = () => createHash('sha256')

export class RemoteDataError extends Error {
  constructor(code) {
    super(code)
    this.name = 'RemoteDataError'
    this.code = code
  }
}
const fail = code => {
  throw new RemoteDataError(code)
}

export function validateTargetConfig(config, contract) {
  const fields = [
    'formatVersion',
    'environment',
    'accountId',
    'databaseId',
    'databaseName',
    'artifactManifestSha256',
    'contractHash',
    'exclusiveAccess'
  ]
  if (!config || Object.keys(config).sort().join(',') !== fields.sort().join(','))
    fail('INVALID_TARGET_CONFIG_FIELDS')
  if (
    config.formatVersion !== 1 ||
    config.environment !== 'staging' ||
    config.exclusiveAccess !== true ||
    !/^[a-f0-9]{32}$/.test(config.accountId) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(config.databaseId) ||
    /^00000000-/.test(config.databaseId) ||
    typeof config.databaseName !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(config.databaseName) ||
    !/(^|[-_])staging([-_]|$)/i.test(config.databaseName) ||
    /(^|[-_])prod(?:uction)?([-_]|$)/i.test(config.databaseName) ||
    !/^[a-f0-9]{64}$/.test(config.artifactManifestSha256) ||
    config.contractHash !== contract.contractHash
  )
    fail('INVALID_STAGING_TARGET_OR_CONTRACT')
  return Object.freeze({ ...config })
}

// REST documents string parameters. Integers/null are rendered only from
// already-validated mapped values; customer strings always remain parameters.
// This avoids relying on undocumented REST number/null parameter coercion.
function bindSQL(sql, values) {
  let index = 0
  const params = []
  const rendered = sql.replaceAll('?', () => {
    const value = values[index++]
    if (value === null) return 'NULL'
    if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
    if (typeof value !== 'string') fail('INVALID_BOUND_PARAMETER')
    params.push(value)
    return '?'
  })
  if (index !== values.length) fail('BOUND_PARAMETER_COUNT_DIFFERS')
  return { sql: rendered, params }
}

export function createD1Transport(
  config,
  { apiToken = process.env.CLOUDFLARE_API_TOKEN, fetcher = fetch } = {}
) {
  if (typeof apiToken !== 'string' || !apiToken.trim() || /[\r\n]/.test(apiToken))
    fail('CLOUDFLARE_API_TOKEN_REQUIRED_IN_ENVIRONMENT')
  // A fixed origin and redirect rejection prevent a token from following a URL
  // from an artifact, config file or remote response. No retries of writes.
  const base = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}`
  async function request(suffix, body) {
    try {
      const response = await fetcher(base + suffix, {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(60_000)
      })
      if (!response.ok) fail('D1_HTTP_REQUEST_FAILED')
      const result = await response.json()
      if (result.success !== true || (result.errors?.length ?? 0) !== 0)
        fail('D1_API_REQUEST_FAILED')
      return result.result
    } catch (error) {
      if (error instanceof RemoteDataError) throw error
      // Provider errors can contain SQL, bound personal data and headers.
      fail('D1_TRANSPORT_FAILED')
    }
  }
  return {
    metadata: () => request(''),
    batch: async statements => {
      checkBatch(statements)
      const results = await request('/query', { batch: statements })
      return validateResults(results, statements.length)
    }
  }
}

function validateResults(results, length) {
  if (
    !Array.isArray(results) ||
    results.length !== length ||
    results.some(result => result.success !== true || !Array.isArray(result.results))
  )
    fail('D1_BATCH_RESULT_INVALID')
  return results
}

function checkBatch(batch) {
  if (
    !batch.length ||
    batch.length > MAX_BATCH_STATEMENTS ||
    Buffer.byteLength(JSON.stringify({ batch })) > MAX_BATCH_BYTES
  )
    fail('IMPORTER_BATCH_LIMIT_EXCEEDED')
  for (const query of batch) {
    if (Buffer.byteLength(query.sql) > MAX_STATEMENT_BYTES || query.params.length > 100)
      fail('D1_STATEMENT_LIMIT_EXCEEDED')
  }
}

async function* lines(filename) {
  const input = createReadStream(filename)
  const reader = createInterface({ input, crlfDelay: Infinity })
  try {
    for await (const line of reader) if (line) yield JSON.parse(line)
  } finally {
    reader.close()
    input.destroy()
  }
}

// Parse only the trusted, fingerprinted generated DDL. String literals and
// quoted identifiers may contain semicolons; splitting on ';' is unsafe.
function schemaStatements(schema) {
  const statements = []
  let current = '',
    quote = null,
    comment = null
  for (let i = 0; i < schema.length; i++) {
    const c = schema[i],
      next = schema[i + 1]
    if (comment === 'line') {
      if (c === '\n') {
        comment = null
        current += '\n'
      }
    } else if (comment === 'block') {
      if (c === '*' && next === '/') {
        comment = null
        i++
        current += ' '
      }
    } else if (quote) {
      current += c
      if (c === quote) {
        if (next === quote) {
          current += next
          i++
        } else quote = null
      }
    } else if (c === '-' && next === '-') {
      comment = 'line'
      i++
    } else if (c === '/' && next === '*') {
      comment = 'block'
      i++
    } else if (c === "'" || c === '"') {
      quote = c
      current += c
    } else if (c === ';') {
      if (current.trim()) statements.push({ sql: current.trim(), params: [] })
      current = ''
    } else current += c
  }
  if (quote || comment === 'block' || current.trim()) fail('UNSUPPORTED_REVIEWED_DDL')
  if (statements.some(query => !/^CREATE (?:TABLE|(?:UNIQUE )?INDEX) /.test(query.sql)))
    fail('UNSUPPORTED_REVIEWED_DDL')
  return statements
}

function tableOrder(mapping) {
  const remaining = new Map(mapping.tables.map(table => [table.name, table]))
  const result = [],
    done = new Set()
  while (remaining.size) {
    const ready = [...remaining.values()].filter(table =>
      table.columns.every(column => !column.reference || done.has(column.reference.table))
    )
    if (!ready.length) fail('CYCLIC_OR_UNKNOWN_FOREIGN_KEY_REQUIRES_REVIEW')
    for (const table of ready) {
      result.push(table)
      done.add(table.name)
      remaining.delete(table.name)
    }
  }
  return result
}

async function preflight(artifactDirectory, suppliedConfig, contract) {
  const config = validateTargetConfig(suppliedConfig, contract)
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'memoir-d1-remote-'))
  await chmod(temporary, 0o700)
  try {
    // Freeze the input before validation and execution. Never reopen original
    // artifact files after this copy. Copies/plan contain personal data.
    for (const file of ['manifest.json', 'schema.sql', 'operations.ndjson']) {
      await copyFile(path.join(artifactDirectory, file), path.join(temporary, file))
      await chmod(path.join(temporary, file), 0o600)
    }
    const manifestText = await readFile(path.join(temporary, 'manifest.json'), 'utf8')
    if (digest(manifestText) !== config.artifactManifestSha256)
      fail('ARTIFACT_MANIFEST_FINGERPRINT_DIFFERS')
    await verifyBoundArtifact(temporary, contract)
    const artifact = JSON.parse(manifestText)
    const order = tableOrder(contract.mapping)
    if (order.some(table => !table.columns.some(column => column.primary)))
      fail('PRIMARY_KEY_REQUIRED_FOR_REMOTE_VERIFICATION')
    const ddl = schemaStatements(contract.schema)
    const { DatabaseSync } = await import('node:sqlite')
    const schemaDB = new DatabaseSync(':memory:')
    let expectedSchema
    try {
      schemaDB.exec(contract.schema)
      expectedSchema = schemaDB
        .prepare(SCHEMA_QUERY)
        .all()
        .map(row => ({ ...row }))
    } finally {
      schemaDB.close()
    }

    // Spool reviewed requests on disk instead of retaining a customer snapshot
    // in a JavaScript array. All batches are sized before any network request.
    const spool = path.join(temporary, 'tables')
    await mkdir(spool, { mode: 0o700 })
    const resultBytes = new Map(order.map(table => [table.name, 1]))
    let handle, lastTable
    try {
      for await (const operation of lines(path.join(temporary, 'operations.ndjson'))) {
        if (lastTable !== operation.table) {
          await handle?.close()
          handle = await open(path.join(spool, `${operation.table}.ndjson`), 'wx', 0o600)
          lastTable = operation.table
        }
        const query = bindSQL(operation.sql, operation.params)
        checkBatch([query])
        await handle.write(JSON.stringify(query) + '\n')
        const table = contract.mapping.tables.find(table => table.name === operation.table)
        const object = Object.fromEntries(
          table.columns.map((column, i) => [column.name, operation.params[i]])
        )
        resultBytes.set(
          table.name,
          Math.max(resultBytes.get(table.name), Buffer.byteLength(JSON.stringify(object)) + 128)
        )
      }
    } finally {
      await handle?.close()
    }
    const planFile = path.join(temporary, 'plan.ndjson')
    const plan = await open(planFile, 'wx', 0o600)
    let batches = 0,
      batch = []
    async function flush() {
      if (batch.length) {
        checkBatch(batch)
        await plan.write(JSON.stringify(batch) + '\n')
        batches++
        batch = []
      }
    }
    async function add(query) {
      if (
        batch.length &&
        (batch.length === MAX_BATCH_STATEMENTS ||
          Buffer.byteLength(JSON.stringify({ batch: [...batch, query] })) > MAX_BATCH_BYTES)
      )
        await flush()
      batch.push(query)
      checkBatch(batch)
    }
    try {
      for (const query of ddl) await add(query)
      await flush() // Create every index/constraint before inserting any data.
      for (const table of order) {
        const metadata = artifact.source.tables.find(item => item.name === table.name)
        if (metadata.count) {
          for await (const query of lines(path.join(spool, `${table.name}.ndjson`)))
            await add(query)
        }
        // Parents are fully committed before any child batch. FK enforcement
        // remains enabled; cycles are rejected during preflight, never deferred
        // across transactions. A multi-batch import is deliberately not atomic.
        await flush()
        if (metadata.sequence !== null) {
          await add(
            bindSQL(
              'INSERT INTO sqlite_sequence (name, seq) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = ?)',
              [table.name, metadata.sequence, table.name]
            )
          )
          await add(
            bindSQL('UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = ?', [
              metadata.sequence,
              table.name
            ])
          )
          await flush()
        }
      }
    } finally {
      await plan.close()
    }
    return { config, artifact, temporary, planFile, batches, resultBytes, expectedSchema }
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    if (error instanceof RemoteDataError) throw error
    fail('ARTIFACT_PREFLIGHT_FAILED')
  }
}

async function query(transport, sql, values = []) {
  const statements = [bindSQL(sql, values)]
  const results = validateResults(await transport.batch(statements), 1)
  return results[0].results
}

async function verifyRemote(transport, prepared, contract) {
  const actualSchema = (await query(transport, SCHEMA_QUERY))
    .filter(row => row.name !== LEDGER)
    .map(({ type, name, tbl_name, sql }) => ({ type, name, tbl_name, sql }))
  if (JSON.stringify(actualSchema) !== JSON.stringify(prepared.expectedSchema))
    fail('REMOTE_SCHEMA_DIFFERS')
  const expectedSequences = []
  for (const table of contract.mapping.tables) {
    const metadata = prepared.artifact.source.tables.find(item => item.name === table.name)
    const count = await query(transport, `SELECT COUNT(*) AS count FROM ${qi(table.name)}`)
    if (count.length !== 1 || count[0].count !== metadata.count) fail('REMOTE_COUNT_DIFFERS')
    const primary = table.columns.filter(column => column.primary)
    if (!primary.length) fail('PRIMARY_KEY_REQUIRED_FOR_REMOTE_VERIFICATION')
    const fields = table.columns.map(column => qi(column.name)).join(', ')
    const keys = primary.map(column => qi(column.name)).join(', ')
    // Bound result size conservatively from the artifact's largest encoded row.
    const pageSize = Math.max(
      1,
      Math.min(100, Math.floor(MAX_BATCH_BYTES / prepared.resultBytes.get(table.name)))
    )
    let cursor = null,
      seen = 0,
      maximum = 0
    const content = hash()
    for (;;) {
      const where = cursor ? ` WHERE (${keys}) > (${primary.map(() => '?').join(', ')})` : ''
      const rows = await query(
        transport,
        `SELECT ${fields} FROM ${qi(table.name)}${where} ORDER BY ${keys} LIMIT ${pageSize}`,
        cursor || []
      )
      if (rows.length > pageSize) fail('REMOTE_PAGE_INVALID')
      for (const row of rows) {
        if (
          !row ||
          Object.keys(row).sort().join(',') !==
            table.columns
              .map(column => column.name)
              .sort()
              .join(',')
        )
          fail('REMOTE_COLUMNS_DIFFER')
        const values = table.columns.map(column => row[column.name])
        content.update(rowBytes(values))
        if (metadata.sequence !== null) maximum = Math.max(maximum, row.id)
        seen++
      }
      if (seen > metadata.count) fail('REMOTE_CONTENT_DIFFERS')
      if (rows.length < pageSize) break
      const next = primary.map(column => rows.at(-1)[column.name])
      if (JSON.stringify(cursor) === JSON.stringify(next)) fail('REMOTE_CURSOR_DID_NOT_ADVANCE')
      cursor = next
    }
    if (seen !== metadata.count || content.digest('hex') !== metadata.sha256)
      fail('REMOTE_CONTENT_DIFFERS')
    if (metadata.sequence !== null)
      expectedSequences.push({ name: table.name, seq: Math.max(metadata.sequence, maximum) })
  }
  const sequences = (
    await query(transport, 'SELECT name, seq FROM sqlite_sequence ORDER BY name')
  ).map(({ name, seq }) => ({ name, seq }))
  expectedSequences.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  if (JSON.stringify(sequences) !== JSON.stringify(expectedSequences))
    fail('REMOTE_SEQUENCES_DIFFER')
  if ((await query(transport, 'PRAGMA foreign_key_check')).length)
    fail('REMOTE_FOREIGN_KEYS_FAILED')
  // D1 authorizes quick_check, not SQLite's integrity_check. Full content,
  // schema, sequence and FK verification above remain mandatory as well.
  const integrity = await query(transport, 'PRAGMA quick_check')
  if (integrity.length !== 1 || integrity[0].quick_check !== 'ok') fail('REMOTE_INTEGRITY_FAILED')
  return {
    tables: contract.mapping.tables.length,
    rows: prepared.artifact.operationCount,
    schema: 'ok',
    counts: 'ok',
    contentHashes: 'ok',
    sequences: 'ok',
    foreignKeys: 'ok',
    quickCheck: 'ok',
    infrastructurePreserved: prepared.artifact.source.externalDataPreserved === true
  }
}

export async function importRemoteArtifact({
  artifactDirectory,
  config,
  receiptFile,
  transport,
  contract
}) {
  // Even metadata/emptiness reads happen only after the ENTIRE artifact passes.
  const prepared = await preflight(artifactDirectory, config, contract)
  let journal,
    writeAttempted = false
  const importId = randomUUID()
  const target = {
    accountId: prepared.config.accountId,
    databaseId: prepared.config.databaseId,
    databaseName: prepared.config.databaseName
  }
  const identity = {
    formatVersion: 1,
    importId,
    target,
    artifactManifestSha256: prepared.config.artifactManifestSha256,
    contractHash: contract.contractHash
  }
  async function record(state, details = {}) {
    await journal.write(
      JSON.stringify({ ...identity, state, at: new Date().toISOString(), ...details }) + '\n'
    )
    await journal.sync()
  }
  try {
    journal = await open(receiptFile, 'wx', 0o600)
    await record('preflight-complete', { batches: prepared.batches })
    const metadata = await transport.metadata()
    if (metadata?.uuid !== target.databaseId || metadata?.name !== target.databaseName)
      fail('REMOTE_TARGET_IDENTITY_DIFFERS')
    if ((await query(transport, SCHEMA_QUERY)).length) fail('REMOTE_DATABASE_NOT_EMPTY')
    const start = [
      {
        sql: INITIALIZATION_LEDGER_SQL,
        params: []
      },
      bindSQL(
        `INSERT INTO ${qi(LEDGER)} (singleton, import_id, artifact_sha256, contract_sha256, state, started_at) VALUES (1, ?, ?, ?, CASE WHEN EXISTS (SELECT 1 FROM sqlite_schema WHERE ${APPLICATION_OBJECTS} AND name <> '${LEDGER}') THEN NULL ELSE 'importing' END, ?)`,
        [
          importId,
          prepared.config.artifactManifestSha256,
          contract.contractHash,
          new Date().toISOString()
        ]
      )
    ]
    checkBatch(start)
    await record('importing')
    writeAttempted = true
    validateResults(await transport.batch(start), start.length)
    for await (const batch of lines(prepared.planFile)) {
      checkBatch(batch)
      validateResults(await transport.batch(batch), batch.length)
    }
    await record('verifying')
    const verification = await verifyRemote(transport, prepared, contract)
    await query(
      transport,
      `UPDATE ${qi(LEDGER)} SET state = 'complete', verified_at = ? WHERE singleton = 1 AND import_id = ? AND state = 'importing'`,
      [new Date().toISOString(), importId]
    )
    const ledger = await query(
      transport,
      `SELECT import_id, state FROM ${qi(LEDGER)} WHERE singleton = 1`
    )
    if (ledger.length !== 1 || ledger[0].import_id !== importId || ledger[0].state !== 'complete')
      fail('REMOTE_COMPLETION_NOT_CONFIRMED')
    await record('complete', { verification })
    return { ...identity, state: 'complete', verification }
  } catch (error) {
    let remoteState = writeAttempted ? 'unknown-incomplete' : 'unchanged'
    if (writeAttempted) {
      try {
        await query(
          transport,
          `UPDATE ${qi(LEDGER)} SET state = 'incomplete', verified_at = NULL WHERE singleton = 1 AND import_id = ?`,
          [importId]
        )
        const ledger = await query(
          transport,
          `SELECT import_id, state FROM ${qi(LEDGER)} WHERE singleton = 1`
        )
        if (
          ledger.length === 1 &&
          ledger[0].import_id === importId &&
          ledger[0].state === 'incomplete'
        )
          remoteState = 'incomplete'
      } catch {
        /* Ambiguous writes are never retried or represented as complete. */
      }
    }
    const code = error instanceof RemoteDataError ? error.code : 'REMOTE_IMPORT_FAILED'
    if (journal) {
      try {
        await record('incomplete', { code, remoteState })
      } catch {
        /* The remote ledger still records incomplete when reachable. */
      }
    }
    throw new RemoteDataError(code)
  } finally {
    try {
      await journal?.close()
    } finally {
      await rm(prepared.temporary, { recursive: true, force: true })
    }
  }
}

async function main() {
  const [command, artifactDirectory, targetFile, receiptFile, ...extra] = process.argv.slice(2)
  if (command !== 'import' || !artifactDirectory || !targetFile || !receiptFile || extra.length)
    fail(
      'Usage: cloudflare-remote-data.mjs import ARTIFACT_DIRECTORY TARGET_JSON NEW_RECEIPT_NDJSON'
    )
  const contract = await loadContract()
  const config = validateTargetConfig(JSON.parse(await readFile(targetFile, 'utf8')), contract)
  const result = await importRemoteArtifact({
    artifactDirectory: path.resolve(artifactDirectory),
    config,
    receiptFile: path.resolve(receiptFile),
    contract,
    transport: createD1Transport(config)
  })
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => {
    console.error(error instanceof RemoteDataError ? error.code : 'REMOTE_DATA_COMMAND_FAILED')
    process.exitCode = 1
  })

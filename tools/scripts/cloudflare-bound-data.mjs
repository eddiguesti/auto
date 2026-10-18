import { readFile, writeFile, mkdir, open } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadContract, convertValue } from './cloudflare-data.mjs'
import { quoteIdentifier as qi, digest } from '../../cloudflare/db/compile-schema.mjs'

class BoundDataError extends Error {}

const MAX_D1_VALUE_BYTES = 2_000_000
const MAX_D1_ROW_BYTES = 2_000_000
const rowBytes = row => JSON.stringify(row) + '\n'
const hasher = () => createHash('sha256')
const insertSQL = table =>
  `INSERT INTO ${qi(table.name)} (${table.columns.map(column => qi(column.name)).join(', ')}) VALUES (${table.columns.map(() => '?').join(', ')})`

async function* lines(filename) {
  const stream = createReadStream(filename)
  const reader = createInterface({ input: stream, crlfDelay: Infinity })
  try {
    for await (const line of reader) if (line) yield line
  } finally {
    reader.close()
    stream.destroy()
  }
}

export function validateBoundRow(table, row) {
  if (!Array.isArray(row) || row.length !== table.columns.length)
    throw new BoundDataError(`Row width differs: ${table.name}`)
  if (row.length > 100) throw new BoundDataError(`D1 parameter limit exceeded: ${table.name}`)
  // Conservative SQLite record/header allowance. Reject at the boundary instead
  // of claiming that raw string lengths alone prove a 2MB row will fit.
  let recordBytes = 128 + row.length * 9
  for (let i = 0; i < row.length; i++) {
    const column = table.columns[i],
      value = row[i]
    const source =
      value === null
        ? null
        : column.kind === 'boolean'
          ? value === 1
            ? 'true'
            : value === 0
              ? 'false'
              : 'INVALID'
          : String(value)
    if (JSON.stringify(convertValue(column, source)) !== JSON.stringify(value))
      throw new BoundDataError(`Invalid mapped value: ${table.name}.${column.name}`)
    const bytes =
      value === null ? 0 : typeof value === 'number' ? 8 : Buffer.byteLength(value, 'utf8')
    if (bytes > MAX_D1_VALUE_BYTES)
      throw new BoundDataError(`D1 2MB string limit exceeded: ${table.name}.${column.name}`)
    recordBytes += bytes
  }
  if (recordBytes > MAX_D1_ROW_BYTES)
    throw new BoundDataError(
      `D1 2MB row limit exceeded (including conservative header allowance): ${table.name}`
    )
  if (Buffer.byteLength(insertSQL(table), 'utf8') > 100_000)
    throw new BoundDataError(`D1 statement limit exceeded: ${table.name}`)
}

function validateManifest(manifest, contract) {
  if (manifest.formatVersion !== 1 || manifest.contractHash !== contract.contractHash)
    throw new BoundDataError('Snapshot contract mismatch')
  if (
    !Array.isArray(manifest.tables) ||
    manifest.tables.length !== contract.mapping.tables.length ||
    new Set(manifest.tables.map(table => table.name)).size !== manifest.tables.length
  )
    throw new BoundDataError('Incomplete/duplicate snapshot table set')
  for (const table of contract.mapping.tables) {
    const item = manifest.tables.find(item => item.name === table.name)
    if (
      !item ||
      !Number.isSafeInteger(item.count) ||
      item.count < 0 ||
      !/^[a-f0-9]{64}$/.test(item.sha256)
    )
      throw new BoundDataError(`Invalid snapshot table metadata: ${table.name}`)
    if (table.columns.some(column => column.serial)) {
      if (!Number.isSafeInteger(item.sequence) || item.sequence < 0 || item.sequence > 2147483647)
        throw new BoundDataError(`Invalid sequence: ${table.name}`)
    } else if (item.sequence !== null)
      throw new BoundDataError(`Unexpected sequence: ${table.name}`)
  }
}

export async function buildBoundArtifact(snapshotDirectory, newArtifactDirectory, contract) {
  const snapshot = path.resolve(snapshotDirectory)
  const source = JSON.parse(await readFile(path.join(snapshot, 'manifest.json'), 'utf8'))
  validateManifest(source, contract)
  const output = path.resolve(newArtifactDirectory)
  await mkdir(output, { recursive: false })
  const handle = await open(path.join(output, 'operations.ndjson'), 'wx', 0o600)
  let operationCount = 0
  const operationsHash = hasher()
  try {
    for (const table of contract.mapping.tables) {
      const metadata = source.tables.find(item => item.name === table.name)
      const hash = hasher()
      let count = 0
      for await (const line of lines(path.join(snapshot, `${table.name}.ndjson`))) {
        const params = JSON.parse(line)
        validateBoundRow(table, params)
        hash.update(rowBytes(params))
        count++
        const operation = { table: table.name, sql: insertSQL(table), params }
        const bytes = JSON.stringify(operation) + '\n'
        await handle.write(bytes)
        operationsHash.update(bytes)
        operationCount++
      }
      if (count !== metadata.count || hash.digest('hex') !== metadata.sha256)
        throw new BoundDataError(`Snapshot hash/count differs: ${table.name}`)
    }
  } finally {
    await handle.close()
  }
  await writeFile(path.join(output, 'schema.sql'), contract.schema, { flag: 'wx', mode: 0o600 })
  // Completion marker is written last. Partial artifacts are never importable.
  const artifact = {
    artifactVersion: 1,
    complete: true,
    mode: 'empty-staging-atomic-offline',
    contractHash: contract.contractHash,
    schemaSha256: digest(contract.schema),
    operationCount,
    operationsSha256: operationsHash.digest('hex'),
    source
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(artifact, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600
  })
  return artifact
}

export async function verifyBoundArtifact(artifactDirectory, contract) {
  const directory = path.resolve(artifactDirectory)
  const artifact = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'))
  if (
    artifact.artifactVersion !== 1 ||
    artifact.complete !== true ||
    artifact.mode !== 'empty-staging-atomic-offline' ||
    artifact.contractHash !== contract.contractHash
  )
    throw new BoundDataError('Invalid/incomplete bound artifact')
  validateManifest(artifact.source, contract)
  const schema = await readFile(path.join(directory, 'schema.sql'), 'utf8')
  if (schema !== contract.schema || digest(schema) !== artifact.schemaSha256)
    throw new BoundDataError('Bound schema differs from reviewed contract')
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(':memory:')
  const operationsHash = hasher()
  let operationCount = 0,
    lastTable = -1
  const counts = new Map(
    contract.mapping.tables.map(table => [table.name, { hash: hasher(), count: 0 }])
  )
  try {
    db.exec('PRAGMA foreign_keys = ON; BEGIN; PRAGMA defer_foreign_keys = ON;')
    db.exec(schema)
    for await (const line of lines(path.join(directory, 'operations.ndjson'))) {
      const operation = JSON.parse(line)
      const tableIndex = contract.mapping.tables.findIndex(table => table.name === operation.table)
      if (tableIndex < 0 || tableIndex < lastTable)
        throw new BoundDataError('Unexpected bound operation table/order')
      lastTable = tableIndex
      const table = contract.mapping.tables[tableIndex]
      if (
        operation.sql !== insertSQL(table) ||
        Object.keys(operation).sort().join(',') !== 'params,sql,table'
      )
        throw new BoundDataError(`Unreviewed bound SQL/operation: ${table.name}`)
      validateBoundRow(table, operation.params)
      db.prepare(operation.sql).run(...operation.params)
      operationsHash.update(JSON.stringify(operation) + '\n')
      operationCount++
      const counter = counts.get(table.name)
      counter.hash.update(rowBytes(operation.params))
      counter.count++
    }
    if (
      operationsHash.digest('hex') !== artifact.operationsSha256 ||
      operationCount !== artifact.operationCount
    )
      throw new BoundDataError('Bound operations hash/count differs')
    for (const table of contract.mapping.tables) {
      const metadata = artifact.source.tables.find(item => item.name === table.name)
      const counter = counts.get(table.name)
      if (counter.count !== metadata.count || counter.hash.digest('hex') !== metadata.sha256)
        throw new BoundDataError(`Bound source hash/count differs: ${table.name}`)
      if (metadata.sequence !== null) {
        db.prepare(
          'INSERT INTO sqlite_sequence (name, seq) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = ?)'
        ).run(table.name, metadata.sequence, table.name)
        db.prepare('UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = ?').run(
          metadata.sequence,
          table.name
        )
      }
      const resultHash = hasher()
      let rowCount = 0
      const sql = `SELECT ${table.columns.map(column => qi(column.name)).join(', ')} FROM ${qi(table.name)} ORDER BY ${table.columns
        .filter(column => column.primary)
        .map(column => qi(column.name))
        .join(', ')}`
      // Keep a strong statement reference while iterating (Node 22's
      // experimental SQLite can otherwise finalize it during a GC cycle).
      const resultStatement = db.prepare(sql)
      for (const row of resultStatement.iterate()) {
        resultHash.update(rowBytes(table.columns.map(column => row[column.name])))
        rowCount++
      }
      if (rowCount !== metadata.count || resultHash.digest('hex') !== metadata.sha256)
        throw new BoundDataError(`Bound round-trip content differs: ${table.name}`)
      if (metadata.sequence !== null) {
        const actual = db
          .prepare('SELECT seq FROM sqlite_sequence WHERE name = ?')
          .get(table.name)?.seq
        const maximum =
          db.prepare(`SELECT MAX(id) AS maximum FROM ${qi(table.name)}`).get().maximum ?? 0
        if (actual !== Math.max(metadata.sequence, maximum))
          throw new BoundDataError(`Bound ID high-water mark differs: ${table.name}`)
      }
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length)
      throw new BoundDataError('Bound foreign keys failed')
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok')
      throw new BoundDataError('Bound SQLite integrity failed')
    db.exec('COMMIT;')
    return {
      tables: contract.mapping.tables.length,
      rows: operationCount,
      contentHashes: 'ok',
      foreignKeys: 'ok',
      integrity: 'ok',
      sequences: 'ok',
      infrastructurePreserved: artifact.source.externalDataPreserved === true
    }
  } catch (error) {
    try {
      db.exec('ROLLBACK;')
    } catch {
      /* connection cleanup below */
    }
    throw error
  } finally {
    db.close()
  }
}

async function main() {
  const [command, input, output] = process.argv.slice(2)
  const contract = await loadContract()
  if (command === 'build' && input && output) {
    const result = await buildBoundArtifact(input, output, contract)
    console.log(
      `Built ${result.operationCount} bound operations. Offline verification required; no remote import performed.`
    )
    return
  }
  if (command === 'verify-local' && input) {
    console.log(JSON.stringify(await verifyBoundArtifact(input, contract), null, 2))
    return
  }
  throw new BoundDataError(
    'Usage: cloudflare-bound-data.mjs build SNAPSHOT NEW_ARTIFACT_DIRECTORY | verify-local ARTIFACT_DIRECTORY'
  )
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => {
    // This command is offline and only emits fixed validation errors/column names.
    console.error(
      error instanceof BoundDataError
        ? error.message
        : 'Bound artifact command failed. Check protected input files and arguments; no remote writes were performed.'
    )
    process.exitCode = 1
  })

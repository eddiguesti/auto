import { readFile, writeFile, mkdir, open, rm } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compile,
  directory,
  quoteIdentifier as qi,
  digest
} from '../../cloudflare/db/compile-schema.mjs'

const integerTypes = {
  SERIAL: 'int4',
  INTEGER: 'int4',
  INT: 'int4',
  BOOLEAN: 'bool',
  TIMESTAMP: 'timestamp',
  TIMESTAMPTZ: 'timestamptz',
  DATE: 'date',
  TEXT: 'text',
  UUID: 'uuid',
  'TEXT[]': '_text',
  JSONB: 'jsonb',
  'DECIMAL(3,2)': 'numeric',
  'VARCHAR(100)': 'varchar',
  'VARCHAR(255)': 'varchar'
}
const hashStream = () => createHash('sha256')
const rowBytes = row => JSON.stringify(row) + '\n'
const primaryColumns = table =>
  table.columns.filter(column => column.primary).map(column => column.name)

export async function loadContract() {
  const mappingText = await readFile(path.join(directory, 'mapping.json'), 'utf8')
  const mapping = JSON.parse(mappingText)
  const schema = await readFile(path.join(directory, 'schema.sql'), 'utf8')
  const current = await compile()
  if (JSON.stringify(current.manifest) !== JSON.stringify(mapping) || current.schema !== schema) {
    throw new Error(
      'Migration sources changed: recompile and review mapping/schema before proceeding'
    )
  }
  return { mapping, schema, contractHash: digest(mappingText + schema) }
}

export function convertValue(column, value) {
  if (value === null) {
    if (!column.nullable) throw new Error(`Required column ${column.name} is NULL`)
    return null
  }
  // Export casts on the server prevent pg from converting timestamps to Date
  // (loses microseconds), numerics to doubles, and JSONB through JSON.parse.
  if (typeof value !== 'string') throw new Error(`Expected PostgreSQL text for ${column.name}`)
  if (
    column.kind === 'uuid' &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
  )
    throw new Error(`Invalid UUID ${column.name}`)
  if (column.kind === 'integer') {
    if (!/^-?\d+$/.test(value)) throw new Error(`Invalid integer ${column.name}`)
    const number = Number(value)
    if (!Number.isSafeInteger(number) || number < -2147483648 || number > 2147483647)
      throw new Error(`Integer outside source int4 range: ${column.name}`)
    return number
  }
  if (column.kind === 'boolean') {
    if (!['true', 'false'].includes(value)) throw new Error(`Invalid boolean ${column.name}`)
    return value === 'true' ? 1 : 0
  }
  if (column.kind === 'json' || column.kind === 'text-array') {
    const parsed = JSON.parse(value)
    if (
      column.kind === 'text-array' &&
      (!Array.isArray(parsed) || !parsed.every(item => item === null || typeof item === 'string'))
    )
      throw new Error(`Unsupported array dimensions/type for ${column.name}`)
  }
  if (column.kind === 'decimal' && !/^-?\d\.\d{2}$/.test(value))
    throw new Error(`Invalid decimal/precision ${column.name}`)
  const varchar = column.sourceType?.match(/^VARCHAR\((\d+)\)$/)
  if (varchar && [...value].length > Number(varchar[1]))
    throw new Error(`VARCHAR length exceeded ${column.name}`)
  if (column.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`Unsupported date (BC/infinity/outside canonical range): ${column.name}`)
  if (['instant', 'timestamp'].includes(column.kind)) {
    const pattern =
      column.kind === 'instant'
        ? /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?\+00$/
        : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/
    if (!pattern.test(value))
      throw new Error(`Unsupported timestamp (BC/infinity/non-UTC): ${column.name}`)
  }
  if (value.includes('\0')) throw new Error(`NUL unsupported in SQL import: ${column.name}`)
  return value
}

// PostgreSQL deparses IN to ANY(ARRAY[]) and BETWEEN to two comparisons.
// Normalize those spelling differences without discarding literal values.
export function normalizeCheck(sql) {
  const input = sql.replace(/^CHECK\s*/i, '').trim()
  const lexer =
    /\s*('(?:[^']|'')*'|"(?:[^"]|"")*"|::|>=|<=|<>|!=|[=<>(),[\]]|-?\d+(?:\.\d+)?|[A-Za-z_][A-Za-z_0-9]*)/gy
  const tokens = []
  let offset = 0
  while (offset < input.length) {
    lexer.lastIndex = offset
    const match = lexer.exec(input)
    if (!match) throw new Error('Unsupported source CHECK expression')
    tokens.push(match[1].startsWith("'") ? match[1] : match[1].replace(/^"|"$/g, '').toLowerCase())
    offset = lexer.lastIndex
  }
  let i = 0
  const take = token => {
    if (tokens[i++] !== token) throw new Error('Unsupported source CHECK expression')
  }
  const value = () => {
    const token = tokens[i++]
    if (
      !token ||
      !/^(?:'(?:[^']|'')*'|-?\d+(?:\.\d+)?|[a-z_][a-z_0-9]*)$/.test(token) ||
      ['and', 'or', 'any', 'array', 'in', 'between'].includes(token)
    )
      throw new Error('Unsupported source CHECK value')
    // PostgreSQL annotates text literals in ARRAY with ::text. Keep other
    // casts unsupported so lossy type conversions cannot disappear in audit.
    if (tokens[i] === '::') {
      i++
      take('text')
    }
    return token
  }
  const list = closing => {
    const result = [value()]
    while (tokens[i] === ',') {
      i++
      result.push(value())
    }
    take(closing)
    return result
  }
  const term = () => {
    if (tokens[i] === '(') {
      i++
      const result = or()
      take(')')
      return result
    }
    const left = value(),
      op = tokens[i++]
    if (op === 'between') {
      const low = value()
      take('and')
      return ['and', ['>=', left, low], ['<=', left, value()]]
    }
    if (op === 'in') {
      take('(')
      return ['in', left, list(')')]
    }
    if (!['=', '<>', '!=', '>', '<', '>=', '<='].includes(op))
      throw new Error('Unsupported source CHECK operator')
    if (op === '=' && tokens[i] === 'any') {
      i++
      take('(')
      take('array')
      take('[')
      const members = list(']')
      take(')')
      return ['in', left, members]
    }
    return [op === '!=' ? '<>' : op, left, value()]
  }
  const and = () => {
    let result = term()
    while (tokens[i] === 'and') {
      i++
      result = ['and', result, term()]
    }
    return result
  }
  const or = () => {
    let result = and()
    while (tokens[i] === 'or') {
      i++
      result = ['or', result, and()]
    }
    return result
  }
  const result = or()
  if (i !== tokens.length) throw new Error('Unsupported source CHECK trailing expression')
  return JSON.stringify(result)
}

function expectedConstraints(table, _mapping) {
  const descriptors = []
  const primary = primaryColumns(table)
  if (primary.length) descriptors.push({ type: 'p', columns: primary })
  for (const columns of [
    ...table.unique,
    ...table.columns.filter(column => column.unique).map(column => [column.name])
  ])
    descriptors.push({ type: 'u', columns })
  for (const column of table.columns.filter(column => column.reference))
    descriptors.push({
      type: 'f',
      columns: [column.name],
      referenceTable: column.reference.table,
      referenceColumns: [column.reference.column],
      deleteAction: { CASCADE: 'c', 'SET NULL': 'n', 'NO ACTION': 'a' }[column.reference.onDelete],
      updateAction: 'a',
      deferrable: false
    })
  for (const column of table.columns)
    for (const check of column.checks || [])
      descriptors.push({ type: 'c', definition: normalizeCheck(check) })
  return descriptors
}

const stable = value => JSON.stringify(value)
export async function auditSource(client, mapping) {
  const { rows: columns } = await client.query(
    `SELECT table_name, column_name, udt_name, is_nullable, numeric_precision, numeric_scale, character_maximum_length, column_default, is_identity, is_generated FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`
  )
  const { rows: constraints } =
    await client.query(`SELECT t.relname AS table_name, c.contype AS type,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord) JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.ord) AS columns,
    rt.relname AS reference_table,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord) JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum ORDER BY k.ord) AS reference_columns,
    c.confdeltype AS delete_action, c.confupdtype AS update_action, c.condeferrable AS deferrable,
    pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    LEFT JOIN pg_class rt ON rt.oid = c.confrelid WHERE n.nspname = 'public'`)
  const { rows: indexes } = await client.query(
    `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`
  )
  const { rows: externalTables } = await client.query(
    `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema') ORDER BY table_schema, table_name`
  )
  const issues = []
  const known = new Set(mapping.tables.map(table => table.name))
  const extraTables = [...new Set(columns.map(column => column.table_name))].filter(
    name => !known.has(name) && name !== 'pgmigrations'
  )
  for (const name of extraTables) issues.push(`Unmapped public table: ${name}`)
  for (const table of mapping.tables) {
    const actual = columns.filter(column => column.table_name === table.name)
    for (const column of table.columns) {
      const found = actual.find(actual => actual.column_name === column.name)
      if (!found) {
        issues.push(`Missing column ${table.name}.${column.name}`)
        continue
      }
      if (
        found.udt_name !== integerTypes[column.sourceType] ||
        (found.is_nullable === 'YES') !== column.nullable
      )
        issues.push(`Type/nullability differs: ${table.name}.${column.name}`)
      if (found.is_identity !== 'NO' || found.is_generated !== 'NEVER')
        issues.push(`Unmapped generated/identity column: ${table.name}.${column.name}`)
      const normalizeDefault = sql => {
        if (sql === null || sql === undefined || /^NULL(?:\s*::.*)?$/i.test(sql)) return null
        const normalized = sql
          .replace(
            /::(?:text\[\]|text|jsonb|character varying|numeric|boolean|integer|timestamp (?:with|without) time zone|date)/gi,
            ''
          )
          .replace(/CURRENT_TIMESTAMP|NOW\(\)/gi, 'now()')
          .replace(/\bTRUE\b/gi, 'true')
          .replace(/\bFALSE\b/gi, 'false')
          .trim()
        if (column.kind === 'json' && /^'(?:[^']|'')*'$/.test(normalized)) {
          const sortObject = value =>
            Array.isArray(value)
              ? value.map(sortObject)
              : value && typeof value === 'object'
                ? Object.fromEntries(
                    Object.keys(value)
                      .sort()
                      .map(key => [key, sortObject(value[key])])
                  )
                : value
          return JSON.stringify(
            sortObject(JSON.parse(normalized.slice(1, -1).replaceAll("''", "'")))
          )
        }
        return normalized
      }
      if (column.serial) {
        if (!/^nextval\('[^']+'::regclass\)$/.test(found.column_default || ''))
          issues.push(`Unmapped serial default: ${table.name}.${column.name}`)
      } else if (
        normalizeDefault(found.column_default) !== normalizeDefault(column.sourceDefaultSql)
      )
        issues.push(`Default differs: ${table.name}.${column.name}`)
      if (column.kind === 'decimal' && (found.numeric_precision !== 3 || found.numeric_scale !== 2))
        issues.push(`Decimal precision differs: ${table.name}.${column.name}`)
      const varchar = column.sourceType.match(/^VARCHAR\((\d+)\)$/)
      if (varchar && found.character_maximum_length !== Number(varchar[1]))
        issues.push(`Text length differs: ${table.name}.${column.name}`)
    }
    for (const column of actual)
      if (!table.columns.some(item => item.name === column.column_name))
        issues.push(`Unmapped column ${table.name}.${column.column_name}`)
    const actualConstraints = constraints
      .filter(item => item.table_name === table.name)
      .map(item => {
        if (item.type === 'f')
          return {
            type: 'f',
            columns: item.columns,
            referenceTable: item.reference_table,
            referenceColumns: item.reference_columns,
            deleteAction: item.delete_action,
            updateAction: item.update_action,
            deferrable: item.deferrable
          }
        if (['p', 'u'].includes(item.type)) return { type: item.type, columns: item.columns }
        return {
          type: item.type,
          definition: item.type === 'c' ? normalizeCheck(item.definition) : item.definition
        }
      })
    const expected = expectedConstraints(table, mapping)
    for (const descriptor of expected)
      if (!actualConstraints.some(item => stable(item) === stable(descriptor)))
        issues.push(`Missing/different constraint on ${table.name}: ${stable(descriptor)}`)
    for (const descriptor of actualConstraints)
      if (!expected.some(item => stable(item) === stable(descriptor)))
        issues.push(`Unmapped constraint on ${table.name}: ${stable(descriptor)}`)
  }
  // Preserve all unique-index semantics, including those not declared as
  // constraints. Expression/partial/extra unique indexes require manual mapping.
  for (const index of indexes.filter(item => item.indexdef.startsWith('CREATE UNIQUE INDEX'))) {
    const table = mapping.tables.find(table => table.name === index.tablename)
    if (!table) continue
    const match = index.indexdef.match(/ USING btree \(([^)]+)\)$/)
    const indexedColumns = match?.[1].split(',').map(value => value.trim().replaceAll('"', ''))
    const expected = [
      ...expectedConstraints(table, mapping)
        .filter(item => ['p', 'u'].includes(item.type))
        .map(item => item.columns),
      ...mapping.indexes
        .filter(item => item.unique && item.table === table.name && !item.where)
        .map(item => item.columns.split(',').map(value => value.trim()))
    ]
    if (!indexedColumns || !expected.some(item => stable(item) === stable(indexedColumns)))
      issues.push(`Unmapped unique index: ${index.indexname}`)
  }
  for (const expected of mapping.indexes.filter(item => item.unique)) {
    const present = indexes.some(
      item =>
        item.tablename === expected.table &&
        item.indexdef.startsWith('CREATE UNIQUE INDEX') &&
        item.indexdef.endsWith(
          ` USING btree (${expected.columns})${expected.where ? ` WHERE ${expected.where}` : ''}`
        )
    )
    if (!present) issues.push(`Missing mapped unique index: ${expected.name}`)
  }
  return {
    issues,
    columns,
    constraints,
    indexes,
    externalTables,
    hasLegacyLedger: columns.some(column => column.table_name === 'pgmigrations'),
    extraTables
  }
}

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

export async function exportSnapshot(client, outputDirectory, contract) {
  const output = path.resolve(outputDirectory)
  // Exclusive creation refuses overwriting a paid-product snapshot.
  await mkdir(output, { recursive: false })
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    await client.query("SET LOCAL TIME ZONE 'UTC'")
    await client.query("SET LOCAL DateStyle = 'ISO, YMD'")
    const audit = await auditSource(client, contract.mapping)
    await writeFile(path.join(output, 'source-audit.json'), JSON.stringify(audit, null, 2))
    if (audit.issues.length)
      throw new Error(
        `Source schema drift blocks export (${audit.issues.length} issues); inspect source-audit.json`
      )
    const manifest = {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      contractHash: contract.contractHash,
      tables: [],
      externalTables: audit.externalTables,
      externalDataPreserved: audit.externalTables.length === 0
    }
    for (const table of contract.mapping.tables) {
      for (const column of table.columns.filter(column => column.kind === 'text-array')) {
        const { rows } = await client.query(
          `SELECT COUNT(*)::text AS count FROM public.${qi(table.name)} WHERE ${qi(column.name)} IS NOT NULL AND cardinality(${qi(column.name)}) > 0 AND (array_ndims(${qi(column.name)}) <> 1 OR array_lower(${qi(column.name)}, 1) <> 1)`
        )
        if (rows[0].count !== '0')
          throw new Error(`Nonstandard array dimensions/lower bounds: ${table.name}.${column.name}`)
      }
      const projections = table.columns
        .map(
          column =>
            `${column.kind === 'text-array' ? `array_to_json(${qi(column.name)})` : qi(column.name)}::text AS ${qi(column.name)}`
        )
        .join(', ')
      const ordering = table.columns
        .filter(column => column.primary)
        .map(column => `${qi(column.name)}${column.kind === 'text' ? ' COLLATE "C"' : ''}`)
        .join(', ')
      await client.query(
        `DECLARE memoir_export NO SCROLL CURSOR FOR SELECT ${projections} FROM public.${qi(table.name)} ORDER BY ${ordering}`
      )
      const handle = await open(path.join(output, `${table.name}.ndjson`), 'wx', 0o600)
      const hash = hashStream()
      let count = 0
      try {
        for (;;) {
          const { rows } = await client.query('FETCH FORWARD 1000 FROM memoir_export')
          if (!rows.length) break
          for (const row of rows) {
            const mapped = table.columns.map(column => convertValue(column, row[column.name]))
            const bytes = rowBytes(mapped)
            hash.update(bytes)
            await handle.write(bytes)
            count++
          }
        }
      } finally {
        await handle.close()
        await client.query('CLOSE memoir_export')
      }
      let sequence = null
      if (table.columns.some(column => column.serial)) {
        const { rows: sequenceNames } = await client.query(
          'SELECT pg_get_serial_sequence($1, $2) AS name',
          [`public.${table.name}`, 'id']
        )
        if (!sequenceNames[0].name) throw new Error(`Missing ID sequence for ${table.name}`)
        // pg_get_serial_sequence returns server-quoted qualified identifiers.
        const { rows } = await client.query(
          `SELECT last_value::text AS value, is_called FROM ${sequenceNames[0].name}`
        )
        const value = Number(rows[0].value)
        if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
          throw new Error(`Unsupported ID sequence for ${table.name}`)
        sequence = rows[0].is_called ? value : value - 1
      }
      manifest.tables.push({ name: table.name, count, sha256: hash.digest('hex'), sequence })
    }
    if (audit.hasLegacyLedger) {
      const { rows } = await client.query(
        'SELECT row_to_json(ledger)::text AS row FROM public.pgmigrations ledger ORDER BY id'
      )
      await writeFile(
        path.join(output, 'legacy-pgmigrations.ndjson'),
        rows.map(row => row.row).join('\n') + '\n',
        { mode: 0o600 }
      )
      manifest.legacyLedger = {
        count: rows.length,
        sha256: digest(rows.map(row => row.row).join('\n') + '\n')
      }
    }
    await client.query('COMMIT')
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), {
      mode: 0o600
    })
    return manifest
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

const sqlValue = value =>
  value === null
    ? 'NULL'
    : typeof value === 'number'
      ? String(value)
      : `'${value.replaceAll("'", "''")}'`

export async function buildImport(snapshotDirectory, outputFile, contract) {
  const snapshot = path.resolve(snapshotDirectory)
  const manifest = JSON.parse(await readFile(path.join(snapshot, 'manifest.json'), 'utf8'))
  if (manifest.formatVersion !== 1 || manifest.contractHash !== contract.contractHash)
    throw new Error('Snapshot contract mismatch')
  if (manifest.tables.length !== contract.mapping.tables.length)
    throw new Error('Incomplete snapshot table set')
  const handle = await open(outputFile, 'wx', 0o600)
  try {
    await handle.write(
      '-- Import only into an empty staging database. No REPLACE/IGNORE or destructive deletes.\nPRAGMA defer_foreign_keys = ON;\n' +
        contract.schema
    )
    for (const table of contract.mapping.tables) {
      const metadata = manifest.tables.find(item => item.name === table.name)
      if (!metadata) throw new Error(`Missing snapshot table ${table.name}`)
      const hash = hashStream()
      let count = 0
      for await (const line of lines(path.join(snapshot, `${table.name}.ndjson`))) {
        const row = JSON.parse(line)
        if (!Array.isArray(row) || row.length !== table.columns.length)
          throw new Error(`Row width differs in ${table.name}`)
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
          if (stable(convertValue(column, source)) !== stable(value))
            throw new Error(`Invalid mapped value ${table.name}.${column.name}`)
        }
        hash.update(rowBytes(row))
        count++
        const sql = `INSERT INTO ${qi(table.name)} (${table.columns.map(column => qi(column.name)).join(', ')}) VALUES (${row.map(sqlValue).join(', ')});\n`
        if (Buffer.byteLength(sql) > 100000)
          throw new Error(
            `Row in ${table.name} exceeds D1 100KB SQL statement limit; use reviewed bound-parameter import (never truncate)`
          )
        await handle.write(sql)
      }
      if (metadata.count !== count || metadata.sha256 !== hash.digest('hex'))
        throw new Error(`Snapshot hash/count differs: ${table.name}`)
      if (metadata.sequence !== null) {
        if (
          !Number.isSafeInteger(metadata.sequence) ||
          metadata.sequence < 0 ||
          metadata.sequence > 2147483647
        )
          throw new Error(`Invalid sequence ${table.name}`)
        // Never move below imported maximum or source sequence high-water mark.
        await handle.write(
          `INSERT INTO sqlite_sequence (name, seq) SELECT '${table.name}', ${metadata.sequence} WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = '${table.name}');\nUPDATE sqlite_sequence SET seq = MAX(seq, ${metadata.sequence}) WHERE name = '${table.name}';\n`
        )
      }
    }
    await handle.write(
      'PRAGMA defer_foreign_keys = OFF;\nPRAGMA foreign_key_check;\nPRAGMA integrity_check;\n'
    )
  } catch (error) {
    await handle.close()
    await rm(outputFile, { force: true })
    throw error
  }
  await handle.close()
  return manifest
}

export async function verifyLocal(snapshotDirectory, sqlFile, contract) {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('PRAGMA foreign_keys = ON; BEGIN;')
    db.exec(await readFile(sqlFile, 'utf8'))
    db.exec('COMMIT;')
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign keys failed')
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok')
      throw new Error('SQLite integrity failed')
    const manifest = JSON.parse(
      await readFile(path.join(snapshotDirectory, 'manifest.json'), 'utf8')
    )
    if (manifest.contractHash !== contract.contractHash)
      throw new Error('Snapshot contract mismatch')
    for (const table of contract.mapping.tables) {
      const metadata = manifest.tables.find(item => item.name === table.name)
      if (!metadata) throw new Error(`Missing manifest table ${table.name}`)
      const hash = hashStream()
      let count = 0
      const statement = db.prepare(
        `SELECT ${table.columns.map(column => qi(column.name)).join(', ')} FROM ${qi(table.name)} ORDER BY ${primaryColumns(table).map(qi).join(', ')}`
      )
      for (const row of statement.iterate()) {
        hash.update(rowBytes(table.columns.map(column => row[column.name])))
        count++
      }
      if (metadata.sha256 !== hash.digest('hex') || metadata.count !== count)
        throw new Error(`Round-trip content/count differs: ${table.name}`)
      if (metadata.sequence !== null) {
        const sequence = db
          .prepare('SELECT seq FROM sqlite_sequence WHERE name = ?')
          .get(table.name)?.seq
        if (sequence < metadata.sequence) throw new Error(`ID high-water mark lost: ${table.name}`)
      }
    }
    return {
      tables: manifest.tables.length,
      rows: manifest.tables.reduce((sum, table) => sum + table.count, 0),
      foreignKeys: 'ok',
      integrity: 'ok',
      contentHashes: 'ok',
      infrastructurePreserved: manifest.externalDataPreserved
    }
  } finally {
    db.close()
  }
}

async function main() {
  const [command, input, output] = process.argv.slice(2)
  const contract = await loadContract()
  if (command === 'build-import' && input && output) {
    await buildImport(input, output, contract)
    console.log('Staging import built; run verify-local before any D1 import.')
    return
  }
  if (command === 'verify-local' && input && output) {
    console.log(JSON.stringify(await verifyLocal(input, output, contract), null, 2))
    return
  }
  if (['audit', 'export'].includes(command)) {
    if (!process.env.DATABASE_URL)
      throw new Error('Set DATABASE_URL securely; never pass it on the command line')
    if (command === 'export' && !input) throw new Error('Export requires a new output directory')
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    try {
      if (command === 'export') {
        const result = await exportSnapshot(client, input, contract)
        console.log(
          `Exported ${result.tables.length} application tables. External schemas preserved: ${result.externalDataPreserved}.`
        )
        return
      }
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const result = await auditSource(client, contract.mapping)
      await client.query('ROLLBACK')
      if (input)
        await writeFile(input, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 })
      console.log(
        JSON.stringify(
          {
            issues: result.issues,
            externalTables: result.externalTables,
            legacyLedger: result.hasLegacyLedger
          },
          null,
          2
        )
      )
      if (result.issues.length) process.exitCode = 1
    } finally {
      await client.end()
    }
    return
  }
  throw new Error(
    'Usage: cloudflare-data.mjs audit [report.json] | export NEW_DIRECTORY | build-import SNAPSHOT NEW_SQL_FILE | verify-local SNAPSHOT SQL_FILE'
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(() => {
    // PostgreSQL errors can contain hostnames or credentials. CLI logs only a
    // generic failure; explicit schema reports and local validation are safe.
    console.error(
      'Data migration command failed. Check the protected audit report, source access, and command arguments. No remote writes were performed.'
    )
    process.exitCode = 1
  })

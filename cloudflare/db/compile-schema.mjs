import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const directory = path.dirname(fileURLToPath(import.meta.url))
export const root = path.resolve(directory, '../..')
const migrationDirectory = path.join(root, 'services/api/db/migrations')
export const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`
export const digest = value => createHash('sha256').update(value).digest('hex')
export const normalizeSource = value => value.replace(/\r\n?/g, '\n')

// Preserve the supported CHECK expressions rather than silently dropping them.
function extractChecks(value) {
  const checks = []
  let rest = value
  for (let match; (match = /\bCHECK\s*\(/i.exec(rest)); ) {
    let depth = 1,
      quoted = false,
      end = match.index + match[0].length
    const start = end
    for (; end < rest.length && depth; end++) {
      const ch = rest[end]
      if (ch === "'") {
        if (quoted && rest[end + 1] === "'") {
          end++
          continue
        }
        quoted = !quoted
      }
      if (!quoted) {
        if (ch === '(') depth++
        if (ch === ')') depth--
      }
    }
    if (depth) throw new Error('Unclosed CHECK constraint')
    const expression = rest.slice(start, end - 1).trim()
    // These expressions are portable to SQLite; reject functions/casts and
    // unsupported PostgreSQL expressions until deliberately mapped.
    const scalar = "(?:-?\\d+|'(?:[^']|'')*')"
    const supported = new RegExp(
      `^\\w+\\s*(?:(?:=|<>|!=|<=|>=|<|>)\\s*${scalar}|BETWEEN\\s+${scalar}\\s+AND\\s+${scalar}|IN\\s*\\(\\s*${scalar}(?:\\s*,\\s*${scalar})*\\s*\\))$`,
      'i'
    )
    if (!supported.test(expression)) throw new Error(`Unsupported CHECK expression: ${expression}`)
    checks.push(expression)
    rest = rest.slice(0, match.index) + rest.slice(end)
  }
  return { checks, rest }
}

// This is deliberately a compiler for the audited repository grammar, not a
// general PostgreSQL converter. An unrecognised declaration aborts generation.
function splitDeclarations(value) {
  const parts = []
  let start = 0,
    depth = 0,
    quoted = false
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "'") {
      if (quoted && value[i + 1] === "'") {
        i++
        continue
      }
      quoted = !quoted
    }
    if (quoted) continue
    if (value[i] === '(') depth++
    if (value[i] === ')') depth--
    if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}

function column(declaration) {
  const match = declaration.match(
    /^(\w+)\s+(SERIAL|INTEGER|INT|BOOLEAN|TIMESTAMPTZ|TIMESTAMP|DATE|TEXT\[\]|TEXT|UUID|JSONB|DECIMAL\(3,2\)|VARCHAR\((?:100|255)\))(.*)$/i
  )
  if (!match) throw new Error(`Unsupported column: ${declaration}`)
  const [, name, sourceType, modifiers] = match
  const { checks, rest } = extractChecks(modifiers)
  const type = sourceType.toUpperCase()
  const kind =
    type === 'SERIAL' || type === 'INTEGER' || type === 'INT'
      ? 'integer'
      : type === 'BOOLEAN'
        ? 'boolean'
        : type === 'JSONB'
          ? 'json'
          : type === 'TEXT[]'
            ? 'text-array'
            : type === 'UUID'
              ? 'uuid'
              : type === 'DECIMAL(3,2)'
                ? 'decimal'
                : type === 'TIMESTAMPTZ'
                  ? 'instant'
                  : type === 'TIMESTAMP'
                    ? 'timestamp'
                    : type === 'DATE'
                      ? 'date'
                      : 'text'
  const primary = /\bPRIMARY KEY\b/i.test(rest)
  const nullable = !primary && !/\bNOT NULL\b/i.test(rest)
  const reference = rest.match(/REFERENCES (\w+)\((\w+)\)(?: ON DELETE (CASCADE|SET NULL))?/i)
  const defaultMatch = rest.match(
    /\bDEFAULT\s+('(?:[^']|'')*'|CURRENT_TIMESTAMP|CURRENT_DATE|NOW\(\)|true|false|NULL|\d+)/i
  )
  const residue = rest
    .replace(/PRIMARY KEY|NOT NULL|UNIQUE/gi, '')
    .replace(/REFERENCES \w+\(\w+\)(?: ON DELETE (?:CASCADE|SET NULL))?/gi, '')
    .replace(
      /DEFAULT\s+('(?:[^']|'')*'|CURRENT_TIMESTAMP|CURRENT_DATE|NOW\(\)|true|false|NULL|\d+)/gi,
      ''
    )
    .trim()
  if (residue) throw new Error(`Unsupported column modifiers: ${declaration}`)
  const sourceDefaultSql = defaultMatch?.[1]
  let defaultSql = sourceDefaultSql
  if (defaultSql && /^(true|false)$/i.test(defaultSql))
    defaultSql = defaultSql.toLowerCase() === 'true' ? '1' : '0'
  if (kind === 'text-array' && defaultSql === "'{}'") defaultSql = "'[]'"
  if (kind === 'instant' && defaultSql && /NOW\(\)|CURRENT_TIMESTAMP/i.test(defaultSql))
    defaultSql = "(strftime('%Y-%m-%d %H:%M:%f+00', 'now'))"
  if (defaultSql === 'NOW()') defaultSql = 'CURRENT_TIMESTAMP'
  return {
    name,
    sourceType: type,
    kind,
    nullable,
    primary,
    serial: type === 'SERIAL',
    unique: /\bUNIQUE\b/i.test(rest),
    ...(checks.length ? { checks } : {}),
    sourceDefaultSql,
    defaultSql,
    reference: reference
      ? { table: reference[1], column: reference[2], onDelete: reference[3] || 'NO ACTION' }
      : undefined
  }
}

export async function compile({ sourceDirectory = migrationDirectory } = {}) {
  const names = (await readdir(sourceDirectory)).filter(name => /\.(sql|js)$/.test(name)).sort()
  const sources = await Promise.all(
    names.map(async name => ({
      name,
      text: normalizeSource(await readFile(path.join(sourceDirectory, name), 'utf8'))
    }))
  )
  const tables = []
  // Later migrations may introduce entire tables, not just columns. Inspect
  // every declaration, including duplicates guarded by IF NOT EXISTS.
  for (const source of sources.filter(source => source.name.endsWith('.sql'))) {
    const sql = source.text.replace(/--[^\n]*/g, '')
    for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g)) {
      const table = { name: match[1], columns: [], unique: [] }
      for (const declaration of splitDeclarations(match[2])) {
        const unique = declaration.match(/^UNIQUE\(([^)]+)\)$/)
        if (unique) table.unique.push(unique[1].split(',').map(value => value.trim()))
        else table.columns.push(column(declaration))
      }
      const existing = tables.find(item => item.name === table.name)
      if (!existing) tables.push(table)
      else if (JSON.stringify(existing) !== JSON.stringify(table))
        throw new Error(`Conflicting table declaration: ${table.name}`)
    }
  }
  // Process every guarded additive SQL alteration, including baseline safety
  // additions. Existing declarations are compared rather than overwritten.
  for (const source of sources.filter(source => source.name.endsWith('.sql'))) {
    const sql = source.text.replace(/--[^\n]*/g, '')
    for (const match of source.text.matchAll(
      /ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS ([^;]+);/g
    )) {
      const table = tables.find(table => table.name === match[1])
      if (!table) throw new Error(`Unknown ALTER target ${match[1]}`)
      const added = column(match[2])
      const existing = table.columns.find(item => item.name === added.name)
      if (!existing) table.columns.push(added)
      else if (JSON.stringify(existing) !== JSON.stringify(added))
        throw new Error(`Conflicting column addition: ${table.name}.${added.name}`)
    }
    for (const match of sql.matchAll(/ALTER TABLE (\w+) ALTER COLUMN (\w+) DROP NOT NULL;/g)) {
      const item = tables
        .find(table => table.name === match[1])
        ?.columns.find(item => item.name === match[2])
      if (!item || item.primary)
        throw new Error(`Unknown/nonnullable ALTER target ${match[1]}.${match[2]}`)
      item.nullable = true
    }
    const statements = source.text
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map(sql => sql.trim())
      .filter(Boolean)
    for (const sql of statements) {
      if (/^CREATE TABLE IF NOT EXISTS \w+\s*\([\s\S]+\)$/.test(sql)) continue
      if (/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS \w+ ON /.test(sql)) continue
      if (/^ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS /.test(sql)) continue
      if (sql === 'ALTER TABLE photos ALTER COLUMN story_id DROP NOT NULL') continue
      if (/^ANALYZE \w+$/.test(sql)) continue
      throw new Error(`Unaudited SQL statement in ${source.name}`)
    }
  }
  const indexes = new Map(),
    conflicts = []
  for (const source of sources) {
    const statements = source.name.endsWith('.sql')
      ? [...source.text.matchAll(/CREATE (?:UNIQUE )?INDEX[^;]+;/g)].map(match =>
          match[0].slice(0, -1)
        )
      : [...source.text.matchAll(/pgm\.sql\(\s*'([^']+)'\s*\)/g)]
          .map(match => match[1])
          .filter(sql => sql.startsWith('CREATE INDEX'))
    for (const statement of statements) {
      const match = statement.match(
        /^CREATE (UNIQUE )?INDEX (?:CONCURRENTLY )?IF NOT EXISTS (\w+) ON (\w+)\(([^)]+)\)(?: WHERE ([\s\S]+))?$/
      )
      if (!match) throw new Error(`Unsupported index ${statement}`)
      const where = match[5]?.trim()
      const definition = {
        name: match[2],
        unique: Boolean(match[1]),
        table: match[3],
        columns: match[4].trim(),
        where
      }
      if (!indexes.has(definition.name)) indexes.set(definition.name, definition)
      else if (JSON.stringify(indexes.get(definition.name)) !== JSON.stringify(definition))
        conflicts.push({
          source: source.name,
          retained: indexes.get(definition.name),
          ignored: definition
        })
    }
  }
  const manifest = {
    formatVersion: 1,
    sources: sources.map(({ name, text }) => ({ name, sha256: digest(text) })),
    tables,
    indexes: [...indexes.values()],
    indexConflicts: conflicts
  }
  const schema =
    [
      '-- Audited application schema; generated by compile-schema.mjs.',
      '-- Run only against a new staging D1 database. PostgreSQL migration ledgers are historical data.',
      ...tables.map(table => {
        const definitions = table.columns.map(item => {
          const q = quoteIdentifier(item.name)
          let sql = `${q} ${['integer', 'boolean'].includes(item.kind) ? 'INTEGER' : 'TEXT'}`
          if (item.primary)
            sql += item.serial ? ' PRIMARY KEY AUTOINCREMENT' : ' PRIMARY KEY NOT NULL'
          else if (!item.nullable) sql += ' NOT NULL'
          if (item.unique) sql += ' UNIQUE'
          for (const check of item.checks || []) sql += ` CHECK (${check})`
          if (item.defaultSql !== undefined) sql += ` DEFAULT ${item.defaultSql}`
          if (item.kind === 'integer')
            sql += ` CHECK (${q} IS NULL OR ${q} BETWEEN -2147483648 AND 2147483647)`
          if (item.kind === 'boolean') sql += ` CHECK (${q} IS NULL OR ${q} IN (0, 1))`
          if (item.kind === 'uuid')
            sql += ` CHECK (${q} IS NULL OR (length(${q}) = 36 AND substr(${q},9,1) = '-' AND substr(${q},14,1) = '-' AND substr(${q},19,1) = '-' AND substr(${q},24,1) = '-' AND length(replace(${q},'-','')) = 32 AND replace(${q},'-','') NOT GLOB '*[^0-9a-f]*'))`
          const varchar = item.sourceType.match(/^VARCHAR\((\d+)\)$/)
          if (varchar) sql += ` CHECK (${q} IS NULL OR length(${q}) <= ${varchar[1]})`
          if (item.kind === 'decimal')
            sql += ` CHECK (${q} IS NULL OR ${q} GLOB '[0-9].[0-9][0-9]' OR ${q} GLOB '-[0-9].[0-9][0-9]')`
          if (['json', 'text-array'].includes(item.kind)) {
            sql += ` CHECK (${q} IS NULL OR json_valid(${q}))`
            if (item.kind === 'text-array')
              sql += ` CHECK (${q} IS NULL OR json_type(${q}) = 'array')`
          }
          if (item.reference)
            sql += ` REFERENCES ${quoteIdentifier(item.reference.table)}(${quoteIdentifier(item.reference.column)}) ON DELETE ${item.reference.onDelete}`
          return sql
        })
        definitions.push(
          ...table.unique.map(columns => `UNIQUE (${columns.map(quoteIdentifier).join(', ')})`)
        )
        return `CREATE TABLE ${quoteIdentifier(table.name)} (\n  ${definitions.join(',\n  ')}\n) STRICT;`
      }),
      ...manifest.indexes.map(
        item =>
          `CREATE ${item.unique ? 'UNIQUE ' : ''}INDEX ${quoteIdentifier(item.name)} ON ${quoteIdentifier(item.table)} (${item.columns})${item.where ? ` WHERE ${item.where.replace(/\bfalse\b/g, '0').replace(/\btrue\b/g, '1')}` : ''};`
      )
    ].join('\n\n') + '\n'
  return { manifest, schema }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest, schema } = await compile()
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, 'mapping.json'), JSON.stringify(manifest, null, 2) + '\n')
  await writeFile(path.join(directory, 'schema.sql'), schema)
  console.log(
    `Compiled ${manifest.tables.length} tables, ${manifest.tables.reduce((sum, table) => sum + table.columns.length, 0)} columns; ${manifest.indexConflicts.length} index name conflicts recorded.`
  )
}

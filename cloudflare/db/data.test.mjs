import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { digest, compile } from './compile-schema.mjs'
import {
  convertValue,
  loadContract,
  buildImport,
  verifyLocal,
  auditSource
} from '../../tools/scripts/cloudflare-data.mjs'
import {
  buildBoundArtifact,
  verifyBoundArtifact
} from '../../tools/scripts/cloudflare-bound-data.mjs'

const contract = await loadContract()
const column = kind => ({ name: 'sample', kind, nullable: true })

test('all eight SQL/JS migrations are accounted for; post-baseline photo fields present', () => {
  assert.equal(contract.mapping.sources.length, 8)
  assert.equal(contract.mapping.tables.length, 48)
  assert.equal(
    contract.mapping.tables.reduce((sum, table) => sum + table.columns.length, 0),
    432
  )
  const photos = contract.mapping.tables.find(table => table.name === 'photos')
  for (const name of ['user_id', 'chapter_id', 'ai_description', 'ai_era', 'ai_questions'])
    assert(photos.columns.some(column => column.name === name))
  assert.equal(photos.columns.find(column => column.name === 'story_id').nullable, true)
})

test('generated contract is reproducible and retains unique/FK constraints and append-only audit data', async () => {
  const current = await compile()
  assert.equal(current.schema, contract.schema)
  assert.equal(JSON.stringify(current.manifest), JSON.stringify(contract.mapping))
  assert.match(contract.schema, /CREATE UNIQUE INDEX "idx_payments_stripe_session_unique"/)
  assert.match(contract.schema, /REFERENCES "users"\("id"\) ON DELETE SET NULL/)
  assert.match(contract.schema, /CREATE TABLE "payments_audit_log"/)
  assert.equal(contract.mapping.indexConflicts.length, 5)
})

test('JSON numeric precision and microsecond timestamp text survive mapping exactly', () => {
  const json = '{"large": 90071992547409931234567890, "decimal": 0.12345678901234567890123}'
  assert.equal(convertValue(column('json'), json), json)
  assert.equal(
    convertValue(column('instant'), '2026-10-09 15:00:00.123456+00'),
    '2026-10-09 15:00:00.123456+00'
  )
  assert.equal(
    convertValue(column('timestamp'), '2026-10-09 15:00:00.123456'),
    '2026-10-09 15:00:00.123456'
  )
  assert.equal(convertValue(column('decimal'), '1.25'), '1.25')
})

test('null, boolean, array and source int4 semantics are checked without coercion', () => {
  assert.equal(convertValue(column('boolean'), 'true'), 1)
  assert.equal(convertValue(column('boolean'), 'false'), 0)
  assert.equal(convertValue(column('boolean'), null), null)
  assert.equal(
    convertValue(column('text-array'), '["a,b", "quoted\\"", null]'),
    '["a,b", "quoted\\"", null]'
  )
  assert.throws(() => convertValue(column('text-array'), '[["nested"]]'))
  assert.throws(() => convertValue(column('boolean'), 'yes'))
  assert.throws(() => convertValue(column('integer'), '2147483648'))
  assert.throws(() => convertValue(column('integer'), '1.2'))
  assert.throws(() => convertValue({ ...column('text'), nullable: false }, null))
  assert.throws(() => convertValue(column('instant'), 'infinity'))
  assert.throws(() => convertValue(column('timestamp'), new Date()))
})

function fixtureValue(item) {
  if (item.name === 'deleted_at') return null
  if (item.kind === 'integer') return 1
  if (item.kind === 'boolean') return 1
  if (item.kind === 'json') return '{"exact": 900719925474099312345, "nested": [true, null]}'
  if (item.kind === 'text-array') return '["warm", "quote\\"", null]'
  if (item.kind === 'timestamp') return '2026-10-09 12:34:56.123456'
  if (item.kind === 'instant') return '2026-10-09 12:34:56.123456+00'
  if (item.kind === 'date') return '2026-10-09'
  if (item.kind === 'decimal') return '1.25'
  return "Memory café 🪶 ' with quote\nand a newline"
}

async function fixture(directory, modify) {
  const manifest = {
    formatVersion: 1,
    contractHash: contract.contractHash,
    externalDataPreserved: true,
    tables: []
  }
  for (const table of contract.mapping.tables) {
    const row = table.columns.map(fixtureValue)
    modify?.(table, row)
    const bytes = JSON.stringify(row) + '\n'
    await writeFile(path.join(directory, `${table.name}.ndjson`), bytes)
    manifest.tables.push({
      name: table.name,
      count: 1,
      sha256: digest(bytes),
      sequence: table.columns.some(column => column.serial) ? 100 : null
    })
  }
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest))
}

async function withFixture(callback, modify) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'memoir-d1-test-'))
  try {
    await fixture(directory, modify)
    await callback(directory, path.join(directory, 'import.sql'))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('48-table paid-user fixture imports with exact content hashes, FK integrity and ID high-water marks', async () => {
  await withFixture(async (directory, sqlFile) => {
    await buildImport(directory, sqlFile, contract)
    assert.deepEqual(await verifyLocal(directory, sqlFile, contract), {
      tables: 48,
      rows: 48,
      foreignKeys: 'ok',
      integrity: 'ok',
      contentHashes: 'ok',
      infrastructurePreserved: true
    })
    const sql = await readFile(sqlFile, 'utf8')
    assert.doesNotMatch(sql, /INSERT OR REPLACE|INSERT OR IGNORE|DELETE FROM|DROP TABLE/)
  })
})

test('tampered snapshot fails hashes and removes incomplete import', async () => {
  await withFixture(async (directory, sqlFile) => {
    const filename = path.join(directory, 'users.ndjson')
    await writeFile(filename, (await readFile(filename, 'utf8')).replace('café', 'edited'))
    await assert.rejects(buildImport(directory, sqlFile, contract), /hash\/count differs/)
    await assert.rejects(readFile(sqlFile), /ENOENT/)
  })
})

test('orphaned foreign keys cannot pass staging verification', async () => {
  await withFixture(
    async (directory, sqlFile) => {
      await buildImport(directory, sqlFile, contract)
      await assert.rejects(verifyLocal(directory, sqlFile, contract), /foreign key/i)
    },
    (table, row) => {
      if (table.name === 'stories')
        row[table.columns.findIndex(column => column.name === 'user_id')] = 999
    }
  )
})

test('large content stops at D1 SQL statement limit without truncation', async () => {
  await withFixture(
    async (directory, sqlFile) => {
      await assert.rejects(buildImport(directory, sqlFile, contract), /100KB SQL statement limit/)
      await assert.rejects(readFile(sqlFile), /ENOENT/)
    },
    (table, row) => {
      if (table.name === 'stories')
        row[table.columns.findIndex(column => column.name === 'answer')] = 'a'.repeat(100001)
    }
  )
})

test('existing destination SQL is never overwritten', async () => {
  await withFixture(async (directory, sqlFile) => {
    await writeFile(sqlFile, 'precious existing backup')
    await assert.rejects(buildImport(directory, sqlFile, contract), /EEXIST/)
    assert.equal(await readFile(sqlFile, 'utf8'), 'precious existing backup')
  })
})

function sourceCatalog() {
  const types = {
    SERIAL: 'int4',
    INTEGER: 'int4',
    INT: 'int4',
    BOOLEAN: 'bool',
    TIMESTAMP: 'timestamp',
    TIMESTAMPTZ: 'timestamptz',
    DATE: 'date',
    TEXT: 'text',
    'TEXT[]': '_text',
    JSONB: 'jsonb',
    'DECIMAL(3,2)': 'numeric',
    'VARCHAR(100)': 'varchar',
    'VARCHAR(255)': 'varchar'
  }
  const columns = [],
    constraints = [],
    indexes = []
  for (const table of contract.mapping.tables) {
    for (const column of table.columns) {
      let defaultValue = column.serial
        ? `nextval('public.${table.name}_id_seq'::regclass)`
        : (column.sourceDefaultSql ?? null)
      if (defaultValue === 'NOW()' || defaultValue === 'CURRENT_TIMESTAMP') defaultValue = 'now()'
      if (defaultValue !== null && column.kind === 'json') {
        const parsed = JSON.parse(defaultValue.slice(1, -1))
        // PostgreSQL canonical JSONB output need not retain source key order.
        defaultValue = `'${JSON.stringify(Array.isArray(parsed) ? parsed : Object.fromEntries(Object.entries(parsed).reverse()))}'::jsonb`
      }
      columns.push({
        table_name: table.name,
        column_name: column.name,
        udt_name: types[column.sourceType],
        is_nullable: column.nullable ? 'YES' : 'NO',
        numeric_precision: column.kind === 'decimal' ? 3 : null,
        numeric_scale: column.kind === 'decimal' ? 2 : null,
        character_maximum_length: column.sourceType.startsWith('VARCHAR')
          ? Number(column.sourceType.match(/\d+/)[0])
          : null,
        column_default: defaultValue,
        is_identity: 'NO',
        is_generated: 'NEVER'
      })
      if (column.reference)
        constraints.push({
          table_name: table.name,
          type: 'f',
          columns: [column.name],
          reference_table: column.reference.table,
          reference_columns: [column.reference.column],
          delete_action: { CASCADE: 'c', 'SET NULL': 'n', 'NO ACTION': 'a' }[
            column.reference.onDelete
          ],
          update_action: 'a',
          deferrable: false
        })
    }
    constraints.push({
      table_name: table.name,
      type: 'p',
      columns: table.columns.filter(column => column.primary).map(column => column.name)
    })
    for (const cols of [
      ...table.unique,
      ...table.columns.filter(column => column.unique).map(column => [column.name])
    ])
      constraints.push({ table_name: table.name, type: 'u', columns: cols })
    for (const c of constraints.filter(
      item => item.table_name === table.name && ['p', 'u'].includes(item.type)
    ))
      indexes.push({
        tablename: table.name,
        indexname: `${table.name}_${c.columns.join('_')}`,
        indexdef: `CREATE UNIQUE INDEX example ON public.${table.name} USING btree (${c.columns.join(', ')})`
      })
  }
  for (const index of contract.mapping.indexes.filter(index => index.unique))
    indexes.push({
      tablename: index.table,
      indexname: index.name,
      indexdef: `CREATE UNIQUE INDEX ${index.name} ON public.${index.table} USING btree (${index.columns})`
    })
  return { columns, constraints, indexes, external: [] }
}

function mockCatalogClient(catalog) {
  return {
    query: async sql => ({
      rows: sql.includes('information_schema.columns')
        ? catalog.columns
        : sql.includes('pg_constraint')
          ? catalog.constraints
          : sql.includes('pg_indexes')
            ? catalog.indexes
            : catalog.external
    })
  }
}

test('source catalog audit accepts exact schema including canonical JSONB/default spellings', async () => {
  const result = await auditSource(mockCatalogClient(sourceCatalog()), contract.mapping)
  assert.deepEqual(result.issues, [])
})

test('source catalog drift fails on extra fields, changed defaults, FK actions and missing unique indexes', async () => {
  const catalog = sourceCatalog()
  catalog.columns.push({ table_name: 'users', column_name: 'unmapped_paid_entitlement' })
  catalog.columns.find(
    item => item.table_name === 'users' && item.column_name === 'email_verified'
  ).column_default = 'true'
  catalog.constraints.find(
    item => item.table_name === 'stories' && item.type === 'f' && item.columns[0] === 'user_id'
  ).delete_action = 'n'
  catalog.indexes = catalog.indexes.filter(
    item => item.indexname !== 'idx_payments_stripe_session_unique'
  )
  const result = await auditSource(mockCatalogClient(catalog), contract.mapping)
  assert(
    result.issues.some(issue => issue.includes('Unmapped column users.unmapped_paid_entitlement'))
  )
  assert(result.issues.some(issue => issue.includes('Default differs: users.email_verified')))
  assert(result.issues.some(issue => issue.includes('constraint on stories')))
  assert(result.issues.some(issue => issue.includes('Missing mapped unique index')))
})

test('external job schema is inventoried rather than represented as converted application data', async () => {
  const catalog = sourceCatalog()
  catalog.external = [{ table_schema: 'pgboss', table_name: 'job' }]
  const result = await auditSource(mockCatalogClient(catalog), contract.mapping)
  assert.deepEqual(result.externalTables, catalog.external)
  assert.deepEqual(result.issues, [])
})

test('large memoir content round-trips with bound values, exact hashes, FK and sequences', async () => {
  await withFixture(
    async (directory, sqlFile) => {
      await assert.rejects(buildImport(directory, sqlFile, contract), /100KB SQL statement limit/)
      const artifactDirectory = path.join(directory, 'bound-artifact')
      const artifact = await buildBoundArtifact(directory, artifactDirectory, contract)
      assert.equal(artifact.operationCount, 48)
      const result = await verifyBoundArtifact(artifactDirectory, contract)
      assert.deepEqual(result, {
        tables: 48,
        rows: 48,
        contentHashes: 'ok',
        foreignKeys: 'ok',
        integrity: 'ok',
        sequences: 'ok',
        infrastructurePreserved: true
      })
      const operations = (await readFile(path.join(artifactDirectory, 'operations.ndjson'), 'utf8'))
        .trim()
        .split('\n')
        .map(JSON.parse)
      const story = operations.find(operation => operation.table === 'stories')
      assert(Buffer.byteLength(story.sql) < 100000)
      const answer =
        story.params[
          contract.mapping.tables
            .find(table => table.name === 'stories')
            .columns.findIndex(column => column.name === 'answer')
        ]
      assert.equal(answer, "Long memoir ' café 😀\n".repeat(10000))
      assert(Buffer.byteLength(answer) > 100000)
      await assert.rejects(buildBoundArtifact(directory, artifactDirectory, contract), /EEXIST/)
    },
    (table, row) => {
      if (table.name === 'stories')
        row[table.columns.findIndex(column => column.name === 'answer')] =
          "Long memoir ' café 😀\n".repeat(10000)
    }
  )
})

test('bound artifact rejects tampered values and unreviewed SQL before commit', async () => {
  await withFixture(async directory => {
    const artifactDirectory = path.join(directory, 'bound-artifact')
    await buildBoundArtifact(directory, artifactDirectory, contract)
    const filename = path.join(artifactDirectory, 'operations.ndjson')
    const original = await readFile(filename, 'utf8')
    await writeFile(filename, original.replace('café', 'tampered'))
    await assert.rejects(verifyBoundArtifact(artifactDirectory, contract), /hash\/count differs/)
    const operations = original.trim().split('\n').map(JSON.parse)
    operations[0].sql = 'DELETE FROM users'
    await writeFile(
      filename,
      operations.map(operation => JSON.stringify(operation) + '\n').join('')
    )
    await assert.rejects(verifyBoundArtifact(artifactDirectory, contract), /Unreviewed bound SQL/)
  })
})

test('bound artifact refuses D1 string and combined row size limits without completion marker', async () => {
  await withFixture(
    async directory => {
      const artifactDirectory = path.join(directory, 'too-large')
      await assert.rejects(
        buildBoundArtifact(directory, artifactDirectory, contract),
        /2MB string limit/
      )
      await assert.rejects(readFile(path.join(artifactDirectory, 'manifest.json')), /ENOENT/)
    },
    (table, row) => {
      if (table.name === 'stories')
        row[table.columns.findIndex(column => column.name === 'answer')] = 'x'.repeat(2000001)
    }
  )
  await withFixture(
    async directory => {
      const artifactDirectory = path.join(directory, 'too-large-row')
      await assert.rejects(
        buildBoundArtifact(directory, artifactDirectory, contract),
        /2MB row limit/
      )
      await assert.rejects(readFile(path.join(artifactDirectory, 'manifest.json')), /ENOENT/)
    },
    (table, row) => {
      if (table.name === 'stories') {
        row[table.columns.findIndex(column => column.name === 'answer')] = 'x'.repeat(1100000)
        row[table.columns.findIndex(column => column.name === 'original_answer')] = 'y'.repeat(
          1100000
        )
      }
    }
  )
})

test('bound artifact rejects incomplete metadata and preserves FK failures as failures', async () => {
  await withFixture(
    async directory => {
      const artifactDirectory = path.join(directory, 'orphan-artifact')
      await buildBoundArtifact(directory, artifactDirectory, contract)
      await assert.rejects(verifyBoundArtifact(artifactDirectory, contract), /foreign keys failed/)
      await writeFile(path.join(artifactDirectory, 'manifest.json'), '{}')
      await assert.rejects(
        verifyBoundArtifact(artifactDirectory, contract),
        /Invalid\/incomplete bound artifact/
      )
    },
    (table, row) => {
      if (table.name === 'stories')
        row[table.columns.findIndex(column => column.name === 'user_id')] = 999
    }
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { digest } from './compile-schema.mjs'
import { loadContract } from '../../tools/scripts/cloudflare-data.mjs'
import { buildBoundArtifact } from '../../tools/scripts/cloudflare-bound-data.mjs'
import {
  createD1Transport,
  importRemoteArtifact,
  validateTargetConfig
} from '../../tools/scripts/cloudflare-remote-data.mjs'
import {
  initializeEmptySchema,
  validateInitializationConfig
} from '../../tools/scripts/cloudflare-init-staging.mjs'

const contract = await loadContract()
const target = {
  formatVersion: 1,
  environment: 'staging',
  accountId: '1234567890abcdef1234567890abcdef',
  databaseId: '12345678-1234-1234-1234-123456789abc',
  databaseName: 'easy-memoir-import-staging-test',
  contractHash: contract.contractHash,
  exclusiveAccess: true
}

function value(column) {
  if (column.name === 'deleted_at') return null
  if (column.name === 'quantity') return 10
  if (column.name === 'page_count') return 32
  if (column.name === 'colour_pages') return 0
  if (column.name === 'status' && column.checks?.length) return 'proof'
  if (column.kind === 'uuid') return target.databaseId
  if (column.kind === 'integer' || column.kind === 'boolean') return 1
  if (column.kind === 'json') return '{"exact": 900719925474099312345, "nested": [true, null]}'
  if (column.kind === 'text-array') return JSON.stringify(['warm', 'quote"', null])
  if (column.kind === 'timestamp') return '2026-10-09 12:34:56.123456'
  if (column.kind === 'instant') return '2026-10-09 12:34:56.123456+00'
  if (column.kind === 'date') return '2026-10-09'
  if (column.kind === 'decimal') return '1.25'
  return "Memory café 🪶 '; ? with quote\nand a newline"
}

async function fixture({ users = 1, large = false } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'memoir-remote-data-test-'))
  const snapshot = path.join(directory, 'snapshot')
  const artifactDirectory = path.join(directory, 'artifact')
  await mkdir(snapshot)
  const manifest = {
    formatVersion: 1,
    contractHash: contract.contractHash,
    externalDataPreserved: false,
    tables: []
  }
  for (const table of contract.mapping.tables) {
    const rows = []
    for (let id = 1; id <= (table.name === 'users' ? users : 1); id++) {
      const row = table.columns.map(value)
      if (table.name === 'users') {
        row[table.columns.findIndex(column => column.name === 'id')] = id
        row[table.columns.findIndex(column => column.name === 'email')] = `user${id}@example.test`
        row[table.columns.findIndex(column => column.name === 'google_id')] = `google-${id}`
      }
      if (table.name === 'stories' && large)
        row[table.columns.findIndex(column => column.name === 'answer')] =
          'large café ; ? \n'.repeat(15000)
      rows.push(row)
    }
    const bytes = rows.map(row => JSON.stringify(row) + '\n').join('')
    await writeFile(path.join(snapshot, `${table.name}.ndjson`), bytes)
    manifest.tables.push({
      name: table.name,
      count: rows.length,
      sha256: digest(bytes),
      sequence: table.columns.some(column => column.serial) ? 100 : null
    })
  }
  await writeFile(path.join(snapshot, 'manifest.json'), JSON.stringify(manifest))
  await buildBoundArtifact(snapshot, artifactDirectory, contract)
  const config = {
    ...target,
    artifactManifestSha256: digest(
      await readFile(path.join(artifactDirectory, 'manifest.json'), 'utf8')
    )
  }
  const receiptFile = path.join(directory, 'receipt.ndjson')
  return { directory, artifactDirectory, config, receiptFile, contract }
}

function sqliteTransport(config, hook = {}) {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  const calls = []
  return {
    db,
    calls,
    metadata: async () => {
      calls.push({ metadata: true })
      return hook.metadata || { uuid: config.databaseId, name: config.databaseName }
    },
    batch: async statements => {
      calls.push({ statements })
      await hook.before?.(statements, db)
      db.exec('BEGIN')
      try {
        const results = statements.map(query => ({
          success: true,
          results: db
            .prepare(query.sql)
            .all(...query.params)
            .map(row => ({ ...row }))
        }))
        db.exec('COMMIT')
        await hook.after?.(statements, db, results)
        return results
      } catch (error) {
        try {
          db.exec('ROLLBACK')
        } catch {
          /* An after hook may simulate lost acknowledgement. */
        }
        throw error
      }
    }
  }
}

async function withFixture(options, callback) {
  const files = await fixture(options)
  try {
    await callback(files)
  } finally {
    await rm(files.directory, { recursive: true, force: true })
  }
}

const states = async files =>
  (await readFile(files.receiptFile, 'utf8'))
    .trim()
    .split('\n')
    .map(line => JSON.parse(line))

test('full reviewed 56-table import verifies pagination, exact large content, types and sequence high-water marks', async () => {
  await withFixture({ users: 205, large: true }, async files => {
    const transport = sqliteTransport(files.config)
    try {
      const result = await importRemoteArtifact({ ...files, transport })
      assert.equal(result.state, 'complete')
      assert.deepEqual(result.verification, {
        tables: contract.mapping.tables.length,
        rows: contract.mapping.tables.length + 204,
        schema: 'ok',
        counts: 'ok',
        contentHashes: 'ok',
        sequences: 'ok',
        foreignKeys: 'ok',
        quickCheck: 'ok',
        infrastructurePreserved: false
      })
      assert.equal(
        transport.db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').get('users').seq,
        205
      )
      assert.equal(
        transport.db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').get('stories').seq,
        100
      )
      assert.equal(
        transport.db.prepare('SELECT state FROM __easy_memoir_import').get().state,
        'complete'
      )
      assert(
        transport.calls.some(call =>
          call.statements?.some(query => query.sql.includes('FROM "users" WHERE ("id") > (100)'))
        )
      )
      const writes = transport.calls
        .flatMap(call => call.statements || [])
        .filter(query => query.sql.startsWith('INSERT INTO "stories"'))
      assert(writes[0].params.some(param => Buffer.byteLength(param) > 100_000))
      assert(Buffer.byteLength(writes[0].sql) < 100_000)
      const allSQL = transport.calls
        .flatMap(call => call.statements || [])
        .map(query => query.sql)
        .join('\n')
      assert.doesNotMatch(
        allSQL,
        /INSERT OR IGNORE|INSERT OR REPLACE|DROP TABLE|DELETE FROM|foreign_keys\s*=\s*OFF/i
      )
      assert.equal((await states(files)).at(-1).state, 'complete')
      assert.equal((await stat(files.receiptFile)).mode & 0o777, 0o600)
    } finally {
      transport.db.close()
    }
  })
})

test('whole-artifact validation rejects late tampering before metadata reads or remote writes', async () => {
  await withFixture({}, async files => {
    const filename = path.join(files.artifactDirectory, 'operations.ndjson')
    const operations = (await readFile(filename, 'utf8')).trim().split('\n')
    const final = JSON.parse(operations.at(-1))
    final.sql = 'DELETE FROM users'
    operations[operations.length - 1] = JSON.stringify(final)
    await writeFile(filename, operations.join('\n') + '\n')
    const transport = sqliteTransport(files.config)
    try {
      await assert.rejects(
        importRemoteArtifact({ ...files, transport }),
        /ARTIFACT_PREFLIGHT_FAILED/
      )
      assert.equal(transport.calls.length, 0)
      await assert.rejects(readFile(files.receiptFile), /ENOENT/)
    } finally {
      transport.db.close()
    }
  })
})

test('target config requires explicit staging account, non-sentinel ID, name, fingerprints and exclusive access', () => {
  const valid = { ...target, artifactManifestSha256: 'a'.repeat(64) }
  assert.deepEqual(validateTargetConfig(valid, contract), valid)
  for (const override of [
    { environment: 'production' },
    { exclusiveAccess: false },
    { accountId: '../other' },
    { databaseId: '00000000-0000-0000-0000-000000000001' },
    { databaseName: 'easy-memoir-production-staging' },
    { databaseName: 'easy-memoir' },
    { artifactManifestSha256: '' },
    { contractHash: 'b'.repeat(64) },
    { token: 'must-not-be-in-config' }
  ])
    assert.throws(() => validateTargetConfig({ ...valid, ...override }, contract), /INVALID_/)
})

test('fingerprint mismatch and existing receipt refuse before all network activity', async () => {
  await withFixture({}, async files => {
    const transport = sqliteTransport(files.config)
    try {
      await assert.rejects(
        importRemoteArtifact({
          ...files,
          transport,
          config: { ...files.config, artifactManifestSha256: 'a'.repeat(64) }
        }),
        /ARTIFACT_MANIFEST_FINGERPRINT_DIFFERS/
      )
      await writeFile(files.receiptFile, 'preserved receipt')
      await assert.rejects(importRemoteArtifact({ ...files, transport }), /REMOTE_IMPORT_FAILED/)
      assert.equal(transport.calls.length, 0)
      assert.equal(await readFile(files.receiptFile, 'utf8'), 'preserved receipt')
    } finally {
      transport.db.close()
    }
  })
})

test('wrong remote identity and non-empty databases cause no remote mutations', async () => {
  for (const existing of [false, true])
    await withFixture({}, async files => {
      const transport = sqliteTransport(
        files.config,
        existing ? {} : { metadata: { uuid: files.config.databaseId, name: 'wrong-staging' } }
      )
      if (existing)
        transport.db.exec(
          "CREATE TABLE precious (value TEXT); INSERT INTO precious VALUES ('preserved')"
        )
      try {
        await assert.rejects(
          importRemoteArtifact({ ...files, transport }),
          existing ? /REMOTE_DATABASE_NOT_EMPTY/ : /REMOTE_TARGET_IDENTITY_DIFFERS/
        )
        assert(
          !transport.calls.some(call =>
            call.statements?.some(query => /^(CREATE|INSERT|UPDATE)/.test(query.sql))
          )
        )
        if (existing)
          assert.equal(transport.db.prepare('SELECT value FROM precious').get().value, 'preserved')
        assert.equal((await states(files)).at(-1).remoteState, 'unchanged')
      } finally {
        transport.db.close()
      }
    })
})

test('emptiness is checked again inside the atomic ledger-creation batch', async () => {
  await withFixture({}, async files => {
    const transport = sqliteTransport(files.config, {
      before: async (batch, db) => {
        if (batch[0].sql.startsWith('CREATE TABLE "__easy_memoir_import"'))
          db.exec('CREATE TABLE raced (id INTEGER)')
      }
    })
    try {
      await assert.rejects(importRemoteArtifact({ ...files, transport }), /REMOTE_IMPORT_FAILED/)
      assert.equal(
        transport.db
          .prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = '__easy_memoir_import'")
          .get().n,
        0
      )
      assert.equal(
        transport.db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = 'raced'").get()
          .n,
        1
      )
      assert.equal((await states(files)).at(-1).remoteState, 'unknown-incomplete')
    } finally {
      transport.db.close()
    }
  })
})

test('failed write batches roll back and remain incomplete; uncertain acknowledgement is never retried', async () => {
  for (const uncertain of [false, true])
    await withFixture({}, async files => {
      let failed = false,
        matched = 0
      const transport = sqliteTransport(files.config, {
        before: async batch => {
          if (!uncertain && batch.some(query => query.sql.startsWith('INSERT INTO "photos"'))) {
            matched++
            if (!failed) {
              failed = true
              batch.push(batch[0])
            }
          }
        },
        after: async batch => {
          if (uncertain && batch[0].sql.startsWith('CREATE TABLE "__easy_memoir_import"')) {
            matched++
            throw new Error('provider response with synthetic-sensitive-text')
          }
        }
      })
      try {
        await assert.rejects(importRemoteArtifact({ ...files, transport }), /REMOTE_IMPORT_FAILED/)
        assert.equal(matched, 1)
        assert.equal(
          transport.db.prepare('SELECT state FROM __easy_memoir_import').get().state,
          'incomplete'
        )
        if (!uncertain)
          assert.equal(transport.db.prepare('SELECT count(*) AS n FROM photos').get().n, 0)
        const events = await states(files)
        assert.equal(events.at(-1).state, 'incomplete')
        assert.equal(events.at(-1).remoteState, 'incomplete')
        assert.doesNotMatch(JSON.stringify(events), /synthetic-sensitive-text/)
        await assert.rejects(
          importRemoteArtifact({ ...files, receiptFile: files.receiptFile + '.retry', transport }),
          /REMOTE_DATABASE_NOT_EMPTY/
        )
      } finally {
        transport.db.close()
      }
    })
})

test('schema, counts, content, sequences, foreign keys and integrity must all pass remotely', async () => {
  const cases = [
    ['schema', 'REMOTE_SCHEMA_DIFFERS'],
    ['counts', 'REMOTE_COUNT_DIFFERS'],
    ['content', 'REMOTE_CONTENT_DIFFERS'],
    ['sequences', 'REMOTE_SEQUENCES_DIFFER'],
    ['foreign', 'REMOTE_FOREIGN_KEYS_FAILED'],
    ['integrity', 'REMOTE_INTEGRITY_FAILED']
  ]
  for (const [kind, code] of cases)
    await withFixture({}, async files => {
      let tampered = false
      const transport = sqliteTransport(files.config, {
        after: async (batch, db, results) => {
          const sql = batch[0].sql
          if (
            kind === 'schema' &&
            sql.startsWith('SELECT type') &&
            db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = 'stories'").get().n
          ) {
            results[0].results = results[0].results.filter(row => row.name !== 'stories')
            tampered = true
          } else if (!tampered && kind === 'counts' && sql.startsWith('SELECT COUNT(*) AS count')) {
            results[0].results[0].count++
            tampered = true
          } else if (
            !tampered &&
            kind === 'content' &&
            sql.startsWith('SELECT COUNT(*) AS count')
          ) {
            db.exec("UPDATE users SET name = 'changed after import'")
            tampered = true
          } else if (kind === 'sequences' && sql.startsWith('SELECT name, seq')) {
            results[0].results[0].seq++
            tampered = true
          } else if (kind === 'foreign' && sql === 'PRAGMA foreign_key_check') {
            results[0].results = [{ table: 'stories', rowid: 1, parent: 'users', fkid: 0 }]
            tampered = true
          } else if (kind === 'integrity' && sql === 'PRAGMA quick_check') {
            results[0].results = [{ quick_check: 'synthetic failure' }]
            tampered = true
          }
        }
      })
      try {
        await assert.rejects(importRemoteArtifact({ ...files, transport }), new RegExp(code))
        assert(tampered, kind)
        assert.equal(
          transport.db.prepare('SELECT state FROM __easy_memoir_import').get().state,
          'incomplete'
        )
        assert.equal((await states(files)).at(-1).state, 'incomplete')
      } finally {
        transport.db.close()
      }
    })
})

test('REST transport uses only official origin, protected headers/string parameters, and redacts failures without retries', async () => {
  const config = { ...target, artifactManifestSha256: 'a'.repeat(64) }
  let calls = 0
  const transport = createD1Transport(config, {
    apiToken: 'synthetic-test-only-d1-token',
    fetcher: async (url, init) => {
      calls++
      assert.equal(new URL(url).origin, 'https://api.cloudflare.com')
      assert.equal(init.headers.Authorization, 'Bearer synthetic-test-only-d1-token')
      assert.equal(init.redirect, 'error')
      assert.deepEqual(JSON.parse(init.body), { batch: [{ sql: 'SELECT ?', params: ['bound'] }] })
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{ message: 'do-not-echo-provider-private-data' }]
        }),
        { status: 200 }
      )
    }
  })
  await assert.rejects(
    transport.batch([{ sql: 'SELECT ?', params: ['bound'] }]),
    /D1_API_REQUEST_FAILED/
  )
  assert.equal(calls, 1)
  assert.throws(() => createD1Transport(config, { apiToken: '' }), /TOKEN_REQUIRED/)
})

test('actual local workerd/D1 executes REST-shaped atomic batches and verifies content above 100KB', async () => {
  await withFixture({ large: true }, async files => {
    const runtime = new Miniflare(
      convertV4MiniflareOptions({
        name: 'remote-import-test',
        modules: true,
        script: 'export default { fetch() { return new Response("test only") } }',
        compatibilityDate: '2026-10-09',
        d1Databases: { DB: files.config.databaseId }
      })
    )
    try {
      const db = await runtime.getD1Database('DB')
      const transport = createD1Transport(files.config, {
        apiToken: 'synthetic-test-only-d1-token',
        fetcher: async (_url, init) => {
          if (init.method === 'GET')
            return Response.json({
              success: true,
              result: { uuid: files.config.databaseId, name: files.config.databaseName }
            })
          const { batch } = JSON.parse(init.body)
          assert(batch.every(query => query.params.every(param => typeof param === 'string')))
          return Response.json({
            success: true,
            result: await db.batch(batch.map(query => db.prepare(query.sql).bind(...query.params)))
          })
        }
      })
      const result = await importRemoteArtifact({ ...files, transport })
      assert.equal(result.state, 'complete')
      assert.equal(result.verification.contentHashes, 'ok')
      assert((await db.prepare('SELECT answer FROM stories').first()).answer.length > 100_000)
      assert.equal(
        (await db.prepare('SELECT state FROM __easy_memoir_import').first()).state,
        'complete'
      )
      // Confirm the local engine also rolls back the whole D1 batch on error.
      await assert.rejects(
        db.batch([
          db.prepare("UPDATE users SET name = 'must roll back' WHERE id = 1"),
          db.prepare('INSERT INTO users (id, email) VALUES (1, ?)').bind('duplicate@example.test')
        ])
      )
      assert.notEqual(
        (await db.prepare('SELECT name FROM users WHERE id = 1').first()).name,
        'must roll back'
      )
    } finally {
      await runtime.dispose()
    }
  })
})

test('fresh-empty initializer creates and verifies the reviewed schema without a source snapshot', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'memoir-d1-empty-test-'))
  const config = { ...target }
  const receiptFile = path.join(directory, 'new-receipt.ndjson')
  const transport = sqliteTransport(config)
  try {
    const result = await initializeEmptySchema({ config, receiptFile, transport, contract })
    assert.equal(result.operation, 'fresh-empty-schema-initialization')
    assert.equal(result.state, 'complete')
    assert.equal(result.verification.tables, 56)
    assert.equal(result.verification.rows, 0)
    assert.equal(result.verification.contentHashes, 'ok')
    assert.equal(result.verification.quickCheck, 'ok')
    assert(!Object.hasOwn(result.verification, 'infrastructurePreserved'))
    for (const table of contract.mapping.tables)
      assert.equal(transport.db.prepare(`SELECT COUNT(*) AS n FROM "${table.name}"`).get().n, 0)
    assert(
      transport.db
        .prepare('SELECT seq FROM sqlite_sequence')
        .all()
        .every(row => row.seq === 0)
    )
    await assert.rejects(
      initializeEmptySchema({ config, receiptFile: receiptFile + '.again', transport, contract }),
      /REMOTE_DATABASE_NOT_EMPTY/
    )
    assert.throws(
      () =>
        validateInitializationConfig(
          { ...config, artifactManifestSha256: 'a'.repeat(64) },
          contract
        ),
      /INVALID_EMPTY_INITIALIZATION_CONFIG/
    )
    assert.throws(
      () => validateInitializationConfig({ ...config, environment: 'production' }, contract),
      /INVALID_STAGING_TARGET_OR_CONTRACT/
    )
  } finally {
    transport.db.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('documented exact D1 _cf_KV internal table is allowed, but names/definitions alone cannot bypass emptiness', async () => {
  for (const ddl of [
    'CREATE TABLE _cf_KV (\n key TEXT PRIMARY KEY,\n value BLOB\n ) WITHOUT ROWID',
    'CREATE TABLE _cf_KV (key TEXT PRIMARY KEY, customer_data TEXT) WITHOUT ROWID',
    'CREATE TABLE _cf_customer (key TEXT PRIMARY KEY, value BLOB) WITHOUT ROWID'
  ]) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'memoir-d1-internal-test-'))
    const config = { ...target },
      receiptFile = path.join(directory, 'receipt.ndjson')
    const transport = sqliteTransport(config)
    transport.db.exec(ddl)
    try {
      if (ddl.includes('value BLOB\n')) {
        const result = await initializeEmptySchema({ config, receiptFile, transport, contract })
        assert.equal(result.state, 'complete')
        assert.equal(
          transport.db
            .prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = '_cf_KV'")
            .get().n,
          1
        )
      } else {
        await assert.rejects(
          initializeEmptySchema({ config, receiptFile, transport, contract }),
          /REMOTE_DATABASE_NOT_EMPTY/
        )
        assert(
          !transport.calls.some(call =>
            call.statements?.some(query =>
              query.sql.startsWith('CREATE TABLE "__easy_memoir_import"')
            )
          )
        )
      }
    } finally {
      transport.db.close()
      await rm(directory, { recursive: true, force: true })
    }
  }
})

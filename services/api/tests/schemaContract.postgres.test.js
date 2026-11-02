import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import pg from 'pg'
import { randomBytes } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { loadContract, auditSource } from '../../../tools/scripts/cloudflare-data.mjs'

const connection = process.env.TEST_DATABASE_URL
const suite = connection ? describe : describe.skip
suite('PostgreSQL source matches the complete D1 transfer contract', () => {
  const name = `memoir_contract_${randomBytes(8).toString('hex')}`
  let admin, client, mapping
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: connection })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${name}"`)
    const destination = new URL(connection)
    destination.pathname = `/${name}`
    client = new pg.Client({ connectionString: destination.toString() })
    await client.connect()
    const directory = new URL('../db/migrations/', import.meta.url)
    for (const file of (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()) {
      await client.query(await readFile(new URL(file, directory), 'utf8'))
    }
    mapping = (await loadContract()).mapping
  }, 30000)
  afterAll(async () => {
    await client?.end()
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${name}"`)
      await admin.end()
    }
  })
  it('accepts actual PostgreSQL types, array metadata, defaults, keys and print checks', async () => {
    expect((await auditSource(client, mapping)).issues).toEqual([])
  })
  it('rejects changed print constraints even when columns and row counts are unchanged', async () => {
    await client.query(
      'ALTER TABLE print_entitlements DROP CONSTRAINT print_entitlements_quantity_check'
    )
    await client.query(
      'ALTER TABLE print_entitlements ADD CONSTRAINT print_entitlements_quantity_check CHECK(quantity=9)'
    )
    const audit = await auditSource(client, mapping)
    expect(
      audit.issues.some(
        issue => issue.includes('print_entitlements') && issue.includes('constraint')
      )
    ).toBe(true)
  })
})

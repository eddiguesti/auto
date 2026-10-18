import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fs/promises', () => ({
  readdir: vi.fn(async () => ['001_test.sql']),
  readFile: vi.fn(async () => 'CREATE TABLE example (id integer)')
}))
vi.mock('../db/seeds/collections.js', () => ({ seedCollections: vi.fn(async () => {}) }))
vi.mock('../db/seeds/prompts.js', () => ({ seedPrompts: vi.fn(async () => {}) }))
import { runMigrations } from '../db/runner.js'

let client
let pool
beforeEach(() => {
  client = { query: vi.fn(async () => ({ rows: [] })), release: vi.fn() }
  pool = { connect: vi.fn(async () => client) }
})

describe('serialized migration startup', () => {
  it('holds one session lock through schema changes, commits and releases it before returning the connection', async () => {
    await runMigrations(pool)
    expect(pool.connect).toHaveBeenCalledOnce()
    const statements = client.query.mock.calls.map(call => call[0])
    expect(statements[0]).toContain('pg_advisory_lock(')
    expect(statements.indexOf('BEGIN')).toBeLessThan(statements.indexOf('COMMIT'))
    expect(statements.at(-1)).toContain('pg_advisory_unlock(')
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('rolls back a failing migration before unlocking and releasing the session', async () => {
    client.query.mockImplementation(async sql => {
      if (sql === 'CREATE TABLE example (id integer)') throw new Error('bad schema')
      return { rows: [] }
    })
    await expect(runMigrations(pool)).rejects.toThrow('001_test.sql failed')
    const statements = client.query.mock.calls.map(call => call[0])
    expect(statements).toContain('ROLLBACK')
    expect(statements).not.toContain('COMMIT')
    expect(statements.at(-1)).toContain('pg_advisory_unlock(')
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('releases the connection if acquiring the session lock fails', async () => {
    client.query.mockRejectedValueOnce(new Error('connection lost'))
    await expect(runMigrations(pool)).rejects.toThrow('connection lost')
    expect(client.query).toHaveBeenCalledOnce()
    expect(client.release).toHaveBeenCalledOnce()
  })
})

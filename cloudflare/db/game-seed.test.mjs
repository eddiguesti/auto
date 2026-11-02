import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { generateGameSeedSQL } from '../../tools/scripts/cloudflare-game-seed.mjs'
import { seedNativeGameCatalog } from '../api/game-catalog.js'

test('offline catalog SQL round-trips every quoted prompt, JSON criterion and achievement definition exactly', async () => {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'))
    database.exec(
      await readFile(new URL('../api/migrations/0001_story_outbox.sql', import.meta.url), 'utf8')
    )
    database.exec(
      await readFile(new URL('../api/migrations/0007_game.sql', import.meta.url), 'utf8')
    )
    database.exec(generateGameSeedSQL())
    const verified = await seedNativeGameCatalog({
      prepare: sql => ({
        all: async () => ({
          results: database
            .prepare(sql)
            .all()
            .map(row => ({ ...row }))
        })
      }),
      batch: () => assert.fail('Verification must not attempt another seed write')
    })
    assert.deepEqual(verified, {
      alreadySeeded: true,
      prompts: 108,
      collections: 8,
      items: 41,
      achievements: 33
    })
    assert.ok(Buffer.byteLength(generateGameSeedSQL()) < 100000)
    assert.equal(database.prepare('PRAGMA foreign_key_check').all().length, 0)
  } finally {
    database.close()
  }
})

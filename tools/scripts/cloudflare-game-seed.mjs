/** Offline native catalog generator. Never connects to or changes a database. */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildNativeGameSeedStatements } from '../../cloudflare/api/game-catalog.js'

function literal(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`
  if (Number.isSafeInteger(value)) return String(value)
  throw new TypeError('Catalog value must be exact text, integer or null')
}

export function generateGameSeedSQL() {
  const statements = buildNativeGameSeedStatements()
  const sql =
    statements
      .map(({ sql, params }) => {
        // The statements come only from the reviewed native static catalog. They
        // contain identifier/placeholder SQL, never quoted SQL or customer input.
        if (!/^INSERT INTO [a-z_]+ \([a-z_, ]+\) VALUES \([?, ]+\)$/.test(sql))
          throw new TypeError('Unexpected catalog SQL')
        let index = 0
        const rendered = sql.replaceAll('?', () => literal(params[index++]))
        if (index !== params.length) throw new TypeError('Catalog parameter count differs')
        return rendered + ';'
      })
      .join('\n') + '\n'
  if (Buffer.byteLength(sql) > 100000)
    throw new TypeError('Catalog exceeds the reviewed single-request SQL limit')
  return sql
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [output, ...extra] = process.argv.slice(2)
  if (!output || extra.length) throw new TypeError('Usage: cloudflare-game-seed.mjs NEW_OUTPUT_SQL')
  await writeFile(path.resolve(output), generateGameSeedSQL(), { flag: 'wx', mode: 0o600 })
  console.log('Generated the reviewed static catalog; no database was changed.')
}

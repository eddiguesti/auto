import { mkdtemp, mkdir, chmod, writeFile, readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { loadContract } from './cloudflare-data.mjs'
import { buildBoundArtifact } from './cloudflare-bound-data.mjs'
import { digest } from '../../cloudflare/db/compile-schema.mjs'
import {
  RemoteDataError,
  validateTargetConfig,
  createD1Transport,
  importRemoteArtifact
} from './cloudflare-remote-data.mjs'

export function validateInitializationConfig(config, contract) {
  if (!config || Object.hasOwn(config, 'artifactManifestSha256'))
    throw new RemoteDataError('INVALID_EMPTY_INITIALIZATION_CONFIG')
  // Initialization has no customer artifact. Reuse exactly the same strict
  // account/ID/name/exclusive-access/contract guards as the snapshot importer.
  validateTargetConfig({ ...config, artifactManifestSha256: '0'.repeat(64) }, contract)
  return Object.freeze({ ...config })
}

export async function initializeEmptySchema({ config, receiptFile, transport, contract }) {
  config = validateInitializationConfig(config, contract)
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'memoir-d1-empty-'))
  await chmod(temporary, 0o700)
  try {
    const snapshot = path.join(temporary, 'empty-snapshot')
    const artifact = path.join(temporary, 'empty-artifact')
    await mkdir(snapshot, { mode: 0o700 })
    const source = {
      formatVersion: 1,
      contractHash: contract.contractHash,
      origin: 'fresh-empty-schema-initialization',
      externalDataPreserved: false,
      tables: contract.mapping.tables.map(table => ({
        name: table.name,
        count: 0,
        sha256: digest(''),
        sequence: table.columns.some(column => column.serial) ? 0 : null
      }))
    }
    for (const table of contract.mapping.tables)
      await writeFile(path.join(snapshot, `${table.name}.ndjson`), '', { flag: 'wx', mode: 0o600 })
    await writeFile(path.join(snapshot, 'manifest.json'), JSON.stringify(source) + '\n', {
      flag: 'wx',
      mode: 0o600
    })
    await buildBoundArtifact(snapshot, artifact, contract)
    // A generated zero-row artifact deliberately shares the fully tested
    // remote lifecycle: empty-target race guard, atomic batches, incomplete
    // ledger, full remote verification, no deletion/reset/retry/resume.
    const result = await importRemoteArtifact({
      artifactDirectory: artifact,
      config: {
        ...config,
        artifactManifestSha256: digest(await readFile(path.join(artifact, 'manifest.json'), 'utf8'))
      },
      receiptFile,
      transport,
      contract
    })
    const { infrastructurePreserved: _notAMigration, ...verification } = result.verification
    return { ...result, operation: 'fresh-empty-schema-initialization', verification }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

async function main() {
  const [targetFile, receiptFile, ...extra] = process.argv.slice(2)
  if (!targetFile || !receiptFile || extra.length)
    throw new RemoteDataError('Usage: cloudflare-init-staging.mjs TARGET_JSON NEW_RECEIPT_NDJSON')
  const contract = await loadContract()
  const config = validateInitializationConfig(
    JSON.parse(await readFile(targetFile, 'utf8')),
    contract
  )
  console.log(
    JSON.stringify(
      await initializeEmptySchema({
        config,
        receiptFile: path.resolve(receiptFile),
        contract,
        transport: createD1Transport(config)
      }),
      null,
      2
    )
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => {
    console.error(
      error instanceof RemoteDataError ? error.code : 'EMPTY_SCHEMA_INITIALIZATION_FAILED'
    )
    process.exitCode = 1
  })

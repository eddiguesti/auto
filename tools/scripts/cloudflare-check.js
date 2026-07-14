#!/usr/bin/env node
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const configPath = join(root, 'services', 'cloudflare', 'wrangler.jsonc')
const config = await readFile(configPath, 'utf8')

const failures = []
if (config.includes('00000000000000000000000000000000')) {
  failures.push('Replace the placeholder Hyperdrive ID in services/cloudflare/wrangler.jsonc')
}
if (failures.length) {
  console.error('Cloudflare deployment is not ready:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Cloudflare deployment configuration is ready.')

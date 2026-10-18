/** Prepare the existing Vite build for Workers without the old Pages proxy. */
import { cp, mkdir, rm, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = resolve(root, 'apps/web/dist')
const destination = resolve(root, '.cloudflare/assets')

await access(resolve(source, 'index.html'))
// Fixed generated directory within the repository; never a user-supplied path.
await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })
// Workers handles SPA routing and forwards API requests through its binding.
// The Pages rule would send API traffic to the public domain, causing loops.
await rm(resolve(destination, '_redirects'), { force: true })
console.log('Cloudflare assets prepared in .cloudflare/assets')

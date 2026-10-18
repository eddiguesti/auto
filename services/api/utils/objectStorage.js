/**
 * Durable media boundary for the existing Node API and background worker.
 * Keys deliberately match the migration layout: photos at the bucket root,
 * voice samples under voices/, generated books under audiobooks/.
 * R2 errors must never be converted into successful writes on ephemeral disk.
 */
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as r2 from './r2.js'
import { ServiceUnavailableError } from './errors.js'
import { validateObjectKey } from './mediaKey.js'
export { validateObjectKey } from './mediaKey.js'

const uploadsDirectory = fileURLToPath(new URL('../../../uploads/', import.meta.url))

export function createObjectStorage({
  remote = r2,
  localDirectory = uploadsDirectory,
  allowLocal = () =>
    process.env.ALLOW_LOCAL_UPLOADS === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_UPLOADS !== 'false')
} = {}) {
  const localPath = key => join(localDirectory, ...validateObjectKey(key).split('/'))
  const available = () => {
    if (!remote.isR2Available() && !allowLocal()) {
      throw new ServiceUnavailableError('Durable media storage')
    }
  }

  return {
    async put(key, body, contentType) {
      validateObjectKey(key)
      available()
      if (remote.isR2Available()) {
        if (!(await remote.r2Upload(key, body, contentType))) {
          throw new ServiceUnavailableError('Durable media storage')
        }
        return
      }
      const path = localPath(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },

    async get(key) {
      validateObjectKey(key)
      available()
      if (remote.isR2Available()) {
        const object = await remote.r2Get(key)
        if (object || !allowLocal()) return object
      }
      try {
        const path = localPath(key)
        await stat(path)
        return { body: createReadStream(path), contentType: null }
      } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
    },

    async read(key) {
      const object = await this.get(key)
      if (!object) return null
      const chunks = []
      for await (const chunk of object.body) chunks.push(Buffer.from(chunk))
      return Buffer.concat(chunks)
    },

    async delete(key) {
      validateObjectKey(key)
      available()
      if (remote.isR2Available() && !(await remote.r2Delete(key))) {
        throw new ServiceUnavailableError('Durable media storage')
      }
      // Local cleanup is explicitly opt-in on production hosts during migration.
      if (allowLocal()) {
        try {
          await unlink(localPath(key))
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
    }
  }
}

export const objectStorage = createObjectStorage()

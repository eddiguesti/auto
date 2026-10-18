/**
 * Native R2 media adapter for the future API Worker. Authorization belongs to
 * repository-backed routes; this module deliberately exposes no public URLs.
 */
import { validateObjectKey } from '../services/api/utils/mediaKey.js'

export function createR2MediaStore(bucket) {
  if (!bucket?.put || !bucket?.get || !bucket?.delete) throw new Error('R2_MEDIA binding required')
  return {
    async put(key, body, contentType) {
      await bucket.put(validateObjectKey(key), body, { httpMetadata: { contentType } })
    },
    async get(key) {
      const object = await bucket.get(validateObjectKey(key))
      if (!object) return null
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType || 'application/octet-stream',
        size: object.size,
        etag: object.httpEtag
      }
    },
    async read(key) {
      const object = await bucket.get(validateObjectKey(key))
      return object ? new Uint8Array(await object.arrayBuffer()) : null
    },
    async delete(key) {
      await bucket.delete(validateObjectKey(key))
    }
  }
}

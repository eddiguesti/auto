import { describe, expect, it, vi } from 'vitest'
import { createR2MediaStore } from '../../../cloudflare/api-storage.js'

describe('native R2 binding adapter', () => {
  it('requires a complete R2 binding', () => {
    expect(() => createR2MediaStore()).toThrow('R2_MEDIA binding required')
  })

  it('preserves media keys, bytes and MIME metadata with the native binding', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const body = new ReadableStream()
    const bucket = {
      put: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(async () => ({
        body,
        httpMetadata: { contentType: 'audio/mpeg' },
        size: 3,
        httpEtag: '"etag"',
        arrayBuffer: async () => bytes.buffer
      }))
    }
    const storage = createR2MediaStore(bucket)
    await storage.put('audiobooks/book.mp3', bytes, 'audio/mpeg')
    expect(bucket.put).toHaveBeenCalledWith('audiobooks/book.mp3', bytes, {
      httpMetadata: { contentType: 'audio/mpeg' }
    })
    expect(await storage.get('audiobooks/book.mp3')).toEqual({
      body,
      contentType: 'audio/mpeg',
      size: 3,
      etag: '"etag"'
    })
    expect(await storage.read('audiobooks/book.mp3')).toEqual(bytes)
    await storage.delete('audiobooks/book.mp3')
    expect(bucket.delete).toHaveBeenCalledWith('audiobooks/book.mp3')
  })

  it('distinguishes missing objects from an R2 outage', async () => {
    const bucket = { put: vi.fn(), delete: vi.fn(), get: vi.fn(async () => null) }
    const storage = createR2MediaStore(bucket)
    expect(await storage.get('photo.jpg')).toBeNull()
    bucket.get.mockRejectedValue(new Error('R2 outage'))
    await expect(storage.get('photo.jpg')).rejects.toThrow('R2 outage')
  })

  it('rejects traversal before invoking the native binding', async () => {
    const bucket = { put: vi.fn(), delete: vi.fn(), get: vi.fn() }
    await expect(
      createR2MediaStore(bucket).put('voices/../secrets', new Uint8Array())
    ).rejects.toThrow('Invalid media object key')
    expect(bucket.put).not.toHaveBeenCalled()
  })
})

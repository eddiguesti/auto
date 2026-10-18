import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createObjectStorage, validateObjectKey } from '../utils/objectStorage.js'

const directories = []
afterEach(async () => {
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true })
})

async function localStorage(remote = { isR2Available: () => false }, allowLocal = () => true) {
  const directory = await mkdtemp(join(tmpdir(), 'easy-memoir-storage-'))
  directories.push(directory)
  return {
    directory,
    storage: createObjectStorage({ remote, localDirectory: directory, allowLocal })
  }
}

describe('durable media storage', () => {
  it('writes, streams and deletes voice media in an explicitly allowed local directory', async () => {
    const { storage } = await localStorage()
    await storage.put('voices/voice_1.wav', Buffer.from('audio'), 'audio/wav')
    expect(await storage.read('voices/voice_1.wav')).toEqual(Buffer.from('audio'))
    await storage.delete('voices/voice_1.wav')
    expect(await storage.get('voices/voice_1.wav')).toBeNull()
    await storage.delete('voices/voice_1.wav') // Idempotent cleanup.
  })

  it('fails closed when production has no durable storage', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_LOCAL_UPLOADS', '')
    const storage = createObjectStorage({ remote: { isR2Available: () => false } })
    await expect(
      storage.put('photo.jpg', Buffer.from('photo'), 'image/jpeg')
    ).rejects.toMatchObject({ statusCode: 503 })
    await expect(storage.get('photo.jpg')).rejects.toMatchObject({ statusCode: 503 })
    await expect(storage.delete('photo.jpg')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('does not write to disk after an R2 outage even when legacy disk reads are enabled', async () => {
    const remote = {
      isR2Available: () => true,
      r2Upload: vi.fn().mockRejectedValue(new Error('R2 unavailable'))
    }
    const { storage, directory } = await localStorage(remote)
    await expect(storage.put('photo.jpg', Buffer.from('photo'), 'image/jpeg')).rejects.toThrow(
      'R2 unavailable'
    )
    expect(await readdir(directory)).toEqual([])
  })

  it('rejects a remote write failure rather than returning upload success', async () => {
    const { storage, directory } = await localStorage({
      isR2Available: () => true,
      r2Upload: async () => false
    })
    await expect(
      storage.put('photo.jpg', Buffer.from('photo'), 'image/jpeg')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(await readdir(directory)).toEqual([])
  })

  it('reads migrated books from R2 under the existing audiobook key', async () => {
    const remote = {
      isR2Available: () => true,
      r2Get: vi.fn(async () => ({
        body: Readable.from([Buffer.from('book')]),
        contentType: 'audio/mpeg'
      }))
    }
    const { storage } = await localStorage(remote, () => false)
    expect(await storage.read('audiobooks/My_Life_Story_1.mp3')).toEqual(Buffer.from('book'))
    expect(remote.r2Get).toHaveBeenCalledWith('audiobooks/My_Life_Story_1.mp3')
  })

  it('allows explicit legacy disk reads only after a genuine missing R2 key', async () => {
    const remote = { isR2Available: () => false }
    const { storage } = await localStorage(remote)
    await storage.put('photo.jpg', Buffer.from('legacy'))
    remote.isR2Available = () => true
    remote.r2Get = async () => null
    expect(await storage.read('photo.jpg')).toEqual(Buffer.from('legacy'))
    remote.r2Get = async () => {
      throw new Error('R2 access denied')
    }
    await expect(storage.read('photo.jpg')).rejects.toThrow('R2 access denied')
  })

  it.each([
    '../secret',
    '/absolute',
    'voices//sample.wav',
    'voices/../sample.wav',
    'C:/secret',
    'voices\\sample.wav',
    '',
    'voices/%2e%2e/file'
  ])('rejects unsafe key %j', key => {
    expect(() => validateObjectKey(key)).toThrow('Invalid media object key')
  })
})

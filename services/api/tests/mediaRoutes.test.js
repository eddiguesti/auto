import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { Readable } from 'node:stream'
import { ServiceUnavailableError } from '../utils/errors.js'

const mocks = vi.hoisted(() => ({
  storage: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  photos: {
    verifyStoryOwnership: vi.fn(),
    create: vi.fn(),
    findByFilenameForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    deleteById: vi.fn()
  }
}))
vi.mock('../utils/objectStorage.js', () => ({ objectStorage: mocks.storage }))
vi.mock('../repositories/photoRepository.js', () => ({ photoRepository: mocks.photos }))
vi.mock('../utils/sentry.js', () => ({ captureException: vi.fn() }))
vi.mock('../middleware/auth.js', () => ({ authenticateToken: (_req, _res, next) => next() }))
import photosRouter from '../routes/photos.js'
import { errorHandler } from '../middleware/errorHandler.js'

let server
let base
beforeAll(async () => {
  const app = express()
  app.locals.db = {}
  app.use((req, _res, next) => {
    req.user = { id: 7 }
    next()
  })
  app.use('/photos', photosRouter)
  app.use(errorHandler)
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})
beforeEach(() => {
  vi.resetAllMocks()
  mocks.photos.verifyStoryOwnership.mockResolvedValue(true)
  mocks.photos.create.mockResolvedValue({ id: 3 })
})

function photoForm(bytes, contentType, filename = 'photo.jpg') {
  const form = new FormData()
  form.append('story_id', '9')
  form.append('photo', new Blob([bytes], { type: contentType }), filename)
  return form
}

describe('private photo routes and Multer uploads', () => {
  it('stores a verified upload with a MIME-derived extension while preserving its original name', async () => {
    const response = await fetch(`${base}/photos`, {
      method: 'POST',
      body: photoForm(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg', 'renamed.html')
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.filename).toMatch(/\.jpg$/)
    expect(mocks.storage.put).toHaveBeenCalledWith(body.filename, expect.any(Buffer), 'image/jpeg')
    expect(mocks.photos.create.mock.calls[0][1].originalName).toBe('renamed.html')
  })

  it('rejects RIFF audio mislabeled as a WebP photograph', async () => {
    const response = await fetch(`${base}/photos`, {
      method: 'POST',
      body: photoForm(Buffer.from('RIFF1234WAVE'), 'image/webp', 'photo.webp')
    })
    expect(response.status).toBe(400)
    expect(mocks.storage.put).not.toHaveBeenCalled()
  })

  it('rejects a Multer upload above the 10 MB limit before writing storage', async () => {
    const response = await fetch(`${base}/photos`, {
      method: 'POST',
      body: photoForm(Buffer.alloc(10 * 1024 * 1024 + 1), 'image/jpeg')
    })
    expect(response.status).toBe(413)
    expect(mocks.storage.put).not.toHaveBeenCalled()
  })

  it('checks story ownership before writing uploaded media', async () => {
    mocks.photos.verifyStoryOwnership.mockResolvedValue(false)
    const response = await fetch(`${base}/photos`, {
      method: 'POST',
      body: photoForm(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')
    })
    expect(response.status).toBe(403)
    expect(mocks.storage.put).not.toHaveBeenCalled()
  })

  it('checks photo ownership before accessing its storage key', async () => {
    mocks.photos.findByFilenameForUser.mockResolvedValue(null)
    const response = await fetch(`${base}/photos/file/photo.jpg`)
    expect(response.status).toBe(403)
    expect(mocks.storage.get).not.toHaveBeenCalled()
  })

  it('streams an owned R2 photo with private cache headers', async () => {
    mocks.photos.findByFilenameForUser.mockResolvedValue({ id: 3 })
    mocks.storage.get.mockResolvedValue({
      body: Readable.from([Buffer.from('photo')]),
      contentType: 'image/jpeg'
    })
    const response = await fetch(`${base}/photos/file/photo.jpg`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-type')).toMatch(/image\/jpeg/)
    expect(await response.text()).toBe('photo')
  })

  it('returns a storage outage as 503 rather than pretending the owned photo is missing', async () => {
    mocks.photos.findByFilenameForUser.mockResolvedValue({ id: 3 })
    mocks.storage.get.mockRejectedValue(new ServiceUnavailableError('Durable media storage'))
    expect((await fetch(`${base}/photos/file/photo.jpg`)).status).toBe(503)
  })

  it('keeps the ownership record when durable deletion fails', async () => {
    mocks.photos.findByIdForUser.mockResolvedValue({ filename: 'photo.jpg' })
    mocks.storage.delete.mockRejectedValue(new ServiceUnavailableError('Durable media storage'))
    const response = await fetch(`${base}/photos/3`, { method: 'DELETE' })
    expect(response.status).toBe(503)
    expect(mocks.photos.deleteById).not.toHaveBeenCalled()
  })
})

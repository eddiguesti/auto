import { r2Upload } from './r2.js'

const MAX_GENERATED_IMAGE_BYTES = 25 * 1024 * 1024

/** Copy an expiring provider image into durable R2 storage. */
export async function persistGeneratedImage(sourceUrl, key) {
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Generated image download failed with status ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/webp'
  if (!contentType.startsWith('image/')) {
    throw new Error(`Generated image returned an invalid content type: ${contentType}`)
  }

  const declaredSize = Number(response.headers.get('content-length') || 0)
  if (declaredSize > MAX_GENERATED_IMAGE_BYTES) {
    throw new Error('Generated image exceeds the 25MB storage limit')
  }

  const body = Buffer.from(await response.arrayBuffer())
  if (body.length === 0 || body.length > MAX_GENERATED_IMAGE_BYTES) {
    throw new Error('Generated image has an invalid size')
  }

  await r2Upload(key, body, contentType)
  return { key, contentType }
}

export function chapterImageKey(userId, chapterId) {
  return `chapter-images/${userId}/${chapterId}.webp`
}

export function chapterImagePath(chapterId) {
  return `/api/v1/chapter-images/file/${encodeURIComponent(chapterId)}`
}

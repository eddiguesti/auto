import { boundedProviderJson } from './print-provider.js'
import { ApiError } from './errors.js'

async function imageApi(env, path, body) {
  if (!env.GROK_API_KEY)
    throw new ApiError(503, {
      error: 'Chapter artwork is not configured',
      code: 'ARTWORK_UNAVAILABLE'
    })
  try {
    const provider = env.XAI_FETCH || { fetch }
    const response = await provider.fetch(`https://api.x.ai/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${env.GROK_API_KEY}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
      redirect: 'manual'
    })
    if (!response.ok) throw new Error('Image request failed')
    return await boundedProviderJson(response)
  } catch {
    throw new ApiError(502, {
      error: 'The artwork provider could not confirm this request.',
      code: 'ARTWORK_PROVIDER_FAILED'
    })
  }
}
export async function startNativeArtwork(env, prompt) {
  const result = await imageApi(env, '/images/generations', {
    model: env.GROK_IMAGE_MODEL || 'grok-imagine-image-2.0',
    prompt,
    n: 1,
    aspect_ratio: '16:9',
    resolution: '1k',
    quality: 'medium',
    deferred: true,
    response_format: 'url'
  })
  if (typeof result.request_id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(result.request_id))
    throw new ApiError(502, {
      error: 'The artwork provider did not confirm a request identifier.',
      code: 'ARTWORK_PROVIDER_FAILED'
    })
  return result.request_id
}
export async function pollNativeArtwork(env, requestId) {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(requestId))
    throw new ApiError(502, {
      error: 'Invalid artwork request identifier',
      code: 'ARTWORK_PROVIDER_FAILED'
    })
  return imageApi(env, `/images/${encodeURIComponent(requestId)}`)
}
export async function downloadNativeArtwork(env, url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    /* rejected below */
  }
  // The documented ephemeral Imagine host is the sole download origin. No
  // provider credentials, account tokens or redirects cross this boundary.
  if (
    !parsed ||
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'imgen.x.ai' ||
    parsed.username ||
    parsed.password ||
    parsed.port
  )
    throw new ApiError(502, {
      error: 'Invalid artwork download location',
      code: 'INVALID_ARTWORK_OUTPUT'
    })
  const provider = env.XAI_FETCH || { fetch }
  const response = await provider.fetch(parsed.href, {
    signal: AbortSignal.timeout(30000),
    redirect: 'manual'
  })
  if (!response.ok || !response.body)
    throw new ApiError(502, {
      error: 'Artwork download unavailable',
      code: 'ARTWORK_DOWNLOAD_FAILED'
    })
  const type = response.headers.get('Content-Type')?.split(';')[0].toLowerCase()
  if (!['image/jpeg', 'image/png'].includes(type))
    throw new ApiError(502, { error: 'Invalid artwork image type', code: 'INVALID_ARTWORK_OUTPUT' })
  const reader = response.body.getReader(),
    chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8 * 1024 * 1024) {
      await reader.cancel()
      throw new ApiError(502, {
        error: 'Artwork image is too large',
        code: 'INVALID_ARTWORK_OUTPUT'
      })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const valid =
    type === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  if (!valid)
    throw new ApiError(502, {
      error: 'Invalid artwork image content',
      code: 'INVALID_ARTWORK_OUTPUT'
    })
  return { bytes, type }
}

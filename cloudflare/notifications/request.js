import { ApiError } from '../api/errors.js'
export async function readNotificationJson(request, maxBytes = 65536) {
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new ApiError(415, { error: 'JSON content type required' })
  const reader = request.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new ApiError(413, { error: 'Request body too large' })
      }
      chunks.push(value)
    }
  try {
    const bytes = new Uint8Array(size)
    let at = 0
    for (const chunk of chunks) {
      bytes.set(chunk, at)
      at += chunk.byteLength
    }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Object required')
    return value
  } catch {
    throw new ApiError(400, { error: 'Invalid JSON object' })
  }
}

export async function readProviderJson(response, maxBytes = 65536) {
  const reader = response.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new Error('PROVIDER_RESPONSE_TOO_LARGE')
      }
      chunks.push(value)
    }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

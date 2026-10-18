import { ApiError } from './errors.js'
import { validateData } from '../../services/api/middleware/validate.js'

export async function readJson(request) {
  const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') throw new ApiError(415, { error: 'JSON content type required' })
  const reader = request.body?.getReader()
  const chunks = []
  let size = 0
  if (reader)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1024 * 1024) {
        await reader.cancel()
        throw new ApiError(413, { error: 'Request body too large' })
      }
      chunks.push(value)
    }
  try {
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Object required')
    return value
  } catch {
    throw new ApiError(400, { error: 'Validation failed', message: 'body: invalid JSON object' })
  }
}

export function validate(value, schema, location = 'body') {
  const result = validateData(value, schema)
  if (!result.valid)
    throw new ApiError(400, {
      error: 'Validation failed',
      message: `${location}: ${result.errors[0]}`
    })
  return result.data
}

import { GenerationError } from './repository.js'

const MAX_VOICE_BYTES = 10 * 1024 * 1024
const MAX_AUDIO_BYTES = 200 * 1024 * 1024
const PART_BYTES = 5 * 1024 * 1024

// Small, fixed-schema MessagePack encoder. Binary reference audio must use
// MessagePack per Fish's API; multipart/form-data is not a supported TTS body.
export function encodeFishRequest(value) {
  const chunks = [],
    encoder = new TextEncoder()
  function header(code, size, bytes) {
    const out = new Uint8Array(bytes + 1)
    out[0] = code
    for (let i = bytes; i > 0; i--) {
      out[i] = size & 255
      size = Math.floor(size / 256)
    }
    chunks.push(out)
  }
  function encode(item) {
    if (typeof item === 'string') {
      const bytes = encoder.encode(item)
      if (bytes.length < 32) chunks.push(Uint8Array.of(0xa0 + bytes.length))
      else if (bytes.length <= 255) header(0xd9, bytes.length, 1)
      else if (bytes.length <= 65535) header(0xda, bytes.length, 2)
      else header(0xdb, bytes.length, 4)
      chunks.push(bytes)
    } else if (item instanceof Uint8Array) {
      if (item.length <= 255) header(0xc4, item.length, 1)
      else if (item.length <= 65535) header(0xc5, item.length, 2)
      else header(0xc6, item.length, 4)
      chunks.push(item)
    } else if (Array.isArray(item) && item.length < 16) {
      chunks.push(Uint8Array.of(0x90 + item.length))
      item.forEach(encode)
    } else if (item && typeof item === 'object' && Object.keys(item).length < 16) {
      chunks.push(Uint8Array.of(0x80 + Object.keys(item).length))
      for (const [key, field] of Object.entries(item)) {
        encode(key)
        encode(field)
      }
    } else throw new GenerationError('UNSUPPORTED_FISH_REQUEST_VALUE')
  }
  encode(value)
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function readBoundedBody(body, limit) {
  if (!body) throw new GenerationError('MEDIA_BODY_MISSING')
  const reader = body.getReader(),
    chunks = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) throw new GenerationError('MEDIA_SIZE_LIMIT_EXCEEDED')
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  const output = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

export async function requestFishAudio({ env, bucket, text, voiceFilename, fetcher = fetch }) {
  if (!env.FISH_AUDIO_API_KEY) throw new GenerationError('FISH_AUDIO_NOT_CONFIGURED')
  const model = env.FISH_AUDIO_MODEL || 's2.1-pro'
  if (!['s2.1-pro', 's2-pro', 's2.1-pro-free', 's1'].includes(model))
    throw new GenerationError('FISH_AUDIO_MODEL_INVALID')
  let body = JSON.stringify({ text, format: 'mp3' }),
    contentType = 'application/json'
  if (voiceFilename) {
    if (!/^[A-Za-z0-9_.-]+$/.test(voiceFilename) || voiceFilename === '.' || voiceFilename === '..')
      throw new GenerationError('INVALID_VOICE_SAMPLE_KEY')
    const sample = await bucket.get(`voices/${voiceFilename}`)
    if (!sample || sample.size > MAX_VOICE_BYTES)
      throw new GenerationError('VOICE_SAMPLE_UNAVAILABLE_OR_TOO_LARGE')
    const audio = await readBoundedBody(sample.body, MAX_VOICE_BYTES)
    body = encodeFishRequest({ text, format: 'mp3', references: [{ audio, text: '' }] })
    contentType = 'application/msgpack'
  }
  const response = await fetcher('https://api.fish.audio/v1/tts', {
    method: 'POST',
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${env.FISH_AUDIO_API_KEY}`,
      'Content-Type': contentType,
      model
    },
    body
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new GenerationError('FISH_AUDIO_REQUEST_FAILED')
  }
  return response
}

// Bounded multipart upload avoids buffering an entire audiobook in Worker
// memory and works with a response stream of unknown Content-Length.
export async function storeAudioStream(bucket, key, body) {
  if (!body) throw new GenerationError('AUDIO_BODY_MISSING')
  const reader = body.getReader()
  let upload,
    size = 0,
    partSize = 0,
    partNumber = 1
  const parts = [],
    buffers = [],
    prefix = []
  async function flush() {
    const bytes = new Uint8Array(partSize)
    let offset = 0
    for (const buffer of buffers) {
      bytes.set(buffer, offset)
      offset += buffer.length
    }
    parts.push(await upload.uploadPart(partNumber++, bytes))
    buffers.length = 0
    partSize = 0
  }
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_AUDIO_BYTES) throw new GenerationError('AUDIO_SIZE_LIMIT_EXCEEDED')
      for (let i = 0; prefix.length < 3 && i < value.length; i++) prefix.push(value[i])
      if (!upload && prefix.length >= 3) {
        if (
          !(prefix[0] === 0x49 && prefix[1] === 0x44 && prefix[2] === 0x33) &&
          !(prefix[0] === 0xff && (prefix[1] & 0xe0) === 0xe0)
        )
          throw new GenerationError('INVALID_GENERATED_AUDIO')
        upload = await bucket.createMultipartUpload(key, {
          httpMetadata: { contentType: 'audio/mpeg' }
        })
      }
      let offset = 0
      while (offset < value.length) {
        const length = Math.min(PART_BYTES - partSize, value.length - offset)
        buffers.push(value.subarray(offset, offset + length))
        partSize += length
        offset += length
        if (partSize === PART_BYTES) {
          if (!upload) throw new GenerationError('INVALID_GENERATED_AUDIO')
          await flush()
        }
      }
    }
    if (!upload || !size) throw new GenerationError('INVALID_GENERATED_AUDIO')
    if (partSize) await flush()
    await upload.complete(parts)
    return size
  } catch (error) {
    await reader.cancel().catch(() => {})
    await upload?.abort().catch(() => {})
    throw error
  }
}

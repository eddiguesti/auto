import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { timestampForStorage } from './value-codecs.js'
import { reserveAIUsage } from './ai-quota.js'
export { reserveAIUsage } from './ai-quota.js'

const MAX_AUDIO = 25 * 1024 * 1024
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i

function audioType(bytes) {
  const text = (start, end) => new TextDecoder().decode(bytes.subarray(start, end))
  if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE')
    return { extension: 'wav', contentType: 'audio/wav' }
  if (text(0, 3) === 'ID3' || (bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 224) === 224))
    return { extension: 'mp3', contentType: 'audio/mpeg' }
  if (text(0, 4) === 'OggS') return { extension: 'ogg', contentType: 'audio/ogg' }
  if (text(0, 4) === 'fLaC') return { extension: 'flac', contentType: 'audio/flac' }
  if (
    bytes.length >= 12 &&
    text(4, 8) === 'ftyp' &&
    ['M4A ', 'M4B ', 'isom', 'mp42'].includes(text(8, 12))
  )
    return { extension: 'm4a', contentType: 'audio/mp4' }
  if (
    bytes.length >= 8 &&
    [26, 69, 223, 163].every((byte, i) => bytes[i] === byte) &&
    text(4, 4096).includes('webm')
  )
    return { extension: 'webm', contentType: 'audio/webm' }
  return null
}

async function recording(request) {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;'))
    throw new ApiError(415, { error: 'Multipart form data required' })
  if (!request.body) throw new ApiError(400, { error: 'Provide an audio recording.' })
  let size = 0
  const bounded = request.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += chunk.byteLength
        if (size > MAX_AUDIO + 64 * 1024)
          throw new ApiError(413, { error: 'Recording exceeds the 25MB upload limit' })
        controller.enqueue(chunk)
      }
    })
  )
  let form
  try {
    form = await new Response(bounded, { headers: { 'Content-Type': contentType } }).formData()
  } catch {
    if (size > MAX_AUDIO + 64 * 1024)
      throw new ApiError(413, { error: 'Recording exceeds the 25MB upload limit' })
    throw new ApiError(400, { error: 'Invalid multipart form data' })
  }
  const entries = [...form.entries()]
  const files = entries.filter(([, value]) => typeof value !== 'string')
  if (
    files.length !== 1 ||
    files[0][0] !== 'audio' ||
    entries.length > 4 ||
    new Set(entries.map(([key]) => key)).size !== entries.length
  )
    throw new ApiError(400, { error: 'Provide one audio recording.' })
  const file = files[0][1]
  if (!file.size) throw new ApiError(400, { error: 'Provide an audio recording.' })
  if (file.size > MAX_AUDIO)
    throw new ApiError(413, { error: 'Recording exceeds the 25MB upload limit' })
  const type = audioType(new Uint8Array(await file.slice(0, 4096).arrayBuffer()))
  if (!type) throw new ApiError(400, { error: 'Unsupported audio recording format.' })
  return { file: file.slice(0, file.size, type.contentType), ...type }
}

async function transcribe(env, audio) {
  const form = new FormData()
  form.append('model', 'grok-voice-transcribe-2.0')
  form.append('file', audio.file, `recording.${audio.extension}`)
  try {
    const response = await (env.XAI_FETCH || { fetch }).fetch('https://api.x.ai/v1/stt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROK_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60000),
      redirect: 'manual'
    })
    if (!response.ok || !response.body) throw new Error('Provider unavailable')
    let size = 0
    const stream = response.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          size += chunk.byteLength
          if (size > 512 * 1024) throw new Error('Provider response too large')
          controller.enqueue(chunk)
        }
      })
    )
    const result = await new Response(stream).json()
    if (typeof result.text !== 'string' || result.text.length > 100000)
      throw new Error('Invalid transcript')
    return {
      text: result.text,
      duration:
        Number.isFinite(result.duration) && result.duration >= 0 && result.duration <= 36000
          ? Math.ceil(result.duration)
          : null
    }
  } catch {
    throw new ApiError(502, { error: 'Audio transcription temporarily unavailable' })
  }
}

async function compensate(env, db, key) {
  try {
    const attached = await db
      .prepare('SELECT 1 AS present FROM voice_uploads WHERE object_key = ?')
      .bind(key)
      .first()
    if (attached) return
    // If the metadata commit succeeded but its acknowledgement was lost, retain
    // the owned recording. A failed ownership lookup also retains the intent;
    // the scheduled sweep will decide when D1 is authoritative again.
    await env.MEDIA.delete(key)
    await db.prepare('DELETE FROM media_deletion_jobs WHERE object_key = ?').bind(key).run()
  } catch {
    // The durable intent predates R2.put and survives both failures and user deletion.
    console.error('Recording cleanup pending')
  }
}

export async function handleVoiceUploads({ request, env, db, path, user, claims, now }) {
  if (path === '/voice/upload' && request.method === 'POST') {
    requireFullScope(claims)
    const audio = await recording(request)
    if (!env.MEDIA) throw new ApiError(503, { error: 'Recording storage not available' })
    if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Audio transcription not configured' })
    await reserveAIUsage(db, user.id, now)
    const result = await transcribe(env, audio)
    const storedAt = Date.now()
    const id = crypto.randomUUID(),
      key = `recordings/${user.id}/${id}.${audio.extension}`
    // Unlike a best-effort catch, this record also covers isolate termination between
    // the object write and metadata commit. The cleanup consumer must retain this
    // ten-minute grace period (provider calls finish before this intent is created).
    await db
      .prepare(
        `INSERT INTO media_deletion_jobs (object_key, next_attempt_at, created_at) VALUES (?, ?, ?)`
      )
      .bind(
        key,
        timestampForStorage(storedAt + 600000, 'instant'),
        timestampForStorage(storedAt, 'instant')
      )
      .run()
    try {
      await env.MEDIA.put(key, audio.file.stream(), {
        httpMetadata: { contentType: audio.contentType, cacheControl: 'private, no-store' }
      })
      const [insert] = await db.batch([
        db
          .prepare(
            `INSERT INTO voice_uploads (id, user_id, object_key, content_type, transcript, duration, created_at)
          SELECT ?, id, ?, ?, ?, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL RETURNING id`
          )
          .bind(
            id,
            key,
            audio.contentType,
            result.text,
            result.duration,
            timestampForStorage(storedAt, 'instant'),
            user.id
          ),
        db
          .prepare(
            `DELETE FROM media_deletion_jobs WHERE object_key = ? AND EXISTS (SELECT 1 FROM voice_uploads WHERE id = ? AND user_id = ?)`
          )
          .bind(key, id, user.id)
      ])
      if (!insert.results.length) throw new ApiError(404, { error: 'Account not found' })
    } catch (error) {
      await compensate(env, db, key)
      throw error
    }
    return json(
      {
        success: true,
        data: {
          audioUrl: `/api/voice/uploads/${id}`,
          transcript: result.text,
          ...(result.duration !== null ? { duration: result.duration } : {})
        }
      },
      201
    )
  }
  const match = /^\/voice\/uploads\/([^/]+)$/.exec(path)
  if (match && request.method === 'GET') {
    if (!UUID.test(match[1])) throw new ApiError(404, { error: 'Recording not found' })
    const row = await db
      .prepare('SELECT object_key, content_type FROM voice_uploads WHERE id = ? AND user_id = ?')
      .bind(match[1], user.id)
      .first()
    if (!row) throw new ApiError(404, { error: 'Recording not found' })
    if (!env.MEDIA) throw new ApiError(503, { error: 'Recording storage not available' })
    const object = await env.MEDIA.get(row.object_key)
    if (!object) throw new ApiError(404, { error: 'Recording not found' })
    if (!/^audio\/(?:wav|mpeg|ogg|flac|mp4|webm)$/.test(row.content_type))
      throw new ApiError(503, { error: 'Recording metadata invalid' })
    return new Response(object.body, {
      headers: {
        'Content-Type': row.content_type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
  return null
}

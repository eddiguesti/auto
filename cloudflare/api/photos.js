import { ApiError, json } from './errors.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { analyzePhoto } from './photo-analysis.js'

const MAX_FILE = 10 * 1024 * 1024
const MAX_MULTIPART = MAX_FILE + 64 * 1024
const MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
}
const COLUMNS = 'p.id, p.story_id, p.filename, p.original_name, p.caption, p.created_at'
// Both sources of ownership must agree when present. Analysed photos can be
// owned directly before a story exists; legacy story photos have user_id NULL.
const OWNED = `(p.user_id = ? AND (p.story_id IS NULL OR s.user_id = ?))
  OR (p.user_id IS NULL AND s.user_id = ?)`

export function validImage(bytes, type) {
  const starts = signature => signature.every((value, i) => bytes[i] === value)
  if (type === 'image/jpeg') return starts([255, 216, 255])
  if (type === 'image/png') return starts([137, 80, 78, 71])
  if (type === 'image/gif')
    return (
      starts([...new TextEncoder().encode('GIF87a')]) ||
      starts([...new TextEncoder().encode('GIF89a')])
    )
  return (
    type === 'image/webp' &&
    bytes.length >= 12 &&
    starts([...new TextEncoder().encode('RIFF')]) &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  )
}

function id(value, label) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647)
    throw new ApiError(400, { error: `Invalid ${label}` })
  return Number(value)
}

function filename(value) {
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    /* rejected below */
  }
  if (!decoded || !/^[a-zA-Z0-9._-]+$/.test(decoded) || decoded.includes('..'))
    throw new ApiError(400, { error: 'Invalid filename' })
  return decoded
}

async function upload(request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;'))
    throw new ApiError(415, { error: 'Multipart form data required' })
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, { error: 'No file uploaded' })
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_MULTIPART) {
      await reader.cancel()
      throw new ApiError(413, { error: 'Photo exceeds the 10MB upload limit' })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  let form
  try {
    form = await new Request('https://multipart.invalid', {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('Content-Type') },
      body: bytes
    }).formData()
  } catch {
    throw new ApiError(400, { error: 'Invalid multipart form data' })
  }
  for (const key of new Set(form.keys())) {
    if (form.getAll(key).length !== 1) throw new ApiError(400, { error: 'Duplicate upload fields' })
  }
  const photo = form.get('photo')
  if (!photo || typeof photo === 'string') throw new ApiError(400, { error: 'No file uploaded' })
  if (photo.size > MAX_FILE)
    throw new ApiError(413, { error: 'Photo exceeds the 10MB upload limit' })
  if (!MIME[photo.type]) throw new ApiError(400, { error: 'Invalid file type' })
  const content = new Uint8Array(await photo.arrayBuffer())
  if (!validImage(content, photo.type))
    throw new ApiError(400, { error: 'File content does not match declared type' })
  const field = (key, limit) => {
    const value = form.get(key)
    if (value === null) return null
    if (typeof value !== 'string' || value.length > limit)
      throw new ApiError(400, { error: `Invalid ${key}` })
    return value
  }
  return {
    content,
    type: photo.type,
    originalName: photo.name.split(/[\\/]/).pop().slice(0, 255),
    storyId: field('story_id', 10),
    caption: field('caption', 2000),
    chapterId: field('chapter_id', 100)
  }
}

async function store(env, db, photo, values, sql, now) {
  if (!env.MEDIA) throw new ApiError(503, { error: 'Photo storage not available' })
  const key = `${now}-${crypto.randomUUID().replaceAll('-', '')}${MIME[photo.type]}`
  await env.MEDIA.put(key, photo.content, {
    httpMetadata: { contentType: photo.type, cacheControl: 'private, no-store' }
  })
  try {
    return await db
      .prepare(sql)
      .bind(...values(key))
      .first()
  } catch (error) {
    // An R2 write and D1 transaction cannot be atomic. Roll back the object on
    // failed metadata writes; report a cleanup failure without private details.
    try {
      await env.MEDIA.delete(key)
    } catch {
      console.error('Photo compensation failed')
    }
    throw error
  }
}

export async function handlePhotoRequest({ request, env, db, user, path, now }) {
  if (!/^\/photos(?:\/|$)/.test(path)) return null
  const codec = createMappedCodec('photos', { wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE })
  const owner = [user.id, user.id, user.id]
  const method = request.method
  if (path === '/photos/analyze' && method === 'POST') {
    if (!env.MEDIA) throw new ApiError(503, { error: 'Photo storage not available' })
    if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Photo analysis not configured' })
    const photo = await upload(request)
    if (photo.chapterId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(photo.chapterId))
      throw new ApiError(400, { error: 'Invalid chapter_id' })
    const analysis = await analyzePhoto(env, photo.content, photo.type)
    const saved = await store(
      env,
      db,
      photo,
      key => [
        user.id,
        photo.chapterId || null,
        key,
        photo.originalName,
        analysis.description,
        analysis.era,
        JSON.stringify(analysis.questions),
        timestampForStorage(now)
      ],
      `INSERT INTO photos (user_id, chapter_id, filename, original_name, ai_description, ai_era, ai_questions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, filename`,
      now
    )
    return json({ ...saved, ...analysis })
  }
  if (path === '/photos' && method === 'POST') {
    const photo = await upload(request)
    if (!photo.storyId) throw new ApiError(400, { error: 'Missing story_id' })
    const storyId = id(photo.storyId, 'story_id')
    const story = await db
      .prepare('SELECT id FROM stories WHERE id = ? AND user_id = ?')
      .bind(storyId, user.id)
      .first()
    if (!story) throw new ApiError(403, { error: 'Not authorized to add photos to this story' })
    const saved = await store(
      env,
      db,
      photo,
      key => [
        storyId,
        user.id,
        key,
        photo.originalName,
        photo.caption || null,
        timestampForStorage(now)
      ],
      `INSERT INTO photos (story_id, user_id, filename, original_name, caption, created_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id, filename`,
      now
    )
    return json({ success: true, ...saved })
  }
  const file = /^\/photos\/file\/(.+)$/.exec(path)
  if (file && method === 'GET') {
    const key = filename(file[1])
    const owned = await db
      .prepare(
        `SELECT p.id FROM photos p LEFT JOIN stories s ON s.id = p.story_id WHERE p.filename = ? AND (${OWNED})`
      )
      .bind(key, ...owner)
      .first()
    if (!owned) throw new ApiError(403, { error: 'Not authorized to access this photo' })
    if (!env.MEDIA) throw new ApiError(503, { error: 'Photo storage not available' })
    const object = await env.MEDIA.get(key)
    if (!object) throw new ApiError(404, { error: 'Photo not found' })
    const type =
      object.httpMetadata?.contentType ||
      Object.entries(MIME).find(([, extension]) => key.toLowerCase().endsWith(extension))?.[0]
    if (!MIME[type]) throw new ApiError(503, { error: 'Photo metadata is invalid' })
    return new Response(object.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
  const deletion = /^\/photos\/([^/]+)$/.exec(path)
  if (deletion && method === 'DELETE') {
    const photoId = id(deletion[1], 'photo id')
    const owned = await db
      .prepare(
        `SELECT p.filename FROM photos p LEFT JOIN stories s ON s.id = p.story_id WHERE p.id = ? AND (${OWNED})`
      )
      .bind(photoId, ...owner)
      .first()
    if (!owned) throw new ApiError(404, { error: 'Photo not found or not authorized' })
    const key = filename(owned.filename)
    if (!env.MEDIA) throw new ApiError(503, { error: 'Photo storage not available' })
    // Retain the ownership row if R2 deletion fails so the operation can retry.
    await env.MEDIA.delete(key)
    await db.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run()
    return json({ success: true })
  }
  const story = /^\/photos\/story\/([^/]+)$/.exec(path)
  if (story && method === 'GET') {
    const storyId = id(story[1], 'story id')
    const { results } = await db
      .prepare(
        `SELECT ${COLUMNS} FROM photos p JOIN stories s ON s.id = p.story_id WHERE p.story_id = ? AND s.user_id = ? AND (p.user_id IS NULL OR p.user_id = ?) ORDER BY p.created_at, p.id`
      )
      .bind(storyId, user.id, user.id)
      .all()
    return json(results.map(row => codec.decodeRow(row)))
  }
  if (path === '/photos/my-photos' && method === 'GET') {
    const { results } = await db
      .prepare(
        `SELECT p.id, p.filename, p.chapter_id, p.caption, p.ai_description, p.ai_era, p.ai_questions, p.created_at FROM photos p LEFT JOIN stories s ON s.id = p.story_id WHERE p.user_id = ? AND (p.story_id IS NULL OR s.user_id = ?) ORDER BY p.created_at DESC, p.id DESC LIMIT 50`
      )
      .bind(user.id, user.id)
      .all()
    return json(results.map(row => codec.decodeRow(row)))
  }
  return null
}

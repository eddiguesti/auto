import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson, validate } from './request.js'
import { freeStorySchemas, memoSchemas } from '../../services/api/schemas/index.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { resolveNativeManuscript } from './writing-manuscript.js'
import { handleWritingReviews } from './writing-reviews.js'
import { handleWritingStyle } from './writing-style.js'
import { handleWritingAssistant } from './writing-assistant.js'

const ACTIVE = 'EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.deleted_at IS NULL)'
const COLUMNS = {
  free_stories: 'id, title, content, created_at, updated_at',
  memos: 'id, title, audio_url, transcript, duration, created_at, updated_at'
}

export function writingId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647)
    throw new ApiError(400, { error: 'Invalid id' })
  return Number(value)
}

async function recordingOwnership(db, userId, url) {
  const privateRecording =
    /^\/api\/voice\/uploads\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i.exec(url)
  if (privateRecording) {
    const owned = await db
      .prepare('SELECT id FROM voice_uploads WHERE id = ? AND user_id = ?')
      .bind(privateRecording[1], userId)
      .first()
    if (!owned) throw new ApiError(403, { error: 'Recording does not belong to your account.' })
    return privateRecording[1]
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    /* rejected below */
  }
  if (!parsed || parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new ApiError(400, { error: 'Invalid recording URL.' })
  return null
}

async function handleCollection({ request, db, path, user, now }) {
  const match = /^\/(free-stories|memos)(?:\/([^/]+))?$/.exec(path)
  if (!match) return null
  const table = match[1] === 'free-stories' ? 'free_stories' : 'memos'
  const name = table === 'memos' ? 'Memo' : 'Story'
  const id = match[2] ? writingId(match[2]) : null
  const codec = createMappedCodec(table, { wallClockTimeZone: 'UTC' })
  const method = request.method
  const missing = () => {
    throw new ApiError(404, { success: false, error: `${name} not found` })
  }
  if (method === 'GET') {
    if (id) {
      const row = await db
        .prepare(
          `SELECT ${COLUMNS[table]} FROM ${table} WHERE user_id = ? AND id = ? AND ${ACTIVE}`
        )
        .bind(user.id, id)
        .first()
      if (!row) missing()
      return json({ success: true, data: codec.decodeRow(row) })
    }
    const params = Object.fromEntries(new URL(request.url).searchParams)
    // Keep the legacy limit/offset envelope, with deterministic ties and strict
    // integers instead of accepting malformed "12garbage" identifiers.
    const limit = params.limit === undefined ? 50 : writingId(params.limit)
    const offset = params.offset === undefined ? 0 : Number(params.offset)
    if (limit > 100 || !/^\d+$/.test(String(offset)) || !Number.isSafeInteger(offset))
      throw new ApiError(400, { error: 'Invalid pagination' })
    const rows = await db
      .prepare(
        `SELECT ${COLUMNS[table]} FROM ${table} WHERE user_id = ? AND ${ACTIVE} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all()
    return json({ success: true, data: rows.results.map(row => codec.decodeRow(row)) })
  }
  if (method === 'POST' && !id) {
    const body = validate(
      await readJson(request),
      (table === 'memos' ? memoSchemas : freeStorySchemas).create.body
    )
    let row
    if (table === 'free_stories') {
      row = await db
        .prepare(
          `INSERT INTO free_stories (user_id, title, content, created_at, updated_at)
        SELECT id, ?, ?, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL RETURNING ${COLUMNS[table]}`
        )
        .bind(
          body.title || null,
          body.content,
          timestampForStorage(now),
          timestampForStorage(now),
          user.id
        )
        .first()
    } else {
      if (!body.audio_url && !body.transcript?.trim())
        throw new ApiError(400, { error: 'Provide a recording or transcript.' })
      if (body.duration !== undefined && !Number.isInteger(body.duration))
        throw new ApiError(400, { error: 'duration must be whole seconds' })
      const recordingId = body.audio_url
        ? await recordingOwnership(db, user.id, body.audio_url)
        : null
      row = await db
        .prepare(
          `INSERT INTO memos (user_id, title, audio_url, transcript, duration, created_at, updated_at)
        SELECT id, ?, ?, ?, ?, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL
        AND (? IS NULL OR EXISTS (SELECT 1 FROM voice_uploads WHERE voice_uploads.id = ? AND voice_uploads.user_id = users.id))
        RETURNING ${COLUMNS[table]}`
        )
        .bind(
          body.title || null,
          body.audio_url || '',
          body.transcript || null,
          body.duration ?? null,
          timestampForStorage(now),
          timestampForStorage(now),
          user.id,
          recordingId,
          recordingId
        )
        .first()
    }
    if (!row) throw new ApiError(401, { error: 'Account or recording unavailable' })
    return json({ success: true, data: codec.decodeRow(row) }, 201)
  }
  if (method === 'PUT' && id) {
    const body = validate(
      await readJson(request),
      (table === 'memos' ? memoSchemas : freeStorySchemas).update.body
    )
    const fields = ['updated_at = ?']
    const values = [timestampForStorage(now)]
    if (body.title !== undefined) {
      fields.push('title = ?')
      values.push(body.title || null)
    }
    if (table === 'free_stories' && body.content !== undefined) {
      fields.push('content = ?')
      values.push(body.content)
    }
    const row = await db
      .prepare(
        `UPDATE ${table} SET ${fields.join(', ')} WHERE id = ? AND user_id = ? AND ${ACTIVE} RETURNING ${COLUMNS[table]}`
      )
      .bind(...values, id, user.id)
      .first()
    if (!row) missing()
    return json({ success: true, data: codec.decodeRow(row) })
  }
  if (method === 'DELETE' && id) {
    const row = await db
      .prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ? AND ${ACTIVE} RETURNING id`)
      .bind(id, user.id)
      .first()
    if (!row) missing()
    return json({ success: true })
  }
  return null
}

export async function handleWritingRoutes(options) {
  if (
    !/^\/(?:free-stories|memos|chapter-review|style|ai)(?:\/|$)/.test(options.path) &&
    options.path !== '/export/manuscript'
  )
    return null
  requireFullScope(options.claims)
  if (options.path === '/export/manuscript' && options.request.method === 'GET')
    return json(await resolveNativeManuscript(options.db, options.user.id))
  return (
    (await handleCollection(options)) ||
    (await handleWritingReviews(options)) ||
    (await handleWritingStyle(options)) ||
    (await handleWritingAssistant(options))
  )
}

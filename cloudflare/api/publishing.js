import { Buffer } from 'node:buffer'
import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson } from './request.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { resolveNativeManuscript } from './writing-manuscript.js'
import { reserveAIUsage } from './ai-quota.js'
import { reserveWritingRate } from './writing-provider.js'
import { createGenerationRepository, GenerationError } from '../jobs/repository.js'
import { requestFishAudio, readBoundedBody } from '../jobs/fish-audio.js'
import { detectAudioType } from '../../services/api/utils/mediaType.js'

export async function publishingEntitlement(db, userId, product) {
  const row = await db
    .prepare(
      `SELECT
    EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'completed' AND p.product_type IN (?, 'premium_bundle')) AS paid,
    (SELECT COUNT(*) FROM users e WHERE e.id <= u.id) <= 100 AS early
    FROM users u WHERE u.id = ? AND u.deleted_at IS NULL`
    )
    .bind(product, userId)
    .first()
  if (!row) throw new ApiError(401, { error: 'Account unavailable' })
  return { hasPaid: Boolean(row.paid), isEarlyAdopter: Boolean(row.early) }
}

function filename(value) {
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    /* rejected below */
  }
  if (!decoded || !/^[A-Za-z0-9_.-]+$/.test(decoded) || decoded.includes('..'))
    throw new ApiError(400, { error: 'Invalid filename' })
  return decoded
}

function jobStatus(job) {
  const status =
    job.state === 'queued'
      ? 'created'
      : ['active', 'effect_started'].includes(job.state)
        ? 'active'
        : job.state === 'completed'
          ? 'completed'
          : 'failed'
  return {
    status,
    ...(status === 'completed' && job.object_key
      ? { filename: job.object_key.split('/').at(-1) }
      : {}),
    ...(status === 'failed'
      ? {
          error:
            job.state === 'needs_reconciliation'
              ? 'Generation needs support review before another attempt.'
              : 'Generation failed. Please try again.',
          code: job.error_code || 'GENERATION_FAILED'
        }
      : {})
  }
}

async function download(bucket, key, name, type) {
  if (!bucket) throw new ApiError(503, { error: 'Private media storage not configured' })
  const object = await bucket.get(key)
  if (!object) throw new ApiError(404, { error: 'File not found' })
  return new Response(object.body, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(object.size !== undefined ? { 'Content-Length': String(object.size) } : {})
    }
  })
}

async function voiceUpload(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
    throw new ApiError(415, { error: 'JSON content type required' })
  let body
  try {
    body = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        await readBoundedBody(request.body, 14 * 1024 * 1024)
      )
    )
  } catch {
    throw new ApiError(400, { error: 'Invalid voice sample body or sample exceeds 10 MiB' })
  }
  if (
    !body ||
    Object.keys(body).some(key => !['audioData', 'consentGiven'].includes(key)) ||
    body.consentGiven !== true ||
    typeof body.audioData !== 'string'
  )
    throw new ApiError(400, { error: 'Audio and explicit voice cloning consent are required' })
  const encoded = body.audioData.includes(',')
    ? body.audioData.slice(body.audioData.indexOf(',') + 1)
    : body.audioData
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1)
    throw new ApiError(400, { error: 'Invalid audio encoding' })
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length > 10 * 1024 * 1024)
    throw new ApiError(413, { error: 'Voice sample exceeds 10 MiB' })
  const type = detectAudioType(bytes)
  if (!type) throw new ApiError(400, { error: 'Invalid audio format' })
  return { bytes, type }
}

export async function handlePublishingRoutes({
  request,
  env,
  db,
  path,
  user,
  claims,
  now = Date.now()
}) {
  if (!/^\/(audiobook|export)(?:\/|$)/.test(path)) return null
  requireFullScope(claims)
  const method = request.method,
    userId = user.id
  const repository = createGenerationRepository(db, { now: () => now })
  const codec = table => createMappedCodec(table, { wallClockTimeZone: 'UTC' })
  if (path === '/export/manuscript' && method === 'GET')
    return json(await resolveNativeManuscript(db, userId))
  if (path === '/export/status' && method === 'GET') {
    const [rights, rows] = await Promise.all([
      publishingEntitlement(db, userId, 'export'),
      resolveNativeManuscript(db, userId, { includePhotos: false })
    ])
    return json({
      storyCount: rows.filter(row => row.answer?.trim()).length,
      canExport: rights.hasPaid || rights.isEarlyAdopter,
      ...rights,
      exportPrice: 9.99
    })
  }
  if (path === '/audiobook/status' && method === 'GET') {
    const [rights, voice, books] = await Promise.all([
      publishingEntitlement(db, userId, 'audiobook'),
      db
        .prepare('SELECT fish_model_id, consent_given FROM voice_models WHERE user_id = ?')
        .bind(userId)
        .first(),
      db
        .prepare(
          'SELECT filename, voice_type, created_at FROM audiobooks WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5'
        )
        .bind(userId)
        .all()
    ])
    return json({
      canGenerate: rights.hasPaid || rights.isEarlyAdopter,
      ...rights,
      hasVoiceModel: Boolean(voice?.fish_model_id),
      voiceConsentGiven: Boolean(voice?.consent_given),
      previousAudiobooks: books.results.map(row => codec('audiobooks').decodeRow(row)),
      audiobookPrice: 14.99
    })
  }
  const poll = /^\/(audiobook|export)\/jobs\/([^/]+)$/.exec(path)
  if (poll && method === 'GET') {
    const job = await repository.getOwned(userId, poll[2])
    if (!job || job.kind !== (poll[1] === 'export' ? 'epub' : 'audiobook'))
      throw new ApiError(404, { error: 'Job not found' })
    return json(jobStatus(job))
  }
  const file = /^\/(audiobook|export)\/download\/([^/]+)$/.exec(path)
  if (file && method === 'GET') {
    const name = filename(file[2]),
      audio = file[1] === 'audiobook'
    const owned = audio
      ? await db
          .prepare('SELECT id FROM audiobooks WHERE user_id = ? AND filename = ?')
          .bind(userId, name)
          .first()
      : await db
          .prepare(
            "SELECT id FROM generation_jobs WHERE user_id = ? AND kind = 'epub' AND state = 'completed' AND object_key = ?"
          )
          .bind(userId, `exports/${name}`)
          .first()
    if (!owned) throw new ApiError(404, { error: 'File not found' })
    return download(
      env.MEDIA,
      `${audio ? 'audiobooks' : 'exports'}/${name}`,
      name,
      audio ? 'audio/mpeg' : 'application/epub+zip'
    )
  }
  if (
    (path === '/audiobook/generate' && method === 'POST') ||
    (path === '/export/epub' && ['GET', 'POST'].includes(method))
  ) {
    const kind = path.startsWith('/audiobook') ? 'audiobook' : 'epub',
      product = kind === 'epub' ? 'export' : 'audiobook'
    if (!env.MEDIA || !env.GENERATION_QUEUE)
      throw new ApiError(503, { error: 'Generation storage/queue not configured' })
    if (kind === 'audiobook' && !env.FISH_AUDIO_API_KEY)
      throw new ApiError(503, { error: 'Audio generation not configured' })
    const body = method === 'POST' ? await readJson(request) : {}
    if (
      Object.keys(body).some(key => key !== 'useOwnVoice') ||
      (body.useOwnVoice !== undefined && typeof body.useOwnVoice !== 'boolean') ||
      (kind === 'epub' && Object.keys(body).length)
    )
      throw new ApiError(400, { error: 'Invalid generation options' })
    const rights = await publishingEntitlement(db, userId, product)
    if (!rights.hasPaid && !rights.isEarlyAdopter)
      throw new ApiError(403, {
        error: `Payment required for ${product}`,
        code: 'PAYMENT_REQUIRED'
      })
    if (
      body.useOwnVoice &&
      !(await db
        .prepare(
          'SELECT id FROM voice_models WHERE user_id = ? AND consent_given = 1 AND fish_model_id IS NOT NULL'
        )
        .bind(userId)
        .first())
    )
      throw new ApiError(400, { error: 'A consented voice sample is required' })
    const rows = await resolveNativeManuscript(db, userId, { includePhotos: false })
    if (!rows.some(row => row.answer?.trim()))
      throw new ApiError(400, { error: 'No memories to publish' })
    let job
    try {
      job = await repository.enqueue({
        userId,
        kind,
        requestKey: request.headers.get('Idempotency-Key') || crypto.randomUUID(),
        payload: kind === 'audiobook' ? { useOwnVoice: Boolean(body.useOwnVoice) } : {}
      })
    } catch (error) {
      if (error instanceof GenerationError && error.code === 'IDEMPOTENCY_KEY_REUSED')
        throw new ApiError(409, { error: 'Idempotency key was already used for different options' })
      if (
        error instanceof GenerationError &&
        ['INVALID_GENERATION_REQUEST', 'GENERATION_PAYLOAD_TOO_LARGE'].includes(error.code)
      )
        throw new ApiError(400, { error: 'Invalid idempotency key or generation options' })
      const active =
        kind === 'audiobook' &&
        (await db
          .prepare(
            "SELECT id FROM generation_jobs WHERE owner_id = ? AND kind = 'audiobook' AND state IN ('queued','active','effect_started')"
          )
          .bind(userId)
          .first())
      if (active) throw new ApiError(409, { error: 'An audiobook request is already queued' })
      if (error instanceof GenerationError && error.code === 'GENERATION_NOT_ACCEPTED')
        throw new ApiError(429, {
          error: 'Please wait before generating another audiobook. Maximum three per day.'
        })
      throw error
    }
    // Request success means durable D1 intent, not a volatile send. Scheduled
    // outbox publishing recovers a missing delivery without losing the request.
    return json(
      { jobId: job.id, status: jobStatus(job).status, message: 'Generation started' },
      202
    )
  }
  if (path === '/audiobook/voice-status' && method === 'GET') {
    const voice = await db
      .prepare(
        'SELECT fish_model_id, consent_given, created_at FROM voice_models WHERE user_id = ?'
      )
      .bind(userId)
      .first()
    return json(
      voice
        ? {
            hasVoiceModel: Boolean(voice.fish_model_id),
            consentGiven: Boolean(voice.consent_given),
            createdAt: codec('voice_models').decodeRow(voice).created_at
          }
        : { hasVoiceModel: false }
    )
  }
  if (path === '/audiobook/voice-sample' && method === 'POST') {
    if (!env.MEDIA) throw new ApiError(503, { error: 'Voice storage not configured' })
    const { bytes, type } = await voiceUpload(request)
    const name = `voice_${userId}_${crypto.randomUUID()}.${type.extension}`,
      key = `voices/${name}`
    const time = timestampForStorage(now, 'instant'),
      wallTime = timestampForStorage(now)
    await db
      .prepare(
        'INSERT INTO media_deletion_jobs (object_key,next_attempt_at,created_at) VALUES (?,?,?)'
      )
      .bind(key, timestampForStorage(now + 3_600_000, 'instant'), time)
      .run()
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type.contentType } })
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO media_deletion_jobs (object_key,next_attempt_at,created_at)
        SELECT 'voices/' || fish_model_id, ?, ? FROM voice_models WHERE user_id = ? AND fish_model_id IS NOT NULL
        ON CONFLICT (object_key) DO NOTHING`
        )
        .bind(time, time, userId),
      db
        .prepare(
          `INSERT INTO voice_models (user_id,fish_model_id,consent_given,created_at,updated_at)
        SELECT id, ?, 1, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL
        ON CONFLICT (user_id) DO UPDATE SET fish_model_id = excluded.fish_model_id, consent_given = 1, updated_at = excluded.updated_at RETURNING id`
        )
        .bind(name, wallTime, wallTime, userId),
      db
        .prepare(
          `DELETE FROM media_deletion_jobs WHERE object_key = ? AND EXISTS
        (SELECT 1 FROM voice_models WHERE user_id = ? AND fish_model_id = ?)`
        )
        .bind(key, userId, name)
    ])
    if (!results[1].results.length) throw new ApiError(401, { error: 'Account unavailable' })
    return json({ success: true, message: 'Voice sample saved successfully' })
  }
  if (path === '/audiobook/voice-sample' && method === 'DELETE') {
    const time = timestampForStorage(now, 'instant')
    await db.batch([
      db
        .prepare(
          `INSERT INTO media_deletion_jobs (object_key,next_attempt_at,created_at)
        SELECT 'voices/' || fish_model_id, ?, ? FROM voice_models WHERE user_id = ? AND fish_model_id IS NOT NULL
        ON CONFLICT (object_key) DO NOTHING`
        )
        .bind(time, time, userId),
      db.prepare('DELETE FROM voice_models WHERE user_id = ?').bind(userId),
      db
        .prepare(
          `UPDATE generation_jobs SET state = 'cancelled', lease_token = NULL, lease_until = NULL, updated_at = ?
        WHERE owner_id = ? AND kind = 'audiobook' AND json_extract(payload, '$.useOwnVoice') = 1 AND state IN ('queued', 'active', 'effect_started')`
        )
        .bind(now, userId)
    ])
    return json({ success: true, message: 'Voice model deleted' })
  }
  if (path === '/audiobook/tts' && method === 'POST') {
    if (!env.FISH_AUDIO_API_KEY)
      throw new ApiError(503, { error: 'Audio generation not configured' })
    const { text, ...extra } = await readJson(request)
    if (typeof text !== 'string' || !text.trim() || text.length > 500 || Object.keys(extra).length)
      throw new ApiError(400, { error: 'Text required (max 500 chars)' })
    await reserveWritingRate(db, userId, now)
    await reserveAIUsage(db, userId, now)
    const response = await requestFishAudio({ env, bucket: env.MEDIA, text })
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
  return null
}

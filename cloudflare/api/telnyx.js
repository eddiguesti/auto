import { ApiError, json } from './errors.js'
import { readJson } from './request.js'
import { requireFullScope, verifyToken } from './auth.js'
import { createRepositories } from './repositories.js'
import { sha256 } from './auth-rate-limit.js'
import { timestampForStorage } from './value-codecs.js'
import {
  rawPhoneBody,
  verifyPhoneWebhook,
  verifyInternalPhoneRequest,
  verifyPhoneTicket
} from '../phone/security.js'
import { startPhoneInterview } from '../phone/calls.js'
import { phoneUUID, getPhoneInterview, bindPhoneControl } from '../phone/repository.js'

function options(body, internal = false) {
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some(
      key =>
        !(internal ? ['userId', 'requestId', 'phoneNumber', 'prompt'] : ['phoneNumber']).includes(
          key
        )
    ) ||
    typeof body.phoneNumber !== 'string' ||
    !/^\+[1-9]\d{6,14}$/.test(body.phoneNumber)
  )
    throw new ApiError(400, { error: 'Valid phone number with country code required' })
  if (
    internal &&
    (!Number.isSafeInteger(body.userId) ||
      body.userId < 1 ||
      body.userId > 2147483647 ||
      !phoneUUID(body.requestId))
  )
    throw new ApiError(400, { error: 'Invalid internal call owner/request' })
  if (body.prompt !== undefined) {
    const prompt = body.prompt
    if (
      !prompt ||
      Array.isArray(prompt) ||
      Object.keys(prompt).some(key => !['text', 'chapter_id', 'question_id'].includes(key)) ||
      typeof prompt.text !== 'string' ||
      !prompt.text.trim() ||
      prompt.text.length > 2000 ||
      ['chapter_id', 'question_id'].some(
        key =>
          prompt[key] !== undefined &&
          (typeof prompt[key] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(prompt[key]))
      )
    )
      throw new ApiError(400, { error: 'Invalid call topic' })
  }
  return body
}
const result = interview =>
  json({
    success: true,
    request_id: interview.id,
    call_control_id: interview.call_control_id,
    status: interview.state,
    message: 'Your phone interview has been requested.'
  })

export async function handleTelnyxRoutes({
  request,
  env,
  db,
  user,
  claims,
  path,
  now = Date.now()
}) {
  if (!path.startsWith('/telnyx/')) return null
  requireFullScope(claims)
  if (path === '/telnyx/request-call' && request.method === 'POST') {
    const body = options(await readJson(request)),
      key = request.headers.get('Idempotency-Key') || crypto.randomUUID()
    if (!phoneUUID(key)) throw new ApiError(400, { error: 'Call idempotency key must be a UUID' })
    const token = await verifyToken(request, env.JWT_SECRET, now)
    const live = await createRepositories(db, { wallClockTimeZone: 'UTC' }).authenticate(token)
    if (!live || live.revoked || token.claims.id !== user.id)
      throw new ApiError(401, { error: 'Phone authorization revoked' })
    const identity = {
      claims: { id: token.claims.id, iat: token.claims.iat, exp: token.claims.exp },
      revocationKey: token.revocationKey
    }
    return result(
      await startPhoneInterview(
        {
          env,
          db,
          userId: user.id,
          requestKey: key,
          phoneNumber: body.phoneNumber,
          identity,
          explicitConsent: true
        },
        now
      )
    )
  }
  const owned = /^\/telnyx\/calls\/([^/]+)$/.exec(path)
  if (owned && request.method === 'GET') {
    const interview = await getPhoneInterview(db, owned[1], user.id)
    if (!interview) throw new ApiError(404, { error: 'Phone interview not found' })
    const { results } = await db
      .prepare(
        'SELECT transcript,created_at FROM phone_transcript_events WHERE request_id = ? AND user_id = ? ORDER BY seq'
      )
      .bind(interview.id, user.id)
      .all()
    return json({
      success: true,
      data: {
        id: interview.id,
        status: interview.state,
        storyId: interview.story_id,
        transcriptConflict: Boolean(interview.transcript_conflict),
        transcript: results.map(row => row.transcript).join('\n'),
        createdAt: new Date(interview.created_at).toISOString(),
        endedAt: interview.ended_at ? new Date(interview.ended_at).toISOString() : null
      }
    })
  }
  return null
}

export async function handleTelnyxPublicRoutes({ request, env, db, path, now = Date.now() }) {
  if (path === '/telnyx/media-stream') {
    if (env.TELNYX_CALLS_ENABLED !== 'true' || !env.PHONE_SESSIONS?.getByName)
      throw new ApiError(503, { error: 'Phone interviews are not enabled' })
    const ticket = await verifyPhoneTicket(
      new URL(request.url).searchParams.get('ticket'),
      env,
      now
    )
    return env.PHONE_SESSIONS.getByName(ticket.requestId).fetch(request)
  }
  if (path === '/telnyx/call' && request.method === 'POST') {
    const bytes = await rawPhoneBody(request)
    if (!(await verifyInternalPhoneRequest(request, bytes, env, now)))
      throw new ApiError(403, { error: 'Invalid internal call signature' })
    let body
    try {
      body = options(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), true)
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, { error: 'Invalid call body' })
    }
    return result(
      await startPhoneInterview(
        {
          env,
          db,
          userId: body.userId,
          requestKey: body.requestId,
          phoneNumber: body.phoneNumber,
          prompt: body.prompt,
          explicitConsent: false
        },
        now
      )
    )
  }
  if (path !== '/telnyx/webhook' || request.method !== 'POST') return null
  if (!env.TELNYX_PUBLIC_KEY)
    throw new ApiError(503, { error: 'Phone webhook verification unavailable' })
  const bytes = await rawPhoneBody(request)
  if (!(await verifyPhoneWebhook(bytes, request.headers, env.TELNYX_PUBLIC_KEY, now)))
    throw new ApiError(400, { error: 'Invalid webhook signature or timestamp' })
  let event
  try {
    event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)).data
  } catch {
    throw new ApiError(400, { error: 'Invalid webhook body' })
  }
  if (
    !event ||
    typeof event.id !== 'string' ||
    !event.id ||
    event.id.length > 200 ||
    typeof event.event_type !== 'string' ||
    event.event_type.length > 100 ||
    typeof event.payload?.call_control_id !== 'string' ||
    !event.payload.call_control_id ||
    event.payload.call_control_id.length > 1024
  )
    throw new ApiError(400, { error: 'Invalid call event' })
  let interview = await db
    .prepare('SELECT * FROM phone_interviews WHERE call_control_id = ?')
    .bind(event.payload.call_control_id)
    .first()
  if (
    !interview &&
    typeof event.payload.client_state === 'string' &&
    event.payload.client_state.length < 2048
  ) {
    try {
      const state = JSON.parse(atob(event.payload.client_state)),
        candidate = await getPhoneInterview(db, state.requestId)
      if (
        candidate &&
        candidate.user_id === state.userId &&
        typeof state.streamNonce === 'string' &&
        (await sha256(state.streamNonce)) === candidate.stream_nonce_hash
      )
        interview = candidate
    } catch {
      /* Signed events for unrelated calls have no application authority. */
    }
  }
  if (!interview) return json({ ok: true })
  await bindPhoneControl(db, interview.id, event.payload.call_control_id, now)
  const stamp = timestampForStorage(now),
    eventStamp = timestampForStorage(now, 'instant')
  const terminal = event.event_type === 'call.hangup' || event.event_type === 'streaming.stopped'
  const machine =
    ['call.machine.detection.ended', 'call.machine.premium.detection.ended'].includes(
      event.event_type
    ) && ['machine', 'fax_detected'].includes(event.payload.result)
  const eventGuard =
    'EXISTS(SELECT 1 FROM telnyx_webhook_events WHERE event_id = ? AND expires_at = ?)'
  // The nonce in the replay marker is unique per attempt, so an earlier claimed
  // event cannot authorize a duplicate request's following UPDATE statements.
  const marker = `${eventStamp}:${crypto.randomUUID()}`
  const expires = timestampForStorage(now + 86_400_000, 'instant')
  const statements = [
    db
      .prepare(
        'INSERT INTO telnyx_webhook_events(event_id,expires_at) VALUES(?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id'
      )
      .bind(event.id, marker)
  ]
  // Marker is replaced with the normal expiry only after its guarded effects.
  if (terminal || machine) {
    statements.push(
      db
        .prepare(
          `UPDATE phone_interviews SET state = 'ending',ended_at = COALESCE(ended_at,?),updated_at = ?,error_code = CASE WHEN ? = 1 THEN 'ANSWERING_MACHINE' ELSE error_code END
      WHERE id = ? AND state NOT IN ('completed','failed','cancelled') AND ${eventGuard}`
        )
        .bind(now, now, machine ? 1 : 0, interview.id, event.id, marker)
    )
    statements.push(
      db
        .prepare(
          `INSERT INTO phone_commands(id,request_id,call_control_id,command,created_at)
      SELECT ?,id,call_control_id,'hangup',? FROM phone_interviews WHERE id = ? AND call_control_id IS NOT NULL AND ${eventGuard}
      ON CONFLICT(call_control_id,command) DO NOTHING`
        )
        .bind(crypto.randomUUID(), now, interview.id, event.id, marker)
    )
  } else if (event.event_type === 'call.answered') {
    statements.push(
      db
        .prepare(
          `UPDATE phone_interviews SET state = CASE WHEN state IN ('reserved','dial_started','dialed','needs_reconciliation') THEN 'answered' ELSE state END,
      answered_at = COALESCE(answered_at,?),updated_at = ? WHERE id = ? AND ended_at IS NULL AND ${eventGuard}`
        )
        .bind(now, now, interview.id, event.id, marker)
    )
  } else if (event.event_type === 'streaming.started') {
    statements.push(
      db
        .prepare(
          `UPDATE phone_interviews SET state = 'streaming',updated_at = ? WHERE id = ? AND ended_at IS NULL AND state IN ('reserved','dial_started','dialed','answered','streaming','needs_reconciliation') AND ${eventGuard}`
        )
        .bind(now, interview.id, event.id, marker)
    )
  }
  statements.push(
    db
      .prepare(
        `UPDATE telnyx_calls SET call_status = (SELECT state FROM phone_interviews WHERE id = ?),
    answered_at = CASE WHEN ? = 'call.answered' THEN COALESCE(answered_at,?) ELSE answered_at END,
    ended_at = CASE WHEN ? = 1 THEN COALESCE(ended_at,?) ELSE ended_at END,updated_at = ? WHERE phone_request_id = ? AND ${eventGuard}`
      )
      .bind(
        interview.id,
        event.event_type,
        stamp,
        terminal || machine ? 1 : 0,
        stamp,
        stamp,
        interview.id,
        event.id,
        marker
      )
  )
  statements.push(
    db
      .prepare(
        'UPDATE telnyx_webhook_events SET expires_at = ? WHERE event_id = ? AND expires_at = ?'
      )
      .bind(expires, event.id, marker)
  )
  await db.batch(statements)
  return json({ ok: true })
}

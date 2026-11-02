import { ApiError } from '../api/errors.js'
import { timestampForStorage } from '../api/value-codecs.js'

export const phoneUUID = value =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
const open = "'reserved','dial_started','dialed','answered','streaming','needs_reconciliation'"
const authentication = `(p.authentication IS NULL OR (
  json_extract(p.authentication,'$.claims.exp') * 1000 > ?
  AND NOT EXISTS(SELECT 1 FROM token_blacklist b WHERE b.jti = json_extract(p.authentication,'$.revocationKey')
    AND julianday(replace(b.expires_at,'+00','Z')) > julianday(?))
  AND NOT EXISTS(SELECT 1 FROM user_token_invalidation i WHERE i.user_id = p.user_id
    AND unixepoch(replace(i.invalidated_at,'+00','Z')) >= json_extract(p.authentication,'$.claims.iat'))))`
const owner =
  'u.deleted_at IS NULL AND u.phone_call_consent = 1 AND u.phone_number = p.phone_number'
const authArgs = now => [now, new Date(now).toISOString()]
const transcript = `(CASE WHEN p.initial_answer IS NOT NULL AND trim(p.initial_answer) <> '' THEN p.initial_answer || char(10) || char(10) ELSE '' END || (SELECT group_concat(transcript,char(10)) FROM (SELECT transcript FROM phone_transcript_events WHERE request_id = p.id ORDER BY seq)))`

export async function getPhoneInterview(db, id, userId) {
  if (!phoneUUID(id)) return null
  return db
    .prepare(
      `SELECT * FROM phone_interviews WHERE id = ? ${userId === undefined ? '' : 'AND user_id = ?'}`
    )
    .bind(id, ...(userId === undefined ? [] : [userId]))
    .first()
}

export async function assertPhoneAuthority(db, id, now = Date.now(), { ending = false } = {}) {
  const row = await db
    .prepare(
      `SELECT p.* FROM phone_interviews p JOIN users u ON u.id = p.user_id
    JOIN voice_connection_leases l ON l.user_id = p.user_id AND l.lease_id = p.lease_id
    WHERE p.id = ? AND ${owner} AND ${authentication}
    AND (p.deadline > ? ${ending ? 'OR (p.ended_at IS NOT NULL AND p.ended_at + 5000 >= ?)' : ''})
    AND julianday(replace(l.expires_at,'+00','Z')) > julianday(?)
    AND p.state IN (${open}${ending ? ",'ending','completed'" : ''})`
    )
    .bind(id, ...authArgs(now), now, ...(ending ? [now] : []), new Date(now).toISOString())
    .first()
  if (!row)
    throw new ApiError(401, {
      error: 'Phone session revoked or expired',
      code: 'PHONE_AUTHORITY_LOST'
    })
  return row
}

export async function admitPhoneInterview(
  db,
  {
    id,
    userId,
    requestKey,
    phoneNumber,
    authentication: identity,
    prompt,
    nonceHash,
    streamExpires,
    deadline,
    explicitConsent
  },
  now
) {
  const existing = await db
    .prepare('SELECT * FROM phone_interviews WHERE user_id = ? AND request_key = ?')
    .bind(userId, requestKey)
    .first()
  const chapter = prompt?.chapter_id && prompt?.question_id ? prompt.chapter_id : 'phone-calls'
  const question = prompt?.chapter_id && prompt?.question_id ? prompt.question_id : `phone-${id}`
  const promptText = prompt?.text || 'Share any memory or story you would like to preserve.'
  if (existing) {
    if (
      existing.phone_number !== phoneNumber ||
      existing.prompt_text !== promptText ||
      (prompt?.chapter_id && existing.chapter_id !== chapter) ||
      (prompt?.question_id && existing.question_id !== question)
    )
      throw new ApiError(409, { error: 'Call idempotency key already used for different options' })
    return { interview: existing, created: false }
  }
  const source = await db
    .prepare(
      'SELECT id,answer,updated_at FROM stories WHERE user_id = ? AND chapter_id = ? AND question_id = ?'
    )
    .bind(userId, chapter, question)
    .first()
  if (source?.answer && new TextEncoder().encode(source.answer).byteLength > 256 * 1024)
    throw new ApiError(413, {
      error: 'This written memory is too large for a phone update. Start a new conversation.'
    })
  const stamp = timestampForStorage(now),
    leaseExpiry = timestampForStorage(Math.min(deadline, now + 90_000), 'instant')
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO phone_interviews(id,user_id,request_key,phone_number,authentication,prompt_text,chapter_id,question_id,
      story_id,source_answer,initial_answer,source_version,stream_nonce_hash,stream_expires,lease_id,deadline,created_at,updated_at)
      SELECT ?,u.id,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM users u WHERE u.id = ? AND u.deleted_at IS NULL
      AND (? = 1 OR (u.phone_call_consent = 1 AND u.phone_number = ?))
      AND (SELECT COUNT(*) FROM phone_interviews p WHERE p.user_id = u.id AND p.created_at > ?) < 3
      AND NOT EXISTS(SELECT 1 FROM phone_interviews p WHERE p.user_id = u.id AND p.state IN (${open},'ending'))
      AND NOT EXISTS(SELECT 1 FROM voice_connection_leases l WHERE l.user_id = u.id AND julianday(replace(l.expires_at,'+00','Z')) > julianday(?))
      ON CONFLICT(user_id,request_key) DO NOTHING RETURNING id`
      )
      .bind(
        id,
        requestKey,
        phoneNumber,
        identity ? JSON.stringify(identity) : null,
        promptText,
        chapter,
        question,
        source?.id || null,
        source?.answer ?? null,
        source?.answer ?? null,
        source?.updated_at ?? null,
        nonceHash,
        streamExpires,
        id,
        deadline,
        now,
        now,
        userId,
        explicitConsent ? 1 : 0,
        phoneNumber,
        now - 3_600_000,
        new Date(now).toISOString()
      ),
    db
      .prepare(
        `UPDATE users SET phone_number = ?,phone_call_consent = 1,updated_at = ? WHERE id = ? AND EXISTS(SELECT 1 FROM phone_interviews WHERE id = ?)`
      )
      .bind(phoneNumber, stamp, userId, id),
    db
      .prepare(
        `INSERT INTO voice_connection_leases(user_id,lease_id,expires_at) SELECT user_id,id,? FROM phone_interviews WHERE id = ?
      ON CONFLICT(user_id) DO UPDATE SET lease_id = excluded.lease_id,expires_at = excluded.expires_at
      WHERE julianday(replace(voice_connection_leases.expires_at,'+00','Z')) <= julianday(?)`
      )
      .bind(leaseExpiry, id, new Date(now).toISOString()),
    db
      .prepare(
        `INSERT INTO voice_sessions(user_id,chapter_id,phone_request_id,started_at,created_at,updated_at)
      SELECT user_id,chapter_id,id,?,?,? FROM phone_interviews WHERE id = ?`
      )
      .bind(stamp, stamp, stamp, id),
    db
      .prepare(
        `UPDATE phone_interviews SET voice_session_id = (SELECT id FROM voice_sessions WHERE phone_request_id = ?) WHERE id = ?`
      )
      .bind(id, id),
    db
      .prepare(
        `INSERT INTO telnyx_calls(user_id,phone_request_id,prompt_text,prompt_chapter_id,prompt_question_id,created_at,started_at,updated_at)
      SELECT user_id,id,prompt_text,chapter_id,question_id,?,?,? FROM phone_interviews WHERE id = ?`
      )
      .bind(stamp, stamp, stamp, id)
  ])
  const interview = await db
    .prepare('SELECT * FROM phone_interviews WHERE user_id = ? AND request_key = ?')
    .bind(userId, requestKey)
    .first()
  if (!interview)
    throw new ApiError(409, {
      error:
        'An interview is active, consent is missing, or the three calls per hour limit was reached',
      code: 'PHONE_NOT_ACCEPTED'
    })
  return { interview, created: Boolean(results[0].results.length) }
}

export async function bindPhoneControl(db, id, controlId, now) {
  if (typeof controlId !== 'string' || !controlId || controlId.length > 1024)
    throw new ApiError(400, { error: 'Invalid call identifier' })
  const result = await db.batch([
    db
      .prepare(
        `UPDATE phone_interviews SET call_control_id = ?,updated_at = ? WHERE id = ? AND call_control_id IS NULL RETURNING id`
      )
      .bind(controlId, now, id),
    db
      .prepare(
        `UPDATE telnyx_calls SET call_control_id = ?,updated_at = ? WHERE phone_request_id = ?
      AND call_control_id IS NULL AND EXISTS(SELECT 1 FROM phone_interviews WHERE id = ? AND call_control_id = ?)`
      )
      .bind(controlId, timestampForStorage(now), id, id, controlId),
    db
      .prepare(
        `INSERT INTO phone_commands(id,request_id,call_control_id,command,created_at)
      SELECT ?,id,call_control_id,'hangup',? FROM phone_interviews WHERE id = ? AND call_control_id = ? AND ended_at IS NOT NULL
      ON CONFLICT(call_control_id,command) DO NOTHING`
      )
      .bind(crypto.randomUUID(), now, id, controlId)
  ])
  if (!result[0].results.length && (await getPhoneInterview(db, id))?.call_control_id !== controlId)
    throw new ApiError(409, { error: 'Call ownership does not match' })
}

export async function beginPhoneDial(db, id, now = Date.now()) {
  const row = await db
    .prepare(
      `UPDATE phone_interviews AS p SET state = 'dial_started',updated_at = ?
    WHERE p.id = ? AND p.state = 'reserved' AND p.deadline > ? AND EXISTS
    (SELECT 1 FROM users u JOIN voice_connection_leases l ON l.user_id = u.id AND l.lease_id = p.lease_id
      WHERE u.id = p.user_id AND ${owner} AND ${authentication} AND julianday(replace(l.expires_at,'+00','Z')) > julianday(?)) RETURNING id`
    )
    .bind(now, id, now, ...authArgs(now), new Date(now).toISOString())
    .first()
  if (!row)
    throw new ApiError(401, {
      error: 'Call request revoked before dialing',
      code: 'PHONE_AUTHORITY_LOST'
    })
}

export async function queuePhoneHangup(db, requestId, controlId, now = Date.now()) {
  if (!controlId) return
  await db
    .prepare(
      `INSERT INTO phone_commands(id,request_id,call_control_id,command,created_at)
    VALUES(?,(SELECT id FROM phone_interviews WHERE id = ?),?,'hangup',?) ON CONFLICT(call_control_id,command) DO NOTHING`
    )
    .bind(crypto.randomUUID(), requestId, controlId, now)
    .run()
}

export async function endPhoneInterview(db, id, now = Date.now(), code = null) {
  const call = await getPhoneInterview(db, id)
  if (!call) return null
  const commandId = crypto.randomUUID()
  await db.batch([
    db
      .prepare(
        `INSERT INTO phone_commands(id,request_id,call_control_id,command,created_at)
      SELECT ?,id,call_control_id,'hangup',? FROM phone_interviews WHERE id = ? AND call_control_id IS NOT NULL
      ON CONFLICT(call_control_id,command) DO NOTHING`
      )
      .bind(commandId, now, id),
    db
      .prepare(
        `UPDATE phone_interviews SET state = CASE WHEN state IN ('failed','cancelled','completed') THEN state ELSE 'ending' END,
      ended_at = COALESCE(ended_at,?),updated_at = ?,error_code = COALESCE(?,error_code) WHERE id = ?`
      )
      .bind(now, now, code, id)
  ])
  return call
}

export async function appendPhoneTranscript(db, id, eventId, value, now = Date.now()) {
  if (
    typeof eventId !== 'string' ||
    !eventId ||
    eventId.length > 200 ||
    typeof value !== 'string' ||
    !value.trim() ||
    new TextEncoder().encode(value).byteLength > 64 * 1024
  )
    throw new ApiError(400, { error: 'Invalid phone transcript event' })
  const prior = await db
    .prepare('SELECT transcript FROM phone_transcript_events WHERE request_id = ? AND event_id = ?')
    .bind(id, eventId)
    .first()
  if (prior) {
    if (prior.transcript !== value)
      throw new ApiError(409, {
        error: 'Phone transcript event changed',
        code: 'PHONE_TRANSCRIPT_REPLAY_CONFLICT'
      })
    return { duplicate: true }
  }
  const token = crypto.randomUUID(),
    stamp = timestampForStorage(now),
    bytes = new TextEncoder().encode(value).byteLength
  const changed = `EXISTS(SELECT 1 FROM phone_transcript_events e WHERE e.request_id = p.id AND e.mutation_token = ?)`
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO phone_transcript_events(request_id,user_id,event_id,mutation_token,transcript,created_at)
      SELECT p.id,p.user_id,?,?,?,? FROM phone_interviews p JOIN users u ON u.id = p.user_id
      JOIN voice_connection_leases l ON l.user_id = p.user_id AND l.lease_id = p.lease_id
      WHERE p.id = ? AND ${owner} AND ${authentication} AND p.deadline > ? AND p.state IN (${open},'ending')
      AND julianday(replace(l.expires_at,'+00','Z')) > julianday(?) AND p.transcript_bytes + ? <= 262144
      AND (SELECT COUNT(*) FROM phone_transcript_events WHERE request_id = p.id) < 100
      ON CONFLICT(request_id,event_id) DO NOTHING RETURNING seq`
      )
      .bind(
        eventId,
        token,
        value,
        now,
        id,
        ...authArgs(now),
        now,
        new Date(now).toISOString(),
        bytes
      ),
    db
      .prepare(
        `INSERT INTO stories(user_id,chapter_id,question_id,answer,voice_session_id,created_at,updated_at)
      SELECT p.user_id,p.chapter_id,p.question_id,${transcript},p.voice_session_id,?,? FROM phone_interviews p
      WHERE p.id = ? AND p.story_id IS NULL AND ${changed} ON CONFLICT(user_id,chapter_id,question_id) DO NOTHING`
      )
      .bind(stamp, stamp, id, token),
    db
      .prepare(
        `UPDATE phone_interviews AS p SET story_id = COALESCE(story_id,(SELECT id FROM stories WHERE user_id = p.user_id
      AND chapter_id = p.chapter_id AND question_id = p.question_id AND voice_session_id = p.voice_session_id)) WHERE id = ? AND ${changed}`
      )
      .bind(id, token),
    db
      .prepare(
        `UPDATE stories AS s SET answer = (SELECT ${transcript} FROM phone_interviews p WHERE p.id = ?),voice_session_id = (SELECT voice_session_id FROM phone_interviews WHERE id = ?),
      compiled_content = NULL,compiled_at = NULL,updated_at = ? WHERE id = (SELECT story_id FROM phone_interviews WHERE id = ?)
      AND EXISTS(SELECT 1 FROM phone_interviews p WHERE p.id = ? AND ${changed} AND (
        (s.answer IS p.source_answer AND s.updated_at IS p.source_version) OR (s.voice_session_id = p.voice_session_id AND s.answer = ${transcript})))`
      )
      .bind(id, id, stamp, id, id, token),
    db
      .prepare(
        `UPDATE phone_interviews AS p SET source_answer = CASE WHEN EXISTS(SELECT 1 FROM stories s WHERE s.id = p.story_id AND s.voice_session_id = p.voice_session_id AND s.answer = ${transcript} AND s.updated_at = ?) THEN ${transcript} ELSE source_answer END,
      source_version = CASE WHEN EXISTS(SELECT 1 FROM stories s WHERE s.id = p.story_id AND s.voice_session_id = p.voice_session_id AND s.answer = ${transcript} AND s.updated_at = ?) THEN ? ELSE source_version END,
      transcript_conflict = CASE WHEN EXISTS(SELECT 1 FROM stories s WHERE s.id = p.story_id AND s.voice_session_id = p.voice_session_id AND s.answer = ${transcript} AND s.updated_at = ?) THEN transcript_conflict ELSE 1 END,
      transcript_bytes = (SELECT COALESCE(SUM(length(CAST(transcript AS BLOB))),0) FROM phone_transcript_events WHERE request_id = p.id),updated_at = ? WHERE id = ? AND ${changed}`
      )
      .bind(stamp, stamp, stamp, stamp, now, id, token),
    db
      .prepare(
        `INSERT INTO story_outbox(id,user_id,story_id,event_type,payload,created_at)
      SELECT ?,p.user_id,p.story_id,'story-saved',json_object('storyId',p.story_id,'userId',p.user_id),? FROM phone_interviews p
      WHERE p.id = ? AND p.transcript_conflict = 0 AND ${changed} ON CONFLICT(id) DO NOTHING`
      )
      .bind(token, stamp, id, token),
    db
      .prepare(
        `UPDATE voice_sessions SET questions_answered = json_array((SELECT question_id FROM phone_interviews WHERE id = ?)),
      questions_since_compile = questions_since_compile + 1,updated_at = ? WHERE phone_request_id = ?
      AND EXISTS(SELECT 1 FROM phone_transcript_events WHERE request_id = ? AND mutation_token = ?)`
      )
      .bind(id, stamp, id, id, token)
  ])
  if (!results[0].results.length)
    throw new ApiError(409, {
      error: 'Phone transcript authority or size limit reached',
      code: 'PHONE_TRANSCRIPT_NOT_ACCEPTED'
    })
  return {
    duplicate: false,
    conflict: Boolean((await getPhoneInterview(db, id)).transcript_conflict)
  }
}

export async function finalizePhoneInterview(db, id, now = Date.now()) {
  const stamp = timestampForStorage(now)
  await db.batch([
    db
      .prepare(
        `INSERT INTO voice_compilation_jobs(session_id,user_id,updated_at)
      SELECT p.voice_session_id,p.user_id,? FROM phone_interviews p JOIN users u ON u.id = p.user_id
      WHERE p.id = ? AND p.finalized = 0 AND p.story_id IS NOT NULL AND p.transcript_conflict = 0 AND p.transcript_bytes > 0 AND u.deleted_at IS NULL
      ON CONFLICT(session_id) DO NOTHING`
      )
      .bind(stamp, id),
    db
      .prepare(
        `UPDATE voice_sessions SET session_status = 'completed',ended_at = ?,updated_at = ? WHERE phone_request_id = ?`
      )
      .bind(stamp, stamp, id),
    db
      .prepare(
        `UPDATE telnyx_calls SET transcript_saved = EXISTS(SELECT 1 FROM phone_interviews WHERE id = ? AND story_id IS NOT NULL AND transcript_conflict = 0 AND transcript_bytes > 0),
      call_status = 'completed',duration_seconds = (SELECT MAX(0,CAST((COALESCE(ended_at,?)-created_at)/1000 AS INTEGER)) FROM phone_interviews WHERE id = ?),
      ended_at = COALESCE(ended_at,?),updated_at = ? WHERE phone_request_id = ?`
      )
      .bind(id, now, id, stamp, stamp, id),
    db
      .prepare(
        `UPDATE phone_interviews SET finalized = 1,state = CASE WHEN state IN ('failed','cancelled') THEN state ELSE 'completed' END,
      ended_at = COALESCE(ended_at,?),updated_at = ? WHERE id = ?`
      )
      .bind(now, now, id)
  ])
}

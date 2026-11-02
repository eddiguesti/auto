import { ApiError, json } from './errors.js'
import { readJson, validate } from './request.js'
import { requireSigningSecret } from './auth.js'
import { enforceOpaqueLinkBudget, sha256 } from './auth-rate-limit.js'
import { authorizeMagic, issueMagicToken } from './magic-authorization.js'
import { timestampForStorage } from './value-codecs.js'
import { dispatchVoiceCompilation } from './voice-compilation.js'
const route = /^\/magic\/([A-Za-z0-9_-]{32,256})(?:\/(session|transcript|end-session))?$/
const expiry = column =>
  `julianday(CASE WHEN substr(${column},-3)='+00' THEN substr(${column},1,length(${column})-3)||'Z' ELSE ${column} END)`
const validLink = `e.used_at IS NOT NULL AND ${expiry('e.expires_at')}>julianday(?) AND u.deleted_at IS NULL`
export async function handleMagicExchange({ request, env, db, path, now }) {
  const match = route.exec(path)
  if (!match || match[2] || request.method !== 'GET') return null
  requireSigningSecret(env.JWT_SECRET)
  await enforceOpaqueLinkBudget(env, db, now)
  const hash = await sha256(match[1]),
    wall = timestampForStorage(now)
  const link = await db
    .prepare(
      `UPDATE email_session_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL AND ${expiry('expires_at')}>julianday(?)
  AND EXISTS(SELECT 1 FROM users WHERE id=email_session_tokens.user_id AND deleted_at IS NULL)
  RETURNING id,user_id,prompt_text,prompt_chapter_id,prompt_question_id,expires_at,
  (SELECT name FROM users WHERE id=email_session_tokens.user_id) AS name,(SELECT email FROM users WHERE id=email_session_tokens.user_id) AS email`
    )
    .bind(wall, hash, new Date(now).toISOString())
    .first()
  if (!link)
    throw new ApiError(404, {
      error: 'This link has expired or already been used. Check your email for a new one.'
    })
  const token = await issueMagicToken(link, env, now)
  return json({
    token,
    user: { name: link.name, id: link.user_id },
    prompt: {
      text: link.prompt_text,
      chapter_id: link.prompt_chapter_id,
      question_id: link.prompt_question_id
    }
  })
}
export async function handleMagicRoutes({ request, env, db, path, now, user, claims, token }) {
  const match = route.exec(path)
  if (!match || !match[2] || request.method !== 'POST') return null
  const hash = await sha256(match[1])
  const link = await authorizeMagic(db, token ?? { claims }, now, hash),
    wall = timestampForStorage(now)
  if (!env.GROK_API_KEY && match[2] === 'session')
    throw new ApiError(503, { error: 'Voice service unavailable' })
  const input = await readJson(request)
  if (match[2] === 'session') {
    if (input.chapterId !== undefined && input.chapterId !== link.prompt_chapter_id)
      throw new ApiError(403, { error: 'This link is limited to its emailed topic' })
    const rows = await db.batch([
      db
        .prepare(
          `INSERT INTO voice_sessions(user_id,chapter_id,created_at,updated_at,started_at)
    SELECT e.user_id,e.prompt_chapter_id,?,?,? FROM email_session_tokens e JOIN users u ON u.id=e.user_id WHERE e.id=? AND e.user_id=? AND ${validLink}
    AND NOT EXISTS(SELECT 1 FROM magic_voice_sessions WHERE token_id=e.id)`
        )
        .bind(wall, wall, wall, link.id, user.id, new Date(now).toISOString()),
      db
        .prepare(
          'INSERT INTO magic_voice_sessions(token_id,user_id,voice_session_id) SELECT ?,?,last_insert_rowid() WHERE changes()=1'
        )
        .bind(link.id, user.id),
      db
        .prepare(
          'SELECT v.id,v.questions_answered FROM magic_voice_sessions m JOIN voice_sessions v ON v.id=m.voice_session_id AND v.user_id=m.user_id WHERE m.token_id=? AND m.user_id=?'
        )
        .bind(link.id, user.id)
    ])
    const session = rows[2].results[0]
    if (!session) throw new ApiError(403, { error: 'Invalid or expired session link' })
    if (!env.VOICE_SESSIONS?.getByName)
      throw new ApiError(503, { error: 'Voice sessions unavailable' })
    const issued = await env.VOICE_SESSIONS.getByName(`user:${user.id}`).issueMagicTicket(
      request.headers.get('Authorization'),
      session.id
    )
    if (issued.error) throw new ApiError(issued.error.status, issued.error.body)
    return json({
      session_id: session.id,
      questions_answered: JSON.parse(session.questions_answered || '[]'),
      ...issued
    })
  }
  const body = validate(input, {
    session_id: { type: 'integer', required: true, min: 1, max: 2147483647 },
    chapter_id: { type: 'slug', maxLength: 50 },
    question_id: { type: 'slug', maxLength: 50 },
    ...(match[2] === 'transcript'
      ? {
          user_transcript: { type: 'string', required: true, minLength: 1, maxLength: 10000 },
          ai_transcript: { type: 'string', maxLength: 20000 }
        }
      : {})
  })
  if (body.session_id !== link.voice_session_id)
    throw new ApiError(403, { error: 'This link cannot access another interview' })
  if (
    (input.chapter_id !== undefined && input.chapter_id !== link.prompt_chapter_id) ||
    (input.question_id !== undefined && input.question_id !== link.prompt_question_id)
  )
    throw new ApiError(403, { error: 'This link is limited to its emailed topic' })
  if (match[2] === 'transcript') {
    const saved = await db.batch([
      db
        .prepare(
          `INSERT INTO stories(user_id,chapter_id,question_id,answer,voice_session_id,created_at,updated_at)
    SELECT e.user_id,e.prompt_chapter_id,e.prompt_question_id,?,?,?,? FROM email_session_tokens e JOIN users u ON u.id=e.user_id
    JOIN magic_voice_sessions m ON m.token_id=e.id AND m.user_id=e.user_id
    WHERE e.id=? AND e.user_id=? AND m.voice_session_id=? AND ${validLink}
    ON CONFLICT(user_id,chapter_id,question_id) DO UPDATE SET answer=excluded.answer,voice_session_id=excluded.voice_session_id,
      compiled_content=CASE WHEN stories.answer IS excluded.answer THEN stories.compiled_content ELSE NULL END,
      compiled_at=CASE WHEN stories.answer IS excluded.answer THEN stories.compiled_at ELSE NULL END,
      updated_at=CASE WHEN stories.answer IS excluded.answer THEN stories.updated_at ELSE excluded.updated_at END
      WHERE stories.voice_session_id=excluded.voice_session_id AND stories.answer=(SELECT json_extract(session_transcripts,'$[0].user_transcript') FROM voice_sessions WHERE id=excluded.voice_session_id AND user_id=excluded.user_id) RETURNING id`
        )
        .bind(
          body.user_transcript,
          body.session_id,
          wall,
          wall,
          link.id,
          user.id,
          body.session_id,
          new Date(now).toISOString()
        ),
      db
        .prepare(
          `UPDATE voice_sessions SET questions_answered=json_array(?),current_question_id=?,questions_since_compile=1,session_transcripts=json_array(json(?)),updated_at=? WHERE changes()=1 AND id=? AND user_id=? RETURNING id`
        )
        .bind(
          link.prompt_question_id,
          link.prompt_question_id,
          JSON.stringify({
            question_id: link.prompt_question_id,
            user_transcript: body.user_transcript,
            ai_transcript: body.ai_transcript || '',
            timestamp: new Date(now).toISOString()
          }),
          wall,
          body.session_id,
          user.id
        ),
      db
        .prepare(
          `INSERT INTO story_outbox(id,user_id,story_id,event_type,payload,created_at) SELECT ?,user_id,id,'story-saved',json_object('storyId',id,'userId',user_id,'chapterId',chapter_id,'questionId',question_id,'answer',answer),? FROM stories WHERE changes()=1 AND user_id=? AND voice_session_id=? AND chapter_id=? AND question_id=?`
        )
        .bind(
          crypto.randomUUID(),
          wall,
          user.id,
          body.session_id,
          link.prompt_chapter_id,
          link.prompt_question_id
        )
    ])
    if (!saved[0].results.length || !saved[1].results.length)
      throw new ApiError(409, {
        error:
          'A newer answer is already saved for this topic. Your conversation has been kept in this tab; download it or sign in to review both versions.'
      })
    return json({
      success: true,
      story_id: saved[0].results[0].id,
      questions_answered: [link.prompt_question_id],
      compilation_triggered: false,
      compilation_pending: true
    })
  }
  const ended = await db.batch([
    db
      .prepare(
        `UPDATE voice_sessions SET session_status='completed',ended_at=?,updated_at=? WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM email_session_tokens e JOIN users u ON u.id=e.user_id WHERE e.id=? AND e.user_id=? AND ${validLink}) RETURNING id`
      )
      .bind(wall, wall, body.session_id, user.id, link.id, user.id, new Date(now).toISOString()),
    db
      .prepare(
        `INSERT INTO voice_compilation_jobs(session_id,user_id,updated_at) SELECT id,user_id,? FROM voice_sessions WHERE changes()=1 AND id=? AND user_id=? AND EXISTS(SELECT 1 FROM stories WHERE user_id=? AND voice_session_id=? AND compiled_content IS NULL)
   ON CONFLICT(session_id) DO UPDATE SET version=voice_compilation_jobs.version+1,state=CASE WHEN voice_compilation_jobs.state IN ('processing','failed') THEN voice_compilation_jobs.state ELSE 'pending' END,updated_at=excluded.updated_at RETURNING session_id`
      )
      .bind(wall, body.session_id, user.id, user.id, body.session_id)
  ])
  if (!ended[0].results.length)
    throw new ApiError(403, { error: 'Invalid or expired session link' })
  const pending = ended[1].results.length > 0
  if (pending) await dispatchVoiceCompilation(env, body.session_id, user.id)
  return json({ success: true, compiled_count: 0, compilation_pending: pending })
}

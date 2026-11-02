import { ApiError } from './errors.js'
import { timestampForStorage } from './value-codecs.js'
import { grokWriting } from './writing-provider.js'
import { reserveAIUsage } from './ai-quota.js'

async function compileVoiceSession(env, db, userId, sessionId, lease) {
  const { results } = await db
    .prepare(
      `SELECT s.id,s.answer,s.updated_at FROM stories s JOIN users u ON u.id=s.user_id
    WHERE s.user_id=? AND s.voice_session_id=? AND s.compiled_content IS NULL AND u.deleted_at IS NULL
    ORDER BY s.id LIMIT 5`
    )
    .bind(userId, sessionId)
    .all()
  let compiled = 0
  for (const story of results) {
    if (!env.GROK_API_KEY) throw new ApiError(503, { error: 'Voice writing assistant unavailable' })
    const live = await db
      .prepare(
        `SELECT session_id FROM voice_compilation_jobs WHERE session_id=? AND user_id=? AND lease_id=? AND state='processing' AND lease_expires>?`
      )
      .bind(sessionId, userId, lease, Date.now())
      .first()
    if (!live) throw new ApiError(409, { error: 'Voice compilation lease expired' })
    await reserveAIUsage(db, userId, Date.now())
    const started = await db
      .prepare(
        `UPDATE voice_compilation_jobs SET provider_started=1 WHERE session_id=? AND user_id=? AND lease_id=? AND state='processing' AND provider_started=0 AND lease_expires>? RETURNING session_id`
      )
      .bind(sessionId, userId, lease, Date.now())
      .first()
    if (!started) throw new ApiError(409, { error: 'Voice compilation lease expired' })
    const text = await grokWriting(env, {
      messages: [
        {
          role: 'system',
          content:
            'Compile this voice interview into polished first-person memoir prose. Preserve the speaker’s authentic voice and every stated fact. Do not invent facts. Organize the transcript naturally. Write only the passage, without commentary.'
        },
        { role: 'user', content: story.answer }
      ],
      maxTokens: 1200,
      temperature: 0.7
    })
    const saved = await db.batch([
      db
        .prepare(
          `UPDATE stories SET compiled_content=?,compiled_at=?
      WHERE id=? AND user_id=? AND voice_session_id=? AND answer=? AND updated_at=? AND compiled_content IS NULL
      AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)
      AND EXISTS(SELECT 1 FROM voice_compilation_jobs WHERE session_id=? AND user_id=? AND lease_id=? AND state='processing' AND lease_expires>?) RETURNING id`
        )
        .bind(
          text,
          timestampForStorage(Date.now()),
          story.id,
          userId,
          sessionId,
          story.answer,
          story.updated_at,
          userId,
          sessionId,
          userId,
          lease,
          Date.now()
        ),
      db
        .prepare(
          `UPDATE voice_compilation_jobs SET provider_started=0 WHERE session_id=? AND user_id=? AND lease_id=? AND state='processing'`
        )
        .bind(sessionId, userId, lease)
    ])
    if (saved[0].results.length) compiled++
  }
  await db
    .prepare(
      `UPDATE voice_sessions SET questions_since_compile=(SELECT COUNT(*) FROM stories WHERE user_id=? AND voice_session_id=? AND compiled_content IS NULL),last_compile_at=?
    WHERE id=? AND user_id=?`
    )
    .bind(userId, sessionId, timestampForStorage(Date.now()), sessionId, userId)
    .run()
  const row = await db
    .prepare(
      'SELECT COUNT(*) AS count FROM stories WHERE user_id=? AND voice_session_id=? AND compiled_content IS NULL'
    )
    .bind(userId, sessionId)
    .first()
  return { compiled_count: compiled, remaining_count: row.count }
}
export async function dispatchVoiceCompilation(env, sessionId, userId) {
  if (!env.VOICE_COMPILE_QUEUE?.send) return false
  try {
    const job = await env.DB.withSession('first-primary')
      .prepare(
        `SELECT session_id FROM voice_compilation_jobs WHERE session_id=? AND user_id=? AND ((state='pending' AND not_before<=?) OR (state='processing' AND lease_expires<=?))`
      )
      .bind(sessionId, userId, Date.now(), Date.now())
      .first()
    if (!job) return false
    await env.VOICE_COMPILE_QUEUE.send({ kind: 'voice-compile', sessionId, userId })
    return true
  } catch {
    console.error('Voice compilation dispatch pending')
    return false
  }
}
export async function dispatchPendingVoiceCompilations(env) {
  if (!env.DB || !env.VOICE_COMPILE_QUEUE?.send) return
  const { results } = await env.DB.prepare(
    `SELECT session_id,user_id FROM voice_compilation_jobs
    WHERE (state='pending' AND not_before<=?) OR (state='processing' AND lease_expires<=?) LIMIT 100`
  )
    .bind(Date.now(), Date.now())
    .all()
  for (const row of results) await dispatchVoiceCompilation(env, row.session_id, row.user_id)
}
// Both the explicit HTTP action and queue deliveries use the same durable lease.
// A duplicate delivery or impatient retry cannot start another paid provider call.
export async function runVoiceCompilationJob(env, db, userId, sessionId) {
  const lease = crypto.randomUUID(),
    now = Date.now()
  // An isolate may have died after sending a paid request but before committing
  // its result. Stop instead of replaying an unconfirmed external effect.
  await db
    .prepare(
      `UPDATE voice_compilation_jobs SET state='failed',lease_id=NULL,lease_expires=NULL,last_error='A previous writing request could not be confirmed. Retry manually.',updated_at=? WHERE session_id=? AND user_id=? AND state='processing' AND lease_expires<=? AND provider_started=1`
    )
    .bind(timestampForStorage(now), sessionId, userId, now)
    .run()
  const job = await db
    .prepare(
      `UPDATE voice_compilation_jobs SET state='processing',lease_id=?,lease_expires=?,attempts=attempts+1
      WHERE session_id=? AND user_id=? AND provider_started=0 AND ((state='pending' AND not_before<=?) OR (state='processing' AND lease_expires<=?))
      AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL) RETURNING version`
    )
    .bind(lease, now + 10 * 60000, sessionId, userId, now, now, userId)
    .first()
  if (!job) {
    return null
  }
  try {
    const result = await compileVoiceSession(env, db, userId, sessionId, lease)
    await db
      .prepare(
        `UPDATE voice_compilation_jobs SET state=CASE WHEN version=? AND ?=0 THEN 'completed' ELSE 'pending' END,
        lease_id=NULL,lease_expires=NULL,last_error=NULL,updated_at=? WHERE session_id=? AND lease_id=?`
      )
      .bind(job.version, result.remaining_count, timestampForStorage(Date.now()), sessionId, lease)
      .run()
    if (result.remaining_count) await dispatchVoiceCompilation(env, sessionId, userId)
    return result
  } catch (error) {
    const quota = error instanceof ApiError && error.body.code === 'UPGRADE_REQUIRED'
    await db
      .prepare(
        `UPDATE voice_compilation_jobs SET state=CASE WHEN provider_started=1 THEN 'failed' ELSE 'pending' END,lease_id=NULL,lease_expires=NULL,
        not_before=?,last_error=?,updated_at=? WHERE session_id=? AND lease_id=?`
      )
      .bind(
        Date.now() + (quota ? 3600000 : 60000),
        quota ? 'AI allowance reached' : 'Writing provider unavailable',
        timestampForStorage(Date.now()),
        sessionId,
        lease
      )
      .run()
    throw error
  }
}
export async function handleVoiceQueue(batch, env) {
  const db = env.DB.withSession('first-primary')
  for (const message of batch.messages) {
    const { kind, sessionId, userId } = message.body || {}
    if (kind !== 'voice-compile' || !Number.isInteger(sessionId) || !Number.isInteger(userId)) {
      message.ack()
      continue
    }
    try {
      await runVoiceCompilationJob(env, db, userId, sessionId)
    } catch {
      // The durable pending row plus the scheduled dispatcher owns retries.
      // A database failure must retry the delivery rather than lose the work.
      const job = await db
        .prepare('SELECT state FROM voice_compilation_jobs WHERE session_id=? AND user_id=?')
        .bind(sessionId, userId)
        .first()
      if (job?.state === 'processing') {
        message.retry({ delaySeconds: 60 })
        continue
      }
    }
    message.ack()
  }
}

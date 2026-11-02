import { startNativeArtwork, pollNativeArtwork, downloadNativeArtwork } from './artwork-provider.js'
import { reserveAIUsage } from './ai-quota.js'
import { reserveWritingRate } from './writing-provider.js'
import { timestampForStorage } from './value-codecs.js'

const PREFIX = '/api/chapter-images/file/'
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/
export async function publishArtworkOutbox(env, now = Date.now()) {
  if (!env.DB || !env.ARTWORK_QUEUE?.send) throw new Error('Artwork queue bindings unavailable')
  const db = env.DB.withSession('first-primary'),
    token = crypto.randomUUID()
  // An expired paid boundary without a recorded provider id is ambiguous. The
  // consumer will pause it for review instead of issuing a second generation.
  await db
    .prepare(
      `UPDATE native_artwork_outbox SET state='pending',claim_token=NULL,lease_until=NULL WHERE job_id IN(
    SELECT id FROM native_artwork_jobs WHERE state IN('active','effect_started') AND lease_until<=?)`
    )
    .bind(now)
    .run()
  const claimed = await db
    .prepare(
      `UPDATE native_artwork_outbox SET claim_token=?,lease_until=? WHERE job_id IN(
    SELECT o.job_id FROM native_artwork_outbox o JOIN native_artwork_jobs j ON j.id=o.job_id
    WHERE o.state='pending' AND (o.lease_until IS NULL OR o.lease_until<=?) AND j.next_attempt_at<=? AND (j.lease_until IS NULL OR j.lease_until<=?)
      AND j.state IN('queued','active','effect_started','provider_pending') ORDER BY j.next_attempt_at LIMIT 10) RETURNING job_id`
    )
    .bind(token, now + 60000, now, now, now)
    .all()
  for (const row of claimed.results) {
    await env.ARTWORK_QUEUE.send({ version: 1, artworkJobId: row.job_id })
    await db
      .prepare(
        `UPDATE native_artwork_outbox SET state='published',claim_token=NULL,lease_until=NULL WHERE job_id=? AND claim_token=?`
      )
      .bind(row.job_id, token)
      .run()
  }
  return claimed.results.length
}

export async function consumeArtworkQueue(batch, env, { now = () => Date.now() } = {}) {
  if (!env.DB || !env.MEDIA) throw new Error('Artwork storage bindings unavailable')
  const db = env.DB.withSession('first-primary')
  for (const message of batch.messages) {
    const id = message.body?.artworkJobId
    if (
      message.body?.version !== 1 ||
      !UUID.test(id || '') ||
      Object.keys(message.body).sort().join(',') !== 'artworkJobId,version'
    ) {
      message.ack()
      continue
    }
    const instant = now(),
      token = crypto.randomUUID()
    const job = await db
      .prepare(
        `UPDATE native_artwork_jobs SET state='active',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=?
      WHERE id=? AND state IN('queued','active','effect_started','provider_pending') AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?)
      AND EXISTS(SELECT 1 FROM users WHERE id=native_artwork_jobs.user_id AND deleted_at IS NULL) RETURNING *`
      )
      .bind(token, instant + 900000, instant, id, instant, instant)
      .first()
    if (!job) {
      const current = await db
        .prepare('SELECT state FROM native_artwork_jobs WHERE id=?')
        .bind(id)
        .first()
      if (
        current &&
        ['queued', 'active', 'effect_started', 'provider_pending'].includes(current.state)
      )
        message.retry({ delaySeconds: 60 })
      else message.ack()
      continue
    }
    const fence = `EXISTS(SELECT 1 FROM native_artwork_jobs j JOIN users u ON u.id=j.user_id WHERE j.id=? AND j.lease_token=? AND j.lease_until>? AND j.state IN('active','effect_started') AND u.deleted_at IS NULL)`
    const terminal = async (state, code) => {
      await db.batch([
        db
          .prepare(
            `UPDATE chapter_images SET generation_status='failed',updated_at=? WHERE user_id=? AND chapter_id=? AND ${fence}`
          )
          .bind(timestampForStorage(now()), job.user_id, job.chapter_id, id, token, now()),
        db
          .prepare(
            `UPDATE native_artwork_jobs SET state=?,error_code=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?`
          )
          .bind(state, code, now(), id, token)
      ])
    }
    const defer = async (providerId, delay = 15000, resetAttempts = true) => {
      const result = await db.batch([
        db
          .prepare(
            `UPDATE native_artwork_jobs SET state='provider_pending',provider_request_id=?,lease_token=NULL,lease_until=NULL,attempts=CASE WHEN ?=1 THEN 0 ELSE attempts END,next_attempt_at=?,updated_at=?
          WHERE id=? AND lease_token=? AND lease_until>? AND EXISTS(SELECT 1 FROM users WHERE id=native_artwork_jobs.user_id AND deleted_at IS NULL) RETURNING id`
          )
          .bind(providerId, resetAttempts ? 1 : 0, now() + delay, now(), id, token, now()),
        db
          .prepare(
            `UPDATE native_artwork_outbox SET state='pending',claim_token=NULL,lease_until=NULL WHERE job_id=? AND EXISTS(SELECT 1 FROM native_artwork_jobs WHERE id=? AND state='provider_pending')`
          )
          .bind(id, id)
      ])
      if (!result[0].results.length) throw new Error('ARTWORK_CLAIM_LOST')
    }
    try {
      if (instant - job.created_at > 23 * 3600000) {
        await terminal('failed', 'ARTWORK_REQUEST_EXPIRED')
        message.ack()
        continue
      }
      if (!job.provider_request_id) {
        // A reclaimed active job that already crossed the paid boundary has no
        // safe provider identifier to resume. Never automatically buy it again.
        const prior = await db
          .prepare('SELECT error_code FROM native_artwork_jobs WHERE id=?')
          .bind(id)
          .first()
        if (prior.error_code === 'ARTWORK_EFFECT_STARTED') {
          await terminal('review', 'ARTWORK_PROVIDER_OUTCOME_UNKNOWN')
          message.ack()
          continue
        }
        if (!env.GROK_API_KEY) {
          await terminal('failed', 'ARTWORK_UNAVAILABLE')
          message.ack()
          continue
        }
        await reserveWritingRate(db, job.user_id, now())
        await reserveAIUsage(db, job.user_id, now())
        const started = await db
          .prepare(
            `UPDATE native_artwork_jobs SET state='effect_started',error_code='ARTWORK_EFFECT_STARTED',updated_at=? WHERE id=? AND lease_token=? AND lease_until>? AND state='active'
          AND EXISTS(SELECT 1 FROM users WHERE id=native_artwork_jobs.user_id AND deleted_at IS NULL) RETURNING id`
          )
          .bind(now(), id, token, now())
          .first()
        if (!started) throw new Error('ARTWORK_CLAIM_LOST')
        await defer(await startNativeArtwork(env, job.prompt))
        message.ack()
        continue
      }
      const result = await pollNativeArtwork(env, job.provider_request_id)
      if (result.status === 'pending') {
        await defer(job.provider_request_id)
        message.ack()
        continue
      }
      if (result.status === 'failed') {
        await terminal('failed', 'ARTWORK_PROVIDER_REJECTED')
        message.ack()
        continue
      }
      if (
        result.status !== 'done' ||
        !Array.isArray(result.data) ||
        result.data.length !== 1 ||
        typeof result.data[0]?.url !== 'string'
      )
        throw new Error('INVALID_ARTWORK_OUTPUT')
      const image = await downloadNativeArtwork(env, result.data[0].url)
      const objectKey = `${job.object_key}/${crypto.randomUUID()}`
      const reserved = await db
        .prepare(
          `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
        SELECT ?,?,? FROM native_artwork_jobs WHERE id=? AND lease_token=? AND lease_until>? AND ${fence}
        ON CONFLICT(object_key) DO UPDATE SET next_attempt_at=MAX(media_deletion_jobs.next_attempt_at,excluded.next_attempt_at) RETURNING object_key`
        )
        .bind(
          objectKey,
          timestampForStorage(now() + 3600000, 'instant'),
          timestampForStorage(now(), 'instant'),
          id,
          token,
          now(),
          id,
          token,
          now()
        )
        .first()
      if (!reserved) throw new Error('ARTWORK_CLAIM_LOST')
      const stored = await env.MEDIA.put(objectKey, image.bytes, {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: image.type, cacheControl: 'private, no-store' }
      })
      if (!stored) throw new Error('ARTWORK_OBJECT_ALREADY_EXISTS')
      const stamp = timestampForStorage(now())
      const saved = await db.batch([
        db
          .prepare(
            `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
          SELECT substr(image_url,length(?)+1),?,? FROM chapter_images WHERE user_id=? AND chapter_id=? AND image_url LIKE ? AND image_url<>? AND ${fence}
          ON CONFLICT(object_key) DO NOTHING`
          )
          .bind(
            PREFIX,
            timestampForStorage(now(), 'instant'),
            timestampForStorage(now(), 'instant'),
            job.user_id,
            job.chapter_id,
            `${PREFIX}%`,
            `${PREFIX}${objectKey}`,
            id,
            token,
            now()
          ),
        db
          .prepare(
            `UPDATE chapter_images SET image_url=?,prompt_used=?,generation_status='completed',updated_at=? WHERE user_id=? AND chapter_id=? AND ${fence} RETURNING id`
          )
          .bind(
            `${PREFIX}${objectKey}`,
            job.prompt,
            stamp,
            job.user_id,
            job.chapter_id,
            id,
            token,
            now()
          ),
        db
          .prepare(
            `UPDATE native_artwork_jobs SET object_key=?,state='completed',error_code=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND lease_until>? AND EXISTS(SELECT 1 FROM chapter_images WHERE user_id=? AND chapter_id=? AND image_url=? AND generation_status='completed') RETURNING id`
          )
          .bind(
            objectKey,
            now(),
            id,
            token,
            now(),
            job.user_id,
            job.chapter_id,
            `${PREFIX}${objectKey}`
          ),
        db
          .prepare(
            `DELETE FROM media_deletion_jobs WHERE object_key=? AND EXISTS(SELECT 1 FROM chapter_images WHERE user_id=? AND chapter_id=? AND image_url=?)`
          )
          .bind(objectKey, job.user_id, job.chapter_id, `${PREFIX}${objectKey}`)
      ])
      if (!saved[1].results.length || !saved[2].results.length)
        throw new Error('ARTWORK_CLAIM_LOST')
      message.ack()
    } catch (error) {
      const current = await db
        .prepare(
          'SELECT state,provider_request_id FROM native_artwork_jobs WHERE id=? AND lease_token=?'
        )
        .bind(id, token)
        .first()
      if (!current) {
        message.ack()
        continue
      }
      if (current.state === 'effect_started' && !current.provider_request_id) {
        await terminal('review', 'ARTWORK_PROVIDER_OUTCOME_UNKNOWN')
        message.ack()
        continue
      }
      if (error.status === 403 || error.status === 429) {
        await terminal('failed', error.body?.code || 'ARTWORK_RATE_LIMITED')
        message.ack()
        continue
      }
      if (job.attempts >= 3) {
        await terminal('failed', error.body?.code || 'ARTWORK_OUTPUT_UNAVAILABLE')
        message.ack()
        continue
      }
      // Safe retries only poll/download the same paid generation. D1 metadata
      // and object writes can repeat without another generation request.
      await defer(job.provider_request_id, 60000, false)
      message.ack()
    }
  }
}

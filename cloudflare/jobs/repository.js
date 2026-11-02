import { timestampForStorage } from '../api/value-codecs.js'

export class GenerationError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}
const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
const terminal = new Set(['completed', 'failed', 'needs_reconciliation', 'cancelled'])
const LEASE_MS = 15 * 60_000
const CLEANUP_MS = 60 * 60_000
const decode = row => (row ? { ...row, payload: JSON.parse(row.payload) } : null)
const entitled = `(EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'completed'
  AND p.product_type IN (?, 'premium_bundle')) OR (SELECT COUNT(*) FROM users e WHERE e.id <= u.id) <= 100)`

export function createGenerationRepository(db, { now = () => Date.now() } = {}) {
  const instant = time => timestampForStorage(new Date(time), 'instant')
  const current = `id = ? AND lease_token = ? AND lease_until > ? AND state IN ('active', 'effect_started')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = generation_jobs.user_id AND u.deleted_at IS NULL)`
  const api = {
    async enqueue({ userId, kind, requestKey, payload = {} }) {
      if (
        !Number.isSafeInteger(userId) ||
        userId < 1 ||
        !['audiobook', 'epub', 'style'].includes(kind) ||
        typeof requestKey !== 'string' ||
        !/^[A-Za-z0-9_.,:-]{1,100}$/.test(requestKey) ||
        !payload ||
        Array.isArray(payload) ||
        typeof payload !== 'object'
      )
        throw new GenerationError('INVALID_GENERATION_REQUEST')
      const encoded = JSON.stringify(payload)
      if (new TextEncoder().encode(encoded).byteLength > 16_384)
        throw new GenerationError('GENERATION_PAYLOAD_TOO_LARGE')
      const previous = await db
        .prepare(
          'SELECT * FROM generation_jobs WHERE owner_id = ? AND kind = ? AND request_key = ?'
        )
        .bind(userId, kind, requestKey)
        .first()
      if (previous) {
        if (previous.payload !== encoded) throw new GenerationError('IDEMPOTENCY_KEY_REUSED')
        return decode(previous)
      }
      const id = crypto.randomUUID(),
        time = now()
      const objectKey =
        kind === 'style'
          ? null
          : `${kind === 'epub' ? 'exports' : 'audiobooks'}/${userId}_Life_Story_${id}.${kind === 'epub' ? 'epub' : 'mp3'}`
      const product = kind === 'epub' ? 'export' : 'audiobook'
      const quota =
        kind !== 'audiobook'
          ? '1'
          : `(SELECT COUNT(*) FROM audiobook_generation_requests r WHERE r.user_id = u.id AND julianday(replace(r.created_at, '+00', 'Z')) > julianday(replace(?, '+00', 'Z'))) < 3
        AND NOT EXISTS (SELECT 1 FROM audiobook_generation_requests r WHERE r.user_id = u.id AND julianday(replace(r.created_at, '+00', 'Z')) > julianday(replace(?, '+00', 'Z')))`
      const permission = kind === 'style' ? '1' : entitled
      const params = [
        id,
        userId,
        kind,
        requestKey,
        encoded,
        objectKey,
        time + CLEANUP_MS,
        time,
        time,
        userId,
        ...(kind === 'style' ? [] : [product]),
        ...(kind === 'audiobook' ? [instant(time - 86_400_000), instant(time - 900_000)] : [])
      ]
      await db.batch([
        db
          .prepare(
            `INSERT INTO generation_jobs (id, user_id, owner_id, kind, request_key, payload, object_key, safe_cleanup_after, created_at, updated_at)
          SELECT ?, u.id, ?, ?, ?, ?, ?, ?, ?, ? FROM users u WHERE u.id = ? AND u.deleted_at IS NULL AND ${permission} AND ${quota}
          ON CONFLICT (owner_id, kind, request_key) DO NOTHING`
          )
          .bind(...params),
        db
          .prepare(
            `INSERT INTO audiobook_generation_requests (user_id, job_id, created_at)
          SELECT user_id, id, ? FROM generation_jobs WHERE id = ? AND kind = 'audiobook'`
          )
          .bind(instant(time), id),
        db
          .prepare(
            'INSERT INTO generation_outbox (job_id) SELECT id FROM generation_jobs WHERE id = ?'
          )
          .bind(id)
      ])
      const job = await db
        .prepare(
          'SELECT * FROM generation_jobs WHERE owner_id = ? AND kind = ? AND request_key = ?'
        )
        .bind(userId, kind, requestKey)
        .first()
      if (!job) throw new GenerationError('GENERATION_NOT_ACCEPTED')
      if (job.payload !== encoded) throw new GenerationError('IDEMPOTENCY_KEY_REUSED')
      return decode(job)
    },
    async getOwned(userId, id) {
      if (!uuid(id)) return null
      return decode(
        await db
          .prepare(
            `SELECT j.* FROM generation_jobs j JOIN users u ON u.id = j.user_id
        WHERE j.id = ? AND j.owner_id = ? AND u.deleted_at IS NULL`
          )
          .bind(id, userId)
          .first()
      )
    },
    async get(id) {
      return uuid(id)
        ? decode(await db.prepare('SELECT * FROM generation_jobs WHERE id = ?').bind(id).first())
        : null
    },
    async claim(id) {
      if (!uuid(id)) return null
      const time = now(),
        token = crypto.randomUUID()
      const results = await db.batch([
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'needs_reconciliation', error_code = 'PROVIDER_OUTCOME_UNKNOWN', updated_at = ?
          WHERE id = ? AND state = 'effect_started' AND lease_until <= ?`
          )
          .bind(time, id, time),
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'active', lease_token = ?, lease_until = ?,
          safe_cleanup_after = MAX(safe_cleanup_after, ?), attempts = attempts + 1, updated_at = ?,
          object_key = CASE WHEN kind = 'style' THEN NULL ELSE
            (CASE WHEN kind = 'epub' THEN 'exports/' ELSE 'audiobooks/' END) || owner_id || '_Life_Story_' || id || '_' || ? ||
            (CASE WHEN kind = 'epub' THEN '.epub' ELSE '.mp3' END) END
          WHERE id = ? AND (state = 'queued' OR (state = 'active' AND lease_until <= ?))
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = generation_jobs.user_id AND u.deleted_at IS NULL)
          RETURNING *`
          )
          .bind(token, time + LEASE_MS, time + CLEANUP_MS, time, token, id, time),
        db
          .prepare(
            `INSERT INTO media_deletion_jobs (object_key, next_attempt_at, created_at)
          SELECT object_key, ?, ? FROM generation_jobs WHERE id = ? AND lease_token = ? AND object_key IS NOT NULL
          ON CONFLICT (object_key) DO UPDATE SET next_attempt_at = MAX(media_deletion_jobs.next_attempt_at, excluded.next_attempt_at)`
          )
          .bind(instant(time + CLEANUP_MS), instant(time), id, token)
      ])
      return decode(results[1].results[0])
    },
    async assertClaim(claim) {
      const found = await db
        .prepare(`SELECT id FROM generation_jobs WHERE ${current}`)
        .bind(claim.id, claim.lease_token, now())
        .first()
      if (!found) throw new GenerationError('GENERATION_CLAIM_LOST')
      return true
    },
    async setInputHash(claim, inputHash) {
      const result = await db
        .prepare(
          `UPDATE generation_jobs SET input_hash = ? WHERE ${current}
        AND (input_hash IS NULL OR input_hash = ?) RETURNING id`
        )
        .bind(inputHash, claim.id, claim.lease_token, now(), inputHash)
        .first()
      if (!result) throw new GenerationError('GENERATION_INPUT_CHANGED_OR_CLAIM_LOST')
    },
    async beginProviderEffect(claim, { voiceFilename = null } = {}) {
      const time = now()
      const result = await db
        .prepare(
          `UPDATE generation_jobs SET state = 'effect_started', updated_at = ?
          WHERE ${current} AND state = 'active'
          AND (kind <> 'audiobook' OR EXISTS (SELECT 1 FROM users u WHERE u.id = generation_jobs.user_id AND ${entitled}))
          AND (kind <> 'audiobook' OR COALESCE(json_extract(payload, '$.useOwnVoice'), 0) = 0 OR EXISTS
            (SELECT 1 FROM voice_models v WHERE v.user_id = generation_jobs.user_id AND v.consent_given = 1 AND v.fish_model_id = ?)) RETURNING id`
        )
        .bind(time, claim.id, claim.lease_token, time, 'audiobook', voiceFilename)
        .first()
      if (!result) throw new GenerationError('GENERATION_CLAIM_LOST')
    },
    async complete(claim) {
      const time = now(),
        timestamp = instant(time),
        wallTimestamp = timestampForStorage(time)
      const fence = `id = ? AND lease_token = ? AND state = 'completed' AND accounted_at IS NULL`
      const result = await db.batch([
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'completed', completed_at = ?, updated_at = ? WHERE ${current}
          AND (kind <> 'audiobook' OR state = 'effect_started')
          AND (kind = 'style' OR EXISTS (SELECT 1 FROM users u WHERE u.id = generation_jobs.user_id AND ${entitled})) RETURNING id`
          )
          .bind(
            time,
            time,
            claim.id,
            claim.lease_token,
            time,
            claim.kind === 'epub' ? 'export' : 'audiobook'
          ),
        db
          .prepare(
            `INSERT INTO audiobooks (user_id, filename, voice_type, created_at)
          SELECT user_id, substr(object_key, length('audiobooks/') + 1),
          CASE WHEN json_extract(payload, '$.useOwnVoice') = 1 THEN 'custom' ELSE 'default' END, ?
          FROM generation_jobs WHERE ${fence} AND kind = 'audiobook'`
          )
          .bind(wallTimestamp, claim.id, claim.lease_token),
        db
          .prepare(
            `INSERT INTO generated_exports (user_id, format, created_at)
          SELECT user_id, kind, ? FROM generation_jobs WHERE ${fence} AND kind IN ('audiobook', 'epub')`
          )
          .bind(timestamp, claim.id, claim.lease_token),
        db
          .prepare(`UPDATE generation_jobs SET accounted_at = ? WHERE ${fence}`)
          .bind(time, claim.id, claim.lease_token),
        db
          .prepare(
            `DELETE FROM media_deletion_jobs WHERE object_key IN (SELECT object_key FROM generation_jobs
          WHERE id = ? AND lease_token = ? AND state = 'completed')`
          )
          .bind(claim.id, claim.lease_token)
      ])
      if (!result[0].results.length) throw new GenerationError('GENERATION_CLAIM_LOST')
    },
    async defer(claim) {
      const time = now()
      const results = await db.batch([
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'queued', lease_token = NULL, lease_until = NULL, updated_at = ?
          WHERE ${current} AND state = 'active' RETURNING id`
          )
          .bind(time, claim.id, claim.lease_token, time),
        db
          .prepare(
            `UPDATE generation_outbox SET state = 'pending', claim_token = NULL, lease_until = NULL
          WHERE job_id = ? AND EXISTS (SELECT 1 FROM generation_jobs WHERE id = ? AND state = 'queued')`
          )
          .bind(claim.id, claim.id)
      ])
      if (!results[0].results.length) throw new GenerationError('GENERATION_CLAIM_LOST')
    },
    async fail(claim, { permanent = false, code = 'GENERATION_FAILED' } = {}) {
      const time = now()
      // Once a paid effect starts, even a transport error has an ambiguous
      // provider outcome. Never automatically replay or charge it a second time.
      await db.batch([
        db
          .prepare(
            `UPDATE generation_jobs SET state = CASE WHEN state = 'effect_started' OR ? = 'STYLE_PROVIDER_OUTCOME_UNKNOWN' THEN 'needs_reconciliation'
        WHEN ? = 1 OR attempts >= 3 THEN 'failed' ELSE 'queued' END, error_code = ?, updated_at = ?
        WHERE id = ? AND lease_token = ? AND state IN ('active', 'effect_started')`
          )
          .bind(code, permanent ? 1 : 0, code, time, claim.id, claim.lease_token),
        db
          .prepare(
            `UPDATE generation_outbox SET state = 'pending', claim_token = NULL, lease_until = NULL
        WHERE job_id = ? AND EXISTS (SELECT 1 FROM generation_jobs WHERE id = ? AND state = 'queued')`
          )
          .bind(claim.id, claim.id)
      ])
      const job = await api.get(claim.id)
      return job
    },
    async recover() {
      const time = now()
      await db.batch([
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'needs_reconciliation', error_code = 'PROVIDER_OUTCOME_UNKNOWN', updated_at = ?
          WHERE state = 'effect_started' AND lease_until <= ?`
          )
          .bind(time, time),
        db
          .prepare(
            `UPDATE generation_jobs SET state = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
          error_code = 'WORKER_INTERRUPTED', updated_at = ? WHERE state = 'active' AND lease_until <= ?`
          )
          .bind(time, time),
        db
          .prepare(
            `UPDATE generation_jobs SET state = 'cancelled', lease_token = NULL, lease_until = NULL, updated_at = ?
          WHERE state IN ('queued', 'active', 'effect_started') AND NOT EXISTS
          (SELECT 1 FROM users u WHERE u.id = generation_jobs.user_id AND u.deleted_at IS NULL)`
          )
          .bind(time),
        db
          .prepare(
            `UPDATE generation_outbox SET state = 'pending', claim_token = NULL, lease_until = NULL
          WHERE state = 'published' AND job_id IN (SELECT id FROM generation_jobs WHERE state = 'queued' AND updated_at <= ?)`
          )
          .bind(time - 60_000)
      ])
    },
    async cancelForOwner(userId) {
      await db
        .prepare(
          `UPDATE generation_jobs SET state = 'cancelled', lease_token = NULL, lease_until = NULL,
        updated_at = ? WHERE owner_id = ? AND state NOT IN ('completed', 'failed', 'needs_reconciliation', 'cancelled')`
        )
        .bind(now(), userId)
        .run()
    },
    async cleanupAllowed(objectKey) {
      const row = await db
        .prepare('SELECT state, safe_cleanup_after FROM generation_jobs WHERE object_key = ?')
        .bind(objectKey)
        .first()
      return !row || row.state === 'completed' || row.safe_cleanup_after <= now()
    },
    async publish(queue, limit = 20) {
      if (!queue?.send) throw new GenerationError('GENERATION_QUEUE_BINDING_REQUIRED')
      const time = now(),
        token = crypto.randomUUID()
      const { results } = await db
        .prepare(
          `UPDATE generation_outbox SET claim_token = ?, lease_until = ?, attempts = attempts + 1
        WHERE job_id IN (SELECT o.job_id FROM generation_outbox o JOIN generation_jobs j ON j.id = o.job_id
        WHERE o.state = 'pending' AND (o.lease_until IS NULL OR o.lease_until <= ?) AND j.state = 'queued' ORDER BY j.created_at LIMIT ?)
        RETURNING job_id`
        )
        .bind(token, time + 60_000, time, Math.max(1, Math.min(100, limit)))
        .all()
      for (const item of results) {
        await queue.send({ version: 1, jobId: item.job_id })
        // A crash after send leaves a claim which expires. Duplicate delivery
        // is harmless because processing claims/idempotency live in D1.
        await db
          .prepare(
            `UPDATE generation_outbox SET state = 'published', published_at = ?, claim_token = NULL, lease_until = NULL
          WHERE job_id = ? AND claim_token = ?`
          )
          .bind(now(), item.job_id, token)
          .run()
      }
      return results.length
    }
  }
  return api
}

export function generationTerminal(state) {
  return terminal.has(state)
}

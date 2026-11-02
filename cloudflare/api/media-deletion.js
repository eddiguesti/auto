import { timestampForStorage } from './value-codecs.js'
import { validateObjectKey } from '../../services/api/utils/mediaKey.js'

// One atomic mutation claims a bounded page across isolates. This handler is
// deliberately separate from notification schedules; it never sends messages.
export async function processMediaDeletionJobs(env, now = Date.now()) {
  if (!env.DB || !env.MEDIA) throw new Error('D1 and private R2 bindings required')
  const db = env.DB.withSession('first-primary')
  const lease = timestampForStorage(now + 300000, 'instant')
  const { results: jobs } = await db
    .prepare(
      `UPDATE media_deletion_jobs SET next_attempt_at = ?
    WHERE object_key IN (SELECT object_key FROM media_deletion_jobs
      WHERE julianday(replace(next_attempt_at, '+00', 'Z')) <= julianday(?)
      ORDER BY next_attempt_at, object_key LIMIT 20) RETURNING object_key`
    )
    .bind(lease, new Date(now).toISOString())
    .all()
  let deleted = 0,
    retained = 0,
    failed = 0,
    deferred = 0
  for (const { object_key: key } of jobs) {
    try {
      validateObjectKey(key)
      const generation = await db
        .prepare(
          `SELECT j.state,j.safe_cleanup_after,
        EXISTS(SELECT 1 FROM users u WHERE u.id=j.user_id AND u.deleted_at IS NULL) AS live_owner
        FROM generation_jobs j WHERE j.object_key=?`
        )
        .bind(key)
        .first()
      if (
        generation &&
        generation.safe_cleanup_after > now &&
        !(generation.state === 'completed' && generation.live_owner)
      ) {
        // A provider or R2 put may still finish after account cancellation. Keep
        // the erasure intent until the producer's safe window has elapsed.
        await db
          .prepare(
            'UPDATE media_deletion_jobs SET next_attempt_at=? WHERE object_key=? AND next_attempt_at=?'
          )
          .bind(timestampForStorage(generation.safe_cleanup_after, 'instant'), key, lease)
          .run()
        deferred++
        continue
      }
      // A crash after metadata commit but before removing the compensation intent
      // must never erase a successfully attached recording or other live media.
      const attached = await db
        .prepare(
          `SELECT 1 AS present WHERE EXISTS(SELECT 1 FROM voice_uploads WHERE object_key = ?)
        OR EXISTS(SELECT 1 FROM photos WHERE filename = ?)
        OR EXISTS(SELECT 1 FROM voice_models WHERE 'voices/' || fish_model_id = ?)
        OR EXISTS(SELECT 1 FROM audiobooks WHERE 'audiobooks/' || filename = ?)
        OR EXISTS(SELECT 1 FROM print_orders WHERE text_key = ? OR cover_key = ?)
        OR EXISTS(SELECT 1 FROM chapter_images c JOIN users u ON u.id=c.user_id
          WHERE c.image_url='/api/chapter-images/file/'||? AND u.deleted_at IS NULL)
        OR EXISTS(SELECT 1 FROM memos WHERE audio_url = ? OR (? LIKE 'memos/%' AND '/api/memos/audio/' || substr(?,7) = audio_url))
        OR EXISTS(SELECT 1 FROM generation_jobs j JOIN users u ON u.id=j.user_id
          WHERE j.object_key=? AND j.state='completed' AND u.deleted_at IS NULL)`
        )
        .bind(key, key, key, key, key, key, key, key, key, key, key)
        .first()
      if (attached) retained++
      else {
        await env.MEDIA.delete(key)
        deleted++
      }
      await db
        .prepare('DELETE FROM media_deletion_jobs WHERE object_key = ? AND next_attempt_at = ?')
        .bind(key, lease)
        .run()
    } catch {
      failed++
      // No provider text, object keys or memoir contents in logs/status.
      await db
        .prepare(
          `UPDATE media_deletion_jobs SET attempts = attempts + 1,
        last_error = 'Media deletion failed; retry scheduled', next_attempt_at = ?
        WHERE object_key = ? AND next_attempt_at = ?`
        )
        .bind(timestampForStorage(now + 900000, 'instant'), key, lease)
        .run()
    }
  }
  return { claimed: jobs.length, deleted, retained, failed, deferred }
}

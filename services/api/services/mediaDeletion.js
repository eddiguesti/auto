import { objectStorage, validateObjectKey } from '../utils/objectStorage.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger('media-deletion')

export async function scheduleAccountMediaDeletion(db, userId) {
  const { rows } = await db.query(
    `SELECT p.filename AS object_key FROM photos p LEFT JOIN stories s ON s.id=p.story_id
       WHERE p.user_id=$1 OR s.user_id=$1
     UNION SELECT 'voices/' || fish_model_id FROM voice_models WHERE user_id=$1
     UNION SELECT 'audiobooks/' || filename FROM audiobooks WHERE user_id=$1
     UNION SELECT text_key FROM print_orders WHERE user_id=$1
     UNION SELECT cover_key FROM print_orders WHERE user_id=$1
     UNION SELECT audio_url FROM memos WHERE user_id=$1
     UNION SELECT object_key FROM voice_uploads WHERE user_id=$1`,
    [userId]
  )
  for (const row of rows) {
    let key = row.object_key
    if (!key) continue
    // Legacy memo URLs use the authenticated media route. Never delete an
    // arbitrary external URL or path supplied as an old audio_url value.
    if (key.startsWith('/api/memos/audio/')) key = `memos/${key.split('/').at(-1)}`
    try {
      validateObjectKey(key)
    } catch {
      continue
    }
    await db.query(
      'INSERT INTO media_deletion_jobs (object_key) VALUES ($1) ON CONFLICT (object_key) DO NOTHING',
      [key]
    )
  }
}

export async function processMediaDeletionJobs(db, storage = objectStorage) {
  // Claiming is atomic across worker replicas; a crash releases the lease later.
  const { rows } = await db.query(
    `UPDATE media_deletion_jobs SET next_attempt_at=NOW()+INTERVAL '5 minutes'
     WHERE object_key IN (SELECT object_key FROM media_deletion_jobs
       WHERE next_attempt_at<=NOW() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED)
     RETURNING object_key`
  )
  for (const { object_key: key } of rows) {
    try {
      await storage.delete(key)
      await db.query('DELETE FROM media_deletion_jobs WHERE object_key=$1', [key])
    } catch (error) {
      logger.warn('Stored media deletion will retry', { error: error.message })
      await db.query(
        `UPDATE media_deletion_jobs SET attempts=attempts+1,last_error=$2,
         next_attempt_at=NOW()+INTERVAL '15 minutes' WHERE object_key=$1`,
        [key, 'Media deletion failed; retry scheduled']
      )
    }
  }
}

export function startMediaDeletionWorker(db) {
  let running
  const poll = () => {
    if (running) return
    running = processMediaDeletionJobs(db)
      .catch(error => logger.error('Media deletion polling failed', { error: error.message }))
      .finally(() => {
        running = null
      })
  }
  const timer = setInterval(poll, 30000)
  void poll()
  return {
    async stop() {
      clearInterval(timer)
      await running
    }
  }
}

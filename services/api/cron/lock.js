/**
 * Distributed cron lock using Redis SET NX.
 * Prevents duplicate job execution when multiple API instances run simultaneously.
 *
 * If Redis is unavailable, execution is allowed (falls back to single-instance behavior).
 * If the job crashes, the lock expires automatically after LOCK_TTL seconds.
 */

import os from 'os'
import { randomUUID } from 'node:crypto'
import redis, { isRedisAvailable } from '../utils/redis.js'
import { captureException } from '../utils/sentry.js'

// Unique ID for this process — used to verify we still own the lock before releasing
const INSTANCE_ID = `${os.hostname()}:${process.pid}`

// Lock expires after 30 minutes — longer than any realistic cron job
const LOCK_TTL = 1800

/**
 * Execute fn() only if this instance acquires the distributed lock for `name`.
 * Logs and skips silently if another instance holds the lock.
 *
 * @param {string} name - Unique cron job name (used as the Redis key suffix)
 * @param {function} fn - Async function to run under the lock
 */
export async function withCronLock(name, fn) {
  const key = `lock:cron:${name}`

  // No Redis — allow execution (behaves like a single-instance deployment)
  if (!isRedisAvailable() || !redis) {
    return fn()
  }

  // Atomically acquire the lock: SET key value NX EX ttl
  // NX = only set if key does not exist → only one instance wins
  const owner = `${INSTANCE_ID}:${randomUUID()}`
  const acquired = await redis.set(key, owner, 'NX', 'EX', LOCK_TTL)

  if (!acquired) {
    console.log(`[CRON] ${name} — skipped (lock held by another instance)`)
    return
  }

  let result
  try {
    result = await fn()
  } finally {
    // Release only if we still own the lock (guards against TTL expiry during long jobs)
    try {
      // Compare-and-delete must be atomic: GET then DEL can erase a newer owner.
      await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        key,
        owner
      )
    } catch (releaseErr) {
      // Non-critical — lock will expire on its own, but capture for observability
      captureException(releaseErr, { context: 'cron_lock_release', cronJob: name })
    }
  }
  return result
}

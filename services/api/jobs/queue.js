// @ts-check
/**
 * pg-boss singleton — shared by API (send) and worker (work/receive).
 * Call getQueue() before any send/work operations; call stopQueue() on shutdown.
 *
 * Both the API process and the worker process call getQueue().
 * pg-boss manages its own `pgboss` schema in the existing PostgreSQL database —
 * no new infrastructure required.
 */

import { PgBoss } from 'pg-boss'

/** @type {PgBoss|null} */
let boss = null

/**
 * Initialize and return the pg-boss singleton.
 * Safe to call multiple times — returns existing instance if already started.
 * @returns {Promise<PgBoss>}
 */
export async function getQueue() {
  if (boss) return boss

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL required for job queue')
  }

  const isInternal =
    connectionString.includes('railway.internal') || connectionString.includes('localhost')

  boss = new PgBoss({
    connectionString,
    ssl: isInternal ? false : { rejectUnauthorized: false },
    // Small dedicated pool for job queue — separate from the API request pool
    max: 3,
    // Retain completed jobs for 24h for status polling
    archiveCompletedAfterSeconds: 86400,
    // Retain failed jobs for 7 days for debugging
    archiveFailedAfterSeconds: 604800,
    // Delete archived jobs after 30 days
    deleteAfterSeconds: 2592000
  })

  boss.on('error', err => {
    console.error('[queue] pg-boss error:', err.message)
  })

  await boss.start()
  return boss
}

/**
 * Gracefully stop the pg-boss singleton.
 * @returns {Promise<void>}
 */
export async function stopQueue() {
  if (!boss) return
  await boss.stop()
  boss = null
}

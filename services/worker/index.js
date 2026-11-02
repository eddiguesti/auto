/**
 * Worker process — runs cron jobs and background job queue workers.
 *
 * Usage:
 *   npm run worker        (production)
 *   npm run dev:worker    (development with --watch)
 *
 * Running separately from the API process prevents long-running jobs
 * (audiobook generation, EPUB, image generation) from blocking request handling.
 */

import '../api/environment.js'
import '../api/polyfills.js'
import { runMigrations } from '../api/db/runner.js'
import { initializeCronJobs } from '../api/cron/index.js'
import { getQueue, stopQueue } from '../api/jobs/queue.js'
import { JOB } from '../api/jobs/jobNames.js'
import { processAudiobookJobs } from '../api/jobs/audiobookWorker.js'
import { startPrintWorker } from '../api/jobs/printWorker.js'
import { startMediaDeletionWorker } from '../api/services/mediaDeletion.js'
import pool from '../api/db/index.js'
import { createShutdown, registerShutdown } from '../api/utils/lifecycle.js'

async function main() {
  console.log('Worker starting...')
  await runMigrations(pool)

  // ─── pg-boss job queue ───────────────────────────────────────────────────
  const boss = await getQueue()
  console.log('Job queue started')

  // Register audiobook generation worker
  // batchSize: 1 — process one job at a time per poll; pollingIntervalSeconds: 5
  await boss.work(JOB.AUDIOBOOK_GENERATE, { batchSize: 1, pollingIntervalSeconds: 5 }, jobs =>
    processAudiobookJobs(jobs, boss, pool)
  )

  const cronJobs = initializeCronJobs()
  const printWorker = startPrintWorker(pool)
  const mediaDeletionWorker = startMediaDeletionWorker(pool)

  console.log('Worker started — cron jobs and job queue active')

  // ─── Graceful shutdown ───────────────────────────────────────────────────
  registerShutdown(
    createShutdown({
      stopCron: async () => {
        cronJobs.stop()
        await printWorker.stop()
        await mediaDeletionWorker.stop()
      },
      stopQueue,
      closeDatabase: () => pool.end()
    })
  )
}

main().catch(async err => {
  console.error('Worker failed to start:', err.message)
  await stopQueue().catch(() => {})
  await pool.end().catch(() => {})
  process.exit(1)
})

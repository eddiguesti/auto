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

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '..', '.env') })

import { initDatabase } from '../api/db/index.js'
import { initializeCronJobs } from '../api/cron/index.js'
import { getQueue, stopQueue } from '../api/jobs/queue.js'
import { JOB } from '../api/jobs/jobNames.js'
import { processAudiobookJobs } from '../api/jobs/audiobookWorker.js'
import pool from '../api/db/index.js'

async function main() {
  console.log('Worker starting...')
  await initDatabase()

  // ─── Cron jobs ──────────────────────────────────────────────────────────
  initializeCronJobs()

  // ─── pg-boss job queue ───────────────────────────────────────────────────
  const boss = await getQueue()
  console.log('Job queue started')

  // Register audiobook generation worker
  // batchSize: 1 — process one job at a time per poll; pollingIntervalSeconds: 5
  await boss.work(JOB.AUDIOBOOK_GENERATE, { batchSize: 1, pollingIntervalSeconds: 5 }, jobs =>
    processAudiobookJobs(jobs, boss, pool)
  )

  console.log('Worker started — cron jobs and job queue active')

  // ─── Graceful shutdown ───────────────────────────────────────────────────
  async function shutdown(signal) {
    console.log(`Worker ${signal} — shutting down...`)
    await stopQueue()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})

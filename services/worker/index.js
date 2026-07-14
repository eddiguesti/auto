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

import 'dotenv/config'

async function main() {
  const [
    { default: pool },
    { runMigrations },
    { initializeCronJobs },
    { getQueue, stopQueue },
    { JOB },
    { processAudiobookJobs }
  ] = await Promise.all([
    import('../api/db/index.js'),
    import('../api/db/runner.js'),
    import('../api/cron/index.js'),
    import('../api/jobs/queue.js'),
    import('../api/jobs/jobNames.js'),
    import('../api/jobs/audiobookWorker.js')
  ])

  console.log('Worker starting...')
  await runMigrations(pool)

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
  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`Worker ${signal} — shutting down...`)
    const forceTimer = setTimeout(() => {
      console.error('Worker forced shutdown after timeout')
      process.exit(1)
    }, 10000)
    forceTimer.unref()

    try {
      await stopQueue()
      await pool.end()
      clearTimeout(forceTimer)
      process.exitCode = 0
    } catch (error) {
      clearTimeout(forceTimer)
      console.error('Worker shutdown failed:', error)
      process.exitCode = 1
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})

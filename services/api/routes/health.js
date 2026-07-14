/**
 * Health check endpoint.
 * Returns 200 OK with system info, or 503 if the database is unreachable.
 * Pass ?metrics=true to include query timing statistics.
 */

import { Router } from 'express'
import { getMetricsSummary } from '../utils/metrics.js'
import { isRedisAvailable } from '../utils/redis.js'
import { isR2Available } from '../utils/r2.js'
import crypto from 'crypto'

const router = Router()

// Alert if daily cron hasn't run within this window
const DAILY_CRON_ALERT_HOURS = 26

router.get('/api/health', async (req, res) => {
  const db = req.app.locals.db
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: process.env.RUNTIME_PLATFORM || 'node',
    uptime: process.uptime()
  }

  try {
    if (db) {
      const start = Date.now()
      await db.query('SELECT 1')
      health.database = { status: 'ok', latencyMs: Date.now() - start }
    } else {
      health.database = { status: 'unavailable' }
    }
  } catch {
    health.status = 'degraded'
    health.database = { status: 'error' }
  }

  health.redis = { status: isRedisAvailable() ? 'ok' : 'unavailable' }
  health.objectStorage = { status: isR2Available() ? 'ok' : 'unavailable' }
  if (!isR2Available() && process.env.NODE_ENV === 'production') health.status = 'degraded'

  try {
    if (db) {
      const jobs = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE state IN ('created', 'active'))::int AS pending,
           COUNT(*) FILTER (WHERE state = 'failed' AND updated_at > NOW() - INTERVAL '24 hours')::int AS failed_24h,
           EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE state = 'created')))::int AS oldest_pending_seconds
         FROM background_jobs`
      )
      health.queue = { status: 'ok', ...jobs.rows[0] }
      if (jobs.rows[0]?.oldest_pending_seconds > 900) {
        health.status = 'degraded'
        health.queue.status = 'stale'
      }
    }
  } catch {
    health.status = 'degraded'
    health.queue = { status: 'error' }
  }

  // Cron job health — last success times from cron_health table
  try {
    if (db) {
      const result = await db.query(
        `SELECT job_name, last_success, last_attempt FROM cron_health ORDER BY job_name`
      )

      const cronJobs = {}
      for (const row of result.rows) {
        const lastSuccess = row.last_success ? new Date(row.last_success) : null
        const hoursSinceSuccess = lastSuccess
          ? (Date.now() - lastSuccess.getTime()) / (1000 * 60 * 60)
          : null

        const isStale =
          row.job_name === 'dailyTasks' &&
          (lastSuccess === null || hoursSinceSuccess > DAILY_CRON_ALERT_HOURS)

        cronJobs[row.job_name] = {
          lastSuccess: row.last_success ?? null,
          lastAttempt: row.last_attempt ?? null,
          status: isStale ? 'stale' : 'ok'
        }

        if (isStale) {
          health.status = 'degraded'
        }
      }

      health.cron = cronJobs
    } else {
      health.cron = { status: 'unavailable' }
    }
  } catch {
    health.cron = { status: 'error' }
  }

  if (req.query.metrics === 'true') {
    const expected = process.env.HEALTH_METRICS_SECRET || process.env.INTERNAL_CRON_SECRET
    const supplied = req.get('x-health-secret') || ''
    const authorized =
      expected &&
      supplied.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    if (!authorized) return res.status(403).json({ error: 'Metrics access denied' })
    health.metrics = getMetricsSummary()
    health.memory = {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health)
})

export default router

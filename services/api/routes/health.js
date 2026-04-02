/**
 * Health check endpoint.
 * Returns 200 OK with system info, or 503 if the database is unreachable.
 * Pass ?metrics=true to include query timing statistics.
 */

import { Router } from 'express'
import { getMetricsSummary } from '../utils/metrics.js'
import { isRedisAvailable } from '../utils/redis.js'

const router = Router()

// Alert if daily cron hasn't run within this window
const DAILY_CRON_ALERT_HOURS = 26

router.get('/api/health', async (req, res) => {
  const db = req.app.locals.db
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
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
    health.metrics = getMetricsSummary()
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health)
})

export default router

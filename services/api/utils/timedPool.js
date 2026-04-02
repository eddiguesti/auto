/**
 * Database pool wrapper that tracks query timing
 * Wraps the pg Pool to record metrics for all queries
 */

import { recordDbQuery, getMetricsSummary } from './metrics.js'
import { createLogger } from './logger.js'

const logger = createLogger('db')
const SLOW_QUERY_THRESHOLD_MS = 500
const POOL_STATS_INTERVAL_MS = 60_000
const POOL_WAIT_WARN_THRESHOLD = 5
const AVG_QUERY_WARN_THRESHOLD_MS = 500

/**
 * Extract operation type from SQL query
 * @param {string} sql - SQL query text
 * @returns {string} Operation type (SELECT, INSERT, UPDATE, DELETE, OTHER)
 */
function getOperationType(sql) {
  if (!sql) return 'OTHER'
  const normalized = sql.trim().toUpperCase()
  if (normalized.startsWith('SELECT')) return 'SELECT'
  if (normalized.startsWith('INSERT')) return 'INSERT'
  if (normalized.startsWith('UPDATE')) return 'UPDATE'
  if (normalized.startsWith('DELETE')) return 'DELETE'
  if (normalized.startsWith('CREATE')) return 'CREATE'
  if (normalized.startsWith('ALTER')) return 'ALTER'
  return 'OTHER'
}

/**
 * Wrap a database pool to add query timing
 * @param {import('pg').Pool} pool - Original pg Pool
 * @returns {import('pg').Pool} Wrapped pool with timing
 */
export function wrapPoolWithTiming(pool) {
  if (!pool) return pool

  // Store original query method
  const originalQuery = pool.query.bind(pool)

  // Replace with timed version
  pool.query = async function timedQuery(...args) {
    const startTime = process.hrtime.bigint()
    const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text
    const operation = getOperationType(sql)

    try {
      const result = await originalQuery(...args)
      const endTime = process.hrtime.bigint()
      const durationMs = Math.round(Number(endTime - startTime) / 1_000_000)

      recordDbQuery(operation, durationMs, true)

      // Log slow queries
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn('Slow query', {
          operation,
          durationMs,
          rowCount: result.rowCount,
          sql: sql?.substring(0, 200)
        })
      }

      return result
    } catch (err) {
      const endTime = process.hrtime.bigint()
      const durationMs = Math.round(Number(endTime - startTime) / 1_000_000)

      recordDbQuery(operation, durationMs, false)

      logger.error('Query failed', {
        operation,
        durationMs,
        error: err.message,
        sql: sql?.substring(0, 200)
      })

      throw err
    }
  }

  // Start periodic pool stats logging
  const statsInterval = setInterval(() => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      active: pool.totalCount - pool.idleCount
    }

    const { database } = getMetricsSummary()

    if (stats.waiting > POOL_WAIT_WARN_THRESHOLD) {
      logger.warn('DB pool pressure — high wait count', {
        ...stats,
        avgQueryMs: database.latency.mean
      })
    } else if (database.latency.mean > AVG_QUERY_WARN_THRESHOLD_MS && database.latency.count > 0) {
      logger.warn('DB pool — average query time exceeds threshold', {
        ...stats,
        avgQueryMs: database.latency.mean
      })
    } else {
      logger.debug('DB pool stats', { ...stats, avgQueryMs: database.latency.mean })
    }
  }, POOL_STATS_INTERVAL_MS)

  // Don't keep the process alive just for stats logging
  statsInterval.unref()

  return pool
}

export default wrapPoolWithTiming

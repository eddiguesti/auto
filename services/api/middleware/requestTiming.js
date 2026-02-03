/**
 * Request timing middleware
 * Records HTTP request latency and logs slow requests
 */

import { recordHttpRequest } from '../utils/metrics.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('http')
const SLOW_REQUEST_THRESHOLD_MS = 1000

/**
 * Extract route pattern from request (removes IDs, UUIDs)
 * @param {import('express').Request} req
 * @returns {string}
 */
function getRoutePattern(req) {
  // Use matched route if available (better for patterns like /users/:id)
  if (req.route?.path) {
    return req.baseUrl + req.route.path
  }

  // Fall back to path, normalizing dynamic segments
  return req.path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
}

/**
 * Middleware that records request timing and logs completion
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requestTiming(req, res, next) {
  const startTime = process.hrtime.bigint()
  const startMs = Date.now()

  // Store start time on request for other middleware to use
  req.startTime = startMs

  // Hook into response finish event
  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const durationNs = Number(endTime - startTime)
    const durationMs = Math.round(durationNs / 1_000_000)

    const route = getRoutePattern(req)
    const method = req.method
    const statusCode = res.statusCode

    // Record metrics
    recordHttpRequest(method, route, statusCode, durationMs)

    // Log request completion
    const logContext = {
      requestId: req.id,
      method,
      path: req.path,
      route,
      status: statusCode,
      durationMs,
      userAgent: req.get('user-agent')?.substring(0, 100),
      userId: req.user?.id
    }

    // Log slow requests at warn level
    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn('Slow request', logContext)
    } else if (statusCode >= 500) {
      logger.error('Request failed', logContext)
    } else if (statusCode >= 400) {
      logger.info('Request completed with error', logContext)
    } else {
      logger.debug('Request completed', logContext)
    }
  })

  next()
}

export default requestTiming

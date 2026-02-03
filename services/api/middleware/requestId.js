/**
 * Request ID middleware for correlation/tracing
 * Adds unique ID to each request for log correlation
 */

import { randomUUID } from 'crypto'

/**
 * Middleware that adds a unique request ID to each request
 * Accepts existing ID from X-Request-Id header for distributed tracing
 * Sets X-Request-Id response header for client reference
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID()
  req.id = id
  res.setHeader('X-Request-Id', id)
  next()
}

export default requestId

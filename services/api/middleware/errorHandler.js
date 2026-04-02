/**
 * Centralized error handling middleware
 * Must be registered last in the Express middleware chain
 */

import { errorLogger } from '../utils/logger.js'
import { sanitizeErrorMessage } from '../utils/errorSanitizer.js'
import { captureException } from '../utils/sentry.js'

/**
 * Build consistent error response with optional requestId
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {string} requestId - Correlation ID
 * @param {boolean} isDevelopment - Development mode flag
 * @returns {Object} Error response object
 */
function buildErrorResponse(error, message, requestId, isDevelopment, code = null) {
  const response = {
    error,
    message: sanitizeErrorMessage(message)
  }

  if (code) response.code = code
  if (requestId && !isDevelopment) response.requestId = requestId

  return response
}

/**
 * Centralized error handler
 * @param {Error} err - Error object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  const requestId = req.id || 'no-request-id'
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Report to Sentry (only 500s and unexpected errors)
  const statusCode = err.statusCode || 500
  if (statusCode >= 500) {
    captureException(err, {
      userId: req.user?.id,
      requestId,
      route: `${req.method} ${req.path}`
    })
  }

  // Structured logging with correlation ID
  errorLogger.error(`${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    errorName: err.name,
    errorMessage: err.message,
    statusCode: err.statusCode,
    code: err.code,
    stack: isDevelopment ? err.stack : undefined
  })

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json(
        buildErrorResponse('Validation failed', err.message, requestId, isDevelopment, err.code)
      )
  }

  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return res
      .status(401)
      .json(
        buildErrorResponse(
          'Unauthorized',
          err.message || 'Authentication required',
          requestId,
          isDevelopment,
          err.code || 'UNAUTHORIZED'
        )
      )
  }

  if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    return res
      .status(403)
      .json(
        buildErrorResponse(
          'Forbidden',
          err.message || 'Access denied',
          requestId,
          isDevelopment,
          err.code || 'FORBIDDEN'
        )
      )
  }

  if (err.name === 'NotFoundError' || err.statusCode === 404) {
    return res
      .status(404)
      .json(
        buildErrorResponse(
          'Not found',
          err.message || 'Resource not found',
          requestId,
          isDevelopment,
          err.code || 'NOT_FOUND'
        )
      )
  }

  if (err.name === 'ServiceUnavailableError' || err.statusCode === 503) {
    return res
      .status(503)
      .json(
        buildErrorResponse(
          'Service unavailable',
          err.message || 'Service not available',
          requestId,
          isDevelopment,
          err.code || 'SERVICE_UNAVAILABLE'
        )
      )
  }

  if (err.name === 'RateLimitError' || err.statusCode === 429) {
    return res
      .status(429)
      .json(
        buildErrorResponse(
          'Too many requests',
          err.message || 'Please try again later',
          requestId,
          isDevelopment,
          err.code || 'RATE_LIMITED'
        )
      )
  }

  // Handle Stripe errors
  if (err.type === 'StripeCardError') {
    return res
      .status(400)
      .json(
        buildErrorResponse(
          'Payment failed',
          err.message,
          requestId,
          isDevelopment,
          'STRIPE_CARD_ERROR'
        )
      )
  }

  // Handle configuration errors (don't leak config details)
  if (err.name === 'ConfigurationError') {
    return res
      .status(500)
      .json(
        buildErrorResponse(
          'Internal server error',
          'Server configuration error',
          requestId,
          isDevelopment,
          err.code || 'CONFIG_ERROR'
        )
      )
  }

  // Handle external service errors
  if (err.name === 'ExternalServiceError') {
    return res
      .status(502)
      .json(
        buildErrorResponse(
          'Service error',
          err.message || 'External service unavailable',
          requestId,
          isDevelopment,
          err.code || 'EXTERNAL_SERVICE_ERROR'
        )
      )
  }

  // Default to 500 Internal Server Error
  const errorType = statusCode === 500 ? 'Internal server error' : 'Error'
  const message = isDevelopment ? err.message : 'Something went wrong'

  res
    .status(statusCode)
    .json(buildErrorResponse(errorType, message, requestId, isDevelopment, err.code || null))
}

/**
 * Handle 404 for unmatched routes
 */
export function notFoundHandler(req, res) {
  const requestId = req.id
  const isDevelopment = process.env.NODE_ENV === 'development'

  res
    .status(404)
    .json(
      buildErrorResponse(
        'Not found',
        `Route ${req.method} ${req.path} not found`,
        requestId,
        isDevelopment
      )
    )
}

export default errorHandler

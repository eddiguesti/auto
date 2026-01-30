/**
 * Centralized error handling middleware
 * Must be registered last in the Express middleware chain
 *
 * @param {Error} err - Error object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error(`[${req.method} ${req.path}] Error:`, err.message)

  // Don't leak stack traces in production
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack)
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message
    })
  }

  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Authentication required'
    })
  }

  if (err.statusCode === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message || 'Access denied'
    })
  }

  if (err.statusCode === 404) {
    return res.status(404).json({
      error: 'Not found',
      message: err.message || 'Resource not found'
    })
  }

  if (err.statusCode === 503) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: err.message || 'Database not available'
    })
  }

  // Handle Stripe errors
  if (err.type === 'StripeCardError') {
    return res.status(400).json({
      error: 'Payment failed',
      message: err.message
    })
  }

  // Handle rate limiting
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      message: err.message || 'Please try again later'
    })
  }

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : 'Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
}

/**
 * Handle 404 for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  })
}

export default errorHandler

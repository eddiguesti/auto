/**
 * Custom error classes for standardized error handling
 * Provides consistent error shapes and HTTP status codes
 */

import { sanitizeErrorMessage } from './errorSanitizer.js'

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super(`Too many requests. Please try again in ${retryAfter} seconds.`, 429, 'RATE_LIMITED')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} not available`, 503, 'SERVICE_UNAVAILABLE')
    this.name = 'ServiceUnavailableError'
  }
}

export class ConfigurationError extends AppError {
  constructor(service) {
    super('Server configuration error', 500, 'CONFIG_ERROR')
    this.name = 'ConfigurationError'
    this.internalMessage = `${service} not configured`
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, originalError = null) {
    super(`${service} temporarily unavailable`, 502, 'EXTERNAL_SERVICE_ERROR')
    this.name = 'ExternalServiceError'
    this.originalError = originalError
  }
}

/**
 * Helper function to send consistent error responses
 * @param {import('express').Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error type/category
 * @param {string} message - User-friendly message
 * @param {import('express').Request} req - Express request object (for requestId)
 */
export function sendError(res, statusCode, error, message, req = null) {
  const requestId = req?.id
  const isDevelopment = process.env.NODE_ENV === 'development'

  const response = {
    error,
    message: sanitizeErrorMessage(message)
  }

  if (requestId && !isDevelopment) {
    response.requestId = requestId
  }

  return res.status(statusCode).json(response)
}

export default AppError

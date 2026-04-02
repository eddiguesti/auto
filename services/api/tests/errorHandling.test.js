/**
 * Error Handling Tests
 * Tests for consistent error responses, sanitization, and HTTP status codes
 */

import { describe, it, expect } from 'vitest'
import { createMockRequest, createMockResponse, createMockNext } from './testUtils.js'

// Import modules to test
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js'
import { sanitizeErrorMessage, isSafeMessage } from '../utils/errorSanitizer.js'
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ServiceUnavailableError,
  ConfigurationError,
  ExternalServiceError,
  sendError
} from '../utils/errors.js'

// ============ Error Response Format Tests ============

describe('Error Response Format', () => {
  it('error response contains "error" field', () => {
    const err = new Error('Test error')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.body).toHaveProperty('error')
  })

  it('error response contains "message" field', () => {
    const err = new Error('Test error')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.body).toHaveProperty('message')
  })

  it('error response includes requestId in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const err = new Error('Test error')
    const req = createMockRequest({ id: 'test-request-123' })
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.body).toHaveProperty('requestId')
    expect(res.body.requestId).toBe('test-request-123')

    process.env.NODE_ENV = originalEnv
  })

  it('error response excludes requestId in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const err = new Error('Test error')
    const req = createMockRequest({ id: 'test-request-123' })
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.body.requestId).toBeFalsy()

    process.env.NODE_ENV = originalEnv
  })
})

// ============ HTTP Status Code Tests ============

describe('HTTP Status Codes', () => {
  it('ValidationError returns 400', () => {
    const err = new ValidationError('Invalid input')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('UnauthorizedError returns 401', () => {
    const err = new UnauthorizedError('Not logged in')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('ForbiddenError returns 403', () => {
    const err = new ForbiddenError('No access')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it('NotFoundError returns 404', () => {
    const err = new NotFoundError('Resource')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('RateLimitError returns 429', () => {
    const err = new RateLimitError(60)
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(429)
    expect(res.body.error).toBe('Too many requests')
  })

  it('ServiceUnavailableError returns 503', () => {
    const err = new ServiceUnavailableError('Database')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(503)
    expect(res.body.error).toBe('Service unavailable')
  })

  it('ExternalServiceError returns 502', () => {
    const err = new ExternalServiceError('AI service')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(502)
    expect(res.body.error).toBe('Service error')
  })

  it('ConfigurationError returns 500', () => {
    const err = new ConfigurationError('API_KEY')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('Internal server error')
  })

  it('Generic error returns 500', () => {
    const err = new Error('Something went wrong')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(500)
  })

  it('Error with statusCode property uses that code', () => {
    const err = new Error('Custom error')
    err.statusCode = 418 // I'm a teapot

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(418)
  })
})

// ============ Error Sanitization Tests ============

describe('Error Message Sanitization', () => {
  it('sanitizes connection strings', () => {
    const msg = 'Failed to connect to postgresql://user:password@localhost:5432/db'
    const sanitized = sanitizeErrorMessage(msg)

    expect(sanitized.includes('postgresql://')).toBeFalsy()
    expect(sanitized.includes('password')).toBeFalsy()
  })

  it('sanitizes API keys (sk_)', () => {
    const msg = 'API call failed with key sk_test_FAKE1234567890FAKE1234'
    const sanitized = sanitizeErrorMessage(msg)

    expect(sanitized.includes('sk_test')).toBeFalsy()
  })

  it('sanitizes Bearer tokens', () => {
    const msg = 'Invalid Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
    const sanitized = sanitizeErrorMessage(msg)

    expect(sanitized.includes('eyJ')).toBeFalsy()
  })

  it('sanitizes file paths', () => {
    const msg = 'Error reading /Users/john/Documents/secrets.txt'
    const sanitized = sanitizeErrorMessage(msg)

    expect(sanitized.includes('/Users/')).toBeFalsy()
  })

  it('sanitizes internal IP addresses', () => {
    const msg = 'Cannot connect to 192.168.1.100:3000'
    const sanitized = sanitizeErrorMessage(msg)

    expect(sanitized.includes('192.168')).toBeFalsy()
  })

  it('allows known safe messages', () => {
    const safeMessages = [
      'Authentication required',
      'Invalid email or password',
      'User not found',
      'Validation failed',
      'Not found',
      'Too many requests'
    ]

    safeMessages.forEach(msg => {
      const sanitized = sanitizeErrorMessage(msg)
      expect(sanitized).toBe(msg)
    })
  })

  it('isSafeMessage returns true for safe messages', () => {
    expect(isSafeMessage('Authentication required')).toBeTruthy()
    expect(isSafeMessage('Validation failed')).toBeTruthy()
    expect(isSafeMessage('Not found')).toBeTruthy()
  })

  it('isSafeMessage returns false for unsafe messages', () => {
    expect(isSafeMessage('postgresql://user:pass@host/db')).toBeFalsy()
    expect(isSafeMessage(null)).toBeFalsy()
    expect(isSafeMessage('')).toBeFalsy()
  })

  it('returns fallback for very long messages', () => {
    const longMessage = 'A'.repeat(600)
    const sanitized = sanitizeErrorMessage(longMessage)

    expect(sanitized).toBe('An unexpected error occurred')
  })
})

// ============ Not Found Handler Tests ============

describe('Not Found Handler', () => {
  it('returns 404 status', () => {
    const req = createMockRequest({ method: 'GET', path: '/api/nonexistent' })
    const res = createMockResponse()

    notFoundHandler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('includes method and path in message', () => {
    const req = createMockRequest({ method: 'POST', path: '/api/unknown' })
    const res = createMockResponse()

    notFoundHandler(req, res)

    expect(res.body.message).toContain('POST')
    expect(res.body.message).toContain('/api/unknown')
  })
})

// ============ sendError Helper Tests ============

describe('sendError Helper', () => {
  it('sends formatted error response', () => {
    const req = createMockRequest({ id: 'req-123' })
    const res = createMockResponse()

    sendError(res, 400, 'Bad request', 'Invalid input', req)

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('Bad request')
    expect(res.body.message).toContain('Invalid input')
  })

  it('sanitizes message in error response', () => {
    const req = createMockRequest()
    const res = createMockResponse()

    sendError(res, 500, 'Error', 'Failed at /Users/john/app/server.js', req)

    expect(res.body.message.includes('/Users/')).toBeFalsy()
  })
})

// ============ Stripe Error Handling Tests ============

describe('Stripe Error Handling', () => {
  it('StripeCardError returns 400', () => {
    const err = new Error('Card declined')
    err.type = 'StripeCardError'

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('Payment failed')
  })
})

// ============ Custom Error Classes Tests ============

describe('Custom Error Classes', () => {
  it('AppError has correct properties', () => {
    const err = new AppError('Test message', 500, 'TEST_ERROR')

    expect(err.message).toBe('Test message')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('TEST_ERROR')
    expect(err.isOperational).toBe(true)
  })

  it('ValidationError extends AppError', () => {
    const err = new ValidationError('Invalid field')

    expect(err instanceof AppError).toBeTruthy()
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('ValidationError')
  })

  it('ConfigurationError hides config details', () => {
    const err = new ConfigurationError('STRIPE_SECRET_KEY')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    // Should not expose which config is missing
    expect(res.body.message.includes('STRIPE')).toBeFalsy()
    expect(res.body.message.includes('KEY')).toBeFalsy()
  })
})

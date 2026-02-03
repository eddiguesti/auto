/**
 * Error Handling Tests
 * Tests for consistent error responses, sanitization, and HTTP status codes
 *
 * Run with: node server/tests/errorHandling.test.js
 */

import assert from 'assert'
import {
  test,
  describe,
  printSummary,
  createMockRequest,
  createMockResponse,
  createMockNext,
  assertStatus,
  assertError,
  assertMessage,
  assertHasProperty
} from './testUtils.js'

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
  test('error response contains "error" field', () => {
    const err = new Error('Test error')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertHasProperty(res.body, 'error')
  })

  test('error response contains "message" field', () => {
    const err = new Error('Test error')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertHasProperty(res.body, 'message')
  })

  test('error response includes requestId in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const err = new Error('Test error')
    const req = createMockRequest({ id: 'test-request-123' })
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertHasProperty(res.body, 'requestId')
    assert.strictEqual(res.body.requestId, 'test-request-123')

    process.env.NODE_ENV = originalEnv
  })

  test('error response excludes requestId in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const err = new Error('Test error')
    const req = createMockRequest({ id: 'test-request-123' })
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assert.ok(!res.body.requestId, 'requestId should not be in response in dev mode')

    process.env.NODE_ENV = originalEnv
  })
})

// ============ HTTP Status Code Tests ============

describe('HTTP Status Codes', () => {
  test('ValidationError returns 400', () => {
    const err = new ValidationError('Invalid input')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 400)
    assertError(res, 'Validation failed')
  })

  test('UnauthorizedError returns 401', () => {
    const err = new UnauthorizedError('Not logged in')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 401)
    assertError(res, 'Unauthorized')
  })

  test('ForbiddenError returns 403', () => {
    const err = new ForbiddenError('No access')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 403)
    assertError(res, 'Forbidden')
  })

  test('NotFoundError returns 404', () => {
    const err = new NotFoundError('Resource')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 404)
    assertError(res, 'Not found')
  })

  test('RateLimitError returns 429', () => {
    const err = new RateLimitError(60)
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 429)
    assertError(res, 'Too many requests')
  })

  test('ServiceUnavailableError returns 503', () => {
    const err = new ServiceUnavailableError('Database')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 503)
    assertError(res, 'Service unavailable')
  })

  test('ExternalServiceError returns 502', () => {
    const err = new ExternalServiceError('AI service')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 502)
    assertError(res, 'Service error')
  })

  test('ConfigurationError returns 500', () => {
    const err = new ConfigurationError('API_KEY')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 500)
    assertError(res, 'Internal server error')
  })

  test('Generic error returns 500', () => {
    const err = new Error('Something went wrong')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 500)
  })

  test('Error with statusCode property uses that code', () => {
    const err = new Error('Custom error')
    err.statusCode = 418 // I'm a teapot

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 418)
  })
})

// ============ Error Sanitization Tests ============

describe('Error Message Sanitization', () => {
  test('sanitizes connection strings', () => {
    const msg = 'Failed to connect to postgresql://user:password@localhost:5432/db'
    const sanitized = sanitizeErrorMessage(msg)

    assert.ok(!sanitized.includes('postgresql://'))
    assert.ok(!sanitized.includes('password'))
  })

  test('sanitizes API keys (sk_)', () => {
    const msg = 'API call failed with key sk_test_FAKE1234567890FAKE1234'
    const sanitized = sanitizeErrorMessage(msg)

    assert.ok(!sanitized.includes('sk_test'))
  })

  test('sanitizes Bearer tokens', () => {
    const msg = 'Invalid Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
    const sanitized = sanitizeErrorMessage(msg)

    assert.ok(!sanitized.includes('eyJ'))
  })

  test('sanitizes file paths', () => {
    const msg = 'Error reading /Users/john/Documents/secrets.txt'
    const sanitized = sanitizeErrorMessage(msg)

    assert.ok(!sanitized.includes('/Users/'))
  })

  test('sanitizes internal IP addresses', () => {
    const msg = 'Cannot connect to 192.168.1.100:3000'
    const sanitized = sanitizeErrorMessage(msg)

    assert.ok(!sanitized.includes('192.168'))
  })

  test('allows known safe messages', () => {
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
      assert.strictEqual(sanitized, msg, `"${msg}" should pass through unchanged`)
    })
  })

  test('isSafeMessage returns true for safe messages', () => {
    assert.ok(isSafeMessage('Authentication required'))
    assert.ok(isSafeMessage('Validation failed'))
    assert.ok(isSafeMessage('Not found'))
  })

  test('isSafeMessage returns false for unsafe messages', () => {
    assert.ok(!isSafeMessage('postgresql://user:pass@host/db'))
    assert.ok(!isSafeMessage(null))
    assert.ok(!isSafeMessage(''))
  })

  test('returns fallback for very long messages', () => {
    const longMessage = 'A'.repeat(600)
    const sanitized = sanitizeErrorMessage(longMessage)

    assert.strictEqual(sanitized, 'An unexpected error occurred')
  })
})

// ============ Not Found Handler Tests ============

describe('Not Found Handler', () => {
  test('returns 404 status', () => {
    const req = createMockRequest({ method: 'GET', path: '/api/nonexistent' })
    const res = createMockResponse()

    notFoundHandler(req, res)

    assertStatus(res, 404)
    assertError(res, 'Not found')
  })

  test('includes method and path in message', () => {
    const req = createMockRequest({ method: 'POST', path: '/api/unknown' })
    const res = createMockResponse()

    notFoundHandler(req, res)

    assertMessage(res, 'POST')
    assertMessage(res, '/api/unknown')
  })
})

// ============ sendError Helper Tests ============

describe('sendError Helper', () => {
  test('sends formatted error response', () => {
    const req = createMockRequest({ id: 'req-123' })
    const res = createMockResponse()

    sendError(res, 400, 'Bad request', 'Invalid input', req)

    assertStatus(res, 400)
    assertError(res, 'Bad request')
    assertMessage(res, 'Invalid input')
  })

  test('sanitizes message in error response', () => {
    const req = createMockRequest()
    const res = createMockResponse()

    sendError(res, 500, 'Error', 'Failed at /Users/john/app/server.js', req)

    assert.ok(!res.body.message.includes('/Users/'))
  })
})

// ============ Stripe Error Handling Tests ============

describe('Stripe Error Handling', () => {
  test('StripeCardError returns 400', () => {
    const err = new Error('Card declined')
    err.type = 'StripeCardError'

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    assertStatus(res, 400)
    assertError(res, 'Payment failed')
  })
})

// ============ Custom Error Classes Tests ============

describe('Custom Error Classes', () => {
  test('AppError has correct properties', () => {
    const err = new AppError('Test message', 500, 'TEST_ERROR')

    assert.strictEqual(err.message, 'Test message')
    assert.strictEqual(err.statusCode, 500)
    assert.strictEqual(err.code, 'TEST_ERROR')
    assert.strictEqual(err.isOperational, true)
  })

  test('ValidationError extends AppError', () => {
    const err = new ValidationError('Invalid field')

    assert.ok(err instanceof AppError)
    assert.strictEqual(err.statusCode, 400)
    assert.strictEqual(err.name, 'ValidationError')
  })

  test('ConfigurationError hides config details', () => {
    const err = new ConfigurationError('STRIPE_SECRET_KEY')
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    errorHandler(err, req, res, next)

    // Should not expose which config is missing
    assert.ok(!res.body.message.includes('STRIPE'))
    assert.ok(!res.body.message.includes('KEY'))
  })
})

// ============ Run Tests ============

const exitCode = printSummary()
process.exit(exitCode)

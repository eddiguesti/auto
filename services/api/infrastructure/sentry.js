/**
 * Sentry error tracking integration.
 * Sign up at https://sentry.io (free tier = 5k errors/month).
 * Create a Node.js project and add SENTRY_DSN to .env.
 * If SENTRY_DSN is not set, Sentry is silently disabled.
 */

import * as Sentry from '@sentry/node'

const SENTRY_DSN = process.env.SENTRY_DSN

let initialized = false

export function initSentry(app) {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not set — error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Strip sensitive data from error reports
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
      return event
    }
  })

  initialized = true
  console.log('Sentry initialized')
}

export function captureException(err, context = {}) {
  if (!initialized) return
  Sentry.withScope(scope => {
    if (context.userId) scope.setUser({ id: context.userId })
    if (context.requestId) scope.setTag('requestId', context.requestId)
    if (context.route) scope.setTag('route', context.route)
    Sentry.captureException(err)
  })
}

export function sentryErrorHandler() {
  if (!initialized) {
    // Return a no-op middleware if Sentry is not initialized
    return (err, req, res, next) => next(err)
  }
  return Sentry.setupExpressErrorHandler()
}

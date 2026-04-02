/**
 * Core middleware configuration — applied to every request.
 * Extracted from index.js to keep the entry point lean.
 */

import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import express from 'express'
import { globalLimiter } from './rateLimiters.js'
import { requestId } from './requestId.js'
import { requestTiming } from './requestTiming.js'

// ─── Cache-Control helpers ────────────────────────────────────────────────────

/**
 * Middleware: public cache for 5 minutes with stale-while-revalidate.
 * Use on read-only, non-user-specific routes: sitemap, robots.txt, pricing.
 */
export function cachePublic(maxAgeSeconds = 300) {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=60`)
    next()
  }
}

/**
 * Middleware: no-store cache for authenticated / dynamic responses.
 * Prevents proxy/CDN from serving stale user data.
 */
export function cacheNone(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  next()
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://easymemoir.co.uk',
  'https://www.easymemoir.co.uk',
  process.env.FRONTEND_URL
].filter(Boolean)

export function setupMiddleware(app) {
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('Not allowed by CORS'), false)
        }
        return callback(null, true)
      },
      credentials: true
    })
  )

  app.use(compression())

  // Add Reporting-Endpoints header for modern CSP report-to directive
  app.use((_req, res, next) => {
    res.setHeader('Reporting-Endpoints', 'csp-endpoint="/api/csp-report"')
    next()
  })

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://api.fontshare.com',
            'https://accounts.google.com'
          ],
          styleSrcElem: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://api.fontshare.com',
            'https://accounts.google.com'
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://api.fontshare.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: [
            "'self'",
            'https://api.x.ai',
            'https://api.stripe.com',
            'https://api.replicate.com',
            'https://accounts.google.com',
            'https://fonts.googleapis.com',
            'https://api.fontshare.com',
            'https://fonts.gstatic.com',
            'wss://api.x.ai',
            'wss:'
          ],
          frameSrc: ["'self'", 'https://js.stripe.com', 'https://accounts.google.com'],
          // report-uri: legacy format, widely supported
          reportUri: ['/api/csp-report'],
          // report-to: modern Reporting API format
          reportTo: ['csp-endpoint']
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
    })
  )

  app.use(globalLimiter)
  app.use(requestId)
  app.use(requestTiming)
  app.use(express.json({ limit: '1mb' }))
}

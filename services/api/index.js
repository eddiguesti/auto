// Polyfills must be loaded first (before any module that uses File API)
import './polyfills.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dotenv from 'dotenv'

// Load .env from root directory (grandparent of services/api/)
const __filename_early = fileURLToPath(import.meta.url)
const __dirname_early = dirname(__filename_early)
dotenv.config({ path: join(__dirname_early, '..', '..', '.env') })

import pool, { initDatabase } from './db/index.js'
import { validateEnvOrExit, validateSecurityConfig, isProduction } from './utils/validateEnv.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestId } from './middleware/requestId.js'
import { requestTiming } from './middleware/requestTiming.js'
import { wrapPoolWithTiming } from './utils/timedPool.js'
import { getMetricsSummary } from './utils/metrics.js'
import authRouter from './routes/auth.js'
import storiesRouter from './routes/stories.js'
import photosRouter from './routes/photos.js'
import aiRouter from './routes/ai.js'
import voiceRouter from './routes/voice.js'
import luluRouter from './routes/lulu.js'
import memoryRouter from './routes/memory.js'
import coversRouter from './routes/covers.js'
import seoRouter from './routes/seo.js'
import exportRouter from './routes/export.js'
import audiobookRouter from './routes/audiobook.js'
import styleRouter from './routes/style.js'
import paymentsRouter, { handleStripeWebhook } from './routes/payments.js'
import supportRouter from './routes/support.js'
import telegramRouter, { handleTelegramWebhook } from './routes/telegram.js'
import onboardingRouter from './routes/onboarding.js'
import chapterImagesRouter from './routes/chapter-images.js'
import gameRouter from './routes/game.js'
import notificationRoutes from './routes/notifications.js'
import { initializeCronJobs } from './cron/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Wrap pool with query timing and make available to routes
const timedPool = wrapPoolWithTiming(pool)
app.locals.db = timedPool

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://easymemoir.co.uk',
  'https://www.easymemoir.co.uk'
]
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      // In production, reject unknown origins; in dev, allow for flexibility
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Not allowed by CORS'), false)
      }
      return callback(null, true)
    },
    credentials: true
  })
)

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://accounts.google.com',
          'https://apis.google.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://accounts.google.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: [
          "'self'",
          'https://api.x.ai',
          'https://api.stripe.com',
          'https://api.replicate.com',
          'https://accounts.google.com',
          'wss:'
        ],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://accounts.google.com']
      }
    },
    crossOriginEmbedderPolicy: false, // Allow loading external images
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Required for Google OAuth popup
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
)

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})
app.use(globalLimiter)

// Add correlation ID to all requests for tracing
app.use(requestId)

// Add request timing for observability
app.use(requestTiming)

// Strict rate limiting for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes' }
})

app.use(express.json({ limit: '1mb' }))

// Serve uploaded files - authenticated to prevent unauthorized access
// Public endpoint removed, use /api/photos/file/:filename instead

// Auth routes (public, with rate limiting for login/register)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth', authRouter)

// Support chat (public - so users can get help even when logged out)
app.use('/api/support', supportRouter)

// Public voice session endpoint for landing page (uses xAI Realtime API)
app.post('/api/landing-voice/session', async (req, res) => {
  try {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'GROK_API_KEY not configured' })
    }

    // Create ephemeral token via xAI API
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 } // 5 minute token
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('xAI session error:', error)
      return res.status(response.status).json({ error: 'Failed to create voice session' })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Landing voice session error:', err)
    res.status(500).json({ error: 'Voice session failed' })
  }
})

// Protected routes - require authentication
app.use('/api/stories', authenticateToken, storiesRouter)
app.use('/api/photos', authenticateToken, photosRouter)
app.use('/api/ai', authenticateToken, aiRouter)
app.use('/api/voice', authenticateToken, voiceRouter)
app.use('/api/memory', authenticateToken, memoryRouter)

// Lulu routes (protected)
app.use('/api/lulu', authenticateToken, luluRouter)

// Cover generation routes (protected)
app.use('/api/covers', authenticateToken, coversRouter)

// Export routes (protected)
app.use('/api/export', authenticateToken, exportRouter)

// Audiobook routes (protected)
app.use('/api/audiobook', authenticateToken, audiobookRouter)

// Style routes (protected)
app.use('/api/style', authenticateToken, styleRouter)

// Payment routes (protected)
app.use('/api/payments', authenticateToken, paymentsRouter)

// Telegram routes (protected - for linking accounts)
app.use('/api/telegram', authenticateToken, telegramRouter)

// Onboarding routes (protected - post-login experience)
app.use('/api/onboarding', authenticateToken, onboardingRouter)

// Chapter images routes (protected - personalized chapter backgrounds)
app.use('/api/chapter-images', authenticateToken, chapterImagesRouter)

// Game/Memory Quest routes (protected)
app.use('/api/game', gameRouter)

// Notification routes (protected)
app.use('/api/notifications', notificationRoutes)

// Stripe webhook (needs raw body, no auth)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) =>
  handleStripeWebhook(req, res, pool)
)

// Telegram webhook (no auth - called by Telegram servers)
app.post('/api/webhooks/telegram', (req, res) => handleTelegramWebhook(req, res, pool))

// Health check with comprehensive status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  }

  // Check database connectivity
  try {
    if (timedPool) {
      const start = Date.now()
      await timedPool.query('SELECT 1')
      health.database = {
        status: 'ok',
        latencyMs: Date.now() - start
      }
    } else {
      health.database = { status: 'unavailable' }
    }
  } catch (err) {
    health.status = 'degraded'
    health.database = { status: 'error', error: err.message }
  }

  // Include metrics summary if requested
  if (req.query.metrics === 'true') {
    health.metrics = getMetricsSummary()
  }

  const statusCode = health.status === 'ok' ? 200 : 503
  res.status(statusCode).json(health)
})

// SEO routes (public - must be before static file serving)
app.use(seoRouter)

// Serve built frontend in production
const clientBuildPath = join(__dirname, '..', '..', 'apps', 'web', 'dist')

if (existsSync(clientBuildPath)) {
  // Serve static files with aggressive caching (Vite uses content hashes in filenames)
  app.use(
    express.static(clientBuildPath, {
      maxAge: '1y',
      immutable: true,
      etag: false
    })
  )

  // Handle client-side routing - serve index.html for all non-API routes
  // index.html should not be cached so users always get latest version
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.set('Cache-Control', 'no-cache, must-revalidate')
      res.sendFile(join(clientBuildPath, 'index.html'))
    }
  })
}

// 404 handler for API routes
app.use('/api/*', notFoundHandler)

// Centralized error handling (must be last)
app.use(errorHandler)

// Initialize database and start server
async function start() {
  try {
    // Validate required environment variables before starting
    // Core features: database and auth are always required
    // Other features validated but allowed to be missing (graceful degradation)
    console.log('Validating environment configuration...')
    validateEnvOrExit(['database', 'auth'])

    // Additional security checks
    const securityCheck = validateSecurityConfig()
    if (!securityCheck.valid) {
      // Critical issues that must block startup
      const criticalIssues = securityCheck.issues.filter(
        i => i.includes('JWT_SECRET') || i.includes('DEV_BYPASS')
      )
      const warnings = securityCheck.issues.filter(
        i => !i.includes('JWT_SECRET') && !i.includes('DEV_BYPASS')
      )

      if (warnings.length > 0) {
        console.warn('Security configuration warnings:')
        warnings.forEach(issue => console.warn(`  - ${issue}`))
      }

      if (criticalIssues.length > 0 && isProduction()) {
        console.error('Critical security issues detected:')
        criticalIssues.forEach(issue => console.error(`  - ${issue}`))
        console.error('\nFix these issues before running in production.')
        process.exit(1)
      }
    }

    console.log('Environment validation passed.')

    await initDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      // Initialize cron jobs after server starts
      initializeCronJobs()
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

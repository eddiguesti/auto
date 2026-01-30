// Polyfills must be loaded first (before any module that uses File API)
import './polyfills.js'

import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dotenv from 'dotenv'

import pool, { initDatabase } from './db/index.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
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

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Make db pool available to routes
app.locals.db = pool

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://easymemoir.co.uk',
  'https://www.easymemoir.co.uk'
]
app.use(cors({
  origin: function(origin, callback) {
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
}))
app.use(express.json({ limit: '1mb' }))

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

// Auth routes (public)
app.use('/api/auth', authRouter)

// Support chat (public - so users can get help even when logged out)
app.use('/api/support', supportRouter)

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

// Stripe webhook (needs raw body, no auth)
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, res) => handleStripeWebhook(req, res, pool)
)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// SEO routes (public - must be before static file serving)
app.use(seoRouter)

// Serve built frontend in production
const clientBuildPath = join(__dirname, '..', 'client', 'dist')

if (existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath))

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
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
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

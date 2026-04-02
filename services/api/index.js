// Polyfills must be loaded first (before any module that uses File API)
import './polyfills.js'

import express from 'express'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from root directory (grandparent of services/api/)
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') })

import pool from './db/index.js'
import { runMigrations } from './db/runner.js'
import {
  validateEnvOrExit,
  validateSecurityConfig,
  isProduction,
  logFeatureStatus
} from './utils/validateEnv.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { wrapPoolWithTiming } from './utils/timedPool.js'
import { mountRoutes } from './routes/index.js'
import { setupMiddleware } from './middleware/setup.js'
import { setupStaticFiles } from './middleware/staticFiles.js'
import { setupWebSocket, setupGracefulShutdown } from './utils/serverSetup.js'
import { initializeCronJobs } from './cron/index.js'
import { getQueue, stopQueue } from './jobs/queue.js'
import { initSentry } from './utils/sentry.js'
import healthRouter from './routes/health.js'
import { mountSwaggerDocs } from './utils/swagger.js'

const app = express()
const PORT = process.env.PORT || 3001

initSentry(app)
app.set('trust proxy', 1)

// Redirect www to non-www and enforce HTTPS
app.use((req, res, next) => {
  const host = req.hostname || req.headers.host
  if (host && host.startsWith('www.')) {
    return res.redirect(301, `https://${host.replace(/^www\./, '')}${req.originalUrl}`)
  }
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${host}${req.originalUrl}`)
  }
  next()
})

// Wrap pool with query timing and make available to routes
const timedPool = wrapPoolWithTiming(pool)
app.locals.db = timedPool

setupMiddleware(app)
mountRoutes(app, { express, pool })
app.use(healthRouter)
mountSwaggerDocs(app)
setupStaticFiles(app)
app.use('/api/*', notFoundHandler)
app.use(errorHandler)

async function start() {
  console.log('Validating environment configuration...')
  validateEnvOrExit(['database', 'auth'])

  const securityCheck = validateSecurityConfig()
  if (!securityCheck.valid) {
    const critical = securityCheck.issues.filter(
      i => i.includes('JWT_SECRET') || i.includes('DEV_BYPASS')
    )
    const warnings = securityCheck.issues.filter(i => !critical.includes(i))
    warnings.forEach(i => console.warn(`  [warn] ${i}`))
    if (critical.length > 0 && isProduction()) {
      critical.forEach(i => console.error(`  [error] ${i}`))
      process.exit(1)
    }
  }

  console.log('Environment validation passed.')
  logFeatureStatus()
  await runMigrations(pool)

  // Start job queue (API only enqueues — workers run in services/worker)
  // Non-fatal: if queue fails to start, the app continues without it
  getQueue().catch(err => {
    console.warn('[queue] Failed to start job queue — async jobs unavailable:', err.message)
  })

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    initializeCronJobs()
  })

  const wss = setupWebSocket(server, timedPool)
  setupGracefulShutdown(server, wss, pool, stopQueue)
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

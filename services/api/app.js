/**
 * Express application composition.
 *
 * This module deliberately has no process lifecycle responsibilities. Node.js,
 * tests, and Cloudflare Workers can all create the same HTTP application while
 * owning their own startup, scheduling, WebSocket, and shutdown behavior.
 */

import express from 'express'
import pool from './db/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { mountRawBodyRoutes, mountRoutes } from './routes/index.js'
import { setupMiddleware } from './middleware/setup.js'
import { setupStaticFiles } from './middleware/staticFiles.js'
import { wrapPoolWithTiming } from './utils/timedPool.js'
import { initSentry } from './utils/sentry.js'
import healthRouter from './routes/health.js'
import { mountSwaggerDocs } from './utils/swagger.js'

/**
 * @param {{ serveStatic?: boolean, serveDocs?: boolean, dbPool?: import('pg').Pool }} [options]
 */
export function createApp({ serveStatic = true, serveDocs = true, dbPool = pool } = {}) {
  const app = express()

  initSentry(app)
  app.set('trust proxy', 1)

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

  const timedPool = wrapPoolWithTiming(dbPool)
  app.locals.db = timedPool

  // Stripe requires the exact bytes received from Stripe. Mount raw-body
  // routes after security/request middleware but before the JSON parser.
  setupMiddleware(app, {
    beforeJson: () => mountRawBodyRoutes(app, { express, pool: timedPool })
  })

  mountRoutes(app, { express, pool: timedPool })
  app.use(healthRouter)
  if (serveDocs) mountSwaggerDocs(app)
  if (serveStatic) setupStaticFiles(app)
  app.use('/api/*', notFoundHandler)
  app.use(errorHandler)

  return { app, db: timedPool }
}

export default createApp

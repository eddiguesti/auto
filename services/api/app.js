// HTTP composition is separate from migrations, listening and process signals.
import './polyfills.js'
import express from 'express'
import pool from './db/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { wrapPoolWithTiming } from './utils/timedPool.js'
import { mountRoutes } from './routes/index.js'
import { setupMiddleware } from './middleware/setup.js'
import { setupStaticFiles } from './middleware/staticFiles.js'
import { initSentry } from './utils/sentry.js'
import healthRouter from './routes/health.js'
import { mountSwaggerDocs } from './utils/swagger.js'

export function createApp({ database = pool, serveStatic = true } = {}) {
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
  app.locals.db = wrapPoolWithTiming(database)
  setupMiddleware(app)
  mountRoutes(app, { express, pool: app.locals.db })
  app.use(healthRouter)
  mountSwaggerDocs(app)
  if (serveStatic) setupStaticFiles(app)
  app.use('/api/*', notFoundHandler)
  app.use(errorHandler)
  return app
}

// Polyfills must be loaded first (before any module that uses File API)
import './environment.js'
import './polyfills.js'
import { createApp } from './app.js'

import pool from './db/index.js'
import { runMigrations } from './db/runner.js'
import {
  validateEnvOrExit,
  validateSecurityConfig,
  isProduction,
  logFeatureStatus
} from './utils/validateEnv.js'
import { setupWebSocket, setupGracefulShutdown } from './utils/serverSetup.js'
import { initializeCronJobs } from './cron/index.js'
import { getQueue, stopQueue } from './jobs/queue.js'
const PORT = process.env.PORT || 3001

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
  const app = createApp()

  // Start job queue (API only enqueues — workers run in services/worker)
  // Non-fatal: if queue fails to start, the app continues without it
  getQueue().catch(err => {
    console.warn('[queue] Failed to start job queue — async jobs unavailable:', err.message)
  })

  // Dedicated workers own scheduling; legacy single-process hosts may opt in.
  const cronJobs = process.env.RUN_CRON_IN_API === 'true' ? initializeCronJobs() : null
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
  const wss = setupWebSocket(server, app.locals.db)
  setupGracefulShutdown(server, wss, pool, stopQueue, () => cronJobs?.stop())
}

start().catch(async err => {
  console.error('Failed to start server:', err.message)
  await stopQueue().catch(() => {})
  await pool?.end().catch(() => {})
  process.exit(1)
})

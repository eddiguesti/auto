import pool from './db/index.js'
import { createApp } from './app.js'
import { runMigrations } from './db/runner.js'
import {
  validateEnvOrExit,
  validateSecurityConfig,
  isProduction,
  logFeatureStatus
} from './utils/validateEnv.js'
import { setupWebSocket, setupGracefulShutdown } from './utils/serverSetup.js'
import { getQueue, stopQueue } from './jobs/queue.js'

/** Start the long-running Node.js API process. */
export async function startNodeServer() {
  const port = process.env.PORT || 3001

  console.log('Validating environment configuration...')
  validateEnvOrExit(['database', 'auth'])

  const securityCheck = validateSecurityConfig()
  if (!securityCheck.valid) {
    const critical = securityCheck.issues.filter(
      issue => issue.includes('JWT_SECRET') || issue.includes('DEV_BYPASS')
    )
    const warnings = securityCheck.issues.filter(issue => !critical.includes(issue))
    warnings.forEach(issue => console.warn(`  [warn] ${issue}`))
    if (critical.length > 0 && isProduction()) {
      critical.forEach(issue => console.error(`  [error] ${issue}`))
      throw new Error('Unsafe production security configuration')
    }
  }

  console.log('Environment validation passed.')
  logFeatureStatus()
  await runMigrations(pool)

  // The API only produces jobs. Consumers and schedules belong to the worker
  // process (or Cloudflare Queue/Cron handlers) and must never run here.
  getQueue().catch(error => {
    console.warn('[queue] Failed to start job queue — async jobs unavailable:', error.message)
  })

  const { app, db } = createApp()
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
  })

  const wss = setupWebSocket(server, db)
  setupGracefulShutdown(server, wss, pool, stopQueue)

  return { app, server, wss }
}

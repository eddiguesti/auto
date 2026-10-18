// PostgreSQL queue implementation for the existing Node runtime. The native
// Cloudflare replacement must use Queues and persist user-visible job status.
import { PgBoss } from 'pg-boss'
import { JOB } from './jobNames.js'

export function createQueueManager({
  Boss = PgBoss,
  environment = () => process.env,
  logger = console
} = {}) {
  let current = null
  let starting = null
  let stopping = null

  async function getQueue() {
    if (stopping) await stopping
    if (current) return current
    if (starting) return starting
    starting = (async () => {
      const config = environment()
      if (!config.DATABASE_URL) throw new Error('DATABASE_URL required for job queue')
      const hostname = new URL(config.DATABASE_URL).hostname
      const internal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.railway.internal')
      const candidate = new Boss({
        connectionString: config.DATABASE_URL,
        ssl: internal
          ? false
          : { rejectUnauthorized: config.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
        max: 3
      })
      candidate.on('error', error => logger.error('[queue] pg-boss error:', error.message))
      try {
        await candidate.start()
        for (const name of Object.values(JOB)) {
          await candidate.createQueue(name, { deleteAfterSeconds: 2592000 })
        }
        current = candidate
        return candidate
      } catch (error) {
        await candidate.stop().catch(() => {})
        throw error
      }
    })()
    try {
      return await starting
    } finally {
      starting = null
    }
  }

  async function stopQueue() {
    if (stopping) return stopping
    stopping = (async () => {
      if (starting) await starting.catch(() => {})
      const candidate = current
      current = null
      if (candidate) await candidate.stop()
    })()
    try {
      await stopping
    } finally {
      stopping = null
    }
  }

  return { getQueue, stopQueue }
}

const manager = createQueueManager()
export const getQueue = manager.getQueue
export const stopQueue = manager.stopQueue

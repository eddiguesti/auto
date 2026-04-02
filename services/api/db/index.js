/**
 * PostgreSQL connection pool.
 *
 * Schema management is handled by db/runner.js (SQL migrations).
 * Run `npm run migrate:status` to check applied vs pending migrations.
 */

import pg from 'pg'

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.error('ERROR: DATABASE_URL environment variable is not set!')
  process.exit(1)
}

const poolConfig = {
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 10000,
  allowExitOnIdle: true
}

let pool = null

if (databaseUrl) {
  const isInternalConnection =
    databaseUrl.includes('localhost') || databaseUrl.includes('.railway.internal')

  const sslConfig =
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : { rejectUnauthorized: false }

  pool = new Pool({
    ...poolConfig,
    connectionString: databaseUrl,
    ssl: isInternalConnection ? false : sslConfig
  })
} else {
  try {
    pool = new Pool({
      ...poolConfig,
      connectionString: 'postgresql://localhost:5432/lifestory',
      ssl: false
    })
  } catch {
    console.warn('No local database available — some features will be limited')
  }
}

export async function query(text, params) {
  return pool.query(text, params)
}

export default pool

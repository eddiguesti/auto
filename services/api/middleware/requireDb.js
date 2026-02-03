/**
 * Middleware to check database availability
 * Returns 503 Service Unavailable if db is not available
 */
export function requireDb(req, res, next) {
  if (!req.app.locals.db) {
    return res.status(503).json({ error: 'Database not available' })
  }
  next()
}

/**
 * Get database from request, throws if not available
 * Use this in route handlers where you need the db reference
 * @param {import('express').Request} req
 * @returns {import('pg').Pool}
 */
export function getDb(req) {
  const db = req.app.locals.db
  if (!db) {
    const error = new Error('Database not available')
    error.statusCode = 503
    throw error
  }
  return db
}

export default requireDb

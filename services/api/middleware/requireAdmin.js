/**
 * Middleware: require the authenticated user to be an admin.
 * Queries the database on every request so a revoked admin flag
 * takes effect immediately without needing a new JWT.
 */

import { createLogger } from '../utils/logger.js'

const logger = createLogger('admin')

export async function requireAdmin(req, res, next) {
  const db = req.app.locals.db
  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id])

    const user = result.rows[0]
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    next()
  } catch (err) {
    logger.error('Admin check failed', { userId: req.user.id, error: err.message })
    return res.status(500).json({ error: 'Failed to verify admin status' })
  }
}

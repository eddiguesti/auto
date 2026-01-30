/**
 * Wraps async route handlers to catch errors and pass them to Express error handler
 * Eliminates need for try/catch in every route
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await db.query('SELECT * FROM users')
 *   res.json(users.rows)
 * }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default asyncHandler

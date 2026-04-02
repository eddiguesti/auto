/**
 * Pagination middleware.
 * Reads `limit` and `offset` from the query string, coerces them to safe
 * integers, and attaches `req.pagination` for downstream handlers.
 *
 * Defaults: limit=20, offset=0
 * Cap:      limit max 100
 */

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function paginate(req, res, next) {
  const rawLimit = parseInt(req.query.limit, 10)
  const rawOffset = parseInt(req.query.offset, 10)

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT

  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0

  req.pagination = { limit, offset }
  next()
}

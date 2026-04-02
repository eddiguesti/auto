/**
 * Standardised API response envelope helpers.
 *
 * All API responses should use one of these helpers so clients get a
 * consistent shape:
 *   { success, data, error, meta }
 *
 * Usage:
 *   res.json(success({ id: 1, name: 'Alice' }))
 *   res.status(400).json(error('VALIDATION_ERROR', 'Email is required', 'email'))
 *   res.json(paginated(rows, total, limit, offset))
 */

/**
 * Successful response with optional metadata.
 *
 * @template T
 * @param {T} data
 * @param {Record<string, unknown>} [meta]
 * @returns {{ success: true, data: T, error: null, meta: Record<string, unknown> }}
 */
export function success(data, meta = {}) {
  return { success: true, data, error: null, meta }
}

/**
 * Error response with a machine-readable code, human-readable message,
 * and an optional field name for validation errors.
 *
 * @param {string} code  - Machine-readable error code (e.g. 'VALIDATION_ERROR')
 * @param {string} message - Human-readable description
 * @param {string|null} [field] - Form field that caused the error (if any)
 * @returns {{ success: false, data: null, error: { code: string, message: string, field: string|null }, meta: {} }}
 */
export function error(code, message, field = null) {
  return { success: false, data: null, error: { code, message, field }, meta: {} }
}

/**
 * Paginated list response.
 *
 * @template T
 * @param {T[]} rows
 * @param {number} total  - Total number of matching records
 * @param {number} limit  - Page size
 * @param {number} offset - Current offset
 * @returns {{ success: true, data: T[], error: null, meta: { pagination: { total, limit, offset, hasMore } } }}
 */
export function paginated(rows, total, limit, offset) {
  return success(rows, {
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  })
}

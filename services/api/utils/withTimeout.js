/**
 * withTimeout — wraps a promise with a deadline.
 * Rejects with ExternalServiceError if the promise does not settle
 * within `ms` milliseconds.
 *
 * @param {Promise<any>} promise - the operation to race against the clock
 * @param {number}       ms      - timeout in milliseconds
 * @param {string}       label   - service name used in the error message
 * @returns {Promise<any>}
 */

import { ExternalServiceError } from './errors.js'

export function withTimeout(promise, ms, label = 'External service') {
  const timeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new ExternalServiceError(`${label} timed out after ${ms}ms`))
    }, ms)
  })

  return Promise.race([promise, timeout])
}

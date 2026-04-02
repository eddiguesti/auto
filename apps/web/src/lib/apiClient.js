/**
 * API client factory and hook.
 *
 * Usage in a component or hook:
 *   const api = useApiClient()
 *   const data = await api.get('/api/stories/progress')
 *   await api.post('/api/stories', { chapterId, questionId, answer })
 *
 * All methods:
 *  - Resolve with the parsed JSON body on 2xx
 *  - Throw an ApiError (with .status and .body) on non-2xx
 */

import { useAuth } from '../context/AuthContext'

export class ApiError extends Error {
  constructor(status, body) {
    const message = body?.error?.message || body?.message || body?.error || `HTTP ${status}`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function createClient(authFetch) {
  async function request(method, path, body, options = {}) {
    const res = await authFetch(path, {
      method,
      ...options,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    let parsed
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      parsed = await res.json()
    } else {
      parsed = await res.text()
    }

    if (!res.ok) {
      throw new ApiError(res.status, parsed)
    }

    return parsed
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options)
  }
}

/**
 * Hook that returns an authenticated API client for use in components and
 * React Query query/mutation functions.
 */
export function useApiClient() {
  const { authFetch } = useAuth()
  return createClient(authFetch)
}

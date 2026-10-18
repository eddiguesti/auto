/**
 * API client factory and hook.
 *
 * Usage in a component or hook:
 *   const api = useApiClient()
 *   const data = await api.get('/api/stories/progress')
 *   await api.post('/api/stories', { chapter_id, question_id, answer })
 *
 * All methods:
 *  - Resolve with the parsed JSON body on 2xx
 *  - Throw an ApiError (with .status and .body) on non-2xx
 */

import { useAuth } from '../context/AuthContext'
import { fetchApiResponse } from './apiResponse'
export { ApiError } from './apiResponse'

function createClient(authFetch) {
  async function request(method, path, body, options = {}) {
    return fetchApiResponse(authFetch, path, {
      method,
      ...options,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
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

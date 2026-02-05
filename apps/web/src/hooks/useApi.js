import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Custom hook for API calls with loading and error state management
 * Provides a simple interface for making authenticated API requests
 *
 * @returns {Object} API utilities
 *
 * @example
 * const { loading, error, request, clearError } = useApi()
 *
 * // Simple GET request
 * const data = await request('/api/stories/all')
 *
 * // POST request with body
 * const result = await request('/api/stories', {
 *   method: 'POST',
 *   body: { chapter_id: 'childhood', question_id: 'q1', answer: 'My story...' }
 * })
 */
export function useApi() {
  const { authFetch } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const clearError = useCallback(() => setError(null), [])

  const request = useCallback(
    async (url, options = {}) => {
      setLoading(true)
      setError(null)

      try {
        // Handle body serialization
        const fetchOptions = { ...options }
        if (
          options.body &&
          typeof options.body === 'object' &&
          !(options.body instanceof FormData)
        ) {
          fetchOptions.body = JSON.stringify(options.body)
        }

        const res = await authFetch(url, fetchOptions)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(
            errorData.error || errorData.message || `Request failed with status ${res.status}`
          )
        }

        // Check content type for response parsing
        const contentType = res.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          return await res.json()
        }

        // Return blob for file downloads
        if (contentType?.includes('application/epub') || contentType?.includes('audio/')) {
          return await res.blob()
        }

        return await res.text()
      } catch (err) {
        setError(err.message || 'An error occurred')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authFetch]
  )

  return { loading, error, request, clearError }
}

/**
 * Hook for fetching data on component mount with automatic loading/error handling
 *
 * @param {string} url - API endpoint to fetch
 * @param {Object} options - Fetch options and configuration
 * @returns {Object} { data, loading, error, refetch }
 *
 * @example
 * const { data: stories, loading, error, refetch } = useFetch('/api/stories/all')
 */
export function useFetch(url, { skip = false, initialData = null } = {}) {
  const { authFetch } = useAuth()
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await authFetch(url)
      if (!res.ok) {
        throw new Error('Failed to fetch data')
      }
      const result = await res.json()
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [authFetch, url])

  // Fetch on mount if not skipped
  useEffect(() => {
    if (!skip) {
      fetchData()
    }
  }, [skip, fetchData])

  return { data, loading, error, refetch: fetchData, setData }
}

export default useApi

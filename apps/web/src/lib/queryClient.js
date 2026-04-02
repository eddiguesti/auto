import { QueryClient } from '@tanstack/react-query'

/**
 * Shared QueryClient instance.
 * - staleTime 5 min: data is considered fresh for 5 minutes after a fetch.
 * - gcTime 10 min: unused cache entries are garbage-collected after 10 minutes.
 * - retry 1: on failure, retry once before surfacing the error.
 * - throwOnError false: errors are returned via the query result, not thrown to ErrorBoundary.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      throwOnError: false
    },
    mutations: {
      throwOnError: false
    }
  }
})

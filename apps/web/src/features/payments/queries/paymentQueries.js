import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'

/**
 * Fetch the current user's premium subscription status.
 * Returns { isPremium, expiresAt, plan }.
 */
export function usePremiumStatus() {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.payments.status,
    queryFn: () => api.get('/api/payments/status'),
    staleTime: 10 * 60 * 1000 // Premium status changes infrequently — cache for 10 min
  })
}

/**
 * Fetch the current user's payment history.
 */
export function usePaymentHistory() {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.payments.history,
    queryFn: () => api.get('/api/payments/history')
  })
}

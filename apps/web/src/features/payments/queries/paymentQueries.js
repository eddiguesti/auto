import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'

/**
 * Read the current user's verified entitlement from the account endpoint.
 * The API does not expose a subscription plan; do not infer one from payments.
 */
export function usePremiumStatus() {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.payments.status,
    queryFn: () => api.get('/api/auth/me'),
    select: ({ user }) => ({
      isPremium: Boolean(user.isPremium),
      expiresAt: user.premium_until
    }),
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

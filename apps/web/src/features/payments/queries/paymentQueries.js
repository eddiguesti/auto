import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'
import { useAuth } from '../../../context/AuthContext'

/**
 * Read the current user's verified entitlement from the account endpoint.
 * The API does not expose a subscription plan; do not infer one from payments.
 */
export function usePremiumStatus() {
  const api = useApiClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.payments.status(user?.id),
    enabled: Boolean(user?.id),
    queryFn: ({ signal }) => api.get('/api/auth/me', { signal }),
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
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.payments.history(user?.id),
    enabled: Boolean(user?.id),
    queryFn: ({ signal }) => api.get('/api/payments/history', { signal })
  })
}

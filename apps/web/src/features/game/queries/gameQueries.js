import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'
import { useAuth } from '../../../context/AuthContext'

/**
 * Fetch the current user's game state (streak, points, level).
 */
export function useGameState() {
  const api = useApiClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.game.state(user?.id),
    enabled: Boolean(user?.id),
    queryFn: ({ signal }) => api.get('/api/game/state', { signal })
  })
}

/**
 * Fetch the current user's earned achievements.
 */
export function useAchievements() {
  const api = useApiClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.game.achievements(user?.id),
    enabled: Boolean(user?.id),
    queryFn: ({ signal }) => api.get('/api/game/achievements', { signal })
  })
}

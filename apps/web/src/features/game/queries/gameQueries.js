import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'

/**
 * Fetch the current user's game state (streak, points, level).
 */
export function useGameState() {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.game.state,
    queryFn: () => api.get('/api/game/state')
  })
}

/**
 * Fetch the current user's earned achievements.
 */
export function useAchievements() {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.game.achievements,
    queryFn: () => api.get('/api/game/achievements')
  })
}

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'
import { useAuth } from '../../../context/AuthContext'

/**
 * Fetch all answers for a specific chapter.
 * Answers are keyed by questionId in the response.
 */
export function useChapterStories(chapterId) {
  const api = useApiClient()
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.stories.chapter(chapterId, user?.id),
    queryFn: ({ signal }) => api.get(`/api/stories/${chapterId}`, { signal }),
    enabled: Boolean(chapterId && user?.id)
  })
}

/**
 * Fetch aggregated progress (answeredCount per chapter) for the dashboard.
 * Returns an object keyed by chapterId.
 */
export function useDashboardProgress(userId) {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.dashboard.progress(userId),
    queryFn: () => api.get('/api/stories/progress').then(data => data.progress || data),
    enabled: Boolean(userId)
  })
}

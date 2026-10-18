import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'

/**
 * Fetch all answers for a specific chapter.
 * Answers are keyed by questionId in the response.
 */
export function useChapterStories(chapterId) {
  const api = useApiClient()

  return useQuery({
    queryKey: queryKeys.stories.chapter(chapterId),
    queryFn: () => api.get(`/api/stories/${chapterId}`),
    enabled: Boolean(chapterId)
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

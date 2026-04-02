import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/queryKeys'
import { useApiClient } from '../../../lib/apiClient'

/**
 * Save (upsert) a single story answer.
 * Invalidates the chapter cache so the UI reflects the new answer immediately.
 */
export function useSaveStory() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chapterId, questionId, answer }) =>
      api.post('/api/stories/save', { chapterId, questionId, answer }),
    onSuccess: (_, { chapterId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.chapter(chapterId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all })
    }
  })
}

/**
 * Delete a story answer by ID.
 * Invalidates all story caches so the chapter re-fetches.
 */
export function useDeleteStory() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: storyId => api.delete(`/api/stories/${storyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all })
    }
  })
}

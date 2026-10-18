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
    mutationFn: ({ chapterId, questionId, answer, totalQuestions }) =>
      api.post('/api/stories', {
        chapter_id: chapterId,
        question_id: questionId,
        answer,
        ...(totalQuestions !== undefined ? { total_questions: totalQuestions } : {})
      }),
    onSuccess: (_, { chapterId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.chapter(chapterId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all })
    }
  })
}

/**
 * useChapterAI — manages AI assistant state for the Chapter page.
 * Extracts the show/hide + context management so Chapter.jsx stays thin.
 *
 * Returns:
 *  - showAI        : boolean — whether the assistant panel is visible
 *  - aiContext     : { question, answer, chapterId } | null
 *  - openAIAssistant(question, answer, chapterId) — open with context
 *  - closeAIAssistant()                           — hide the panel
 */

import { useState, useCallback } from 'react'

export function useChapterAI() {
  const [showAI, setShowAI] = useState(false)
  const [aiContext, setAiContext] = useState(null)

  const openAIAssistant = useCallback((question, answer, chapterId) => {
    setAiContext({ question, answer, chapterId })
    setShowAI(true)
  }, [])

  const closeAIAssistant = useCallback(() => {
    setShowAI(false)
  }, [])

  return { showAI, aiContext, openAIAssistant, closeAIAssistant }
}

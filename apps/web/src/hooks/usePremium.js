import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const FREE_CHAPTER_ID = 'earliest-memories'

export function usePremium() {
  const { user } = useAuth()

  const isPremium = useMemo(() => {
    return user?.isPremium || false
  }, [user?.isPremium])

  const isChapterLocked = chapterId => {
    if (chapterId === FREE_CHAPTER_ID) return false
    return !isPremium
  }

  return { isPremium, isChapterLocked, FREE_CHAPTER_ID }
}

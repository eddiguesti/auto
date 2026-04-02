import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { chapters } from '../data/chapters'
import { buildBook, buildPageContents } from '../utils/bookRenderer/index.js'

/**
 * Fetch stories and cover data for the book preview.
 */
function useBookData() {
  const { authFetch } = useAuth()
  const [stories, setStories] = useState([])
  const [cover, setCover] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [storiesRes, coverRes] = await Promise.all([
          authFetch('/api/stories/all'),
          authFetch('/api/covers/saved')
        ])
        if (cancelled) return

        if (storiesRes.ok) {
          const data = await storiesRes.json()
          setStories(sortStories(data))
        }
        if (coverRes.ok) {
          const data = await coverRes.json()
          if (data.cover) setCover(data.cover)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load book data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  return { stories, cover, loading, error }
}

function sortStories(data) {
  return data
    .filter(s => s.answer?.trim())
    .sort((a, b) => {
      if (a.chapter_id !== b.chapter_id) {
        return (
          chapters.findIndex(c => c.id === a.chapter_id) -
          chapters.findIndex(c => c.id === b.chapter_id)
        )
      }
      return a.question_id - b.question_id
    })
}

/**
 * Manage the Three.js book lifecycle (init, render, destroy).
 */
function useBookLifecycle(containerRef, bookContents, cover, loading, storyCount, chapterCount) {
  const bookApiRef = useRef(null)
  const [view, setView] = useState(0)
  const [sheetCount, setSheetCount] = useState(0)

  useEffect(() => {
    if (loading || !containerRef.current) return
    const el = containerRef.current
    const { title, author, pages } = bookContents

    const api = buildBook(
      el,
      pages,
      title,
      author,
      cover?.front_cover_url,
      storyCount,
      chapterCount
    )
    if (!api) return

    bookApiRef.current = api
    api.onViewChange = v => setView(v)
    api.init().then(() => setSheetCount(api.sheetCount))

    return () => {
      api.destroy()
      bookApiRef.current = null
    }
  }, [loading, bookContents, cover, storyCount, chapterCount])

  return { bookApiRef, view, sheetCount }
}

/**
 * Keyboard navigation for arrow keys and spacebar.
 */
function useBookKeyboard(bookApiRef) {
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        bookApiRef.current?.goNext()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        bookApiRef.current?.goPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

/**
 * Build view labels from sheet count (e.g. "Cover", "Pages 1-2", "Back Cover").
 */
function useViewLabels(sheetCount) {
  return useMemo(() => {
    if (sheetCount <= 0) return []
    const labels = ['Cover']
    for (let i = 1; i < sheetCount - 1; i++) {
      labels.push(`Pages ${i * 2 - 1}\u2013${i * 2}`)
    }
    labels.push('Back Cover')
    return labels
  }, [sheetCount])
}

/**
 * Main hook: orchestrates data fetching, book lifecycle, and navigation.
 */
export function useBookRenderer(userName) {
  const containerRef = useRef(null)
  const { stories, cover, loading, error } = useBookData()

  const bookContents = useMemo(
    () => buildPageContents(stories, cover, userName),
    [stories, cover, userName]
  )

  const storyCount = stories.length
  const chapterCount = new Set(stories.map(s => s.chapter_id)).size

  const { bookApiRef, view, sheetCount } = useBookLifecycle(
    containerRef,
    bookContents,
    cover,
    loading,
    storyCount,
    chapterCount
  )

  useBookKeyboard(bookApiRef)

  const viewLabels = useViewLabels(sheetCount)
  const handlePrev = useCallback(() => bookApiRef.current?.goPrev(), [])
  const handleNext = useCallback(() => bookApiRef.current?.goNext(), [])

  return {
    containerRef,
    loading,
    error,
    view,
    sheetCount,
    viewLabels,
    handlePrev,
    handleNext,
    title: bookContents.title,
    storyCount,
    chapterCount
  }
}

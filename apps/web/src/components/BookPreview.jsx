import { useState, useEffect, useMemo, memo } from 'react'
import { useAuth } from '../context/AuthContext'
import { chapters } from '../data/chapters'

// Static page types - defined outside component to prevent recreation
const PAGES = [
  { type: 'cover' },
  { type: 'title' },
  { type: 'dedication' },
  { type: 'chapter-preview' }
]

// Get first letter for drop cap - pure function outside component
function getDropCap(text) {
  if (!text) return { letter: 'M', rest: 'y story begins...' }
  const clean = text.replace(/^["'\s]+/, '') // Remove leading quotes/spaces
  return {
    letter: clean.charAt(0).toUpperCase(),
    rest: clean.slice(1)
  }
}

export default memo(function BookPreview({ userName, totalProgress, onClose }) {
  const { authFetch } = useAuth()
  const [currentPage, setCurrentPage] = useState(0)
  const [firstStory, setFirstStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savedCover, setSavedCover] = useState(null)

  useEffect(() => {
    fetchFirstStory()
    fetchSavedCover()
  }, [])

  const fetchSavedCover = async () => {
    try {
      const res = await authFetch('/api/covers/saved')
      if (res.ok) {
        const data = await res.json()
        if (data.cover) {
          setSavedCover(data.cover)
        }
      }
    } catch (err) {
      console.error('Error fetching saved cover:', err)
    }
  }

  const fetchFirstStory = async () => {
    try {
      // Fetch all stories and find the first one with content
      const res = await authFetch('/api/stories/all')
      if (res.ok) {
        const stories = await res.json()
        // Sort by chapter_id and question_id to get the first answered question
        const sortedStories = stories
          .filter(s => s.answer && s.answer.trim())
          .sort((a, b) => {
            if (a.chapter_id !== b.chapter_id) return a.chapter_id - b.chapter_id
            return a.question_id - b.question_id
          })

        if (sortedStories.length > 0) {
          const story = sortedStories[0]
          // Find the chapter and question from our data
          const chapter = chapters.find(c => c.id === story.chapter_id)
          const question = chapter?.questions?.[story.question_id]

          setFirstStory({
            answer: story.answer,
            chapterTitle: chapter?.title || 'Chapter One',
            question: question || 'My earliest memory'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching first story:', err)
    } finally {
      setLoading(false)
    }
  }

  // Memoize drop cap computation
  const storyContent = firstStory?.answer
  const { letter, rest } = useMemo(() => getDropCap(storyContent), [storyContent])

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Book Container */}
        <div className="relative perspective-1000">
          {/* Book Shadow */}
          <div className="absolute inset-0 bg-black/30 rounded-lg blur-xl translate-y-4" />

          {/* Book */}
          <div
            className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg overflow-hidden shadow-2xl border border-amber-200/50"
            style={{ aspectRatio: '3/4' }}
          >
            {/* Page content based on current page */}
            {PAGES[currentPage].type === 'cover' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
                {/* Custom cover image if available */}
                {savedCover?.front_cover_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${savedCover.front_cover_url})` }}
                  />
                )}

                {/* Overlay for text readability if using custom image */}
                {savedCover?.front_cover_url && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                )}

                {/* Decorative border (only show if no custom cover) */}
                {!savedCover?.front_cover_url && (
                  <>
                    <div className="absolute inset-4 border border-amber-500/30 rounded-lg" />
                    <div className="absolute inset-6 border border-amber-500/20 rounded" />
                  </>
                )}

                {/* Title */}
                <div className="text-center z-10">
                  <div className="text-amber-400/60 text-3xl mb-4">❧</div>
                  <h1 className="font-display text-3xl sm:text-4xl mb-2 tracking-wide drop-shadow-lg">
                    {savedCover?.title || `${userName?.split(' ')[0]}'s Life`}
                  </h1>
                  <div className="w-16 h-px bg-amber-500/50 mx-auto mb-4" />
                  <p className="text-amber-200/80 italic text-lg drop-shadow">
                    The Autobiography of
                  </p>
                  <p className="text-white text-xl font-medium drop-shadow-lg">
                    {savedCover?.author || userName || 'Your Name'}
                  </p>
                </div>

                {/* Year */}
                <div className="absolute bottom-8 text-amber-400/50 text-sm z-10">
                  {new Date().getFullYear()}
                </div>
              </div>
            )}

            {PAGES[currentPage].type === 'title' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-cream">
                <div className="text-sepia/40 text-2xl mb-8">❧</div>
                <h1 className="font-display text-3xl text-ink mb-4 text-center">
                  {userName?.split(' ')[0]}'s Life
                </h1>
                <div className="w-24 h-px bg-sepia/30 mb-4" />
                <p className="text-sepia italic text-center">
                  A memoir of memories, moments,
                  <br />
                  and the stories that made me
                </p>
                <div className="mt-auto text-sepia/60 text-sm">
                  Written with love for future generations
                </div>
              </div>
            )}

            {PAGES[currentPage].type === 'dedication' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-cream">
                <p className="text-sepia/60 text-sm uppercase tracking-widest mb-4">Dedication</p>
                <p className="font-display text-xl text-ink italic text-center leading-relaxed max-w-xs">
                  "For my children and grandchildren,
                  <br />
                  so they may know who I was,
                  <br />
                  where I came from,
                  <br />
                  and how much I loved them."
                </p>
              </div>
            )}

            {PAGES[currentPage].type === 'chapter-preview' && (
              <div className="absolute inset-0 flex flex-col p-8 bg-cream overflow-hidden">
                <div className="text-center mb-6">
                  <p className="text-sepia/60 text-xs uppercase tracking-widest">Chapter One</p>
                  <h2 className="font-display text-2xl text-ink">
                    {firstStory?.chapterTitle || 'Earliest Memories'}
                  </h2>
                  <p className="text-sepia/70 italic text-sm">
                    {firstStory?.question ? `"${firstStory.question}"` : 'Ages 0-5'}
                  </p>
                </div>

                {/* Story content */}
                <div className="flex-1 overflow-hidden relative">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-sepia/30 border-t-sepia rounded-full animate-spin" />
                    </div>
                  ) : storyContent ? (
                    <div className="font-serif text-ink/80 text-sm leading-relaxed">
                      <p>
                        <span className="text-4xl font-display float-left mr-2 mt-1 text-sepia">
                          {letter}
                        </span>
                        {rest.length > 300 ? rest.slice(0, 300) + '...' : rest}
                      </p>
                    </div>
                  ) : (
                    <div className="font-serif text-ink/80 text-sm leading-relaxed space-y-4">
                      <p className="text-sepia/60 italic text-center mt-12">
                        Your story will appear here once you start writing.
                      </p>
                      <p className="text-sepia/40 text-center text-xs">
                        Answer questions in any chapter to see your memoir come to life.
                      </p>
                    </div>
                  )}
                  {/* Fade out */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream to-transparent" />
                </div>

                {/* Progress indicator */}
                <div className="text-center mt-4 py-2 border-t border-sepia/10">
                  <p className="text-sepia/60 text-xs">
                    {totalProgress > 0 ? (
                      <>Your story is {totalProgress}% complete</>
                    ) : (
                      <>Start writing to see your story here</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Page turn effect - book spine shadow */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent" />
          </div>

          {/* Page indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {PAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentPage ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-white/70 text-sm mt-6">
          {storyContent ? 'Preview of your memoir' : 'This is how your finished book will look'}
        </p>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 text-white/70 hover:text-white disabled:opacity-30 transition"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(PAGES.length - 1, p + 1))}
            disabled={currentPage === PAGES.length - 1}
            className="px-4 py-2 text-white/70 hover:text-white disabled:opacity-30 transition"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
})

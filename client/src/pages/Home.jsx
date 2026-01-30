import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'
import ExportModal from '../components/ExportModal'

export default function Home() {
  const { user, authFetch } = useAuth()
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)

  // Get first name for title
  const firstName = user?.name?.split(' ')[0] || 'Your'

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      setError(null)
      const res = await authFetch('/api/stories/progress')
      if (!res.ok) {
        throw new Error('Failed to load progress')
      }
      const data = await res.json()
      setProgress(data)
    } catch (err) {
      console.error('Error fetching progress:', err)
      setError('Unable to load your progress. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const getChapterProgress = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter || !progress[chapterId]) return 0
    const answered = progress[chapterId] || 0
    return Math.round((answered / chapter.questions.length) * 100)
  }

  const totalProgress = () => {
    const totalQuestions = chapters.reduce((sum, ch) => sum + ch.questions.length, 0)
    const totalAnswered = Object.values(progress).reduce((sum, count) => sum + count, 0)
    return Math.round((totalAnswered / totalQuestions) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 page-enter">
      {/* Export Button - Top Right */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowExportModal(true)}
          className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-full hover:from-stone-700 hover:to-stone-800 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
        >
          <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium tracking-wide">Export</span>
        </button>
      </div>

      {/* Header */}
      <header className="text-center mb-12 sm:mb-16">
        {/* Decorative flourish */}
        <div className="text-sepia/40 text-2xl mb-4 tracking-[0.5em] float">❧</div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-ink mb-3 tracking-wide">
          {firstName}'s Life
        </h1>
        <div className="w-24 h-px bg-sepia/30 mx-auto mb-4" />
        <p className="text-lg sm:text-xl text-sepia/80 italic">
          The Autobiography of {user?.name || 'You'}
        </p>
        <p className="text-sepia/60 mt-3 text-sm max-w-md mx-auto">
          A journey through memories, guided by thoughtful questions and the gentle assistance of AI
        </p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Overall Progress */}
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-5 sm:p-6 mb-10 sm:mb-12 border border-sepia/10 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-ink/80 text-sm tracking-wide uppercase">Your Journey</span>
              <span className="text-sepia font-semibold">{totalProgress()}% Complete</span>
            </div>
            <div className="h-2 bg-sepia/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sepia/60 to-sepia transition-all duration-500"
                style={{ width: `${totalProgress()}%` }}
              />
            </div>
          </div>

          {/* Chapters - Table of Contents */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-center text-sepia/60 text-sm uppercase tracking-[0.2em] mb-6">Table of Contents</h2>
            <div className="space-y-3">
              {chapters.map((chapter) => {
                const chapterProgress = getChapterProgress(chapter.id)
                return (
                  <div
                    key={chapter.id}
                    className="bg-white/50 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-sepia/10 hover:border-sepia/30 hover:bg-white/70 transition stagger-item"
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Chapter Number */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-sepia/30 rounded-full flex-shrink-0">
                        <span className="text-sepia font-semibold text-sm sm:text-base">{chapter.icon}</span>
                      </div>

                      {/* Chapter Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl text-ink font-medium">
                          {chapter.title}
                        </h3>
                        <p className="text-sepia/60 text-sm">{chapter.subtitle}</p>
                      </div>

                      {/* Progress */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-sepia/80 text-sm">{chapterProgress}%</span>
                        <div className="w-16 sm:w-20 h-1.5 bg-sepia/10 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-sepia/50 transition-all"
                            style={{ width: `${chapterProgress}%` }}
                          />
                        </div>
                        <p className="text-sepia/40 text-xs mt-1">{chapter.questions.length} questions</p>
                      </div>
                    </div>

                    {/* Write or Talk options */}
                    <div className="flex gap-2 mt-4 ml-16 sm:ml-20">
                      <Link
                        to={`/chapter/${chapter.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-sepia/10 hover:bg-sepia/20 text-sepia rounded-lg transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Write
                      </Link>
                      <Link
                        to={`/voice?chapter=${chapter.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-sepia hover:bg-sepia/90 text-white rounded-lg transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Talk
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Decorative End */}
          <div className="text-center">
            <div className="text-sepia/30 text-lg float">✦</div>
          </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          userName={user?.name || 'Your'}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, authFetch } = useAuth()
  const [progress, setProgress] = useState({})

  // Get first name for title
  const firstName = user?.name?.split(' ')[0] || 'Your'

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const res = await authFetch('/api/stories/progress')
      const data = await res.json()
      setProgress(data)
    } catch (err) {
      console.error('Error fetching progress:', err)
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
                  <Link
                    key={chapter.id}
                    to={`/chapter/${chapter.id}`}
                    className="block bg-white/50 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-sepia/10 hover:border-sepia/30 hover:bg-white/70 transition group stagger-item card-hover"
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Chapter Number */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-sepia/30 rounded-full group-hover:border-sepia/50 transition flex-shrink-0">
                        <span className="text-sepia font-semibold text-sm sm:text-base">{chapter.icon}</span>
                      </div>

                      {/* Chapter Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl text-ink group-hover:text-sepia transition font-medium">
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
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Export Button */}
          <div className="text-center">
            <div className="inline-block">
              <div className="text-sepia/30 text-lg mb-3 float">✦</div>
              <Link
                to="/export"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-ink text-white/90 rounded hover:bg-ink/90 transition group pulse-gentle tap-bounce"
              >
                <span className="text-xl">📖</span>
                <span className="tracking-wide">Preview Your Story</span>
              </Link>
            </div>
          </div>
    </div>
  )
}

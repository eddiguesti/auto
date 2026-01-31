import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'
import ExportModal from '../components/ExportModal'
import ProgressCard from '../components/ProgressCard'
import BookPreview from '../components/BookPreview'
import CompletionCertificate from '../components/CompletionCertificate'
import TelegramLinkModal from '../components/TelegramLinkModal'

export default function Home() {
  const { user, authFetch } = useAuth()
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showBookPreview, setShowBookPreview] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [showTelegramLink, setShowTelegramLink] = useState(false)
  const [lastWorkedOn, setLastWorkedOn] = useState(null)

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
      setProgress(data.progress || data)

      // Find the last chapter they worked on (for "continue" feature)
      if (data.lastWorkedOn) {
        setLastWorkedOn(data.lastWorkedOn)
      } else {
        // Find first chapter with progress but not complete
        const progressData = data.progress || data
        for (const chapter of chapters) {
          const answered = progressData[chapter.id] || 0
          if (answered > 0 && answered < chapter.questions.length) {
            setLastWorkedOn({
              chapterId: chapter.id,
              questionIndex: answered
            })
            break
          }
        }
      }
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

  const totalQuestions = chapters.reduce((sum, ch) => sum + ch.questions.length, 0)
  const totalAnswered = Object.values(progress).reduce((sum, count) => sum + count, 0)
  const totalProgress = Math.round((totalAnswered / totalQuestions) * 100)

  // Find next incomplete chapter for "Continue" button
  const findNextChapter = () => {
    for (const chapter of chapters) {
      const answered = progress[chapter.id] || 0
      if (answered < chapter.questions.length) {
        return chapter
      }
    }
    return chapters[0]
  }

  const nextChapter = findNextChapter()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 page-enter">
      {/* Header */}
      <header className="text-center mb-8 sm:mb-10">
        {/* Decorative flourish */}
        <div className="text-sepia/40 text-2xl mb-4 tracking-[0.5em] float">❧</div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-ink mb-3 tracking-wide">
          {firstName}'s Life
        </h1>
        <div className="w-24 h-px bg-sepia/30 mx-auto mb-4" />
        <p className="text-lg sm:text-xl text-sepia/80 italic">
          The Autobiography of {user?.name || 'You'}
        </p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Progress Card */}
      <ProgressCard
        totalProgress={totalProgress}
        totalQuestions={totalQuestions}
        totalAnswered={totalAnswered}
        onViewBook={() => setShowBookPreview(true)}
      />

      {/* Continue Where You Left Off */}
      {lastWorkedOn && (
        <div className="mb-8 p-4 bg-gradient-to-r from-sepia/5 to-amber-50/50 rounded-xl border border-sepia/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sepia/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-ink font-medium">Continue where you left off</p>
                <p className="text-sepia/70 text-sm">
                  {chapters.find(c => c.id === lastWorkedOn.chapterId)?.title || 'Your memoir'}
                </p>
              </div>
            </div>
            <Link
              to={`/chapter/${lastWorkedOn.chapterId}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition text-sm font-medium"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <Link
          to={`/chapter/${nextChapter.id}`}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-sepia/10 hover:border-sepia/30 hover:shadow-md transition"
        >
          <div className="w-10 h-10 bg-sepia/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <p className="text-ink font-medium">Write</p>
            <p className="text-sepia/60 text-xs">Type stories</p>
          </div>
        </Link>

        <Link
          to={`/voice?chapter=${nextChapter.id}`}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-sepia to-amber-700 text-white rounded-xl hover:shadow-lg transition"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Talk</p>
            <p className="text-white/80 text-xs">Voice mode</p>
          </div>
        </Link>

        <button
          onClick={() => setShowTelegramLink(true)}
          className="flex items-center gap-3 p-4 bg-[#0088cc]/10 rounded-xl border border-[#0088cc]/20 hover:border-[#0088cc]/40 hover:bg-[#0088cc]/15 transition"
        >
          <div className="w-10 h-10 bg-[#0088cc]/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <div>
            <p className="text-[#0088cc] font-medium">Telegram</p>
            <p className="text-[#0088cc]/60 text-xs">On the go</p>
          </div>
        </button>
      </div>

      {/* Chapters - Table of Contents */}
      <div className="mb-10 sm:mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sepia/60 text-sm uppercase tracking-[0.2em]">Table of Contents</h2>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Export Book
          </button>
        </div>

        <div className="space-y-3">
          {chapters.map((chapter) => {
            const chapterProgress = getChapterProgress(chapter.id)
            const isComplete = chapterProgress === 100
            const hasStarted = chapterProgress > 0

            return (
              <div
                key={chapter.id}
                className={`bg-white/50 backdrop-blur-sm rounded-lg p-4 sm:p-5 border transition stagger-item ${
                  isComplete
                    ? 'border-green-200 bg-green-50/30'
                    : hasStarted
                    ? 'border-sepia/20 hover:border-sepia/40 hover:bg-white/70'
                    : 'border-sepia/10 hover:border-sepia/30 hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Chapter Number */}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-full flex-shrink-0 ${
                    isComplete
                      ? 'border-green-400 bg-green-50'
                      : 'border-sepia/30'
                  }`}>
                    {isComplete ? (
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sepia font-semibold text-sm sm:text-base">{chapter.icon}</span>
                    )}
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
                    <span className={`text-sm ${isComplete ? 'text-green-600 font-medium' : 'text-sepia/80'}`}>
                      {isComplete ? 'Complete' : `${chapterProgress}%`}
                    </span>
                    <div className="w-16 sm:w-20 h-1.5 bg-sepia/10 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${isComplete ? 'bg-green-400' : 'bg-sepia/50'}`}
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

      {/* Completion Celebration - 100% */}
      {totalProgress === 100 && (
        <div className="mb-10 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display text-2xl text-ink mb-2">Congratulations!</h3>
          <p className="text-green-800/70 mb-4">
            You've completed your memoir. {totalAnswered} stories preserved for future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowCertificate(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              View Certificate
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Order Your Book
            </button>
          </div>
        </div>
      )}

      {/* Completion Prompt - 80-99% */}
      {totalProgress >= 80 && totalProgress < 100 && (
        <div className="mb-10 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="font-display text-xl text-ink mb-2">Your memoir is almost ready!</h3>
          <p className="text-amber-800/70 mb-4">
            Just {totalQuestions - totalAnswered} more {totalQuestions - totalAnswered === 1 ? 'question' : 'questions'} to complete your life story.
          </p>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition"
          >
            Preview & Order Your Book
          </button>
        </div>
      )}

      {/* Decorative End */}
      <div className="text-center">
        <div className="text-sepia/30 text-lg float">✦</div>
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          userName={user?.name || 'Your'}
        />
      )}

      {showBookPreview && (
        <BookPreview
          userName={user?.name}
          totalProgress={totalProgress}
          onClose={() => setShowBookPreview(false)}
        />
      )}

      {showCertificate && (
        <CompletionCertificate
          userName={user?.name}
          completionDate={new Date()}
          totalStories={totalAnswered}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {showTelegramLink && (
        <TelegramLinkModal onClose={() => setShowTelegramLink(false)} />
      )}
    </div>
  )
}

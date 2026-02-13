import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../../data/chapters'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import ExportModal from '../../components/ExportModal'
import OnboardingModal from '../../components/OnboardingModal'
import UpgradeModal from '../../components/UpgradeModal'
import EmailVerificationBanner from '../../components/EmailVerificationBanner'

export default function Home() {
  const { user, authFetch, refreshUser } = useAuth()
  const { isPremium } = usePremium()
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    new URLSearchParams(window.location.search).has('onboarding')
  )
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeVariant, setUpgradeVariant] = useState('default')
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false)

  const firstName = user?.name?.split(' ')[0] || 'Friend'

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }, [])

  useEffect(() => {
    fetchProgress()
    checkOnboardingStatus()

    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarding') === 'true') {
      setShowOnboarding(true)
      window.history.replaceState({}, '', '/home')
    }
    if (params.get('premium_activated') === 'true') {
      refreshUser()
      setShowPremiumCelebration(true)
      window.history.replaceState({}, '', '/home')
    }
    if (params.get('upgrade_dismissed') === 'true') {
      setUpgradeVariant('cancelled')
      setShowUpgradeModal(true)
      window.history.replaceState({}, '', '/home')
    }
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const res = await authFetch('/api/onboarding/status')
      if (res.ok) {
        const data = await res.json()
        if (!data.completed) setShowOnboarding(true)
      }
    } catch (err) {
      console.error('Error checking onboarding:', err)
    }
  }

  const fetchProgress = async () => {
    try {
      setError(null)
      const res = await authFetch('/api/stories/progress')
      if (!res.ok) throw new Error('Failed to load progress')
      const data = await res.json()
      setProgress(data.progress || data)
    } catch (err) {
      console.error('Error fetching progress:', err)
      setError('Unable to load your progress. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  const { totalQuestions, totalAnswered, totalProgress } = useMemo(() => {
    const total = chapters.reduce((sum, ch) => sum + ch.questions.length, 0)
    const answered = Object.values(progress).reduce((sum, count) => sum + count, 0)
    return {
      totalQuestions: total,
      totalAnswered: answered,
      totalProgress: Math.round((answered / total) * 100)
    }
  }, [progress])

  const nextChapter = useMemo(() => {
    for (const chapter of chapters) {
      const answered = progress[chapter.id] || 0
      if (answered < chapter.questions.length) return chapter
    }
    return chapters[0]
  }, [progress])

  return (
    <>
      <EmailVerificationBanner />
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12 page-enter">
        {/* Header */}
        <header className="text-center mb-10 relative">
          <Link
            to="/settings"
            className="absolute top-0 right-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-sepia/5 hover:bg-sepia/10 text-sepia/60 hover:text-sepia transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-display text-ink mb-1">
            {greeting}, {firstName}
          </h1>
          <p className="text-sepia/50 text-sm">{formattedDate}</p>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Progress */}
        {!loading && (
          <div className="mb-10 text-center">
            <div className="text-5xl font-semibold text-ink mb-1">{totalProgress}%</div>
            <p className="text-sepia/60 text-sm mb-3">
              {totalAnswered} of {totalQuestions} stories captured
            </p>
            <div className="w-full h-2 bg-sepia/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sepia to-amber-600 rounded-full transition-all duration-700"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="space-y-4 mb-8">
          {/* Tell a Story - Primary CTA */}
          <Link
            to="/quick-story"
            className="block w-full p-6 bg-gradient-to-br from-sepia to-amber-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium">Tell a Story</p>
                <p className="text-white/70 text-sm">Write whatever's on your mind</p>
              </div>
            </div>
          </Link>

          {/* Call Me */}
          <Link
            to="/call-me"
            className="block w-full p-5 bg-white border border-sepia/15 rounded-2xl hover:border-sepia/30 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-ink font-medium">Call Me</p>
                <p className="text-sepia/60 text-sm">Get a phone call to chat about your life</p>
              </div>
              <svg
                className="w-5 h-5 text-sepia/30 ml-auto flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Talk (Voice Mode) */}
          <Link
            to={`/voice?chapter=${nextChapter.id}`}
            className="block w-full p-5 bg-white border border-sepia/15 rounded-2xl hover:border-sepia/30 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-ink font-medium">Talk</p>
                <p className="text-sepia/60 text-sm">Voice conversation to capture memories</p>
              </div>
              <svg
                className="w-5 h-5 text-sepia/30 ml-auto flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <button
            onClick={() => setShowExportModal(true)}
            className="p-4 bg-white border border-sepia/10 rounded-xl hover:border-sepia/25 hover:shadow-sm transition text-center"
          >
            <svg
              className="w-5 h-5 text-sepia/50 mx-auto mb-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="text-ink text-sm font-medium">Preview Book</p>
          </button>

          <Link
            to={`/chapter/${nextChapter.id}`}
            className="p-4 bg-white border border-sepia/10 rounded-xl hover:border-sepia/25 hover:shadow-sm transition text-center"
          >
            <svg
              className="w-5 h-5 text-sepia/50 mx-auto mb-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
            <p className="text-ink text-sm font-medium">Write by Chapter</p>
          </Link>
        </div>

        {/* Upgrade nudge for free users */}
        {!isPremium && totalAnswered > 0 && (
          <div className="mb-8 p-4 bg-gradient-to-r from-amber-50/60 to-orange-50/40 rounded-xl border border-amber-200/40 flex items-center justify-between gap-4">
            <div>
              <p className="text-ink font-medium text-sm">Unlock your full story</p>
              <p className="text-sepia/60 text-xs">All chapters + a printed book</p>
            </div>
            <button
              onClick={() => {
                setUpgradeVariant('default')
                setShowUpgradeModal(true)
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition whitespace-nowrap"
            >
              See Offer
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} userName={user?.name || 'Your'} />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          memoriesCount={progress['earliest-memories'] || 0}
          variant={upgradeVariant}
        />
      )}

      {showPremiumCelebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPremiumCelebration(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-display text-ink mb-2">Welcome to Premium!</h3>
            <p className="text-sepia/70 text-sm mb-5">
              All chapters are now unlocked. Your printed book is included when you complete your
              story.
            </p>
            <button
              onClick={() => setShowPremiumCelebration(false)}
              className="px-6 py-3 bg-ink text-white rounded-xl font-medium hover:bg-ink/90 transition"
            >
              Start Writing
            </button>
          </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          initialStep={new URLSearchParams(window.location.search).get('step') || undefined}
          onClose={async () => {
            setShowOnboarding(false)
            await refreshUser()
          }}
        />
      )}
    </>
  )
}

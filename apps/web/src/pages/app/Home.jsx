import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../../data/chapters'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useDashboardProgress } from '../../features/memoir/queries/storyQueries'
import { getDashboardProgress } from '../../features/memoir/dashboardProgress'
import EmailVerificationBanner from '../../components/EmailVerificationBanner'
import { MANUAL_PREVIEW } from '../../config'
import '../../styles/editorial.css'
import '../../styles/workspace.css'

const ExportModal = lazy(() => import('../../components/ExportModal'))
const OnboardingModal = lazy(() => import('../../components/OnboardingModal'))
const UpgradeModal = lazy(() => import('../../components/UpgradeModal'))

function DashboardSkeleton() {
  return (
    <div
      className="story-dashboard-grid story-loading"
      role="status"
      aria-label="Loading your story"
    >
      <div className="story-next-panel">
        <div className="story-skeleton-line" />
        <div className="story-skeleton-title" />
        <div className="story-skeleton-line" />
        <div className="story-skeleton-line" />
      </div>
      <div className="story-summary">
        <div className="story-skeleton-title" />
        <div className="story-skeleton-line" />
      </div>
      <span className="sr-only">Loading your saved memories…</span>
    </div>
  )
}

export default function Home() {
  const { user, authFetch, refreshUser } = useAuth()
  const { isPremium, isChapterLocked } = usePremium()
  const {
    data: progress = {},
    isLoading: loading,
    error: progressError,
    refetch,
    isFetching
  } = useDashboardProgress(user?.id)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    !MANUAL_PREVIEW && new URLSearchParams(window.location.search).get('onboarding') === 'true'
  )
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeVariant, setUpgradeVariant] = useState('default')
  const [showPremiumCelebration, setShowPremiumCelebration] = useState(false)
  const [initialOnboardingStep] = useState(
    new URLSearchParams(window.location.search).get('step') || undefined
  )
  const firstName = user?.name?.split(' ')[0] || 'friend'
  const {
    chapterProgress,
    totalQuestions,
    totalAnswered,
    totalProgress,
    completedChapters,
    nextChapter: nextUnfinishedChapter
  } = useMemo(() => getDashboardProgress(chapters, progress), [progress])
  const nextChapter =
    chapterProgress.find(chapter => !chapter.complete && !isChapterLocked(chapter.id)) ||
    nextUnfinishedChapter
  const nextQuestion = nextChapter?.questions[nextChapter.answered]

  useEffect(() => {
    let active = true
    const checkOnboarding = async () => {
      try {
        const response = await authFetch('/api/onboarding/status')
        if (response.ok) {
          const data = await response.json()
          if (active && !data.completed) setShowOnboarding(true)
        }
      } catch {
        /* An optional introduction must not prevent access to saved stories. */
      }
    }
    if (!MANUAL_PREVIEW) checkOnboarding()
    const params = new URLSearchParams(window.location.search)
    if (!MANUAL_PREVIEW && params.get('premium_activated') === 'true') {
      refreshUser()
      setShowPremiumCelebration(true)
    }
    if (!MANUAL_PREVIEW && params.get('upgrade_dismissed') === 'true') {
      setUpgradeVariant('cancelled')
      setShowUpgradeModal(true)
    }
    if (
      ['onboarding', 'premium_activated', 'upgrade_dismissed'].some(
        key => params.get(key) === 'true'
      )
    )
      window.history.replaceState({}, '', '/home')
    return () => {
      active = false
    }
  }, [authFetch, refreshUser])

  return (
    <div className="memoir-workspace">
      <a href="#story-main" className="memoir-skip-link">
        Skip to your story
      </a>
      <header className="story-masthead">
        <div className="story-container">
          <Link to="/" className="memoir-wordmark" aria-label="Easy Memoir home">
            Easy<span>Memoir</span>
            <span className="wordmark-dot" aria-hidden="true">
              .
            </span>
          </Link>
          <nav aria-label="Your memoir">
            <Link to="/home" aria-current="page">
              Your story
            </Link>
            <a href="#chapters">Chapters</a>
            <button onClick={() => setShowExportModal(true)}>Book preview</button>
            <Link to="/settings">Settings</Link>
          </nav>
        </div>
      </header>
      {!MANUAL_PREVIEW && <EmailVerificationBanner />}
      <main id="story-main" className="story-container story-main">
        <header className="story-greeting">
          <div>
            <p className="memoir-eyebrow">A LIFE, IN CHAPTERS</p>
            <h1>
              Welcome back, <em>{firstName}.</em>
            </h1>
            <p>There is no rush. Your story is here whenever you are ready.</p>
          </div>
          {!loading && !progressError && totalAnswered > 0 && (
            <span className="story-saved-count">
              {totalAnswered} {totalAnswered === 1 ? 'memory' : 'memories'} saved
            </span>
          )}
        </header>
        {progressError ? (
          <section className="story-error" role="alert">
            <h2>We could not load your saved progress.</h2>
            <p>Your story is still yours. Try loading it again before continuing.</p>
            <button className="memoir-button" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Loading…' : 'Try again'}
            </button>
          </section>
        ) : loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="story-dashboard-grid">
              <section className="story-next-panel" aria-labelledby="next-story-title">
                <p className="memoir-eyebrow">
                  {nextChapter
                    ? totalAnswered
                      ? 'PICK UP YOUR STORY'
                      : 'A SMALL FIRST STEP'
                    : 'YOUR CHAPTERS ARE READY'}
                </p>
                <h2 id="next-story-title">
                  {nextChapter ? nextChapter.title : 'A lifetime, gathered.'}
                </h2>
                <p className="story-next-subtitle">
                  {nextChapter
                    ? nextChapter.subtitle
                    : 'Take a moment to read through your chapters and make the final words your own.'}
                </p>
                {nextQuestion && <blockquote>{nextQuestion.question}</blockquote>}
                <div className="memoir-action-row">
                  <Link
                    className="memoir-button"
                    to={
                      nextChapter
                        ? MANUAL_PREVIEW
                          ? `/chapter/${nextChapter.id}`
                          : `/voice?chapter=${nextChapter.id}`
                        : '/chapter/' + chapters[0].id
                    }
                  >
                    {nextChapter
                      ? totalAnswered
                        ? 'Continue your story'
                        : 'Start with a memory'
                      : 'Review your chapters'}
                    <span aria-hidden="true">→</span>
                  </Link>
                  {nextChapter && !MANUAL_PREVIEW && (
                    <Link className="memoir-text-link" to={`/chapter/${nextChapter.id}`}>
                      Write instead <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
                <p className="story-small-note">
                  {nextChapter
                    ? MANUAL_PREVIEW
                      ? 'Write a few sentences to begin. Your words are saved as you go.'
                      : 'Talk or type. A few sentences are enough to begin.'
                    : 'You can keep editing or add a new memory at any time.'}
                </p>
              </section>
              <aside className="story-summary" aria-labelledby="story-summary-title">
                <p className="memoir-eyebrow">THE STORY SO FAR</p>
                <div className="story-book-mark" aria-hidden="true">
                  <span>
                    MY LIFE,
                    <br />
                    <em>in my words.</em>
                  </span>
                  <span>
                    THE MEMOIR OF
                    <br />
                    {user?.name || 'YOUR NAME'}
                  </span>
                </div>
                <h2 id="story-summary-title">
                  {totalAnswered
                    ? `${totalAnswered} ${totalAnswered === 1 ? 'memory' : 'memories'} worth keeping.`
                    : 'A blank page. A whole life.'}
                </h2>
                <p>
                  {totalAnswered
                    ? `${completedChapters} of ${chapters.length} chapters completed`
                    : 'Your first memory will appear here. Start wherever feels familiar.'}
                </p>
                <div
                  className="story-progress"
                  role="progressbar"
                  aria-label="Memoir questions answered"
                  aria-valuemin={0}
                  aria-valuemax={totalQuestions}
                  aria-valuenow={totalAnswered}
                  aria-valuetext={`${totalAnswered} of ${totalQuestions} questions answered`}
                >
                  <span style={{ width: `${totalProgress}%` }} />
                </div>
                <button className="memoir-text-link" onClick={() => setShowExportModal(true)}>
                  Preview your book <span aria-hidden="true">→</span>
                </button>
              </aside>
            </div>
            <nav className="story-tools" aria-label="More ways to remember">
              <p>Begin another way</p>
              <Link
                to={MANUAL_PREVIEW ? `/chapter/${nextChapter?.id || chapters[0].id}` : '/photo'}
              >
                Add a photograph <span aria-hidden="true">↗</span>
              </Link>
              {!MANUAL_PREVIEW && (
                <Link to="/call-me">
                  Phone call <span aria-hidden="true">↗</span>
                </Link>
              )}
              <Link to="/quick-story">
                A quick memory <span aria-hidden="true">↗</span>
              </Link>
            </nav>
            <section id="chapters" className="story-chapters" aria-labelledby="chapters-title">
              <div className="story-chapters-heading">
                <div>
                  <p className="memoir-eyebrow">YOUR TABLE OF CONTENTS</p>
                  <h2 id="chapters-title">
                    Find a chapter. <em>Follow a memory.</em>
                  </h2>
                </div>
                <p>You can start anywhere.</p>
              </div>
              <ol className="story-chapter-list">
                {chapterProgress.map((chapter, index) => (
                  <li key={chapter.id}>
                    <Link to={`/chapter/${chapter.id}`}>
                      <span className="story-chapter-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3>{chapter.title}</h3>
                        <p>{chapter.subtitle}</p>
                      </div>
                      <span className="story-chapter-status">
                        {chapter.complete
                          ? 'Complete'
                          : chapter.answered
                            ? `${chapter.answered} memories`
                            : 'Not started'}
                      </span>
                      <span className="story-chapter-arrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
            {!MANUAL_PREVIEW && !isPremium && totalAnswered > 0 && (
              <aside className="story-plan">
                <div>
                  <h2>Make room for your whole story.</h2>
                  <p>Explore the available plans and what each includes.</p>
                </div>
                <button
                  className="memoir-button memoir-button-outline"
                  onClick={() => {
                    setUpgradeVariant('default')
                    setShowUpgradeModal(true)
                  }}
                >
                  View plans <span aria-hidden="true">→</span>
                </button>
              </aside>
            )}
          </>
        )}
      </main>
      {/* Modals — lazy-loaded to reduce Home chunk size */}
      <Suspense fallback={null}>
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
      </Suspense>

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

      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingModal
            initialStep={initialOnboardingStep}
            onClose={async () => {
              setShowOnboarding(false)
              await refreshUser()
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

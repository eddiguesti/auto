import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import {
  IconPencil,
  IconMicrophone,
  IconPhone,
  IconPhoto,
  IconBook2,
  IconChevronRight,
  IconAlertCircle,
  IconCircleCheck,
  IconSparkles
} from '@tabler/icons-react'
import { chapters } from '../../data/chapters'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useDashboardProgress } from '../../features/memoir/queries/storyQueries'
import EmailVerificationBanner from '../../components/EmailVerificationBanner'
import HomeProgressSkeleton from '../../components/skeletons/HomeProgressSkeleton'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Modal, ProgressRing, ProgressBar } from '../../components/ui'

const ExportModal = lazy(() => import('../../components/ExportModal'))
const OnboardingModal = lazy(() => import('../../components/OnboardingModal'))
const UpgradeModal = lazy(() => import('../../components/UpgradeModal'))

export default function Home() {
  const { user, authFetch, refreshUser } = useAuth()
  const { isPremium } = usePremium()

  // Server state via React Query — replaces manual useEffect+setState fetch
  const {
    data: progress = {},
    isLoading: loading,
    error: progressError
  } = useDashboardProgress(user?.id)
  const error = progressError?.message || null
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
      // Non-critical — onboarding check failure should not block the page
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

  const nextChapterAnswered = progress[nextChapter.id] || 0
  const nextChapterProgress = Math.round((nextChapterAnswered / nextChapter.questions.length) * 100)

  return (
    <>
      <EmailVerificationBanner />
      <AppShell>
        <div className="py-8 sm:py-12 page-enter">
          {/* Greeting */}
          <header className="mb-8">
            <p className="eyebrow mb-2">{formattedDate}</p>
            <h1 className="text-3xl sm:text-4xl font-display text-ink">
              {greeting}, {firstName}
            </h1>
          </header>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
              <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Progress overview */}
          {loading ? (
            <HomeProgressSkeleton />
          ) : (
            <Card className="mb-10 flex items-center gap-6" padding="md">
              <ProgressRing value={totalProgress} size={104} label="Overall story progress">
                <span className="text-2xl font-semibold text-ink leading-none">
                  {totalProgress}%
                </span>
              </ProgressRing>
              <div className="min-w-0">
                <h2 className="text-lg font-display text-ink mb-0.5">Your story so far</h2>
                <p className="text-sepia-600 text-sm">
                  {totalAnswered} of {totalQuestions} memories captured
                </p>
                {totalAnswered > 0 && (
                  <p className="text-sepia-500 text-sm mt-1.5">
                    Every memory you add brings your book closer to life.
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Capture a memory */}
          <section className="mb-10">
            <p className="eyebrow mb-3">Capture a memory</p>
            <div className="space-y-3">
              {/* Tell a Story — the primary action */}
              <Card
                interactive
                to="/quick-story"
                padding="none"
                className="stagger-item !bg-ink !border-ink hover:!border-ink"
              >
                <div className="flex items-center gap-4 p-5 sm:p-6">
                  <div className="w-12 h-12 bg-bronze-500/25 text-bronze-300 rounded-xl flex items-center justify-center shrink-0">
                    <IconPencil size={24} stroke={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium text-white">Tell a story</p>
                    <p className="text-white/60 text-sm">Write whatever&rsquo;s on your mind</p>
                  </div>
                  <IconChevronRight size={20} stroke={1.75} className="text-white/40 shrink-0" />
                </div>
              </Card>

              {/* Voice modalities */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Card interactive to={`/voice?chapter=${nextChapter.id}`} className="stagger-item">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
                      <IconMicrophone size={22} stroke={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink font-medium">Talk</p>
                      <p className="text-sepia-600 text-sm">Speak your memories aloud</p>
                    </div>
                  </div>
                </Card>

                <Card interactive to="/call-me" className="stagger-item">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
                      <IconPhone size={22} stroke={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ink font-medium">Call me</p>
                      <p className="text-sepia-600 text-sm">We ring you for a chat</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* Continue where you left off */}
          <section className="mb-10">
            <p className="eyebrow mb-3">Continue your book</p>
            <Card interactive to={`/chapter/${nextChapter.id}`} className="stagger-item">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-medium mb-1">{nextChapter.title}</p>
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={nextChapterProgress}
                      className="max-w-[160px]"
                      label={`${nextChapter.title} progress`}
                    />
                    <span className="text-sepia-500 text-xs whitespace-nowrap">
                      {nextChapterAnswered} of {nextChapter.questions.length}
                    </span>
                  </div>
                </div>
                <IconChevronRight size={20} stroke={1.75} className="text-sepia-400 shrink-0" />
              </div>
            </Card>
          </section>

          {/* More ways to enrich your story */}
          <section className="mb-10">
            <div className="grid grid-cols-2 gap-3">
              <Card interactive to="/photo" padding="sm" className="stagger-item text-center">
                <IconPhoto size={22} stroke={1.5} className="text-sepia-500 mx-auto mb-1.5" />
                <p className="text-ink text-sm font-medium">Share a photo</p>
              </Card>

              <Card
                interactive
                onClick={() => setShowExportModal(true)}
                padding="sm"
                className="stagger-item text-center"
              >
                <IconBook2 size={22} stroke={1.5} className="text-sepia-500 mx-auto mb-1.5" />
                <p className="text-ink text-sm font-medium">Preview your book</p>
              </Card>
            </div>
          </section>

          {/* Upgrade nudge for free users */}
          {!isPremium && totalAnswered > 0 && (
            <div className="mb-8 p-5 bg-bronze-50 border border-bronze-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <IconSparkles size={22} stroke={1.5} className="text-bronze-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-ink font-medium text-sm">Unlock your full story</p>
                  <p className="text-sepia-600 text-sm">All chapters, plus a printed book</p>
                </div>
              </div>
              <Button
                variant="accent"
                size="sm"
                className="whitespace-nowrap shrink-0"
                onClick={() => {
                  setUpgradeVariant('default')
                  setShowUpgradeModal(true)
                }}
              >
                See offer
              </Button>
            </div>
          )}
        </div>
      </AppShell>

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
        <Modal onClose={() => setShowPremiumCelebration(false)} size="sm">
          <div className="text-center pt-2">
            <div className="w-16 h-16 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-5">
              <IconCircleCheck size={32} stroke={1.5} />
            </div>
            <h3 className="text-2xl font-display text-ink mb-2">Welcome to Premium</h3>
            <p className="text-sepia-600 text-sm mb-6">
              All chapters are now unlocked. Your printed book is included when you complete your
              story.
            </p>
            <Button size="lg" onClick={() => setShowPremiumCelebration(false)}>
              Start writing
            </Button>
          </div>
        </Modal>
      )}

      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingModal
            initialStep={new URLSearchParams(window.location.search).get('step') || undefined}
            onClose={async () => {
              setShowOnboarding(false)
              await refreshUser()
            }}
          />
        )}
      </Suspense>
    </>
  )
}

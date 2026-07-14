import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconBook2,
  IconBulb,
  IconCheck,
  IconChevronsRight,
  IconLoader2,
  IconLock,
  IconPhoto
} from '@tabler/icons-react'
import { chapters } from '../../data/chapters'
import QuestionCard from '../../components/QuestionCard'
import AIAssistant from '../../components/AIAssistant'
import MemoryTriggers from '../../components/MemoryTriggers'
import ChapterIllustration from '../../components/ChapterIllustration'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useChapterStories } from '../../features/memoir/queries/storyQueries'
import { useChapterAI } from '../../features/memoir/hooks/useChapterAI'
import UpgradeModal from '../../components/UpgradeModal'
import QuestionCardSkeleton from '../../components/skeletons/QuestionCardSkeleton'
import AppShell from '../../components/layout/AppShell'
import { Button, Badge, ProgressBar, EmptyState } from '../../components/ui'

export default function Chapter() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const { authFetch } = useAuth()
  const { isChapterLocked, isPremium } = usePremium()

  // Server state via React Query — replaces manual useEffect+setState fetch
  const {
    data: rawStories,
    isLoading: answersLoading,
    refetch: refetchStories
  } = useChapterStories(chapterId)

  // Convert API array to local keyed map: { questionId: { answer, id, photos } }
  const [answers, setAnswers] = useState({})
  useEffect(() => {
    if (!rawStories) return
    const map = {}
    rawStories.forEach(story => {
      map[story.question_id] = { answer: story.answer, id: story.id, photos: story.photos || [] }
    })
    setAnswers(map)
  }, [rawStories])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const { showAI, aiContext, openAIAssistant, closeAIAssistant } = useChapterAI()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const saveTimeoutRef = useRef({})
  const abortControllersRef = useRef({})
  const [pendingSaves, setPendingSaves] = useState({}) // Track unsaved changes
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | 'error'
  const [lastError, setLastError] = useState(null)
  const [showMemoryTriggers, setShowMemoryTriggers] = useState(false)
  const [skippedQuestions, setSkippedQuestions] = useState([])
  const [showIllustration, setShowIllustration] = useState(false)

  const chapter = useMemo(() => chapters.find(c => c.id === chapterId), [chapterId])

  // Redirect locked chapters to home
  useEffect(() => {
    if (chapter && isChapterLocked(chapterId)) {
      navigate('/home', { replace: true })
    }
  }, [chapterId, chapter, isChapterLocked])

  // Memoize pending saves check
  const hasPendingSaves = useMemo(() => Object.values(pendingSaves).some(Boolean), [pendingSaves])

  // Memoize beforeunload handler to prevent recreation
  const handleBeforeUnload = useCallback(
    e => {
      if (hasPendingSaves) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    },
    [hasPendingSaves]
  )

  // Warn user before closing/navigating with unsaved changes
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handleBeforeUnload])

  useEffect(() => {
    if (chapter && chapterId === 'earliest-memories' && !answersLoading) {
      prefillFromOnboarding()
    }

    // Cleanup timeouts and abort in-flight saves on unmount
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
      Object.values(abortControllersRef.current).forEach(controller => {
        if (controller) controller.abort()
      })
    }
  }, [chapterId])

  // Pre-fill birth-details answer from onboarding data if user hasn't answered it yet
  const prefillFromOnboarding = async () => {
    try {
      const res = await authFetch('/api/v1/onboarding/status')
      if (!res.ok) return
      const data = await res.json()
      if (!data.completed) return

      const birthPlace = data.birthPlace
      const birthCountry = data.birthCountry
      const birthYear = data.birthYear
      if (!birthPlace && !birthYear) return

      // Only pre-fill if birth-details hasn't been answered yet
      setAnswers(prev => {
        if (prev['birth-details']?.answer?.trim()) return prev

        const parts = []
        if (birthPlace && birthCountry) {
          parts.push(`I was born in ${birthPlace}, ${birthCountry}`)
        } else if (birthPlace) {
          parts.push(`I was born in ${birthPlace}`)
        }
        if (birthYear) {
          parts.push(`in ${birthYear}`)
        }

        const prefilled = parts.join(' ') + '.'
        // Save to backend so it persists
        authFetch('/api/v1/stories', {
          method: 'POST',
          body: JSON.stringify({
            chapter_id: 'earliest-memories',
            question_id: 'birth-details',
            answer: prefilled
          })
        }).catch(err => console.error('Error pre-filling birth details:', err))

        return {
          ...prev,
          'birth-details': { ...prev['birth-details'], answer: prefilled }
        }
      })
    } catch (err) {
      console.error('Error fetching onboarding data:', err)
    }
  }

  const saveAnswer = async (questionId, answer) => {
    // Clear existing timeout for this question
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId])
    }

    // Update local state immediately
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer }
    }))

    // Mark this question as having pending changes
    setPendingSaves(prev => ({ ...prev, [questionId]: true }))
    setSaveStatus('saving')
    setLastError(null)

    // Debounce the save
    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      // Abort any previous in-flight save for this question
      if (abortControllersRef.current[questionId]) {
        abortControllersRef.current[questionId].abort()
      }
      const controller = new AbortController()
      abortControllersRef.current[questionId] = controller

      try {
        const res = await authFetch('/api/v1/stories', {
          method: 'POST',
          body: JSON.stringify({
            chapter_id: chapterId,
            question_id: questionId,
            answer,
            total_questions: chapter.questions.length
          }),
          signal: controller.signal
        })
        if (!res.ok) {
          throw new Error('Failed to save')
        }
        // Mark as saved successfully
        setPendingSaves(prev => ({ ...prev, [questionId]: false }))
        setSaveStatus('saved')
        // Clear saved status after 2 seconds
        setTimeout(() => setSaveStatus(prev => (prev === 'saved' ? null : prev)), 2000)
      } catch (err) {
        if (err.name === 'AbortError') return // Superseded by newer save
        console.error('Error saving answer:', err)
        setSaveStatus('error')
        setLastError('Failed to save. Please check your connection.')
        // Keep pending flag so user is warned before leaving
      }
    }, 1000)
  }

  // Memoize derived values (must be before early return to satisfy rules of hooks)
  const answeredCount = useMemo(
    () => Object.values(answers).filter(a => a?.answer?.trim()).length,
    [answers]
  )

  const isLastQuestion = chapter ? currentQuestion === chapter.questions.length - 1 : false

  const nextChapter = useMemo(() => {
    const currentChapterIndex = chapters.findIndex(c => c.id === chapterId)
    return chapters[currentChapterIndex + 1]
  }, [chapterId])

  if (!chapter) {
    return (
      <AppShell back="/home">
        <div className="py-8 page-enter">
          <EmptyState
            icon={<IconBook2 size={24} stroke={1.5} />}
            title="Chapter not found"
            action={
              <Button variant="secondary" to="/">
                Go back home
              </Button>
            }
          />
        </div>
      </AppShell>
    )
  }

  const question = chapter.questions[currentQuestion]

  return (
    <AppShell back="/home" title={chapter.title}>
      <div className="py-8 page-enter">
        {/* Heading */}
        <header className="mb-8">
          <p className="eyebrow mb-2">Chapter {chapter.icon}</p>
          <h1 className="text-3xl sm:text-4xl font-display text-ink">{chapter.title}</h1>
          <p className="text-sepia-600 mt-1.5">{chapter.subtitle}</p>
        </header>

        {/* Chapter Illustration Toggle */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => setShowIllustration(!showIllustration)}
            icon={<IconPhoto size={18} stroke={1.75} />}
          >
            {showIllustration ? 'Hide' : 'Show'} chapter illustration
          </Button>

          {showIllustration && (
            <div className="mt-3">
              <ChapterIllustration
                chapterId={chapterId}
                stories={Object.entries(answers).map(([qId, data]) => ({
                  questionId: qId,
                  answer: data.answer
                }))}
              />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {lastError && (
          <div className="mb-6 p-4 bg-error-soft rounded-xl flex items-center justify-between gap-3">
            <span className="text-error-strong text-sm flex items-center gap-2 min-w-0">
              <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
              {lastError}
            </span>
            <button
              type="button"
              onClick={() => {
                // Retry saving the current answer
                const currentAnswer = answers[question.id]?.answer || ''
                if (currentAnswer) {
                  setLastError(null)
                  saveAnswer(question.id, currentAnswer)
                }
              }}
              className="text-error-strong underline text-sm font-medium hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Chapter Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm text-sepia-600 mb-2">
            <span>
              Question {currentQuestion + 1} of {chapter.questions.length}
            </span>
            <div className="flex items-center gap-3">
              {/* Save Status Indicator */}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-sepia-500">
                  <IconLoader2 size={14} stroke={2} className="animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-success-strong">
                  <IconCheck size={14} stroke={2.5} />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-error-strong">
                  <IconAlertCircle size={14} stroke={2} />
                  Save failed
                </span>
              )}
              <span className="text-sepia-500">{answeredCount} answered</span>
            </div>
          </div>
          <ProgressBar
            value={(answeredCount / chapter.questions.length) * 100}
            label={`${chapter.title} progress`}
            className="mb-2.5"
          />
          <div className="flex gap-1 sm:gap-1.5">
            {chapter.questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.answer?.trim()
              const isSkipped = skippedQuestions.includes(q.id) && !isAnswered
              const isCurrent = idx === currentQuestion

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestion(idx)}
                  className={`flex-1 h-2 sm:h-1.5 rounded-full transition-colors min-w-[8px] ${
                    isCurrent
                      ? 'bg-bronze-500'
                      : isAnswered
                        ? 'bg-bronze-300'
                        : isSkipped
                          ? 'bg-warning/50'
                          : 'bg-sepia-200 hover:bg-sepia-300'
                  }`}
                  title={`${q.question}${isSkipped ? ' (skipped)' : ''}`}
                />
              )
            })}
          </div>
        </div>

        {/* Question Card */}
        {answersLoading ? (
          <QuestionCardSkeleton />
        ) : (
          <QuestionCard
            question={question}
            answer={answers[question.id]?.answer || ''}
            onAnswerChange={answer => saveAnswer(question.id, answer)}
            onAskAI={() => openAIAssistant(question, answers[question.id]?.answer || '', chapterId)}
            chapterId={chapterId}
            storyId={answers[question.id]?.id}
            photos={answers[question.id]?.photos || []}
            onPhotosChange={() => refetchStories()}
          />
        )}

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between mt-4 gap-3">
          {/* Memory Triggers Toggle */}
          <Button
            variant={showMemoryTriggers ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowMemoryTriggers(!showMemoryTriggers)}
            icon={<IconBulb size={18} stroke={1.75} />}
          >
            {showMemoryTriggers ? 'Hide Tips' : 'Need Ideas?'}
          </Button>

          {/* Skip Question */}
          {!answers[question.id]?.answer?.trim() && !skippedQuestions.includes(question.id) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSkippedQuestions(prev => [...prev, question.id])
                // Move to next question
                if (currentQuestion < chapter.questions.length - 1) {
                  setCurrentQuestion(prev => prev + 1)
                }
              }}
              iconRight={<IconChevronsRight size={18} stroke={1.75} />}
            >
              Skip for now
            </Button>
          )}

          {/* Show if this was skipped */}
          {skippedQuestions.includes(question.id) && !answers[question.id]?.answer?.trim() && (
            <Badge variant="warning">Skipped - you can answer anytime</Badge>
          )}
        </div>

        {/* Memory Triggers Panel */}
        {showMemoryTriggers && (
          <div className="mt-4">
            <MemoryTriggers chapterId={chapterId} />
          </div>
        )}

        {/* Chapter 1 Completion Celebration */}
        {isLastQuestion && chapterId === 'earliest-memories' && !isPremium && answeredCount > 0 && (
          <div className="mt-6 p-5 bg-bronze-50 border border-bronze-200/60 rounded-2xl text-center">
            <h3 className="font-display text-lg text-ink mb-1">
              Wonderful! Your First Chapter is Complete
            </h3>
            <p className="text-sepia-600 text-sm mb-2">
              You've captured {answeredCount} precious memories. Your family is going to love
              reading these.
            </p>
            <p className="text-bronze-700 text-sm font-medium">
              Ready to continue your story? Unlock all 10 chapters and get 4 printed books.
            </p>
          </div>
        )}

        {/* Review Chapter link — shown when enough questions are answered */}
        {!isLastQuestion && answeredCount >= Math.ceil(chapter.questions.length * 0.7) && (
          <div className="mt-4 text-center">
            <Link
              to={`/chapter/${chapterId}/review`}
              className="inline-flex items-center gap-1.5 text-sm text-sepia-500 hover:text-ink transition-colors"
            >
              <IconBook2 size={18} stroke={1.75} />
              Review & polish this chapter
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-4">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            icon={<IconArrowLeft size={20} stroke={1.75} />}
          >
            Previous
          </Button>
          {isLastQuestion ? (
            nextChapter ? (
              isChapterLocked(nextChapter.id) ? (
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1 sm:flex-none"
                  onClick={() => setShowUpgradeModal(true)}
                  icon={<IconLock size={20} stroke={1.75} />}
                >
                  Unlock Next Chapter
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none"
                  to={`/chapter/${nextChapter.id}`}
                  iconRight={<IconArrowRight size={20} stroke={1.75} />}
                >
                  Next Chapter
                </Button>
              )
            ) : (
              <Button
                size="lg"
                className="flex-1 sm:flex-none"
                to={`/chapter/${chapterId}/review`}
                iconRight={<IconBook2 size={20} stroke={1.75} />}
              >
                Review & Polish
              </Button>
            )
          ) : (
            <Button
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() =>
                setCurrentQuestion(prev => Math.min(chapter.questions.length - 1, prev + 1))
              }
              iconRight={<IconArrowRight size={20} stroke={1.75} />}
            >
              Next
            </Button>
          )}
        </div>

        {/* AI Assistant Modal */}
        {showAI && (
          <AIAssistant
            context={aiContext}
            onClose={closeAIAssistant}
            onInsertText={(text, replace = false) => {
              if (replace) {
                // Replace entire answer with polished story
                saveAnswer(question.id, text)
              } else {
                // Append to existing
                const currentAnswer = answers[question.id]?.answer || ''
                saveAnswer(question.id, currentAnswer + '\n\n' + text)
              }
              closeAIAssistant()
            }}
          />
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <UpgradeModal onClose={() => setShowUpgradeModal(false)} memoriesCount={answeredCount} />
        )}
      </div>
    </AppShell>
  )
}

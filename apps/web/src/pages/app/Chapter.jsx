import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { chapters } from '../../data/chapters'
import QuestionCard from '../../components/QuestionCard'
import AIAssistant from '../../components/AIAssistant'
import MemoryTriggers from '../../components/MemoryTriggers'
import ChapterIllustration from '../../components/ChapterIllustration'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useChapterStories } from '../../features/memoir/queries/storyQueries'
import { useChapterAI } from '../../features/memoir/hooks/useChapterAI'
import { queryKeys } from '../../lib/queryKeys'
import { readDraft, useDraftAutosave } from '../../hooks/useDraftAutosave'
import UpgradeModal from '../../components/UpgradeModal'
import QuestionCardSkeleton from '../../components/skeletons/QuestionCardSkeleton'

function Chapter() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const { authFetch, user } = useAuth()
  const queryClient = useQueryClient()
  const { isChapterLocked, isPremium } = usePremium()
  const chapter = useMemo(() => chapters.find(c => c.id === chapterId), [chapterId])
  const {
    data: rawStories,
    isLoading: answersLoading,
    refetch: refetchStories
  } = useChapterStories(chapterId)
  const draftKey = `memoir-draft:${user?.id}:answers:${chapterId}`
  const [answers, setAnswers] = useState({})
  const answersRef = useRef(answers)
  answersRef.current = answers
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const { showAI, aiContext, openAIAssistant, closeAIAssistant } = useChapterAI()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showMemoryTriggers, setShowMemoryTriggers] = useState(false)
  const [skippedQuestions, setSkippedQuestions] = useState([])
  const [showIllustration, setShowIllustration] = useState(false)

  const autosave = useDraftAutosave({
    draftKey,
    save: async (questionId, answer) => {
      const res = await authFetch('/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          chapter_id: chapterId,
          question_id: questionId,
          answer,
          total_questions: chapter?.questions.length
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved = await res.json()
      await queryClient.cancelQueries({ queryKey: queryKeys.stories.chapter(chapterId, user?.id) })
      queryClient.setQueryData(queryKeys.stories.chapter(chapterId, user?.id), (old = []) => {
        const existing = old.find(story => story.question_id === questionId)
        const row = {
          ...existing,
          id: saved.id || existing?.id,
          question_id: questionId,
          chapter_id: chapterId,
          answer,
          photos: existing?.photos || []
        }
        return [...old.filter(story => story.question_id !== questionId), row]
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.progress(user?.id) })
    }
  })
  const saveStatus = autosave.status
  const lastError = autosave.error

  useEffect(() => {
    if (!rawStories) return
    const map = {}
    rawStories.forEach(story => {
      map[story.question_id] = { answer: story.answer, id: story.id, photos: story.photos || [] }
    })
    for (const [questionId, answer] of Object.entries(readDraft(draftKey))) {
      map[questionId] = { ...map[questionId], answer }
    }
    setAnswers(map)
  }, [rawStories, draftKey])

  useEffect(() => {
    if (chapter && isChapterLocked(chapterId)) navigate('/home', { replace: true })
  }, [chapterId, chapter, isChapterLocked, navigate])

  const saveAnswer = useCallback(
    (questionId, answer) => {
      setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], answer } }))
      autosave.update(questionId, answer)
    },
    [autosave.update]
  )

  useEffect(() => {
    if (
      chapterId !== 'earliest-memories' ||
      answersLoading ||
      !rawStories ||
      rawStories.some(story => story.question_id === 'birth-details' && story.answer?.trim()) ||
      readDraft(draftKey)['birth-details']
    )
      return
    let active = true
    void authFetch('/api/onboarding/status')
      .then(async res => {
        if (!res.ok) return
        const data = await res.json()
        if (
          !active ||
          !data.completed ||
          (!data.birthPlace && !data.birthYear) ||
          answersRef.current['birth-details']?.answer?.trim()
        )
          return
        const place = [data.birthPlace, data.birthCountry].filter(Boolean).join(', ')
        const answer =
          [place && `I was born in ${place}`, data.birthYear && `in ${data.birthYear}`]
            .filter(Boolean)
            .join(' ') + '.'
        saveAnswer('birth-details', answer)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [chapterId, answersLoading, rawStories, draftKey, authFetch, saveAnswer])

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
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sepia">Chapter not found</p>
        <Link to="/" className="text-ink underline">
          Go back home
        </Link>
      </div>
    )
  }

  const question = chapter.questions[currentQuestion]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <Link
          to="/home"
          className="text-sepia/70 hover:text-sepia transition inline-flex items-center gap-2 mb-6 py-1 text-sm"
        >
          <span>←</span>
          <span>Return to Contents</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Chapter Number Circle */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center border-2 border-sepia/40 rounded-full flex-shrink-0">
            <span className="text-sepia font-semibold">{chapter.icon}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl text-ink font-medium">{chapter.title}</h1>
            <p className="text-sepia/70 text-sm sm:text-base italic">{chapter.subtitle}</p>
          </div>
        </div>
      </header>

      {/* Chapter Illustration Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowIllustration(!showIllustration)}
          className="text-sepia/60 hover:text-sepia text-sm flex items-center gap-2 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {showIllustration ? 'Hide' : 'Show'} chapter illustration
        </button>

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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-700 text-sm">{lastError}</span>
          <button
            onClick={() => {
              // Retry saving the current answer
              const currentAnswer = answers[question.id]?.answer || ''
              if (currentAnswer) {
                saveAnswer(question.id, currentAnswer)
              }
            }}
            className="text-red-700 underline text-sm hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-sepia/10 mb-4 sm:mb-6">
        <div className="flex justify-between text-xs sm:text-sm text-sepia/70 mb-2">
          <span>
            Question {currentQuestion + 1} of {chapter.questions.length}
          </span>
          <div className="flex items-center gap-3">
            {/* Save Status Indicator */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-sepia/60">
                <span className="w-2 h-2 bg-sepia/40 rounded-full animate-pulse" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-green-600">
                <span>✓</span>
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600">
                <span>!</span>
                Save failed
              </span>
            )}
            <span>{answeredCount} answered</span>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-1.5">
          {chapter.questions.map((q, idx) => {
            const isAnswered = answers[q.id]?.answer?.trim()
            const isSkipped = skippedQuestions.includes(q.id) && !isAnswered
            const isCurrent = idx === currentQuestion

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`flex-1 h-2 sm:h-1.5 rounded-full transition min-w-[8px] ${
                  isCurrent
                    ? 'bg-sepia'
                    : isAnswered
                      ? 'bg-sepia/40'
                      : isSkipped
                        ? 'bg-amber-300'
                        : 'bg-sepia/15 hover:bg-sepia/25'
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
        <button
          onClick={() => setShowMemoryTriggers(!showMemoryTriggers)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
            showMemoryTriggers
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-sepia/5 text-sepia/70 hover:bg-sepia/10 border border-sepia/10'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          {showMemoryTriggers ? 'Hide Tips' : 'Need Ideas?'}
        </button>

        {/* Skip Question */}
        {!answers[question.id]?.answer?.trim() && !skippedQuestions.includes(question.id) && (
          <button
            onClick={() => {
              setSkippedQuestions(prev => [...prev, question.id])
              // Move to next question
              if (currentQuestion < chapter.questions.length - 1) {
                setCurrentQuestion(prev => prev + 1)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-sepia/50 hover:text-sepia/70 text-sm transition"
          >
            <span>Skip for now</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Show if this was skipped */}
        {skippedQuestions.includes(question.id) && !answers[question.id]?.answer?.trim() && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Skipped - you can answer anytime
          </span>
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
        <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-center">
          <h3 className="font-display text-lg text-ink mb-1">
            Wonderful! Your First Chapter is Complete
          </h3>
          <p className="text-sepia/70 text-sm mb-2">
            You've captured {answeredCount} precious memories. Your family is going to love reading
            these.
          </p>
          <p className="text-amber-700 text-sm font-medium">
            Ready to continue your story? Unlock all 10 chapters and get 10 hardback books.
          </p>
        </div>
      )}

      {/* Review Chapter link — shown when enough questions are answered */}
      {!isLastQuestion && answeredCount >= Math.ceil(chapter.questions.length * 0.7) && (
        <div className="mt-4 text-center">
          <Link
            to={`/chapter/${chapterId}/review`}
            className="inline-flex items-center gap-1.5 text-sm text-sepia/60 hover:text-sepia transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Review & polish this chapter
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4 sm:mt-6 gap-4">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="flex-1 sm:flex-none px-5 py-3 sm:py-2 text-sepia/70 hover:text-sepia disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 rounded border border-sepia/20 hover:border-sepia/40 hover:bg-white/50 tap-bounce"
        >
          <span>←</span>
          <span>Previous</span>
        </button>
        {isLastQuestion ? (
          nextChapter ? (
            isChapterLocked(nextChapter.id) ? (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white transition flex items-center justify-center gap-2 rounded hover:shadow-lg tap-bounce"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Unlock Next Chapter</span>
              </button>
            ) : (
              <Link
                to={`/chapter/${nextChapter.id}`}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-sepia text-white transition flex items-center justify-center gap-2 rounded hover:bg-sepia/90 tap-bounce"
              >
                <span>Next Chapter</span>
                <span>→</span>
              </Link>
            )
          ) : (
            <Link
              to={`/chapter/${chapterId}/review`}
              className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-gradient-to-r from-sepia to-amber-700 text-white transition flex items-center justify-center gap-2 rounded hover:shadow-lg tap-bounce"
            >
              <span>Review & Polish</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </Link>
          )
        ) : (
          <button
            onClick={() =>
              setCurrentQuestion(prev => Math.min(chapter.questions.length - 1, prev + 1))
            }
            className="flex-1 sm:flex-none px-5 py-3 sm:py-2 text-sepia/70 hover:text-sepia transition flex items-center justify-center gap-2 rounded border border-sepia/20 hover:border-sepia/40 hover:bg-white/50 tap-bounce"
          >
            <span>Next</span>
            <span>→</span>
          </button>
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
  )
}

// Remount chapter-local editor state when either the chapter or account changes.
export default function ChapterPage() {
  const { chapterId } = useParams()
  const { user } = useAuth()
  return <Chapter key={`${user?.id}:${chapterId}`} />
}

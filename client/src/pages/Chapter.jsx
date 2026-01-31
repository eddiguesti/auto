import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import QuestionCard from '../components/QuestionCard'
import AIAssistant from '../components/AIAssistant'
import MemoryTriggers from '../components/MemoryTriggers'
import ChapterIllustration from '../components/ChapterIllustration'
import { useAuth } from '../context/AuthContext'

export default function Chapter() {
  const { chapterId } = useParams()
  const { authFetch } = useAuth()
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showAI, setShowAI] = useState(false)
  const [aiContext, setAiContext] = useState(null)
  const saveTimeoutRef = useRef({})
  const [pendingSaves, setPendingSaves] = useState({}) // Track unsaved changes
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | 'error'
  const [lastError, setLastError] = useState(null)
  const [showMemoryTriggers, setShowMemoryTriggers] = useState(false)
  const [skippedQuestions, setSkippedQuestions] = useState([])
  const [showIllustration, setShowIllustration] = useState(false)

  const chapter = chapters.find(c => c.id === chapterId)

  // Check if there are any pending saves
  const hasPendingSaves = Object.values(pendingSaves).some(Boolean)

  // Warn user before closing/navigating with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasPendingSaves) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasPendingSaves])

  useEffect(() => {
    if (chapter) {
      fetchAnswers()
    }

    // Cleanup timeouts on unmount
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [chapterId])

  const fetchAnswers = async () => {
    try {
      const res = await authFetch(`/api/stories/${chapterId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch answers')
      }
      const data = await res.json()
      const answersMap = {}
      data.forEach(story => {
        answersMap[story.question_id] = {
          answer: story.answer,
          id: story.id,
          photos: story.photos || []
        }
      })
      setAnswers(answersMap)
    } catch (err) {
      console.error('Error fetching answers:', err)
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
      try {
        const res = await authFetch('/api/stories', {
          method: 'POST',
          body: JSON.stringify({
            chapter_id: chapterId,
            question_id: questionId,
            answer
          })
        })
        if (!res.ok) {
          throw new Error('Failed to save')
        }
        // Mark as saved successfully
        setPendingSaves(prev => ({ ...prev, [questionId]: false }))
        setSaveStatus('saved')
        // Clear saved status after 2 seconds
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? null : prev), 2000)
      } catch (err) {
        console.error('Error saving answer:', err)
        setSaveStatus('error')
        setLastError('Failed to save. Please check your connection.')
        // Keep pending flag so user is warned before leaving
      }
    }, 1000)
  }

  const openAIAssistant = (question, answer) => {
    setAiContext({ question, answer, chapterId })
    setShowAI(true)
  }

  if (!chapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sepia">Chapter not found</p>
        <Link to="/" className="text-ink underline">Go back home</Link>
      </div>
    )
  }

  const question = chapter.questions[currentQuestion]
  const answeredCount = Object.values(answers).filter(a => a?.answer?.trim()).length
  const isLastQuestion = currentQuestion === chapter.questions.length - 1

  // Find next chapter
  const currentChapterIndex = chapters.findIndex(c => c.id === chapterId)
  const nextChapter = chapters[currentChapterIndex + 1]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <Link to="/" className="text-sepia/70 hover:text-sepia transition inline-flex items-center gap-2 mb-6 py-1 text-sm">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                setLastError(null)
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
          <span>Question {currentQuestion + 1} of {chapter.questions.length}</span>
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
      <QuestionCard
        question={question}
        answer={answers[question.id]?.answer || ''}
        onAnswerChange={(answer) => saveAnswer(question.id, answer)}
        onAskAI={() => openAIAssistant(question, answers[question.id]?.answer || '')}
        chapterId={chapterId}
        storyId={answers[question.id]?.id}
        photos={answers[question.id]?.photos || []}
        onPhotosChange={fetchAnswers}
      />

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
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
            <Link
              to={`/chapter/${nextChapter.id}`}
              className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-sepia text-white transition flex items-center justify-center gap-2 rounded hover:bg-sepia/90 tap-bounce"
            >
              <span>Next Chapter</span>
              <span>→</span>
            </Link>
          ) : (
            <Link
              to="/home"
              className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-sepia text-white transition flex items-center justify-center gap-2 rounded hover:bg-sepia/90 tap-bounce"
            >
              <span>Finish Chapter</span>
              <span>✓</span>
            </Link>
          )
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(chapter.questions.length - 1, prev + 1))}
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
          onClose={() => setShowAI(false)}
          onInsertText={(text, replace = false) => {
            if (replace) {
              // Replace entire answer with polished story
              saveAnswer(question.id, text)
            } else {
              // Append to existing
              const currentAnswer = answers[question.id]?.answer || ''
              saveAnswer(question.id, currentAnswer + '\n\n' + text)
            }
            setShowAI(false)
          }}
        />
      )}
    </div>
  )
}

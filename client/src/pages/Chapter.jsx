import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import QuestionCard from '../components/QuestionCard'
import AIAssistant from '../components/AIAssistant'
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
          {chapter.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`flex-1 h-2 sm:h-1.5 rounded-full transition min-w-[8px] ${
                idx === currentQuestion
                  ? 'bg-sepia'
                  : answers[q.id]?.answer?.trim()
                    ? 'bg-sepia/40'
                    : 'bg-sepia/15 hover:bg-sepia/25'
              }`}
              title={q.question}
            />
          ))}
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

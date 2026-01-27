import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import QuestionCard from '../components/QuestionCard'
import AIAssistant from '../components/AIAssistant'

export default function Chapter() {
  const { chapterId } = useParams()
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showAI, setShowAI] = useState(false)
  const [aiContext, setAiContext] = useState(null)
  const saveTimeoutRef = useRef({})

  const chapter = chapters.find(c => c.id === chapterId)

  useEffect(() => {
    if (chapter) {
      fetchAnswers()
    }
  }, [chapterId])

  const fetchAnswers = async () => {
    try {
      const res = await fetch(`/api/stories/${chapterId}`)
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

    // Debounce the save
    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapter_id: chapterId,
            question_id: questionId,
            answer
          })
        })
      } catch (err) {
        console.error('Error saving answer:', err)
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

      {/* Progress Bar */}
      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-sepia/10 mb-4 sm:mb-6">
        <div className="flex justify-between text-xs sm:text-sm text-sepia/70 mb-2">
          <span>Question {currentQuestion + 1} of {chapter.questions.length}</span>
          <span>{answeredCount} answered</span>
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
        <button
          onClick={() => setCurrentQuestion(prev => Math.min(chapter.questions.length - 1, prev + 1))}
          disabled={currentQuestion === chapter.questions.length - 1}
          className="flex-1 sm:flex-none px-5 py-3 sm:py-2 text-sepia/70 hover:text-sepia disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 rounded border border-sepia/20 hover:border-sepia/40 hover:bg-white/50 tap-bounce"
        >
          <span>Next</span>
          <span>→</span>
        </button>
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

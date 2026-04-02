import { useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { usePremium } from '../../hooks/usePremium'
import { useVoiceSession } from '../../hooks/useVoiceSession'
import { AudioVisualizer } from '../../components/AudioVisualizer'
import { chapters } from '../../data/chapters'

/**
 * VoiceChat - Multi-question voice interview experience
 * Presentational wrapper around useVoiceSession hook
 */
export default function VoiceChat() {
  const { isChapterLocked } = usePremium()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const initialQuestionIndex = parseInt(searchParams.get('question') || '0')

  const chapter = chapters.find(c => c.id === chapterId) || chapters[0]

  // Redirect if chapter is locked
  useEffect(() => {
    if (chapterId && isChapterLocked(chapterId)) {
      navigate('/home', { replace: true })
    }
  }, [chapterId, isChapterLocked])

  const {
    phase,
    isRecording,
    isSpeechDetected,
    isSpeaking,
    error,
    question,
    questionIndex,
    questionsAnswered,
    stream,
    startConversation,
    endConversation,
    resetError
  } = useVoiceSession({ chapter, initialQuestionIndex })

  const totalQuestions = chapter.questions.length
  const answeredCount = questionsAnswered.length

  const getStatusText = () => {
    if (isSpeaking) return 'Listening to your story...'
    if (isSpeechDetected) return 'I hear you...'
    if (phase === 'connecting') return 'Connecting...'
    if (phase === 'active') return 'Speak naturally'
    if (phase === 'compiling') return 'Writing your story...'
    if (phase === 'ended') return 'Interview complete'
    return ''
  }

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      {/* Header */}
      <header className="p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sepia/60 hover:text-sepia transition text-sm">
            ← Back
          </Link>
          <div className="flex items-center gap-4">
            {phase === 'active' && (
              <span className="text-sm text-sepia/50">
                Question {questionIndex + 1} of {totalQuestions}
                {answeredCount > 0 && ` (${answeredCount} saved)`}
              </span>
            )}
            {phase === 'active' && (
              <button
                onClick={endConversation}
                className="text-sm text-sepia/60 hover:text-sepia transition"
              >
                End & Save
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <p className="text-sepia/40 text-sm mb-2 uppercase tracking-wider">{chapter.title}</p>
          <h2 className="text-xl text-ink/80 leading-relaxed mb-12 font-light">
            {question?.question}
          </h2>

          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
              <button onClick={resetError} className="ml-3 underline">
                Try again
              </button>
            </div>
          )}

          {phase === 'ready' && !error && (
            <ReadyState onStart={startConversation} answeredCount={answeredCount} />
          )}

          {phase === 'connecting' && <ConnectingState />}

          {phase === 'active' && (
            <>
              <AudioVisualizer
                stream={stream}
                isActive={isRecording}
                isSpeaking={isSpeaking}
                isSpeechDetected={isSpeechDetected}
                size="lg"
              />
              <p className="text-sepia/50 text-sm mt-6 h-6">{getStatusText()}</p>
            </>
          )}

          {phase === 'compiling' && <CompilingState />}

          {phase === 'ended' && (
            <EndedState answeredCount={answeredCount} onContinue={() => navigate('/')} />
          )}
        </div>
      </main>
    </div>
  )
}

function ReadyState({ onStart, answeredCount }) {
  return (
    <div onClick={onStart} className="cursor-pointer group">
      <div className="transition-transform duration-300 group-hover:scale-105">
        <AudioVisualizer
          stream={null}
          isActive={false}
          isSpeaking={false}
          isSpeechDetected={false}
          size="lg"
        />
      </div>
      <p className="text-sepia/60 text-lg font-light mt-6 mb-2">
        {answeredCount > 0 ? 'Continue your interview' : 'Say hello to begin'}
      </p>
      <p className="text-sepia/40 text-sm">Click to start</p>
    </div>
  )
}

function ConnectingState() {
  return (
    <div>
      <AudioVisualizer
        stream={null}
        isActive={false}
        isSpeaking={true}
        isSpeechDetected={false}
        size="lg"
      />
      <p className="text-sepia/50 mt-6">Connecting...</p>
    </div>
  )
}

function CompilingState() {
  return (
    <div className="space-y-6">
      <div className="w-32 h-32 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-amber-600 animate-pulse"
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
      </div>
      <div>
        <p className="text-ink text-lg mb-2">Writing your story...</p>
        <p className="text-sepia/60 text-sm">Turning your memories into beautiful prose</p>
      </div>
    </div>
  )
}

function EndedState({ answeredCount, onContinue }) {
  return (
    <div className="space-y-6">
      <div className="w-32 h-32 mx-auto rounded-full bg-green-50 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-ink text-lg mb-2">Interview saved</p>
        <p className="text-sepia/60 text-sm">
          {answeredCount > 0
            ? `${answeredCount} memories captured and compiled`
            : 'Your story has been recorded'}
        </p>
      </div>
      <button
        onClick={onContinue}
        className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 transition"
      >
        Continue
      </button>
    </div>
  )
}

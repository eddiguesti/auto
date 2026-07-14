import { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconBook2, IconCircleCheck } from '@tabler/icons-react'
import { usePremium } from '../../hooks/usePremium'
import { useVoiceSession } from '../../hooks/useVoiceSession'
import { AudioVisualizer } from '../../components/AudioVisualizer'
import { chapters } from '../../data/chapters'
import AppShell from '../../components/layout/AppShell'
import { Button } from '../../components/ui'

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
  const photoParam = searchParams.get('photo')

  // Parse photo context from URL if present (set by PhotoPrompt page)
  const photoContext = useMemo(() => {
    if (!photoParam) return null
    try {
      return JSON.parse(decodeURIComponent(photoParam))
    } catch {
      return null
    }
  }, [photoParam])

  // Fall back to the free chapter if the requested one is locked
  const chapter = useMemo(() => {
    const requested = chapters.find(c => c.id === chapterId)
    if (requested && !isChapterLocked(requested.id)) return requested
    return chapters.find(c => !isChapterLocked(c.id)) || chapters[0]
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
  } = useVoiceSession({ chapter, initialQuestionIndex, photoContext })

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
    <AppShell back="/home" title={chapter.title}>
      <div className="min-h-[70vh] py-10 page-enter flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full">
          {phase === 'active' && (
            <p className="eyebrow mb-3">
              Question {questionIndex + 1} of {totalQuestions}
              {answeredCount > 0 && ` (${answeredCount} saved)`}
            </p>
          )}

          <h2 className="font-serif text-xl sm:text-2xl text-ink leading-relaxed mb-12">
            {question?.question}
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-8 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center justify-center gap-2.5"
            >
              <IconAlertCircle size={18} stroke={1.75} className="shrink-0" />
              <span>
                {error}
                <button
                  onClick={resetError}
                  className="ml-3 font-medium underline hover:no-underline"
                >
                  Try again
                </button>
              </span>
            </div>
          )}

          {phase === 'ready' && !error && (
            <ReadyState onStart={startConversation} answeredCount={answeredCount} />
          )}

          {phase === 'connecting' && <ConnectingState />}

          {phase === 'active' && (
            <>
              <div className={`inline-flex rounded-full ${isRecording ? 'pulse-gentle' : ''}`}>
                <AudioVisualizer
                  stream={stream}
                  isActive={isRecording}
                  isSpeaking={isSpeaking}
                  isSpeechDetected={isSpeechDetected}
                  size="lg"
                />
              </div>
              <p className="text-sepia-600 text-base mt-6 h-7">{getStatusText()}</p>
              <Button variant="ghost" className="mt-8" onClick={endConversation}>
                End & Save
              </Button>
            </>
          )}

          {phase === 'compiling' && <CompilingState />}

          {phase === 'ended' && (
            <EndedState answeredCount={answeredCount} onContinue={() => navigate('/')} />
          )}
        </div>
      </div>
    </AppShell>
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
      <p className="text-ink text-lg mt-6 mb-1">
        {answeredCount > 0 ? 'Continue your interview' : 'Say hello to begin'}
      </p>
      <p className="text-sepia-500 text-sm">Click to start</p>
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
      <p className="text-sepia-600 mt-6">Connecting...</p>
    </div>
  )
}

function CompilingState() {
  return (
    <div className="space-y-6">
      <div className="w-32 h-32 mx-auto rounded-full bg-bronze-50 text-bronze-600 flex items-center justify-center pulse-soft">
        <IconBook2 size={44} stroke={1.5} />
      </div>
      <div>
        <p className="text-ink text-lg mb-2">Writing your story...</p>
        <p className="text-sepia-600 text-sm">Turning your memories into beautiful prose</p>
      </div>
    </div>
  )
}

function EndedState({ answeredCount, onContinue }) {
  return (
    <div className="space-y-6">
      <div className="w-32 h-32 mx-auto rounded-full bg-success-soft text-success flex items-center justify-center">
        <IconCircleCheck size={48} stroke={1.5} />
      </div>
      <div>
        <p className="text-ink text-lg mb-2">Interview saved</p>
        <p className="text-sepia-600 text-sm">
          {answeredCount > 0
            ? `${answeredCount} memories captured and compiled`
            : 'Your story has been recorded'}
        </p>
      </div>
      <Button size="lg" onClick={onContinue}>
        Continue
      </Button>
    </div>
  )
}

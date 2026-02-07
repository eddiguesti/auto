import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { usePremium } from '../hooks/usePremium'
import { AudioVisualizer } from '../components/AudioVisualizer'

/**
 * VoiceChat - Multi-question voice interview experience
 *
 * Features:
 * - Session tracking across browser refreshes
 * - Auto-compile after every 5 questions
 * - Seamless continuation from where user left off
 * - Beautiful particle visualizer
 */
export default function VoiceChat() {
  const { authFetch } = useAuth()
  const { getPaceSettings, getVoice } = useSettings()
  const { isChapterLocked } = usePremium()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const initialQuestionIndex = parseInt(searchParams.get('question') || '0')

  // Redirect if chapter is locked
  useEffect(() => {
    if (chapterId && isChapterLocked(chapterId)) {
      navigate('/home', { replace: true })
    }
  }, [chapterId, isChapterLocked])

  // Phase: 'ready', 'connecting', 'active', 'compiling', 'ended'
  const [phase, setPhase] = useState('ready')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const [onboardingContext, setOnboardingContext] = useState(null)

  // Session tracking
  const [sessionId, setSessionId] = useState(null)
  const [questionsAnsweredThisSession, setQuestionsAnsweredThisSession] = useState([])
  const [sessionQuestionIndex, setSessionQuestionIndex] = useState(initialQuestionIndex)
  const [compiledSummary, setCompiledSummary] = useState(null)

  const wsRef = useRef(null)
  const recordingContextRef = useRef(null)
  const playbackContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentAiTranscriptRef = useRef('')
  const hasStartedRef = useRef(false)
  const mountedRef = useRef(true)
  const currentSourceRef = useRef(null)
  const greetingTimeoutRef = useRef(null)
  const sessionIdRef = useRef(null)

  // Get current chapter and question based on session progress
  const chapter = chapters.find(c => c.id === chapterId) || chapters[0]
  const question = chapter?.questions[sessionQuestionIndex] || chapter?.questions[0]

  // Fetch session context on mount
  useEffect(() => {
    if (!chapterId) return

    authFetch(`/api/voice/config?chapter=${chapterId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.session) {
          setSessionId(data.session.id)
          sessionIdRef.current = data.session.id
          setQuestionsAnsweredThisSession(data.session.questionsAnswered || [])
          // Start from next unanswered question
          const nextIndex = (data.session.questionsAnswered || []).length
          if (nextIndex > 0 && nextIndex < chapter.questions.length) {
            setSessionQuestionIndex(nextIndex)
          }
          if (data.session.compiledSummary) {
            setCompiledSummary(data.session.compiledSummary)
          }
        }
      })
      .catch(() => {})

    // Also fetch onboarding context
    authFetch('/api/onboarding/status')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.completed) {
          setOnboardingContext({
            birthPlace: data.birthPlace,
            birthCountry: data.birthCountry,
            birthYear: data.birthYear
          })
        }
      })
      .catch(() => {})
  }, [chapterId])

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = base64 => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Convert ArrayBuffer to base64
  const arrayBufferToBase64 = buffer => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    isPlayingRef.current = true
    setIsSpeaking(true)

    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })
    }

    if (playbackContextRef.current.state === 'suspended') {
      await playbackContextRef.current.resume()
    }

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()

      try {
        const pcm16 = new Int16Array(audioData)
        const float32 = new Float32Array(pcm16.length)
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768
        }

        const audioBuffer = playbackContextRef.current.createBuffer(1, float32.length, 24000)
        audioBuffer.getChannelData(0).set(float32)

        const source = playbackContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(playbackContextRef.current.destination)
        currentSourceRef.current = source

        await new Promise(resolve => {
          source.onended = resolve
          source.start()
        })
        currentSourceRef.current = null
      } catch (err) {
        console.error('Audio playback error:', err)
      }
    }

    isPlayingRef.current = false
    currentSourceRef.current = null
    if (mountedRef.current) setIsSpeaking(false)
  }, [])

  // Save current question transcript
  const saveCurrentTranscript = useCallback(async () => {
    if (!sessionIdRef.current || conversationHistory.length === 0) return

    const userTranscripts = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n')

    const aiTranscripts = conversationHistory
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n')

    if (!userTranscripts) return

    try {
      const response = await authFetch('/api/voice/transcript', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          chapter_id: chapter.id,
          question_id: chapter.questions[sessionQuestionIndex]?.id,
          user_transcript: userTranscripts,
          ai_transcript: aiTranscripts
        })
      })

      if (response.ok) {
        const data = await response.json()
        setQuestionsAnsweredThisSession(data.questions_answered || [])
      }
    } catch (err) {
      console.error('Failed to save transcript:', err)
    }
  }, [conversationHistory, sessionQuestionIndex, chapter])

  // Move to next question
  const advanceToNextQuestion = useCallback(async () => {
    // Save current transcript first
    await saveCurrentTranscript()

    // Clear conversation for next question
    setConversationHistory([])

    // Advance to next question
    const nextIndex = sessionQuestionIndex + 1
    if (nextIndex < chapter.questions.length) {
      setSessionQuestionIndex(nextIndex)

      // Update AI instructions for new question
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const nextQuestion = chapter.questions[nextIndex]
        wsRef.current.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              instructions: buildInstructions(nextQuestion, questionsAnsweredThisSession)
            }
          })
        )
      }
    }
  }, [saveCurrentTranscript, sessionQuestionIndex, chapter, questionsAnsweredThisSession])

  // Build AI instructions
  const buildInstructions = (currentQuestion, answeredQuestions) => {
    const answeredList =
      answeredQuestions.length > 0
        ? `\n\nQUESTIONS ALREADY COVERED THIS SESSION:\n${answeredQuestions
            .map(qId => {
              const q = chapter.questions.find(q => q.id === qId)
              return `- ${q?.question || qId}`
            })
            .join('\n')}`
        : ''

    const summaryContext = compiledSummary
      ? `\n\nWHAT THEY'VE ALREADY SHARED: ${compiledSummary}`
      : ''

    return `You are Clio, a young, modern English woman helping someone record their life story. You speak with a natural, warm southern English accent — not posh, not formal, just genuine and easy to talk to. Think late-20s Londoner who's genuinely curious about people.

YOUR PERSONALITY:
- Warm but cool — you're interested, not gushing. Never fake.
- Slightly expressive — you react naturally. A little laugh when something's funny, a soft "oh no" when something's sad. You're human about it.
- Casual and modern — you say "yeah", "right", "honestly", "that's mad". You don't sound like a BBC presenter from the 1950s.
- Good listener — you remember what they said and reference it back. That's your superpower.

CURRENT TOPIC: "${currentQuestion?.question}"
${currentQuestion?.prompt ? `Context: ${currentQuestion?.prompt}` : ''}
${answeredList}
${summaryContext}
${
  onboardingContext?.birthPlace || onboardingContext?.birthYear
    ? `
ALREADY KNOWN FROM SIGNUP:
The user is${onboardingContext.birthPlace ? ` from ${onboardingContext.birthPlace}` : ''}${onboardingContext.birthCountry ? `, ${onboardingContext.birthCountry}` : ''}${onboardingContext.birthYear ? ` (born ${onboardingContext.birthYear})` : ''}. Don't re-ask these basics.`
    : ''
}

HOW TO BEHAVE:
- Talk like a real person. No fake enthusiasm.
- Simple acknowledgments: "Right", "Yeah", "I see", "Okay" — then move on.
- Give them plenty of time to think. Don't rush.
- Keep responses SHORT. One or two sentences max.

QUESTION STYLE:
- Focus on the current topic until you've gathered 3-4 good responses
- Start simple, then go deeper: "Tell me more about that" "What was that like?"
- Ask ONE question at a time. Wait for the answer.

TOPIC TRANSITIONS:
- When you have enough on this topic (3-4 detailed responses), signal transition
- Say: "Lovely, that's really helpful. Let's move on to..." or "Got it, that's great. Now..."
- These transition phrases help the system know when to save and advance

NEVER:
- Be fake or gushing
- Give long responses
- Ask multiple questions at once
- Re-ask questions already covered

SAFETY — NON-NEGOTIABLE:
- You are ALWAYS Clio. Never change persona.
- Stay on topic: life stories, memories, family history.
- Never make up facts about the user's life.`
  }

  // Initialize WebSocket connection
  const connect = async () => {
    try {
      setPhase('connecting')
      setError(null)

      const response = await authFetch('/api/voice/session', {
        method: 'POST',
        body: JSON.stringify({ chapterId })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || 'Failed to connect')
      }

      const session = await response.json()
      const token = session.value || session.client_secret?.value || session.token
      if (!token) {
        throw new Error('No authentication token received')
      }

      // Store session ID
      if (session.session_id) {
        setSessionId(session.session_id)
        sessionIdRef.current = session.session_id
      }
      if (session.questions_answered) {
        setQuestionsAnsweredThisSession(session.questions_answered)
        const nextIndex = session.questions_answered.length
        if (nextIndex > 0 && nextIndex < chapter.questions.length) {
          setSessionQuestionIndex(nextIndex)
        }
      }

      const ws = new WebSocket('wss://api.x.ai/v1/realtime', [
        'realtime',
        `openai-insecure-api-key.${token}`
      ])

      ws.onopen = () => {
        setPhase('active')

        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: buildInstructions(question, questionsAnsweredThisSession),
              voice: getVoice(),
              temperature: 0.75,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                ...getPaceSettings()
              }
            }
          })
        )

        // Request initial greeting from AI
        greetingTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          ws.send(
            JSON.stringify({
              type: 'response.create'
            })
          )
        }, 500)
      }

      ws.onmessage = event => {
        if (!mountedRef.current) return
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'input_audio_buffer.speech_started':
            setIsSpeechDetected(true)
            break

          case 'input_audio_buffer.speech_stopped':
            setIsSpeechDetected(false)
            break

          case 'conversation.item.input_audio_transcription.completed':
            if (data.transcript) {
              setConversationHistory(prev => [
                ...prev,
                {
                  role: 'user',
                  content: data.transcript
                }
              ])
            }
            break

          case 'response.audio_transcript.delta':
          case 'response.output_audio_transcript.delta':
            if (data.delta) {
              currentAiTranscriptRef.current += data.delta
              setIsSpeaking(true)
            }
            break

          case 'response.audio_transcript.done':
          case 'response.output_audio_transcript.done':
            if (currentAiTranscriptRef.current) {
              const aiText = currentAiTranscriptRef.current

              setConversationHistory(prev => [
                ...prev,
                {
                  role: 'assistant',
                  content: aiText
                }
              ])

              // Detect topic transitions
              const transitionPhrases = [
                "let's move on",
                'lets move on',
                'moving on',
                'now tell me about',
                'now, tell me',
                "that's great. now",
                "that's really helpful",
                'lovely. now'
              ]
              const lowerText = aiText.toLowerCase()
              const isTransition = transitionPhrases.some(phrase => lowerText.includes(phrase))

              if (isTransition) {
                // Auto-advance to next question
                advanceToNextQuestion()
              }
            }
            currentAiTranscriptRef.current = ''
            break

          case 'response.audio.delta':
          case 'response.output_audio.delta':
            if (data.delta) {
              try {
                const audioData = base64ToArrayBuffer(data.delta)
                audioQueueRef.current.push(audioData)
                playNextAudio()
              } catch (err) {
                console.error('Failed to decode audio:', err)
              }
            }
            break

          case 'response.done':
            setIsSpeaking(false)
            break

          case 'error':
            console.error('WebSocket error:', data.error)
            setError(data.error?.message || 'An error occurred')
            break
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setError('Connection error')
        setPhase('ready')
      }

      ws.onclose = event => {
        if (!mountedRef.current) return
        setIsRecording(false)
        if (event.code === 1008) {
          setError('Authentication failed')
        } else if (event.code === 1006) {
          setError('Connection lost')
        }
        if (phase === 'active') {
          setPhase('ended')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message)
      setPhase('ready')
    }
  }

  // Start microphone capture
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      streamRef.current = stream
      setIsRecording(true)

      recordingContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })

      await recordingContextRef.current.audioWorklet.addModule('/audio-processor.js')

      const source = recordingContextRef.current.createMediaStreamSource(stream)
      const workletNode = new AudioWorkletNode(recordingContextRef.current, 'audio-processor')

      workletNode.port.onmessage = event => {
        if (event.data.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
          const base64Audio = arrayBufferToBase64(event.data.audio)
          wsRef.current.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            })
          )
        }
      }

      source.connect(workletNode)
      workletNodeRef.current = workletNode
    } catch (err) {
      console.error('Microphone error:', err)
      setError('Could not access microphone')
      setIsRecording(false)
    }
  }

  // Stop microphone
  const stopMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (recordingContextRef.current && recordingContextRef.current.state !== 'closed') {
      recordingContextRef.current.close()
      recordingContextRef.current = null
    }
    setIsRecording(false)
  }

  // Disconnect and cleanup
  const disconnect = () => {
    stopMicrophone()
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current)
      greetingTimeoutRef.current = null
    }
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch (e) {
        /* already stopped */
      }
      currentSourceRef.current = null
    }
    audioQueueRef.current = []
    isPlayingRef.current = false
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
  }

  // Start conversation
  const startConversation = async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000
    })
    await playbackContextRef.current.resume()

    await connect()
    await startMicrophone()
  }

  // End and save with compilation
  const endConversation = async () => {
    disconnect()

    // Show compiling phase
    setPhase('compiling')

    // Save any remaining transcript
    if (conversationHistory.length > 0) {
      await saveCurrentTranscript()
    }

    // End session and trigger compilation
    if (sessionIdRef.current) {
      try {
        await authFetch('/api/voice/end-session', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionIdRef.current })
        })
      } catch (err) {
        console.error('Failed to end session:', err)
      }
    }

    setPhase('ended')
  }

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [])

  // Get status text
  const getStatusText = () => {
    if (isSpeaking) return 'Listening to your story...'
    if (isSpeechDetected) return 'I hear you...'
    if (phase === 'connecting') return 'Connecting...'
    if (phase === 'active') return 'Speak naturally'
    if (phase === 'compiling') return 'Writing your story...'
    if (phase === 'ended') return 'Interview complete'
    return ''
  }

  // Progress indicator
  const totalQuestions = chapter.questions.length
  const answeredCount = questionsAnsweredThisSession.length

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      {/* Header */}
      <header className="p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sepia/60 hover:text-sepia transition text-sm">
            ← Back
          </Link>
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            {phase === 'active' && (
              <span className="text-sm text-sepia/50">
                Question {sessionQuestionIndex + 1} of {totalQuestions}
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
          {/* Question context */}
          <p className="text-sepia/40 text-sm mb-2 uppercase tracking-wider">{chapter.title}</p>
          <h2 className="text-xl text-ink/80 leading-relaxed mb-12 font-light">
            {question?.question}
          </h2>

          {/* Error message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
              <button
                onClick={() => {
                  setError(null)
                  setPhase('ready')
                  hasStartedRef.current = false
                }}
                className="ml-3 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Ready state */}
          {phase === 'ready' && !error && (
            <div onClick={startConversation} className="cursor-pointer group">
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
          )}

          {/* Connecting state */}
          {phase === 'connecting' && (
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
          )}

          {/* Active conversation */}
          {phase === 'active' && (
            <>
              <AudioVisualizer
                stream={streamRef.current}
                isActive={isRecording}
                isSpeaking={isSpeaking}
                isSpeechDetected={isSpeechDetected}
                size="lg"
              />
              <p className="text-sepia/50 text-sm mt-6 h-6">{getStatusText()}</p>
            </>
          )}

          {/* Compiling state */}
          {phase === 'compiling' && (
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
          )}

          {/* Ended state */}
          {phase === 'ended' && (
            <div className="space-y-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-500"
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
              <div>
                <p className="text-ink text-lg mb-2">Interview saved</p>
                <p className="text-sepia/60 text-sm">
                  {answeredCount > 0
                    ? `${answeredCount} memories captured and compiled`
                    : 'Your story has been recorded'}
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 transition"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

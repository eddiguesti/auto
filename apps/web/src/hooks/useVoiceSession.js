/**
 * useVoiceSession — manages WebSocket voice session, audio I/O, and transcript tracking
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { base64ToArrayBuffer, arrayBufferToBase64 } from '../utils/audio'
import { buildInstructions } from '../utils/voiceInstructions'
import { VOICE_CONFIG } from '../data/voiceConfig'
import { readDraft } from './useDraftAutosave'

export function useVoiceSession({ chapter, initialQuestionIndex = 0, photoContext = null }) {
  const { authFetch, token: jwtToken, user } = useAuth()
  const draftKey = `memoir-draft:${user?.id}:voice:${chapter?.id}`
  const recovered = useRef(readDraft(draftKey))
  const { getPaceSettings, getVoice } = useSettings()

  const [phase, setPhase] = useState('ready') // 'ready' | 'connecting' | 'active' | 'compiling' | 'ended'
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [conversationHistory, setConversationHistory] = useState(recovered.current.history || [])
  const [onboardingContext, setOnboardingContext] = useState(null)
  const [sessionId, setSessionId] = useState(recovered.current.sessionId || null)
  const [questionsAnswered, setQuestionsAnswered] = useState([])
  const [questionIndex, setQuestionIndex] = useState(
    recovered.current.questionIndex ?? initialQuestionIndex
  )
  const [compiledSummary, setCompiledSummary] = useState(null)

  // Refs for WebSocket, audio, and lifecycle
  const wsRef = useRef(null)
  const recordingCtxRef = useRef(null)
  const playbackCtxRef = useRef(null)
  const workletRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentAiTranscriptRef = useRef('')
  const hasStartedRef = useRef(false)
  const mountedRef = useRef(true)
  const currentSourceRef = useRef(null)
  const greetingTimeoutRef = useRef(null)
  const sessionIdRef = useRef(recovered.current.sessionId || null)
  const historyRef = useRef(recovered.current.history || [])
  const saveTranscriptRef = useRef(null)
  const advanceRef = useRef(null)
  const advancingRef = useRef(false)
  const messageHandlerRef = useRef(null)

  const question = chapter?.questions[questionIndex] || chapter?.questions[0]

  // Keep refs in sync
  useEffect(() => {
    historyRef.current = conversationHistory
    if (conversationHistory.some(item => item.role === 'user')) {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            history: conversationHistory,
            sessionId: sessionIdRef.current,
            questionIndex
          })
        )
      } catch {
        /* Save errors remain visible. */
      }
    }
  }, [conversationHistory, draftKey, questionIndex, sessionId])

  const appendConversation = useCallback(item => {
    const next = [...historyRef.current, item]
    historyRef.current = next
    setConversationHistory(next)
  }, [])

  // Fetch session context on mount
  useEffect(() => {
    if (!chapter?.id) return
    authFetch(`/api/voice/config?chapter=${chapter.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.session && !recovered.current.history?.length) {
          setSessionId(data.session.id)
          sessionIdRef.current = data.session.id
          setQuestionsAnswered(data.session.questionsAnswered || [])
          const nextIdx = (data.session.questionsAnswered || []).length
          if (nextIdx > 0 && nextIdx < chapter.questions.length) {
            setQuestionIndex(nextIdx)
          }
          if (data.session.compiledSummary) setCompiledSummary(data.session.compiledSummary)
        }
      })
      .catch(() => {})

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
  }, [chapter?.id, chapter?.questions.length, authFetch])

  // --- Audio playback ---
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    isPlayingRef.current = true
    setIsSpeaking(true)

    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: VOICE_CONFIG.SAMPLE_RATE
        })
      }
      if (playbackCtxRef.current.state === 'suspended') await playbackCtxRef.current.resume()

      while (audioQueueRef.current.length > 0) {
        const audioData = audioQueueRef.current.shift()
        try {
          const pcm16 = new Int16Array(audioData)
          const float32 = new Float32Array(pcm16.length)
          for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768
          const buf = playbackCtxRef.current.createBuffer(
            1,
            float32.length,
            VOICE_CONFIG.SAMPLE_RATE
          )
          buf.getChannelData(0).set(float32)
          const source = playbackCtxRef.current.createBufferSource()
          source.buffer = buf
          source.connect(playbackCtxRef.current.destination)
          currentSourceRef.current = source
          await new Promise(resolve => {
            source.onended = resolve
            source.start()
          })
          currentSourceRef.current = null
        } catch (err) {
          /* skip bad chunk */
        }
      }
    } finally {
      isPlayingRef.current = false
      currentSourceRef.current = null
      if (mountedRef.current) setIsSpeaking(false)
    }
  }, [])

  // --- Transcript saving ---
  const saveCurrentTranscript = useCallback(async () => {
    const history = historyRef.current
    if (history.length === 0) return true
    if (!sessionIdRef.current) {
      setError('Your transcript is kept in this tab. Reconnect before saving it.')
      return false
    }
    const userText = history
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n')
    const aiText = history
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n\n')
    if (!userText) return true

    try {
      const res = await authFetch('/api/voice/transcript', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          chapter_id: chapter.id,
          question_id: chapter.questions[questionIndex]?.id,
          user_transcript: userText,
          ai_transcript: aiText
        })
      })
      if (!res.ok) throw new Error('Transcript save failed')
      const data = await res.json()
      if (historyRef.current !== history) {
        setError(
          'More speech arrived while saving. Your transcript is kept in this tab; please try saving again.'
        )
        return false
      }
      setQuestionsAnswered(data.questions_answered || [])
      sessionStorage.removeItem(draftKey)
      return true
    } catch {
      setError(
        'Your transcript has not been saved. It is kept in this tab. Please try again before continuing.'
      )
      return false
    }
  }, [questionIndex, chapter, authFetch, draftKey])
  saveTranscriptRef.current = saveCurrentTranscript

  // --- Advance to next question ---
  const advanceToNextQuestion = useCallback(async () => {
    if (advancingRef.current) return
    advancingRef.current = true
    try {
      if (!(await saveCurrentTranscript())) return
      setConversationHistory([])
      historyRef.current = []
      const nextIdx = questionIndex + 1
      if (nextIdx < chapter.questions.length) {
        setQuestionIndex(nextIdx)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                instructions: buildInstructions(
                  chapter,
                  chapter.questions[nextIdx],
                  questionsAnswered,
                  compiledSummary,
                  onboardingContext,
                  photoContext
                )
              }
            })
          )
        }
      }
    } finally {
      advancingRef.current = false
    }
  }, [
    saveCurrentTranscript,
    questionIndex,
    chapter,
    questionsAnswered,
    compiledSummary,
    onboardingContext,
    photoContext
  ])

  useEffect(() => {
    advanceRef.current = advanceToNextQuestion
  }, [advanceToNextQuestion])

  // --- Microphone ---
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: VOICE_CONFIG.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      streamRef.current = stream
      setIsRecording(true)
      recordingCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: VOICE_CONFIG.SAMPLE_RATE
      })
      await recordingCtxRef.current.audioWorklet.addModule('/audio-processor.js')
      const source = recordingCtxRef.current.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(recordingCtxRef.current, 'audio-processor')
      worklet.port.onmessage = event => {
        if (event.data.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: arrayBufferToBase64(event.data.audio)
            })
          )
        }
      }
      source.connect(worklet)
      workletRef.current = worklet
    } catch {
      setError('Could not access microphone')
      setIsRecording(false)
    }
  }, [])

  const stopMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    workletRef.current?.disconnect()
    workletRef.current = null
    if (recordingCtxRef.current?.state !== 'closed') recordingCtxRef.current?.close()
    recordingCtxRef.current = null
    setIsRecording(false)
  }, [])

  // --- WebSocket ---
  const connect = useCallback(async () => {
    try {
      setPhase('connecting')
      setError(null)
      const response = await authFetch('/api/voice/session', {
        method: 'POST',
        body: JSON.stringify({ chapterId: chapter.id })
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || 'Failed to connect')
      }
      const session = await response.json()

      if (session.session_id) {
        setSessionId(session.session_id)
        sessionIdRef.current = session.session_id
      }
      if (session.questions_answered) {
        setQuestionsAnswered(session.questions_answered)
        const nextIdx = session.questions_answered.length
        if (nextIdx > 0 && nextIdx < chapter.questions.length) setQuestionIndex(nextIdx)
      }

      if (!jwtToken) throw new Error('Not authenticated')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/voice/ws?token=${jwtToken}`
      )

      ws.onopen = () => {
        setPhase('active')
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: buildInstructions(
                chapter,
                question,
                questionsAnswered,
                compiledSummary,
                onboardingContext,
                photoContext
              ),
              voice: getVoice(),
              temperature: 0.75,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad', ...getPaceSettings() }
            }
          })
        )
        greetingTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) ws.send(JSON.stringify({ type: 'response.create' }))
        }, VOICE_CONFIG.GREETING_DELAY_MS)
      }

      ws.onmessage = event => {
        if (!mountedRef.current) return
        const data = JSON.parse(event.data)
        messageHandlerRef.current?.(data)
      }

      ws.onerror = () => {
        if (mountedRef.current) {
          setError('Connection error')
          setPhase('ready')
        }
      }
      ws.onclose = event => {
        if (!mountedRef.current) return
        setIsRecording(false)
        if (event.code === 1008) setError('Authentication failed')
        else if (event.code === 1006) setError('Connection lost')
        if (phase === 'active') setPhase('ended')
      }

      wsRef.current = ws
    } catch (err) {
      setError(err.message)
      setPhase('ready')
    }
  }, [
    chapter,
    question,
    questionsAnswered,
    compiledSummary,
    onboardingContext,
    photoContext,
    authFetch,
    getPaceSettings,
    getVoice,
    jwtToken,
    phase
  ])

  // Handle WebSocket messages
  const handleWsMessage = useCallback(
    data => {
      switch (data.type) {
        case 'input_audio_buffer.speech_started':
          setIsSpeechDetected(true)
          break
        case 'input_audio_buffer.speech_stopped':
          setIsSpeechDetected(false)
          break

        case 'conversation.item.input_audio_transcription.completed':
          if (data.transcript) {
            appendConversation({ role: 'user', content: data.transcript })
            // Detect frustration with pacing and adapt dynamically + persistently
            const transcriptLower = data.transcript.toLowerCase()
            const isCutOff =
              transcriptLower.includes('cutting me off') ||
              transcriptLower.includes('cut me off') ||
              transcriptLower.includes('interrupting') ||
              transcriptLower.includes('let me finish') ||
              transcriptLower.includes('wait let me') ||
              transcriptLower.includes("i wasn't finished") ||
              transcriptLower.includes("hadn't finished") ||
              transcriptLower.includes('slow down') ||
              transcriptLower.includes('too fast')
            if (isCutOff && wsRef.current?.readyState === WebSocket.OPEN) {
              // Immediately slow down this session
              wsRef.current.send(
                JSON.stringify({
                  type: 'session.update',
                  session: {
                    turn_detection: {
                      type: 'server_vad',
                      silence_duration_ms: 5000,
                      threshold: 0.8,
                      prefix_padding_ms: 1000
                    }
                  }
                })
              )
              // Persist preference so all future sessions are slower
              localStorage.setItem('speakingPace', 'slow')
            }
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
        case 'response.output_audio_transcript.done': {
          const aiText = currentAiTranscriptRef.current
          if (aiText) {
            appendConversation({ role: 'assistant', content: aiText })
            const lower = aiText.toLowerCase()
            if (VOICE_CONFIG.TRANSITION_PHRASES.some(p => lower.includes(p))) {
              advanceRef.current?.()
            }
          }
          currentAiTranscriptRef.current = ''
          break
        }

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          if (data.delta) {
            try {
              audioQueueRef.current.push(base64ToArrayBuffer(data.delta))
              playNextAudio()
            } catch {
              /* skip */
            }
          }
          break

        case 'response.done':
          setIsSpeaking(false)
          break
        case 'error':
          setError(data.error?.message || 'An error occurred')
          break
      }
    },
    [playNextAudio, appendConversation]
  )

  messageHandlerRef.current = handleWsMessage

  // --- Full disconnect ---
  const disconnect = useCallback(() => {
    stopMicrophone()
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current)
      greetingTimeoutRef.current = null
    }
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch {
        /* ok */
      }
      currentSourceRef.current = null
    }
    audioQueueRef.current = []
    isPlayingRef.current = false
    wsRef.current?.close()
    wsRef.current = null
    if (playbackCtxRef.current?.state !== 'closed') playbackCtxRef.current?.close()
    playbackCtxRef.current = null
  }, [stopMicrophone])

  // --- Public API ---
  const startConversation = useCallback(async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    playbackCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: VOICE_CONFIG.SAMPLE_RATE
    })
    await playbackCtxRef.current.resume()
    await connect()
    await startMicrophone()
  }, [connect, startMicrophone])

  const endConversation = useCallback(async () => {
    disconnect()
    setPhase('compiling')
    if (!(await saveCurrentTranscript())) {
      setPhase('active')
      return
    }
    if (sessionIdRef.current) {
      try {
        const response = await authFetch('/api/voice/end-session', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionIdRef.current })
        })
        if (!response.ok) throw new Error('Could not finish the session')
      } catch {
        setError(
          'Your transcript is saved, but the interview could not be finished. Please try again.'
        )
        setPhase('active')
        return
      }
    }
    setPhase('ended')
  }, [disconnect, conversationHistory, saveCurrentTranscript, authFetch])

  const resetError = useCallback(async () => {
    if (!(await saveCurrentTranscript())) return
    setError(null)
    setPhase('ready')
    hasStartedRef.current = false
  }, [saveCurrentTranscript])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void saveTranscriptRef.current?.()
      disconnect()
    }
  }, [disconnect])

  return {
    phase,
    isRecording,
    isSpeechDetected,
    isSpeaking,
    error,
    question,
    questionIndex,
    questionsAnswered,
    stream: streamRef.current,
    startConversation,
    endConversation,
    resetError,
    chapter
  }
}

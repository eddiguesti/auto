import { useState, useEffect, useRef, useCallback } from 'react'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { AudioVisualizer } from '../AudioVisualizer'
import { Button } from '../ui'

/**
 * OnboardingVoiceInterview - Real-time voice interview with Clio using xAI Grok
 *
 * Architecture:
 * - Single WebSocket connection to xAI Realtime API
 * - PCM16 audio at 24kHz for both input and output
 * - Server-side VAD (Voice Activity Detection) for turn detection
 * - Microphone muted during AI speech to prevent echo/feedback loops
 *
 * Audio Flow:
 * 1. Microphone → AudioWorklet → PCM16 → Base64 → WebSocket
 * 2. WebSocket → Base64 → PCM16 → Float32 → AudioContext → Speakers
 */
export default function OnboardingVoiceInterview({ onComplete, onBack }) {
  const { authFetch, token: jwtToken } = useAuth()
  const { getPaceSettings, getVoice } = useSettings()

  // ============================================
  // State
  // ============================================
  const [status, setStatus] = useState('Initializing...')
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [error, setError] = useState(null)
  // Track whether Clio has confirmed the user's details
  const [infoConfirmed, setInfoConfirmed] = useState(false)

  // ============================================
  // Refs
  // ============================================
  const wsRef = useRef(null)
  const playbackContextRef = useRef(null)
  const recordingContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentTranscriptRef = useRef('')
  const initStartedRef = useRef(false)
  const greetingSentRef = useRef(false)
  const micMutedRef = useRef(false)
  const unmountedRef = useRef(false)
  const timeoutsRef = useRef([])
  const responseInProgressRef = useRef(false) // Prevent overlapping responses
  const conversationRef = useRef([]) // Mirror of conversationHistory for callbacks
  const playbackCancelledRef = useRef(false) // Allows interrupting audio playback
  const currentSourceRef = useRef(null) // Reference to current audio buffer source

  // Keep conversationRef in sync
  useEffect(() => {
    conversationRef.current = conversationHistory
  }, [conversationHistory])

  // Show Continue button after Clio has confirmed details (8+ messages = 4 full exchanges)
  useEffect(() => {
    if (!infoConfirmed && conversationHistory.length >= 8) {
      setInfoConfirmed(true)
    }
  }, [conversationHistory.length, infoConfirmed])

  // ============================================
  // Utility: Safe Timeout (auto-cleanup on unmount)
  // ============================================
  const safeTimeout = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      if (!unmountedRef.current) fn()
    }, ms)
    timeoutsRef.current.push(id)
    return id
  }, [])

  // ============================================
  // Audio Conversion
  // ============================================
  const base64ToArrayBuffer = useCallback(base64 => {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }, [])

  const arrayBufferToBase64 = useCallback(buffer => {
    const bytes = new Uint8Array(buffer)
    const len = bytes.length
    const chunks = []
    // Process in chunks to avoid call stack issues with large buffers
    for (let i = 0; i < len; i += 8192) {
      chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)))
    }
    return btoa(chunks.join(''))
  }, [])

  // ============================================
  // Audio Context Factory (with error handling)
  // ============================================
  const createAudioContext = useCallback((sampleRate = 24000) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported')
      }
      return new AudioContextClass({ sampleRate })
    } catch (err) {
      console.error('[Audio] Failed to create AudioContext:', err)
      throw err
    }
  }, [])

  // ============================================
  // Audio Playback Queue Processor
  // ============================================
  const stopPlayback = useCallback(() => {
    // Signal to stop - the playback loop will check this flag
    playbackCancelledRef.current = true
    // Clear queued audio
    audioQueueRef.current = []
    // Stop currently playing audio source
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch (e) {
        // Source may have already stopped
      }
      currentSourceRef.current = null
    }
    // NOTE: Do NOT set isPlayingRef.current = false here!
    // The playback loop's finally block will do that when it actually exits.
    // Setting it here causes a race condition where a new loop starts
    // while the old loop is still running.
  }, [])

  const processAudioQueue = useCallback(async () => {
    // CRITICAL: Atomic check-and-set to prevent race condition
    // Multiple audio deltas arrive rapidly - without this, multiple playback loops can start
    if (isPlayingRef.current || unmountedRef.current) return
    if (audioQueueRef.current.length === 0) return

    // Set IMMEDIATELY before any async work to prevent race condition
    isPlayingRef.current = true
    playbackCancelledRef.current = false
    micMutedRef.current = true
    setIsSpeaking(true)

    try {
      // Ensure playback context
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = createAudioContext(24000)
      }
      if (playbackContextRef.current.state === 'suspended') {
        await playbackContextRef.current.resume()
      }

      // Process queue until empty or cancelled
      while (
        audioQueueRef.current.length > 0 &&
        !unmountedRef.current &&
        !playbackCancelledRef.current
      ) {
        const audioData = audioQueueRef.current.shift()

        try {
          const pcm16 = new Int16Array(audioData)
          const float32 = new Float32Array(pcm16.length)

          for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0
          }

          const buffer = playbackContextRef.current.createBuffer(1, float32.length, 24000)
          buffer.getChannelData(0).set(float32)

          const source = playbackContextRef.current.createBufferSource()
          source.buffer = buffer
          source.connect(playbackContextRef.current.destination)
          currentSourceRef.current = source

          await new Promise(resolve => {
            source.onended = resolve
            source.start()
          })

          currentSourceRef.current = null
        } catch (err) {
          console.error('[Audio] Chunk playback error:', err)
        }
      }
    } finally {
      currentSourceRef.current = null
      isPlayingRef.current = false
      if (!unmountedRef.current) {
        setIsSpeaking(false)
        // Delay unmuting to avoid echo from speaker residual
        safeTimeout(() => {
          micMutedRef.current = false
        }, 300)
        // If new audio arrived while we were stopping, process it
        if (audioQueueRef.current.length > 0 && !playbackCancelledRef.current) {
          // Use setTimeout to avoid immediate recursion
          safeTimeout(() => processAudioQueue(), 0)
        }
      }
    }
  }, [createAudioContext, safeTimeout])

  // ============================================
  // WebSocket Message Handler
  // ============================================
  const handleMessage = useCallback(
    (data, ws) => {
      if (unmountedRef.current) return

      switch (data.type) {
        case 'session.created':
          console.log('[WS] Session created')
          break

        case 'session.updated':
          console.log('[WS] Session configured')
          // Only send greeting once and if no response is in progress
          if (
            !greetingSentRef.current &&
            !responseInProgressRef.current &&
            ws?.readyState === WebSocket.OPEN
          ) {
            greetingSentRef.current = true
            responseInProgressRef.current = true
            ws.send(JSON.stringify({ type: 'response.create' }))
          }
          break

        case 'response.created':
          console.log('[WS] Response started')
          // Clear any pending audio from a previous response to prevent overlap
          audioQueueRef.current = []
          responseInProgressRef.current = true
          break

        case 'input_audio_buffer.speech_started':
          // User started speaking - stop Clio's playback immediately (interruption)
          stopPlayback()
          setIsListening(true)
          setStatus('Listening...')
          break

        case 'input_audio_buffer.speech_stopped':
          setIsListening(false)
          setStatus('Processing...')
          break

        case 'conversation.item.input_audio_transcription.completed':
          if (data.transcript) {
            setTranscript(data.transcript)
            setConversationHistory(prev => [...prev, { role: 'user', content: data.transcript }])
          }
          break

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
          if (data.delta) {
            currentTranscriptRef.current += data.delta
            setAiTranscript(currentTranscriptRef.current)
            setStatus('Clio is speaking...')
          }
          break

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          if (currentTranscriptRef.current) {
            setConversationHistory(prev => [
              ...prev,
              { role: 'assistant', content: currentTranscriptRef.current }
            ])
          }
          currentTranscriptRef.current = ''
          setAiTranscript('')
          break

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          if (data.delta) {
            try {
              audioQueueRef.current.push(base64ToArrayBuffer(data.delta))
              processAudioQueue()
            } catch (err) {
              console.error('[Audio] Decode error:', err)
            }
          }
          break

        case 'response.done':
          console.log('[WS] Response complete')
          responseInProgressRef.current = false
          setStatus('Your turn - speak now')
          break

        case 'error':
          console.error('[WS] API Error:', data.error)
          responseInProgressRef.current = false
          setError(data.error?.message || 'An error occurred')
          break

        case 'response.cancelled':
          console.log('[WS] Response cancelled')
          responseInProgressRef.current = false
          break

        default:
          // Ignore unknown message types (rate_limits, etc.)
          break
      }
    },
    [base64ToArrayBuffer, processAudioQueue, stopPlayback]
  )

  // ============================================
  // Microphone Initialization
  // ============================================
  const initMicrophone = useCallback(
    async ws => {
      if (unmountedRef.current) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })

        if (unmountedRef.current) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        recordingContextRef.current = createAudioContext(24000)

        await recordingContextRef.current.audioWorklet.addModule('/audio-processor.js')

        const source = recordingContextRef.current.createMediaStreamSource(stream)
        const workletNode = new AudioWorkletNode(recordingContextRef.current, 'audio-processor')

        workletNode.port.onmessage = event => {
          if (unmountedRef.current) return
          if (micMutedRef.current) return
          if (event.data.type !== 'audio') return
          if (ws?.readyState !== WebSocket.OPEN) return

          ws.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: arrayBufferToBase64(event.data.audio)
            })
          )
        }

        source.connect(workletNode)
        workletNodeRef.current = workletNode

        console.log('[Mic] Ready')
      } catch (err) {
        console.error('[Mic] Error:', err)
        if (!unmountedRef.current) {
          setError('Microphone access required. Please allow and try again.')
        }
      }
    },
    [arrayBufferToBase64, createAudioContext]
  )

  // ============================================
  // Main Initialization
  // ============================================
  const initialize = useCallback(async () => {
    if (initStartedRef.current || unmountedRef.current) return
    initStartedRef.current = true

    try {
      setStatus('Connecting...')
      setError(null)

      // Pre-create playback context (needs user gesture on some browsers)
      playbackContextRef.current = createAudioContext(24000)
      await playbackContextRef.current.resume()

      if (!jwtToken) throw new Error('Not authenticated')
      if (unmountedRef.current) return

      // Connect via server-side proxy (handles xAI auth with API key)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/voice/ws?token=${jwtToken}`
      )

      // Connection timeout (10 seconds)
      const connectionTimeout = safeTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          if (!unmountedRef.current) {
            setError('Connection timeout. Please try again.')
            setStatus('Connection failed')
            initStartedRef.current = false
          }
        }
      }, 10000)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        if (unmountedRef.current) {
          ws.close()
          return
        }

        console.log('[WS] Connected')
        setIsConnected(true)
        setStatus('Connected!')

        // Configure session
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are Clio. Warm, casual young English woman.

Script — follow exactly, one question at a time:
1. "Hi! I'm Clio. What's your name?"
2. "Lovely! Where were you born — city or town?"
3. "And what year were you born?"
4. "So you're [name], born in [place] in [year] — right?"
If yes: "Perfect! Hit continue on your screen."
If no: fix and re-confirm.
After confirmation: only say "Just press continue!" if they keep talking.

Keep every response under 15 words. Never break character.`,
              voice: getVoice(),
              temperature: 0.5,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                silence_duration_ms: 3000,
                threshold: 0.55,
                prefix_padding_ms: 600
              }
            }
          })
        )
      }

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data, ws)
        } catch (err) {
          console.error('[WS] Parse error:', err)
        }
      }

      ws.onerror = () => {
        clearTimeout(connectionTimeout)
        console.error('[WS] Connection error')
        if (!unmountedRef.current) {
          setError('Connection error. Please try again.')
          setIsConnected(false)
        }
      }

      ws.onclose = event => {
        clearTimeout(connectionTimeout)
        console.log('[WS] Closed:', event.code)
        if (!unmountedRef.current) {
          setIsConnected(false)
        }
      }

      wsRef.current = ws
      await initMicrophone(ws)
    } catch (err) {
      console.error('[Init] Error:', err)
      if (!unmountedRef.current) {
        setError(err.message || 'Failed to connect')
        setStatus('Connection failed')
      }
      initStartedRef.current = false
      greetingSentRef.current = false
    }
  }, [authFetch, createAudioContext, handleMessage, initMicrophone, safeTimeout])

  // ============================================
  // Cleanup
  // ============================================
  const cleanup = useCallback(() => {
    // Clear all pending timeouts
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    // Stop any current audio playback
    playbackCancelledRef.current = true
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch (e) {
        // Source may have already stopped
      }
      currentSourceRef.current = null
    }

    // Stop microphone
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    // Disconnect audio worklet
    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null

    // Close audio contexts
    if (recordingContextRef.current?.state !== 'closed') {
      recordingContextRef.current?.close().catch(() => {})
    }
    recordingContextRef.current = null

    if (playbackContextRef.current?.state !== 'closed') {
      playbackContextRef.current?.close().catch(() => {})
    }
    playbackContextRef.current = null

    // Close WebSocket (handle both OPEN and CONNECTING states)
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close()
    }
    wsRef.current = null

    // Reset playback state (but NOT initStartedRef/greetingSentRef - those prevent double-init in StrictMode)
    audioQueueRef.current = []
    micMutedRef.current = false
    responseInProgressRef.current = false
    currentTranscriptRef.current = ''
    isPlayingRef.current = false
  }, [])

  // ============================================
  // Action Handlers
  // ============================================
  const handleContinue = useCallback(() => {
    cleanup()
    // Pass transcripts — channels will be selected in the next step
    onComplete(conversationRef.current)
  }, [cleanup, onComplete])

  const handleRetry = useCallback(() => {
    cleanup()
    // Reset init guards so we can re-initialize
    initStartedRef.current = false
    greetingSentRef.current = false
    setError(null)
    setConversationHistory([])
    setTranscript('')
    setAiTranscript('')
    initialize()
  }, [cleanup, initialize])

  // ============================================
  // Lifecycle
  // ============================================
  useEffect(() => {
    unmountedRef.current = false
    initialize()

    return () => {
      unmountedRef.current = true
      cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] relative">
      {/* Error */}
      {error ? (
        <div className="text-center max-w-sm mx-auto">
          <div className="mb-5 p-4 bg-error-soft text-error-strong rounded-xl text-sm text-left flex items-center gap-3">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
          <Button size="lg" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Visualizer */}
          <div className="flex-1 flex items-center justify-center">
            <AudioVisualizer
              stream={streamRef.current}
              isActive={isConnected}
              isSpeaking={isSpeaking}
              isSpeechDetected={isListening}
              size="lg"
            />
          </div>

          {/* Minimal status */}
          <p className="text-sepia-500 text-base mt-2 mb-4">
            {isSpeaking
              ? 'Clio'
              : isListening
                ? 'Listening...'
                : isConnected
                  ? 'Your turn'
                  : 'Connecting...'}
          </p>

          {/* Continue button — appears after Clio confirms user's details */}
          {infoConfirmed && (
            <Button size="lg" onClick={handleContinue}>
              Continue
            </Button>
          )}
        </>
      )}
    </div>
  )
}

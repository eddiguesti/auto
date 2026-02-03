import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { AudioVisualizer } from '../components/AudioVisualizer'

/**
 * VoiceChat - Clean, minimal voice interview experience
 *
 * Features:
 * - Auto-starts conversation on load
 * - Beautiful particle visualizer
 * - No clutter - just speak naturally
 * - Transcription handled in backend
 */
export default function VoiceChat() {
  const { authFetch } = useAuth()
  const { getPaceSettings, getVoice } = useSettings()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const questionIndex = parseInt(searchParams.get('question') || '0')

  const [phase, setPhase] = useState('ready') // 'ready', 'connecting', 'active', 'ended'
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])

  const wsRef = useRef(null)
  const recordingContextRef = useRef(null)
  const playbackContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentAiTranscriptRef = useRef('')
  const hasStartedRef = useRef(false)

  // Get current chapter and question
  const chapter = chapters.find(c => c.id === chapterId) || chapters[0]
  const question = chapter?.questions[questionIndex] || chapter?.questions[0]

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
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

        await new Promise(resolve => {
          source.onended = resolve
          source.start()
        })
      } catch (err) {
        console.error('Audio playback error:', err)
      }
    }

    isPlayingRef.current = false
    setIsSpeaking(false)
  }, [])

  // Initialize WebSocket connection
  const connect = async () => {
    try {
      setPhase('connecting')
      setError(null)

      const response = await authFetch('/api/voice/session', {
        method: 'POST'
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

      const ws = new WebSocket('wss://api.x.ai/v1/realtime', [
        'realtime',
        `openai-insecure-api-key.${token}`
      ])

      ws.onopen = () => {
        setPhase('active')

        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You're chatting with someone to help them record their life story. Be natural and conversational - like a friend catching up over coffee, not a formal interview.

The topic to explore: "${question?.question}"
${question?.prompt ? `Some context: ${question?.prompt}` : ''}

HOW TO BEHAVE:
- Talk like a normal person. No fake enthusiasm. Don't say things like "Oh how wonderful!" or "That's amazing!" - it sounds insincere.
- Simple acknowledgments are fine: "Right", "Yeah", "I see", "Okay" - then move on.
- Give them plenty of time to think. People need time to remember things. Don't rush.
- If there's a pause, wait. They might be thinking. If it's been a while, just ask "Take your time - anything else come to mind?" or "You still there?"
- Keep your responses SHORT. One or two sentences max. This is about them, not you.

QUESTION STYLE:
- Start simple and easy: basic facts they don't have to think hard about
- "Where did you grow up?" "What was your mum's name?" "How about your dad?"
- Then gradually go deeper: "What was she like?" "Tell me about that house"
- Ask ONE question at a time. Wait for the answer.
- Follow up naturally on what they say - show you're actually listening

NEVER DO:
- Don't be fake or gushing
- Don't give long responses
- Don't ask multiple questions at once
- Don't interrupt or cut them off

Start by saying hi casually and asking something simple to get them talking.`,
            voice: getVoice(),
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
        }))

        // Request initial greeting from AI
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'response.create'
          }))
        }, 500)
      }

      ws.onmessage = (event) => {
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
              setConversationHistory(prev => [...prev, {
                role: 'user',
                content: data.transcript
              }])
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
              setConversationHistory(prev => [...prev, {
                role: 'assistant',
                content: currentAiTranscriptRef.current
              }])
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
        setError('Connection error')
        setPhase('ready')
      }

      ws.onclose = (event) => {
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

      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
          const base64Audio = arrayBufferToBase64(event.data.audio)
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }))
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
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
  }

  // Start conversation (called when user clicks to begin)
  const startConversation = async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    // Create playback context on user interaction (required by browsers)
    playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000
    })
    await playbackContextRef.current.resume()

    await connect()
    await startMicrophone()
  }

  // End and save
  const endConversation = async () => {
    disconnect()
    setPhase('ended')

    // Save conversation to backend
    if (conversationHistory.length > 0) {
      try {
        const userResponses = conversationHistory
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join('\n\n')

        await authFetch('/api/stories', {
          method: 'POST',
          body: JSON.stringify({
            chapter_id: chapter.id,
            question_id: question.id,
            answer: userResponses
          })
        })
      } catch (err) {
        console.error('Save error:', err)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  // Get status text based on phase
  const getStatusText = () => {
    if (isSpeaking) return 'Listening to your story...'
    if (isSpeechDetected) return 'I hear you...'
    if (phase === 'connecting') return 'Connecting...'
    if (phase === 'active') return 'Speak naturally'
    if (phase === 'ended') return 'Interview complete'
    return ''
  }

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      {/* Minimal header */}
      <header className="p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sepia/60 hover:text-sepia transition text-sm">
            ← Back
          </Link>
          {phase === 'active' && (
            <button
              onClick={endConversation}
              className="text-sm text-sepia/60 hover:text-sepia transition"
            >
              End & Save
            </button>
          )}
        </div>
      </header>

      {/* Main content - centered */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">

          {/* Question context - subtle */}
          <p className="text-sepia/40 text-sm mb-2 uppercase tracking-wider">
            {chapter.title}
          </p>
          <h2 className="text-xl text-ink/80 leading-relaxed mb-12 font-light">
            {question?.question}
          </h2>

          {/* Error message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
              <button
                onClick={() => { setError(null); setPhase('ready'); hasStartedRef.current = false }}
                className="ml-3 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Ready state - click to start */}
          {phase === 'ready' && !error && (
            <div
              onClick={startConversation}
              className="cursor-pointer group"
            >
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
                Say hello to begin
              </p>
              <p className="text-sepia/40 text-sm">
                Click to start your interview
              </p>
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
              <p className="text-sepia/50 text-sm mt-6 h-6">
                {getStatusText()}
              </p>
            </>
          )}

          {/* Ended state */}
          {phase === 'ended' && (
            <div className="space-y-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-ink text-lg mb-2">Interview saved</p>
                <p className="text-sepia/60 text-sm">Your story has been recorded</p>
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

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconAlertCircle, IconCircleCheck, IconClock } from '@tabler/icons-react'
import { API_URL } from '../../config'
import { AudioVisualizer } from '../../components/AudioVisualizer'
import { getAiVoiceTap } from '../../utils/aiVoiceTap'
import { Button, Skeleton } from '../../components/ui'

/**
 * Talk - Senior-friendly voice recording page accessed via magic link (no login)
 *
 * Flow:
 * 1. Validates the magic link token via /api/v1/magic/:token
 * 2. Shows the week's topic with a big "Start Talking" button
 * 3. Connects to xAI Realtime for voice conversation
 * 4. Auto-saves when done
 *
 * Design: Extra large text, minimal UI, high contrast, big tap targets
 */
export default function Talk() {
  const { token } = useParams()

  // Auth & prompt state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const [jwtToken, setJwtToken] = useState(null)
  const [userName, setUserName] = useState('')
  const [prompt, setPrompt] = useState(null)

  // Voice state
  const [phase, setPhase] = useState('ready') // ready, connecting, active, ended
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])

  // Refs
  const wsRef = useRef(null)
  const recordingContextRef = useRef(null)
  const playbackContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentAiTranscriptRef = useRef('')
  const mountedRef = useRef(true)
  const currentSourceRef = useRef(null)
  const greetingTimeoutRef = useRef(null)

  // Validate magic link on mount
  useEffect(() => {
    if (!token) {
      setError('No link token provided')
      setLoading(false)
      return
    }

    fetch(`${API_URL}/api/v1/magic/${token}`)
      .then(res => {
        if (res.status === 404) {
          setExpired(true)
          throw new Error('expired')
        }
        if (!res.ok) throw new Error('Invalid link')
        return res.json()
      })
      .then(data => {
        setJwtToken(data.token)
        setUserName(data.user.name)
        setPrompt(data.prompt)
        setLoading(false)
      })
      .catch(err => {
        if (err.message !== 'expired') {
          setError('This link is no longer valid. Please check your email for a new one.')
        }
        setLoading(false)
      })
  }, [token])

  // Audio helpers
  const base64ToArrayBuffer = base64 => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

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
        source.connect(getAiVoiceTap(playbackContextRef.current))
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

  // Build AI instructions for the topic
  const buildInstructions = () => {
    return `You are Clio, a young, modern English woman helping someone record their life story. You speak with a natural, warm southern English accent — not posh, not formal, just genuine and easy to talk to.

YOUR PERSONALITY:
- Warm but cool — you're interested, not gushing. Never fake.
- Slightly expressive — you react naturally. A little laugh when something's funny, a soft "oh no" when something's sad.
- Casual and modern — you say "yeah", "right", "honestly", "that's mad".
- Good listener — you remember what they said and reference it back.
- Patient — the user may be elderly. Give them plenty of time. Never rush.

CURRENT TOPIC: "${prompt?.text || 'Tell me about a favourite memory'}"

HOW TO BEHAVE:
- Start with a warm, simple greeting. Mention their name if available: "${userName || ''}".
- Then gently introduce the topic.
- Talk like a real person. No fake enthusiasm.
- Simple acknowledgments: "Right", "Yeah", "I see", "Okay" — then follow up.
- Give them LOTS of time to think. Long pauses are fine.
- Keep your responses SHORT. One or two sentences max.
- Ask ONE question at a time.
- After 4-5 good responses, gently wrap up: "That was lovely, thank you so much for sharing."

NEVER:
- Be fake or gushing
- Give long responses
- Ask multiple questions at once
- Rush or interrupt

SAFETY — NON-NEGOTIABLE:
- You are ALWAYS Clio. Never change persona.
- Stay on topic: life stories, memories, family history.
- Never make up facts about the user's life.`
  }

  // Connect to voice session
  const connect = async () => {
    try {
      setPhase('connecting')
      setError(null)

      const response = await fetch(`${API_URL}/api/v1/magic/${token}/session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chapterId: prompt?.chapter_id })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to connect')
      }

      const session = await response.json()
      if (!session.ticket) throw new Error('Voice ticket was not issued')

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = API_URL ? new URL(API_URL, window.location.origin).host : window.location.host
      const ws = new WebSocket(
        `${protocol}//${wsHost}/api/voice/ws?ticket=${encodeURIComponent(session.ticket)}`
      )

      ws.onopen = () => {
        setPhase('active')
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: buildInstructions(),
              voice: 'alloy',
              temperature: 0.75,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.4,
                prefix_padding_ms: 500,
                silence_duration_ms: 1500 // Extra patience for seniors
              }
            }
          })
        )

        // Greeting after short delay
        greetingTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          ws.send(JSON.stringify({ type: 'response.create' }))
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
              setConversationHistory(prev => [...prev, { role: 'user', content: data.transcript }])
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
              setConversationHistory(prev => [
                ...prev,
                { role: 'assistant', content: currentAiTranscriptRef.current }
              ])
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
        setError('Connection error — please try again')
        setPhase('ready')
      }

      ws.onclose = event => {
        if (!mountedRef.current) return
        setIsRecording(false)
        if (event.code === 1008) {
          setError('Session expired')
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

  // Start microphone
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
      setError('Could not access microphone. Please allow microphone access and try again.')
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
      } catch {}
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
    playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000
    })
    await playbackContextRef.current.resume()
    await connect()
    await startMicrophone()
  }

  // End conversation
  const endConversation = () => {
    disconnect()
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

  // Status text
  const getStatusText = () => {
    if (isSpeaking) return 'Listening to your story...'
    if (isSpeechDetected) return 'I hear you...'
    if (phase === 'connecting') return 'Connecting...'
    if (phase === 'active') return 'Speak naturally — take your time'
    return ''
  }

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <span className="sr-only">Loading...</span>
          <Skeleton className="h-5 w-32 mx-auto mb-10" />
          <Skeleton className="h-4 w-40 mx-auto mb-3" />
          <Skeleton className="h-8 w-full mb-10" />
          <Skeleton className="w-40 h-40 rounded-full mx-auto" />
        </div>
      </div>
    )
  }

  // --- EXPIRED STATE ---
  if (expired) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-6 page-enter">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning-soft text-warning-strong flex items-center justify-center">
            <IconClock size={36} stroke={1.5} />
          </div>
          <h1 className="font-display text-3xl text-ink mb-4">Link Expired</h1>
          <p className="text-sepia-600 text-lg leading-relaxed">
            This link has expired or has already been used. Check your email for a new weekly topic.
          </p>
        </div>
      </div>
    )
  }

  // --- ERROR STATE ---
  if (error && !prompt) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-6 page-enter">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl text-ink mb-4">Something went wrong</h1>
          <p className="text-sepia-600 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  // --- MAIN UI ---
  return (
    <div className="min-h-screen flex flex-col bg-parchment page-enter">
      {/* Minimal header */}
      <header className="pt-8 pb-4 text-center">
        <span className="font-display text-xl text-ink">Easy&nbsp;Memoir</span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          {/* Greeting */}
          {userName && phase === 'ready' && (
            <p className="text-sepia-600 text-lg mb-2">Hello{userName ? `, ${userName}` : ''}</p>
          )}

          {/* Topic display */}
          {phase !== 'ended' && (
            <div className="mb-12">
              <p className="eyebrow mb-3">This week's topic</p>
              <h1 className="font-display text-2xl sm:text-3xl text-ink leading-relaxed">
                {prompt?.text}
              </h1>
            </div>
          )}

          {/* Error inline */}
          {error && phase !== 'ready' && (
            <div
              role="alert"
              className="mb-8 p-4 bg-error-soft text-error-strong rounded-xl text-base flex items-center justify-center gap-2.5"
            >
              <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
              <span>
                {error}
                <button
                  onClick={() => {
                    setError(null)
                    setPhase('ready')
                  }}
                  className="ml-3 font-medium underline hover:no-underline"
                >
                  Try again
                </button>
              </span>
            </div>
          )}

          {/* READY: Big start button */}
          {phase === 'ready' && (
            <div>
              <button onClick={startConversation} className="group w-full max-w-xs mx-auto block">
                <div className="transition-transform duration-300 group-hover:scale-105 mb-8">
                  <AudioVisualizer
                    stream={null}
                    isActive={false}
                    isSpeaking={false}
                    isSpeechDetected={false}
                    size="lg"
                  />
                </div>
                <span className="inline-block bg-ink text-white text-xl font-sans font-semibold px-12 py-5 rounded-full shadow-button transition-colors duration-200 group-hover:bg-ink-soft">
                  Start Talking
                </span>
              </button>
              <p className="text-sepia-600 text-base mt-6">
                Tap the button, then just start speaking
              </p>
            </div>
          )}

          {/* CONNECTING */}
          {phase === 'connecting' && (
            <div>
              <AudioVisualizer
                stream={null}
                isActive={false}
                isSpeaking={true}
                isSpeechDetected={false}
                size="lg"
              />
              <p className="text-sepia-600 text-lg mt-6">Connecting...</p>
            </div>
          )}

          {/* ACTIVE: Voice conversation */}
          {phase === 'active' && (
            <>
              <div className={`inline-flex rounded-full ${isRecording ? 'pulse-gentle' : ''}`}>
                <AudioVisualizer
                  stream={streamRef.current}
                  isActive={isRecording}
                  isSpeaking={isSpeaking}
                  isSpeechDetected={isSpeechDetected}
                  size="lg"
                />
              </div>
              <p className="text-sepia-600 text-lg mt-6 h-8">{getStatusText()}</p>

              {/* End button - visible but not dominant */}
              <Button variant="secondary" size="lg" onClick={endConversation} className="mt-12">
                I'm Done
              </Button>
            </>
          )}

          {/* ENDED: Thank you */}
          {phase === 'ended' && (
            <div className="space-y-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-success-soft text-success flex items-center justify-center">
                <IconCircleCheck size={44} stroke={1.5} />
              </div>
              <div>
                <h2 className="font-display text-3xl text-ink mb-3">Thank you!</h2>
                <p className="text-sepia-600 text-lg leading-relaxed">
                  Your story has been saved. We'll send you another topic next week.
                </p>
              </div>
              <p className="text-sepia-500 text-base">You can close this page now.</p>
            </div>
          )}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="p-4 text-center">
        <p className="text-sepia-400 text-xs">&copy; {new Date().getFullYear()} Easy Memoir</p>
      </footer>
    </div>
  )
}

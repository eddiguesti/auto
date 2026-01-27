import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapters } from '../data/chapters'

export default function VoiceChat() {
  const [searchParams] = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const questionIndex = parseInt(searchParams.get('question') || '0')

  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('Ready to start')
  const [transcript, setTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const recordingContextRef = useRef(null)
  const playbackContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const currentAiTranscriptRef = useRef('')

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

    // Create or resume playback context
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
        // Convert PCM16 to Float32
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
      setStatus('Connecting...')
      setError(null)

      // Get ephemeral token from server
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || 'Failed to get voice session')
      }

      const session = await response.json()
      console.log('Session response:', session)

      // Get the token from the response (xAI returns { value: "...", expires_at: ... })
      const token = session.value || session.client_secret?.value || session.token
      if (!token) {
        throw new Error('No authentication token received')
      }

      // Connect to xAI WebSocket with ephemeral token
      // Note: xAI realtime API uses the default voice model
      console.log('Connecting to WebSocket with token:', token.substring(0, 20) + '...')
      const ws = new WebSocket('wss://api.x.ai/v1/realtime', [
        'realtime',
        `openai-insecure-api-key.${token}`
      ])

      ws.onopen = () => {
        setIsConnected(true)
        setStatus('Connected - setting up...')
        console.log('WebSocket connected')

        // Configure session with instructions
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a warm, friendly interviewer helping someone write their autobiography. You're currently asking about: "${question?.text}"

Context: ${question?.prompt}

Your job is to:
1. Ask the question in a conversational, gentle way
2. Listen to their response
3. Ask thoughtful follow-up questions to draw out more details
4. Be encouraging but not overly enthusiastic
5. Focus on sensory details - what they saw, heard, felt
6. Keep your responses brief (2-3 sentences max)

Start by warmly greeting them and asking the first question. Remember, this is their story - you're just helping them tell it.`,
            voice: 'Ara', // xAI voice options: Ara, Eve, Leo
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,           // Higher = needs louder speech to trigger
              prefix_padding_ms: 500,   // More padding before speech
              silence_duration_ms: 2500 // 2.5 seconds of silence before AI responds
            }
          }
        }))

        // Request initial response (AI greeting)
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'response.create'
          }))
        }, 500)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        // Log all messages for debugging
        console.log('WS message:', data.type)
        if (data.type.includes('audio') || data.type.includes('transcript') || data.type.includes('error')) {
          console.log('Details:', JSON.stringify(data).substring(0, 200))
        }

        switch (data.type) {
          case 'session.created':
            setStatus('Session created')
            break

          case 'session.updated':
            setStatus('Waiting for AI...')
            break

          case 'input_audio_buffer.speech_started':
            setIsSpeechDetected(true)
            setStatus('Listening to you...')
            break

          case 'input_audio_buffer.speech_stopped':
            setIsSpeechDetected(false)
            setStatus('Thinking... (pause 2.5s to finish)')
            break

          case 'conversation.item.input_audio_transcription.completed':
            if (data.transcript) {
              setTranscript(data.transcript)
              setConversationHistory(prev => [...prev, {
                role: 'user',
                content: data.transcript
              }])
            }
            break

          // Handle both OpenAI and xAI message formats
          case 'response.audio_transcript.delta':
          case 'response.output_audio_transcript.delta':
            if (data.delta) {
              currentAiTranscriptRef.current += data.delta
              setAiTranscript(currentAiTranscriptRef.current)
              setStatus('AI is speaking...')
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
            setAiTranscript('')
            break

          case 'response.audio.delta':
          case 'response.output_audio.delta':
            if (data.delta) {
              console.log('Received audio chunk, length:', data.delta.length)
              try {
                const audioData = base64ToArrayBuffer(data.delta)
                console.log('Decoded audio bytes:', audioData.byteLength)
                audioQueueRef.current.push(audioData)
                playNextAudio()
              } catch (err) {
                console.error('Failed to decode audio:', err)
              }
            }
            break

          case 'response.audio.done':
          case 'response.output_audio.done':
            console.log('Audio response complete')
            break

          case 'response.done':
            setIsSpeaking(false)
            setStatus('YOUR TURN - speak now (take your time)')
            break

          case 'error':
            console.error('WebSocket error:', data.error)
            setError(data.error?.message || JSON.stringify(data.error) || 'An error occurred')
            break

          default:
            // Log unhandled message types for debugging
            if (!['response.created', 'response.output_item.added', 'response.content_part.added',
                  'response.output_item.done', 'response.content_part.done', 'rate_limits.updated',
                  'input_audio_buffer.committed', 'input_audio_buffer.cleared', 'conversation.item.created'].includes(data.type)) {
              console.log('Unhandled message type:', data.type)
            }
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
        setError('Connection error - check console')
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsRecording(false)
        // Show more helpful error message based on close code
        if (event.code === 1008) {
          setError('Authentication failed - check API key')
        } else if (event.code === 1006) {
          setError('Connection lost unexpectedly')
        } else if (event.reason) {
          setError(`Disconnected: ${event.reason}`)
        }
        setStatus('Disconnected')
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message)
      setStatus('Connection failed')
    }
  }

  // Start microphone capture
  const startMicrophone = async () => {
    try {
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      console.log('Microphone access granted')
      streamRef.current = stream
      setIsRecording(true)

      // Create recording context
      recordingContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })

      await recordingContextRef.current.audioWorklet.addModule('/audio-processor.js')
      console.log('Audio worklet loaded')

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
      console.log('Microphone connected and sending audio')
    } catch (err) {
      console.error('Microphone error:', err)
      setError('Could not access microphone: ' + err.message)
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

  // Disconnect
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
    setIsConnected(false)
    setIsRecording(false)
    setIsSpeechDetected(false)
    setStatus('Disconnected')
  }

  // Start conversation
  const startConversation = async () => {
    // Create playback context on user interaction (required by browsers)
    playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000
    })
    await playbackContextRef.current.resume()
    console.log('Playback context created and resumed')

    await connect()
    await startMicrophone()
  }

  // Save the conversation and answers
  const saveConversation = async () => {
    if (conversationHistory.length === 0) return

    try {
      // Combine all user responses
      const userResponses = conversationHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n')

      // Save to database
      await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapter.id,
          questionId: question.id,
          answer: userResponses
        })
      })

      setStatus('Saved!')
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  // Determine button color
  const getButtonColor = () => {
    if (isSpeechDetected) return 'bg-green-500 scale-110'
    if (isSpeaking) return 'bg-blue-500 animate-pulse'
    if (isRecording) return 'bg-red-500'
    return 'bg-sepia hover:bg-sepia/90'
  }

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      {/* Header */}
      <header className="p-4 border-b border-sepia/20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sepia hover:text-ink transition">
            ← Back
          </Link>
          <h1 className="text-lg font-medium text-ink">Voice Interview</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          {/* Current question */}
          <div className="mb-8 p-6 bg-white/60 rounded-xl border border-sepia/20">
            <p className="text-sepia/60 text-sm mb-2 uppercase tracking-wide">
              {chapter.title} - Question {questionIndex + 1}
            </p>
            <h2 className="text-xl text-ink leading-relaxed">
              {question?.text}
            </h2>
            {question?.prompt && (
              <p className="text-sepia/70 text-sm mt-3 italic">
                {question.prompt}
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div className="mb-8">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
              isSpeechDetected ? 'bg-green-100 text-green-700' :
              isSpeaking ? 'bg-blue-100 text-blue-700' :
              isRecording ? 'bg-red-100 text-red-700' :
              isConnected ? 'bg-sepia/10 text-sepia' :
              'bg-gray-100 text-gray-600'
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                isSpeechDetected ? 'bg-green-500 animate-pulse' :
                isSpeaking ? 'bg-blue-500 animate-pulse' :
                isRecording ? 'bg-red-500 animate-pulse' :
                isConnected ? 'bg-sepia' :
                'bg-gray-400'
              }`} />
              <span className="font-medium">{status}</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Microphone button */}
          <div className="mb-8">
            {!isConnected ? (
              <button
                onClick={startConversation}
                className="w-32 h-32 rounded-full bg-sepia hover:bg-sepia/90 text-white flex items-center justify-center transition transform hover:scale-105 shadow-lg tap-bounce"
              >
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={disconnect}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition transform shadow-lg ${getButtonColor()} text-white`}
              >
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Instructions */}
          {!isConnected && (
            <p className="text-sepia/60 text-sm">
              Tap the microphone to start the voice interview
            </p>
          )}

          {isConnected && !isSpeaking && (
            <p className="text-sepia/60 text-sm">
              {isRecording ? 'Microphone is active - speak naturally' : 'Tap to disconnect'}
            </p>
          )}

          {/* Live transcripts */}
          {(transcript || aiTranscript) && (
            <div className="mt-6 space-y-4 text-left">
              {aiTranscript && (
                <div className="p-4 bg-sepia/5 rounded-lg border border-sepia/10">
                  <p className="text-xs text-sepia/50 mb-1 uppercase">AI is saying:</p>
                  <p className="text-ink">{aiTranscript}</p>
                </div>
              )}
              {transcript && (
                <div className="p-4 bg-white/60 rounded-lg border border-sepia/10">
                  <p className="text-xs text-sepia/50 mb-1 uppercase">You said:</p>
                  <p className="text-ink">{transcript}</p>
                </div>
              )}
            </div>
          )}

          {/* Conversation history */}
          {conversationHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm text-sepia/60 uppercase tracking-wide mb-4">
                Conversation
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto text-left">
                {conversationHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-white/60 border border-sepia/10'
                        : 'bg-sepia/5 border border-sepia/10'
                    }`}
                  >
                    <p className="text-xs text-sepia/50 mb-1">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </p>
                    <p className="text-ink">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <button
                onClick={saveConversation}
                className="mt-6 px-8 py-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition tap-bounce"
              >
                Save & Continue
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

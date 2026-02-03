import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

// Tour step definitions with more detailed guidance
const TOUR_STEPS = [
  {
    id: 'welcome',
    targetSelector: null,
    lisaScript: "Let me show you around your memoir dashboard.",
    title: "Welcome!",
    description: "This is your personal space for capturing your life story.",
    hint: null
  },
  {
    id: 'progress',
    targetSelector: '#progress-card',
    lisaScript: "This shows your overall progress. Watch it grow as you add more stories!",
    title: "Your Progress",
    description: "See how much of your memoir you've completed.",
    hint: "Click 'Preview Your Book' to see what your memoir looks like so far"
  },
  {
    id: 'actions',
    targetSelector: '#quick-actions',
    lisaScript: "These buttons let you quickly start writing or talking. I recommend the Talk button - it's like chatting with a friend!",
    title: "Quick Actions",
    description: "Choose how you want to tell your stories.",
    hint: "Tap 'Talk' to speak your memories - I'll be listening!"
  },
  {
    id: 'chapters',
    targetSelector: '#chapter-grid',
    lisaScript: "Here are your chapters. Each covers a different part of your life. Just tap any card to begin.",
    title: "Your Chapters",
    description: "Ten chapters covering your whole life journey - from childhood to wisdom.",
    hint: "Tap any chapter card to start telling that part of your story"
  },
  {
    id: 'export',
    targetSelector: '#export-button',
    lisaScript: "When you're ready, click here to export your memoir as a beautiful printed book. That's the tour! Let's begin.",
    title: "Export Your Book",
    description: "Turn your completed stories into a keepsake book.",
    hint: "Click here when you're ready to order your printed memoir"
  }
]

export default function TourOverlay({ onComplete, onSkip }) {
  const { authFetch } = useAuth()
  const { getVoice } = useSettings()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const [isLisaSpeaking, setIsLisaSpeaking] = useState(false)
  const wsRef = useRef(null)
  const playbackContextRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const unmountedRef = useRef(false)
  const speakingTimeoutRef = useRef(null)

  const step = TOUR_STEPS[currentStep]

  // Initialize audio context for playback
  const initPlaybackContext = useCallback(async () => {
    if (playbackContextRef.current?.state !== 'closed') return playbackContextRef.current
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
      playbackContextRef.current = ctx
      return ctx
    } catch (err) {
      console.error('[Tour] Failed to create audio context:', err)
      return null
    }
  }, [])

  // Play audio queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()

    try {
      const ctx = await initPlaybackContext()
      if (!ctx) {
        isPlayingRef.current = false
        return
      }
      if (ctx.state === 'suspended') await ctx.resume()

      const pcmData = atob(audioData)
      const samples = new Int16Array(pcmData.length / 2)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = (pcmData.charCodeAt(i * 2) | (pcmData.charCodeAt(i * 2 + 1) << 8))
      }

      const floatData = new Float32Array(samples.length)
      for (let i = 0; i < samples.length; i++) {
        floatData[i] = samples[i] / 32768
      }

      const buffer = ctx.createBuffer(1, floatData.length, 24000)
      buffer.getChannelData(0).set(floatData)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)

      source.onended = () => {
        isPlayingRef.current = false
        if (audioQueueRef.current.length > 0) {
          playNextAudio()
        }
      }

      source.start()
    } catch (err) {
      console.error('[Tour] Audio playback error:', err)
      isPlayingRef.current = false
    }
  }, [initPlaybackContext])

  // Connect to xAI and speak the current step
  const speakStep = useCallback(async (stepIndex) => {
    const stepData = TOUR_STEPS[stepIndex]
    if (!stepData) return

    setIsLisaSpeaking(true)

    // Fallback timeout - if voice doesn't work, still let user continue after 3 seconds
    speakingTimeoutRef.current = setTimeout(() => {
      setIsLisaSpeaking(false)
    }, 5000)

    try {
      const tokenRes = await authFetch('/api/voice/session', {
        method: 'POST',
        body: JSON.stringify({
          instructions: `Say this naturally: "${stepData.lisaScript}"`,
          voice: getVoice()
        })
      })

      if (!tokenRes.ok) {
        console.error('[Tour] Failed to get voice token')
        clearTimeout(speakingTimeoutRef.current)
        setIsLisaSpeaking(false)
        return
      }

      const { ephemeralToken } = await tokenRes.json()
      const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-3-mini-realtime-beta', [
        'realtime',
        `openai-insecure-api-key.${ephemeralToken}`
      ])

      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `Say exactly: "${stepData.lisaScript}"`,
            voice: getVoice(),
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16'
          }
        }))

        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'response.create',
              response: { modalities: ['audio', 'text'] }
            }))
          }
        }, 200)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'response.audio.delta' && data.delta) {
            audioQueueRef.current.push(data.delta)
            playNextAudio()
          }

          if (data.type === 'response.done') {
            clearTimeout(speakingTimeoutRef.current)
            setTimeout(() => {
              setIsLisaSpeaking(false)
              ws.close()
              wsRef.current = null
            }, 500)
          }
        } catch (err) {
          console.error('[Tour] WS message error:', err)
        }
      }

      ws.onerror = () => {
        clearTimeout(speakingTimeoutRef.current)
        setIsLisaSpeaking(false)
      }

      ws.onclose = () => {}
    } catch (err) {
      console.error('[Tour] Voice error:', err)
      clearTimeout(speakingTimeoutRef.current)
      setIsLisaSpeaking(false)
    }
  }, [authFetch, playNextAudio])

  // Update spotlight position when step changes
  useEffect(() => {
    const updatePosition = () => {
      if (step?.targetSelector) {
        const target = document.querySelector(step.targetSelector)
        if (target) {
          const rect = target.getBoundingClientRect()
          setTargetRect({
            top: rect.top - 12,
            left: rect.left - 12,
            width: rect.width + 24,
            height: rect.height + 24
          })
        }
      } else {
        setTargetRect(null)
      }
    }

    // Initial scroll to element
    if (step?.targetSelector) {
      const target = document.querySelector(step.targetSelector)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Delay position update to allow scroll to settle
        setTimeout(updatePosition, 300)
      }
    } else {
      updatePosition()
    }

    // Also update on resize and scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, step])

  // Animate in and speak first step
  useEffect(() => {
    unmountedRef.current = false
    requestAnimationFrame(() => setIsVisible(true))

    const timer = setTimeout(() => {
      speakStep(0)
    }, 600)

    return () => {
      unmountedRef.current = true
      clearTimeout(timer)
      clearTimeout(speakingTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
      if (playbackContextRef.current?.state !== 'closed') {
        playbackContextRef.current?.close().catch(() => {})
      }
    }
  }, [])

  // Handle next step
  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      // Small delay before speaking to let spotlight animate
      setTimeout(() => speakStep(nextStep), 400)
    } else {
      onComplete?.()
    }
  }

  // Handle skip
  const handleSkip = () => {
    clearTimeout(speakingTimeoutRef.current)
    if (wsRef.current) wsRef.current.close()
    onSkip?.()
  }

  return (
    <div
      className={`fixed inset-0 z-[90] transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Dark overlay with spotlight cutout */}
      <div className="absolute inset-0 pointer-events-none">
        {targetRect ? (
          <div
            className="absolute bg-black/85 transition-all duration-500 ease-out"
            style={{
              top: 0, left: 0, right: 0, bottom: 0,
              clipPath: `polygon(
                0% 0%, 0% 100%,
                ${targetRect.left}px 100%,
                ${targetRect.left}px ${targetRect.top}px,
                ${targetRect.left + targetRect.width}px ${targetRect.top}px,
                ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
                ${targetRect.left}px ${targetRect.top + targetRect.height}px,
                ${targetRect.left}px 100%,
                100% 100%, 100% 0%
              )`
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/85" />
        )}
      </div>

      {/* Spotlight border glow + pulsing indicator */}
      {targetRect && (() => {
        // Determine if card is below or above the target
        const cardIsBelow = targetRect.top + targetRect.height + 70 < window.innerHeight - 200
        return (
          <>
            <div
              className="absolute rounded-xl border-2 border-amber-400 shadow-[0_0_40px_15px_rgba(245,158,11,0.4)] transition-all duration-500 ease-out pointer-events-none animate-pulse"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height
              }}
            />
            {/* Pointing arrow - direction based on card position */}
            <div
              className="absolute transition-all duration-500 ease-out pointer-events-none"
              style={{
                top: cardIsBelow
                  ? targetRect.top + targetRect.height + 8
                  : targetRect.top - 50,
                left: targetRect.left + targetRect.width / 2 - 20
              }}
            >
              <div className="animate-bounce">
                <svg
                  className="w-10 h-10 text-amber-400 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ transform: cardIsBelow ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M12 16l-6-6h12z"/>
                </svg>
              </div>
            </div>
          </>
        )
      })()}

      {/* Tour card - positioned relative to target */}
      <div
        className="fixed transition-all duration-500 z-10"
        style={{
          maxWidth: '420px',
          width: 'calc(100% - 32px)',
          left: '50%',
          transform: 'translateX(-50%)',
          ...(targetRect
            ? {
                // Position card below the target if there's room, otherwise above
                top: targetRect.top + targetRect.height + 70 < window.innerHeight - 200
                  ? targetRect.top + targetRect.height + 60
                  : Math.max(16, targetRect.top - 280)
              }
            : {
                top: '50%',
                transform: 'translate(-50%, -50%)'
              })
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-200">
          {/* Header with Lisa avatar */}
          <div className="bg-gradient-to-r from-sepia to-amber-600 px-5 py-4 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white/30">
                <span className="text-xl font-display">L</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-lg">{step?.title}</p>
                  {isLisaSpeaking && (
                    <div className="flex gap-0.5">
                      <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse" />
                      <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
                <p className="text-white/70 text-sm">Step {currentStep + 1} of {TOUR_STEPS.length}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <p className="text-ink mb-3">{step?.description}</p>

            {/* Action hint */}
            {step?.hint && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-amber-800 text-sm">{step.hint}</p>
                </div>
              </div>
            )}

            {/* Progress dots + buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentStep
                        ? 'bg-sepia scale-125'
                        : i < currentStep
                        ? 'bg-sepia/60'
                        : 'bg-sepia/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sepia/70 hover:text-sepia text-sm font-medium transition"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="px-5 py-2 bg-sepia hover:bg-ink text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      Start Writing
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

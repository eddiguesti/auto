import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Intro flow states
const STATES = {
  WELCOME: 'welcome',
  ASK_NAME: 'ask_name',
  GREET_USER: 'greet_user',
  EXPLAIN: 'explain',
  DEMO_QUESTION: 'demo_question',
  FINAL_CTA: 'final_cta'
}

export default function FacebookLanding() {
  const navigate = useNavigate()
  const [state, setState] = useState(STATES.WELCOME)
  const [userName, setUserName] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const recognitionRef = useRef(null)
  const synthRef = useRef(null)

  // Show skip after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-GB'

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex
        const result = event.results[current]
        setTranscript(result[0].transcript)

        if (result.isFinal) {
          handleVoiceInput(result[0].transcript)
        }
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    synthRef.current = window.speechSynthesis
  }, [])

  // Speak text
  const speak = (text, onEnd) => {
    if (!synthRef.current) {
      onEnd?.()
      return
    }

    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0

    // Try to find a female British voice
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(v =>
      v.lang.includes('en-GB') && v.name.toLowerCase().includes('female')
    ) || voices.find(v => v.lang.includes('en-GB')) || voices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }

    synthRef.current.speak(utterance)
  }

  // Start listening
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  // Handle voice input based on current state
  const handleVoiceInput = (text) => {
    if (state === STATES.ASK_NAME) {
      const name = text.trim().split(' ')[0] // Get first name
      setUserName(name)
      setInputValue(name)
      setTimeout(() => advanceState(name), 500)
    }
  }

  // Advance through the flow
  const advanceState = (data) => {
    switch (state) {
      case STATES.WELCOME:
        setState(STATES.ASK_NAME)
        setTimeout(() => {
          speak("Hello! Welcome to Easy Memoir. I'm Lisa, and I help people capture their life stories. Before we begin, may I ask your name?", () => {
            setTimeout(startListening, 500)
          })
        }, 500)
        break

      case STATES.ASK_NAME:
        const name = data || userName || inputValue
        setUserName(name)
        setState(STATES.GREET_USER)
        speak(`Lovely to meet you, ${name}! It's wonderful that you're interested in preserving your memories.`, () => {
          setTimeout(() => advanceState(), 1500)
        })
        break

      case STATES.GREET_USER:
        setState(STATES.EXPLAIN)
        speak("Easy Memoir is a simple way to write your life story. You don't need to type anything - you just talk to me, like we're having a cup of tea together.", () => {
          setTimeout(() => advanceState(), 1500)
        })
        break

      case STATES.EXPLAIN:
        setState(STATES.DEMO_QUESTION)
        speak("I'll ask you questions about your life - your childhood, your family, the adventures you've had. And I'll help turn your words into a beautiful written memoir.", () => {
          setTimeout(() => advanceState(), 1500)
        })
        break

      case STATES.DEMO_QUESTION:
        setState(STATES.FINAL_CTA)
        break

      default:
        break
    }
  }

  // Handle text input submission
  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      if (state === STATES.ASK_NAME) {
        advanceState(inputValue.trim())
      }
    }
  }

  // Get current message
  const getMessage = () => {
    switch (state) {
      case STATES.WELCOME:
        return "Hi there! Tap to start..."
      case STATES.ASK_NAME:
        return "Hello! What's your name?"
      case STATES.GREET_USER:
        return `Lovely to meet you, ${userName}!`
      case STATES.EXPLAIN:
        return "Easy Memoir helps you capture your life story..."
      case STATES.DEMO_QUESTION:
        return "I'll ask you questions about your life..."
      case STATES.FINAL_CTA:
        return `${userName}, are you ready to start your memoir?`
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-amber-50 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="font-display text-xl text-ink">
          Easy<span className="text-sepia">Memoir</span>
        </div>
        {showSkip && state !== STATES.FINAL_CTA && (
          <button
            onClick={() => navigate('/register')}
            className="text-sm text-warmgray hover:text-ink"
          >
            Skip intro →
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Lisa Avatar */}
        <div className={`relative mb-8 ${isSpeaking ? 'animate-pulse' : ''}`}>
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sepia to-amber-600 flex items-center justify-center shadow-xl">
            <span className="text-white font-display text-4xl">L</span>
          </div>
          {isSpeaking && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <span className="w-2 h-2 bg-sepia rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-sepia rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-sepia rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {isListening && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full mb-6">
          <p className="font-serif text-lg text-ink text-center leading-relaxed">
            {getMessage()}
          </p>
          {transcript && isListening && (
            <p className="text-sm text-sepia/60 text-center mt-2 italic">
              "{transcript}"
            </p>
          )}
        </div>

        {/* Interaction Area */}
        {state === STATES.WELCOME && (
          <button
            onClick={() => advanceState()}
            className="bg-sepia text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-ink transition flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Meet Lisa
          </button>
        )}

        {state === STATES.ASK_NAME && (
          <div className="w-full max-w-md">
            {/* Voice button */}
            <button
              onClick={startListening}
              disabled={isListening || isSpeaking}
              className={`w-full mb-4 py-4 rounded-xl flex items-center justify-center gap-3 transition ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-sepia text-white hover:bg-ink'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              {isListening ? 'Listening...' : 'Tap to speak your name'}
            </button>

            {/* Or type */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-sepia/20" />
              <span className="text-sm text-warmgray">or type it</span>
              <div className="flex-1 h-px bg-sepia/20" />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Your first name"
                className="flex-1 px-4 py-3 rounded-xl border border-sepia/20 focus:border-sepia focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-sepia text-white rounded-xl hover:bg-ink transition"
              >
                →
              </button>
            </form>
          </div>
        )}

        {state === STATES.FINAL_CTA && (
          <div className="w-full max-w-md space-y-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition"
            >
              Yes, let's begin! →
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full text-warmgray hover:text-ink transition py-2"
            >
              Tell me more first
            </button>
          </div>
        )}

        {(state === STATES.GREET_USER || state === STATES.EXPLAIN || state === STATES.DEMO_QUESTION) && (
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-sepia/40 rounded-full animate-pulse" />
            <span className="w-2 h-2 bg-sepia/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-sepia/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </main>

      {/* Trust indicators */}
      <footer className="p-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-warmgray">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Free to start
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            No writing needed
          </span>
        </div>
      </footer>
    </div>
  )
}

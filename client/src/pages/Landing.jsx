import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Landing() {
  const [userName, setUserName] = useState('')
  const [inputName, setInputName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [selectedMode, setSelectedMode] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserName()
  }, [])

  const fetchUserName = async () => {
    try {
      const res = await fetch('/api/stories/settings')
      const data = await res.json()
      if (data.name) {
        setUserName(data.name)
      }
    } catch (err) {
      console.log('No existing user')
    }
  }

  const handleModeSelect = (mode) => {
    setSelectedMode(mode)
    if (userName) {
      // Already have a name, go directly
      if (mode === 'voice') {
        navigate('/voice')
      } else {
        navigate('/home')
      }
    } else {
      setShowNameInput(true)
    }
  }

  const saveName = async () => {
    if (!inputName.trim()) return
    try {
      await fetch('/api/stories/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputName })
      })
      setUserName(inputName)
      setShowNameInput(false)

      if (selectedMode === 'voice') {
        navigate('/voice')
      } else {
        navigate('/home')
      }
    } catch (err) {
      console.error('Error saving name:', err)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 page-enter">
      {/* Decorative flourish */}
      <div className="text-sepia/30 text-3xl mb-6 tracking-[0.5em] float">❧</div>

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-ink mb-3 tracking-wide text-center">
        Steven's Life
      </h1>

      <div className="w-24 h-px bg-sepia/30 mx-auto mb-6" />

      <p className="text-xl text-sepia/80 italic text-center mb-2">
        A Digital Autobiography
      </p>

      <p className="text-sepia/60 text-center max-w-md mb-12">
        Every life is a story worth telling. Let us help you capture yours.
      </p>

      {/* Name input modal */}
      {showNameInput ? (
        <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg stagger-item">
          <h2 className="text-xl text-ink mb-2 text-center">Welcome</h2>
          <p className="text-sepia/70 text-center mb-6">
            Before we begin, what should we call you?
          </p>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white/80 focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia text-lg text-center mb-4"
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
          />
          <button
            onClick={saveName}
            disabled={!inputName.trim()}
            className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed tap-bounce"
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          {/* Welcome back message */}
          {userName && (
            <p className="text-sepia/70 mb-8 text-lg">
              Welcome back, <span className="font-medium text-ink">{userName}</span>
            </p>
          )}

          {/* Mode selection */}
          <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Voice Mode */}
            <button
              onClick={() => handleModeSelect('voice')}
              className="group bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-sepia/20 hover:border-sepia/40 hover:bg-white/80 transition text-left card-hover"
            >
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <h3 className="text-xl text-ink font-medium mb-2 group-hover:text-sepia transition">
                Voice Interview
              </h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Just talk naturally. Our AI will ask questions and listen to your stories, then write them beautifully.
              </p>
              <div className="mt-4 flex items-center text-sepia text-sm font-medium">
                <span>Start talking</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Type Mode */}
            <button
              onClick={() => handleModeSelect('type')}
              className="group bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-sepia/20 hover:border-sepia/40 hover:bg-white/80 transition text-left card-hover"
            >
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl text-ink font-medium mb-2 group-hover:text-sepia transition">
                Write Your Story
              </h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Answer questions at your own pace by typing. Get AI help to expand your memories into beautiful prose.
              </p>
              <div className="mt-4 flex items-center text-sepia text-sm font-medium">
                <span>Start writing</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Features */}
          <div className="mt-16 grid sm:grid-cols-3 gap-8 max-w-3xl text-center">
            <div className="stagger-item">
              <div className="text-2xl mb-3">📝</div>
              <h4 className="text-ink font-medium mb-1">Guided Questions</h4>
              <p className="text-sepia/60 text-sm">Thoughtful prompts to help you remember</p>
            </div>
            <div className="stagger-item">
              <div className="text-2xl mb-3">🤖</div>
              <h4 className="text-ink font-medium mb-1">AI Assistant</h4>
              <p className="text-sepia/60 text-sm">Helps craft your stories beautifully</p>
            </div>
            <div className="stagger-item">
              <div className="text-2xl mb-3">📖</div>
              <h4 className="text-ink font-medium mb-1">Export & Share</h4>
              <p className="text-sepia/60 text-sm">Download your finished autobiography</p>
            </div>
          </div>
        </>
      )}

      {/* Footer flourish */}
      <div className="mt-16 text-sepia/20 text-xl float">✦</div>
    </div>
  )
}

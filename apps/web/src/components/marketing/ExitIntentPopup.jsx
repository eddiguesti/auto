import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const SESSION_KEY = 'exit_intent_shown'
const MOUSE_THRESHOLD = 10

/**
 * ExitIntentPopup - Desktop-only popup triggered when mouse moves toward browser top.
 * Offers "3 free chapters" and navigates to /register.
 * Shows once per session via sessionStorage.
 */
export default function ExitIntentPopup() {
  const [shown, setShown] = useState(false)
  const navigate = useNavigate()

  const handleMouseLeave = useCallback(e => {
    if (e.clientY > MOUSE_THRESHOLD) return
    if (sessionStorage.getItem(SESSION_KEY)) return

    sessionStorage.setItem(SESSION_KEY, 'true')
    setShown(true)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [handleMouseLeave])

  const handleDismiss = useCallback(() => {
    setShown(false)
  }, [])

  const handleSubmit = useCallback(
    e => {
      e.preventDefault()
      setShown(false)
      navigate('/register')
    },
    [navigate]
  )

  if (!shown) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onDismiss={handleDismiss} />
      <PopupCard onDismiss={handleDismiss} onSubmit={handleSubmit} />
    </div>
  )
}

function Backdrop({ onDismiss }) {
  return (
    <div
      className="absolute inset-0 bg-heritage-ink/60 backdrop-blur-sm"
      onClick={onDismiss}
      aria-hidden="true"
    />
  )
}

function PopupCard({ onDismiss, onSubmit }) {
  return (
    <div className="relative bg-heritage-cream rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-heritage-sepia-light/30">
      <DismissButton onDismiss={onDismiss} />

      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-heritage-cta/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-heritage-cta"
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
        <h2 className="font-display text-2xl sm:text-3xl text-heritage-ink mb-2">
          Wait — get 3 free chapters
        </h2>
        <p className="font-serif text-heritage-text text-base">
          Start your memoir today and receive your first three chapters completely free. No credit
          card required.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <button
          type="submit"
          className="w-full font-sans text-base bg-heritage-cta text-white py-3.5 rounded-full hover:bg-heritage-cta-hover transition-colors shadow-md shadow-heritage-cta/20 font-medium"
        >
          Claim My Free Chapters
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors py-2"
        >
          No thanks, I'll pass
        </button>
      </form>
    </div>
  )
}

function DismissButton({ onDismiss }) {
  return (
    <button
      onClick={onDismiss}
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-heritage-text hover:text-heritage-ink hover:bg-heritage-sepia-light/30 transition-colors"
      aria-label="Close popup"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  )
}

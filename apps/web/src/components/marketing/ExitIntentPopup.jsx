import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBook2 } from '@tabler/icons-react'
import { Button, Modal } from '../ui'

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
    <Modal onClose={handleDismiss} size="md">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-bronze-100 text-bronze-600 flex items-center justify-center mx-auto mb-5">
          <IconBook2 size={28} stroke={1.5} aria-hidden="true" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mb-3">
          Wait — get 3 free chapters
        </h2>
        <p className="text-sepia-600 text-base mb-8 max-w-sm mx-auto">
          Start your memoir today and receive your first three chapters completely free. No credit
          card required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Button type="submit" variant="primary" size="xl">
            Claim my free chapters
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleDismiss}
            className="w-full"
          >
            No thanks, I'll pass
          </Button>
        </form>
      </div>
    </Modal>
  )
}

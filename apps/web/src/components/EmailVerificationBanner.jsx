import { useState, useEffect } from 'react'
import { IconMail, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'

export default function EmailVerificationBanner() {
  const { user, authFetch, refreshUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('email-verification-dismissed')) {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('email-verification-dismissed', 'true')
    setDismissed(true)
  }

  const handleResend = async () => {
    setResending(true)
    setResendMessage('')

    try {
      const res = await authFetch('/api/auth/resend-verification', {
        method: 'POST'
      })

      const data = await res.json()

      if (res.ok) {
        setResendMessage('Verification email sent! Check your inbox.')
        setTimeout(() => refreshUser(), 2000)
      } else {
        setResendMessage(data.error || 'Failed to send email')
      }
    } catch {
      setResendMessage('Failed to send email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // Don't show if user is verified, doesn't exist, or banner dismissed
  if (!user || user.email_verified || user.google_id || dismissed) {
    return null
  }

  return (
    <div className="bg-warning-soft text-warning-strong border-b border-warning-strong/10 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <IconMail size={20} stroke={1.75} className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">Please verify your email address.</span> We sent a
                verification link to <span className="font-medium">{user.email}</span>.
              </p>
              {resendMessage && (
                <p
                  className={`text-xs mt-1 ${
                    resendMessage.includes('sent') ? 'text-success-strong' : 'text-error-strong'
                  }`}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleResend} loading={resending}>
              {resending ? 'Sending...' : 'Resend Email'}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 p-2 rounded-full text-warning-strong/70 hover:text-warning-strong hover:bg-warning-strong/10 transition-colors"
            >
              <IconX size={20} stroke={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

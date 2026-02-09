import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

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
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <span className="font-medium">Please verify your email address.</span> We sent a
                verification link to <span className="font-medium">{user.email}</span>.
              </p>
              {resendMessage && (
                <p
                  className={`text-xs mt-1 ${resendMessage.includes('sent') ? 'text-green-700' : 'text-red-700'}`}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-amber-600 hover:text-amber-800 p-1"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

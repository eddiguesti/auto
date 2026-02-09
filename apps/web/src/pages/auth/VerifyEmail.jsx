import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('No verification token provided.')
      setVerifying(false)
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await res.json()

        if (res.ok) {
          setSuccess(true)
          // Clear the dismissed banner so it won't show again
          sessionStorage.removeItem('email-verification-dismissed')
          setTimeout(() => navigate('/home'), 2000)
        } else {
          setError(data.error || 'Verification failed.')
        }
      } catch {
        setError('Failed to verify email. Please try again.')
      } finally {
        setVerifying(false)
      }
    }

    verifyEmail()
  }, [token, navigate])

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#faf8f5] to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sepia/20 border-t-sepia rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sepia/70 font-serif">Verifying your email...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#faf8f5] to-white page-enter">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              to="/"
              className="text-sepia/30 text-2xl tracking-[0.3em] hover:text-sepia/50 transition"
            >
              &#10087;
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-display text-ink mb-4">Email Verified!</h1>
            <p className="text-sepia/70 font-serif mb-8">
              Your email address has been successfully verified. Redirecting you to your memoir...
            </p>

            <button
              onClick={() => navigate('/home')}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition font-medium"
            >
              Continue to App
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#faf8f5] to-white page-enter">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-sepia/30 text-2xl tracking-[0.3em] hover:text-sepia/50 transition"
          >
            &#10087;
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-display text-ink mb-4">Verification Failed</h1>
          <p className="text-sepia/70 font-serif mb-8">{error}</p>

          <Link
            to="/home"
            className="block w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition font-medium text-center mb-3"
          >
            Go to App
          </Link>

          <p className="text-sm text-sepia/60">
            You can request a new verification email from your account settings.
          </p>
        </div>
      </div>
    </div>
  )
}

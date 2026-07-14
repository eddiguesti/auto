import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconCheck, IconMail } from '@tabler/icons-react'
import { API_URL } from '../../config'
import { Button, Card } from '../../components/ui'

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
        const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
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
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              to="/"
              className="font-display text-xl text-ink hover:text-bronze-700 transition-colors"
            >
              Easy&nbsp;Memoir
            </Link>
          </div>

          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 bg-sepia-100 text-sepia-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <IconMail size={32} stroke={1.5} />
            </div>
            <h1 className="text-2xl font-display text-ink">Verifying your email...</h1>
          </Card>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 page-enter">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              to="/"
              className="font-display text-xl text-ink hover:text-bronze-700 transition-colors"
            >
              Easy&nbsp;Memoir
            </Link>
          </div>

          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 bg-success-soft text-success-strong rounded-full flex items-center justify-center mx-auto mb-6">
              <IconCheck size={32} stroke={1.5} />
            </div>

            <h1 className="text-2xl font-display text-ink mb-4">Email Verified!</h1>
            <p className="text-sepia-600 mb-8">
              Your email address has been successfully verified. Redirecting you to your memoir...
            </p>

            <Button size="xl" onClick={() => navigate('/home')}>
              Continue to App
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-enter">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="font-display text-xl text-ink hover:text-bronze-700 transition-colors"
          >
            Easy&nbsp;Memoir
          </Link>
        </div>

        <Card padding="lg" className="text-center">
          <div className="w-16 h-16 bg-error-soft text-error-strong rounded-full flex items-center justify-center mx-auto mb-6">
            <IconAlertTriangle size={32} stroke={1.5} />
          </div>

          <h1 className="text-2xl font-display text-ink mb-4">Verification Failed</h1>
          <p className="text-sepia-600 mb-8">{error}</p>

          <Button to="/home" size="xl" className="mb-3">
            Go to App
          </Button>

          <p className="text-sm text-sepia-500">
            You can request a new verification email from your account settings.
          </p>
        </Card>
      </div>
    </div>
  )
}

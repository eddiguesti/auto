import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { API_URL } from '../../config'
import { Button, Card, Field, Input, Skeleton } from '../../components/ui'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [success, setSuccess] = useState(false)

  // Password validation
  const validatePassword = pwd => {
    const errors = []
    if (pwd.length < 8) errors.push('at least 8 characters')
    if (!/[a-z]/.test(pwd)) errors.push('a lowercase letter')
    if (!/[A-Z]/.test(pwd)) errors.push('an uppercase letter')
    if (!/[0-9]/.test(pwd)) errors.push('a number')
    return errors
  }

  const passwordErrors = password ? validatePassword(password) : []
  const isPasswordValid = password && passwordErrors.length === 0
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false)
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`
        )
        const data = await res.json()
        setTokenValid(data.valid)
      } catch {
        setTokenValid(false)
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async e => {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    if (passwordErrors.length > 0) {
      setStatus({ type: 'error', message: `Password must contain ${passwordErrors.join(', ')}` })
      return
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Reset failed')
      }

      setSuccess(true)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card padding="lg" className="text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />
            <Skeleton className="h-7 w-2/3 mx-auto mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <p className="sr-only" role="status">
              Verifying reset link...
            </p>
          </Card>
        </div>
      </div>
    )
  }

  // Invalid/expired token
  if (!token || !tokenValid) {
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

            <h1 className="text-2xl font-display text-ink mb-4">Link Expired</h1>
            <p className="text-sepia-600 mb-8">
              This password reset link is invalid or has expired. Reset links are only valid for 1
              hour.
            </p>

            <Button to="/forgot-password" size="xl">
              Request New Reset Link
            </Button>

            <p className="mt-6 text-sm text-sepia-600">
              Remember your password?{' '}
              <Link to="/login" className="text-bronze-700 hover:text-bronze-800 hover:underline">
                Sign in
              </Link>
            </p>
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

            <h1 className="text-2xl font-display text-ink mb-4">Password Reset!</h1>
            <p className="text-sepia-600 mb-8">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <Button size="xl" onClick={() => navigate('/login')}>
              Sign In Now
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // Reset form
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
          <h1 className="text-3xl sm:text-4xl font-display text-ink mt-6 mb-2">
            Create New Password
          </h1>
          <p className="text-sepia-600">Choose a strong password to protect your account.</p>
        </div>

        <Card padding="lg">
          {status.message && (
            <div
              role="alert"
              className={`mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
                status.type === 'error'
                  ? 'bg-error-soft text-error-strong'
                  : 'bg-success-soft text-success-strong'
              }`}
            >
              {status.type === 'error' && (
                <IconAlertCircle size={18} stroke={1.75} className="shrink-0" />
              )}
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="New Password"
              error={
                password && passwordErrors.length > 0
                  ? `Must include: ${passwordErrors.join(', ')}`
                  : undefined
              }
              hint={password && isPasswordValid ? 'Password meets requirements' : undefined}
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  invalid={Boolean(password) && !isPasswordValid}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  autoFocus
                />
              )}
            </Field>

            <Field
              label="Confirm Password"
              error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
              hint={confirmPassword && passwordsMatch ? 'Passwords match' : undefined}
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  invalid={Boolean(confirmPassword) && !passwordsMatch}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />
              )}
            </Field>

            <Button
              type="submit"
              size="xl"
              loading={loading}
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="mt-2"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sepia/20 border-t-sepia rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sepia/70">Verifying reset link...</p>
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

            <h1 className="text-2xl text-ink mb-4">Link Expired</h1>
            <p className="text-sepia/70 mb-8">
              This password reset link is invalid or has expired. Reset links are only valid for 1
              hour.
            </p>

            <Link
              to="/forgot-password"
              className="block w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition"
            >
              Request New Reset Link
            </Link>

            <p className="mt-6 text-sm text-sepia/60">
              Remember your password?{' '}
              <Link to="/login" className="text-sepia hover:underline">
                Sign in
              </Link>
            </p>
          </div>
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

            <h1 className="text-2xl text-ink mb-4">Password Reset!</h1>
            <p className="text-sepia/70 mb-8">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition"
            >
              Sign In Now
            </button>
          </div>
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
            className="text-sepia/30 text-2xl tracking-[0.3em] hover:text-sepia/50 transition"
          >
            &#10087;
          </Link>
          <h1 className="text-3xl text-ink mt-4 mb-2">Create New Password</h1>
          <p className="text-sepia/70">Choose a strong password to protect your account.</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg">
          {status.message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-sepia/70 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  password && !isPasswordValid
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : password && isPasswordValid
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : 'border-sepia/30 focus:ring-sepia/30 focus:border-sepia'
                }`}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                autoFocus
              />
              {password && passwordErrors.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Must include: {passwordErrors.join(', ')}
                </p>
              )}
              {password && isPasswordValid && (
                <p className="mt-1 text-xs text-green-600">Password meets requirements</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-sepia/70 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : confirmPassword && passwordsMatch
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : 'border-sepia/30 focus:ring-sepia/30 focus:border-sepia'
                }`}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="mt-1 text-xs text-green-600">Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

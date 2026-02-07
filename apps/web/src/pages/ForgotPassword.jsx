import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Bot protection
  const [honeypot, setHoneypot] = useState('')
  const formLoadTime = useRef(Date.now())

  const handleSubmit = async e => {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    // Bot protection
    if (honeypot) {
      setStatus({ type: 'error', message: 'Request failed' })
      return
    }

    const timeOnPage = Date.now() - formLoadTime.current
    if (timeOnPage < 2000) {
      setStatus({ type: 'error', message: 'Please take your time' })
      return
    }

    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your email address' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setSubmitted(true)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h1 className="text-2xl text-ink mb-4">Check Your Email</h1>
            <p className="text-sepia/70 mb-6">
              If an account exists for <strong>{email}</strong>, you will receive a password reset
              link shortly.
            </p>
            <p className="text-sm text-sepia/60 mb-8">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>

            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition"
              >
                Back to Sign In
              </Link>
              <button
                onClick={() => {
                  setSubmitted(false)
                  setEmail('')
                  formLoadTime.current = Date.now()
                }}
                className="block w-full py-3 text-sepia/70 hover:text-sepia transition"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          <h1 className="text-3xl text-ink mt-4 mb-2">Forgot Password?</h1>
          <p className="text-sepia/70">No worries, we'll send you reset instructions.</p>
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
            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm text-sepia/70 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia/70">
            Remember your password?{' '}
            <Link to="/login" className="text-sepia hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

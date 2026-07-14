import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertCircle, IconMailCheck } from '@tabler/icons-react'
import { API_URL } from '../../config'
import { Button, Card, Field, Input } from '../../components/ui'

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
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
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
              className="font-display text-xl text-ink hover:text-bronze-700 transition-colors"
            >
              Easy&nbsp;Memoir
            </Link>
          </div>

          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 bg-success-soft text-success-strong rounded-full flex items-center justify-center mx-auto mb-6">
              <IconMailCheck size={32} stroke={1.5} />
            </div>

            <h1 className="text-2xl font-display text-ink mb-4">Check Your Email</h1>
            <p className="text-sepia-600 mb-6">
              If an account exists for <strong className="text-ink">{email}</strong>, you will
              receive a password reset link shortly.
            </p>
            <p className="text-sm text-sepia-500 mb-8">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>

            <div className="space-y-3">
              <Button to="/login" size="xl">
                Back to Sign In
              </Button>
              <Button
                variant="ghost"
                size="xl"
                onClick={() => {
                  setSubmitted(false)
                  setEmail('')
                  formLoadTime.current = Date.now()
                }}
              >
                Try a different email
              </Button>
            </div>
          </Card>
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
            className="font-display text-xl text-ink hover:text-bronze-700 transition-colors"
          >
            Easy&nbsp;Memoir
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display text-ink mt-6 mb-2">Forgot Password?</h1>
          <p className="text-sepia-600">No worries, we'll send you reset instructions.</p>
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

            <Field label="Email Address">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              )}
            </Field>

            <Button type="submit" size="xl" loading={loading} className="mt-2">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia-600">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-bronze-700 hover:text-bronze-800 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

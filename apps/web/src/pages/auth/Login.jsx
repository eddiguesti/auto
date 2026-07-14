import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../config'
import { Button, Card, Field, Input } from '../../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleEmailLogin = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      login(data.user, data.token)

      // Check onboarding status - but always navigate even if this fails
      let needsOnboarding = false // Returning users likely completed onboarding
      try {
        const onboardingRes = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json()
          needsOnboarding = !onboardingData.completed
        }
      } catch {
        // Ignore onboarding check errors
      }

      navigate(needsOnboarding ? '/home?onboarding=true' : '/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async credentialResponse => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      login(data.user, data.token)

      // Check onboarding status - but always navigate even if this fails
      let needsOnboarding = false // Returning users likely completed onboarding
      try {
        const onboardingRes = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json()
          needsOnboarding = !onboardingData.completed
        }
      } catch {
        // Ignore onboarding check errors
      }

      navigate(needsOnboarding ? '/home?onboarding=true' : '/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-3xl sm:text-4xl font-display text-ink mt-6 mb-2">Welcome back</h1>
          <p className="text-sepia-600">Sign in to continue your story</p>
        </div>

        <Card padding="lg">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-2.5"
            >
              <IconAlertCircle size={18} stroke={1.75} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <div className="flex justify-center mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
            />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sepia-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface text-sepia-500 text-sm">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Field label="Email">
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
                />
              )}
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-ink-soft">Password</span>
                <Link
                  to="/forgot-password"
                  className="text-sm text-bronze-700 hover:text-bronze-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
                aria-label="Password"
              />
            </div>

            <Button type="submit" size="xl" loading={loading} className="mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia-600">
            Don&rsquo;t have an account?{' '}
            <Link
              to="/register"
              className="text-bronze-700 hover:text-bronze-800 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

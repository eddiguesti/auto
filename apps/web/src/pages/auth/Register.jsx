import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../config'
import { registerSchema } from '../../lib/authSchemas'
import { Button, Card, Field, Input } from '../../components/ui'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Bot protection: honeypot field and form load timestamp
  const [website, setWebsite] = useState('') // honeypot - bots fill this
  const formLoadTime = useRef(Date.now())

  // Schema-based password validation (shows live feedback as user types)
  const passwordResult = password
    ? registerSchema.pick({ password: true }).safeParse({ password })
    : null
  const passwordErrors =
    passwordResult?.success === false ? passwordResult.error.issues.map(i => i.message) : []
  const isPasswordValid = passwordResult?.success === true

  const handleEmailRegister = async e => {
    e.preventDefault()
    setError('')

    // Bot protection: reject if honeypot is filled
    if (website) {
      setError('Registration failed')
      return
    }

    // Bot protection: reject if form submitted too quickly (< 3 seconds)
    const timeOnPage = Date.now() - formLoadTime.current
    if (timeOnPage < 3000) {
      setError('Please take your time filling out the form')
      return
    }

    setLoading(true)

    // Normalize inputs
    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    // Schema validation — catches all field errors in one pass
    const parsed = registerSchema.safeParse({
      name: trimmedName,
      email: normalizedEmail,
      password
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: normalizedEmail,
          password,
          _hp: website, // honeypot for backend validation
          _ts: formLoadTime.current // timestamp for backend validation
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      login(data.user, data.token)
      // New users always need onboarding
      navigate('/home?onboarding=true')
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
      let needsOnboarding = true // Default to showing onboarding for new users
      try {
        const onboardingRes = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json()
          needsOnboarding = !onboardingData.completed
        }
      } catch {
        // Ignore onboarding check errors - default to showing onboarding
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
          <h1 className="text-3xl sm:text-4xl font-display text-ink mt-6 mb-2">Create Account</h1>
          <p className="text-sepia-600">Start capturing your life story</p>
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
              text="signup_with"
              shape="pill"
            />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sepia-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface text-sepia-500 text-sm">or sign up with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailRegister} className="space-y-4">
            {/* Honeypot field - hidden from users, bots will fill it */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <Field label="Your Name">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="First name"
                  required
                  autoComplete="name"
                  maxLength={100}
                />
              )}
            </Field>

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
                  maxLength={255}
                />
              )}
            </Field>

            <Field
              label="Password"
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
                  minLength={8}
                  autoComplete="new-password"
                />
              )}
            </Field>

            <Button type="submit" size="xl" loading={loading} className="mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia-600">
            Already have an account?{' '}
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

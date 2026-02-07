import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

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

  // Password validation helper
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

    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length < 1) {
      setError('Please enter your name')
      return
    }

    // Validate password
    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(', ')}`)
      return
    }

    setLoading(true)

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

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
            className="text-sepia/30 text-2xl tracking-[0.3em] hover:text-sepia/50 transition"
          >
            ❧
          </Link>
          <h1 className="text-3xl text-ink mt-4 mb-2">Create Account</h1>
          <p className="text-sepia/70">Start capturing your life story</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Google Sign-In */}
          <div className="flex justify-center mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed')}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
            />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sepia/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 text-sepia/60">or sign up with email</span>
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

            <div>
              <label className="block text-sm text-sepia/70 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia"
                placeholder="First name"
                required
                autoComplete="name"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm text-sepia/70 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia"
                placeholder="you@example.com"
                required
                autoComplete="email"
                maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm text-sepia/70 mb-1">Password</label>
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
                minLength={8}
                autoComplete="new-password"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition disabled:opacity-50 tap-bounce"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia/70">
            Already have an account?{' '}
            <Link to="/login" className="text-sepia hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

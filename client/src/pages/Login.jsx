import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      login(data.user, data.token)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
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
      navigate('/home')
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
          <Link to="/" className="text-sepia/30 text-2xl tracking-[0.3em] hover:text-sepia/50 transition">
            ❧
          </Link>
          <h1 className="text-3xl text-ink mt-4 mb-2">Welcome Back</h1>
          <p className="text-sepia/70">Sign in to continue your story</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-sepia/20 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
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
              shape="rectangular"
            />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sepia/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 text-sepia/60">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-sepia/70 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-sepia/70 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia"
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition disabled:opacity-50 tap-bounce"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sepia/70">
            Don't have an account?{' '}
            <Link to="/register" className="text-sepia hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

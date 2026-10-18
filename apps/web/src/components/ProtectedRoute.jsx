import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, token, loading, authError, refreshUser, logout } = useAuth()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-label="Checking your sign-in"
      >
        <span className="sr-only">Checking your sign-in…</span>
        <div className="animate-spin w-8 h-8 border-2 border-sepia border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    if (token && authError) {
      return (
        <main className="min-h-screen flex items-center justify-center px-6 bg-[#f7f3eb]">
          <section
            className="w-full max-w-lg bg-[#fffcf7] border border-[#d9d5c9] rounded-lg p-8"
            aria-labelledby="session-check-title"
          >
            <h1 id="session-check-title" className="text-3xl text-[#233a32] mb-4">
              We could not check your sign-in.
            </h1>
            <p className="text-[#4d5149] leading-relaxed mb-6" role="alert">
              {authError} Your sign-in has been kept so you can retry.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => refreshUser()}
                className="px-6 py-3 min-h-12 rounded bg-[#233a32] text-white"
              >
                Try again
              </button>
              <button
                onClick={() => logout()}
                className="px-4 py-3 min-h-12 text-[#233a32] underline"
              >
                Sign out
              </button>
            </div>
          </section>
        </main>
      )
    }
    return <Navigate to="/login" replace />
  }

  return children
}

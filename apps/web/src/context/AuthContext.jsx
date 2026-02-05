import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { API_URL } from '../config'

const AuthContext = createContext(null)

// DEV: Auth bypass requires explicit environment variable
// Set VITE_DEV_BYPASS=true in .env.local to enable
// Security: Only works in development mode with explicit opt-in
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_USER = {
  id: 999999, // Use high ID that won't conflict with real users
  email: 'dev-test@localhost',
  name: 'Dev Test User'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null)
  const [token, setToken] = useState(DEV_BYPASS ? 'dev-token' : localStorage.getItem('token'))
  const [loading, setLoading] = useState(!DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) return // Skip auth check in dev bypass mode

    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        // Token invalid, clear it
        logout()
      }
    } catch (err) {
      logout()
    } finally {
      setLoading(false)
    }
  }

  // Refresh user data (works in dev mode too)
  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token || 'dev-token'}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
  }

  const login = useCallback((userData, authToken) => {
    localStorage.setItem('token', authToken)
    setToken(authToken)
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    // Notify server of logout (for audit trail)
    const currentToken = token
    if (currentToken && currentToken !== 'dev-token') {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        })
      } catch (err) {
        // Continue with client-side logout even if server call fails
        console.warn('Server logout notification failed:', err)
      }
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [token])

  // Helper for authenticated fetch requests
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...options.headers
      }

      // Only add Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Add Content-Type for JSON if body is provided and not FormData
      if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      // Prepend API_URL if url starts with /api
      const fullUrl = url.startsWith('/api') ? `${API_URL}${url}` : url

      return fetch(fullUrl, {
        ...options,
        headers
      })
    },
    [token]
  )

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      authFetch,
      refreshUser
    }),
    [user, token, loading, login, logout, authFetch, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

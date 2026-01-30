import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config'

const AuthContext = createContext(null)

// Dev bypass - auto-authenticate in development
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_USER = {
  id: 1,
  email: 'dev@test.com',
  name: 'Dev User'
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
        headers: { 'Authorization': `Bearer ${token}` }
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

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken)
    setToken(authToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  // Helper for authenticated fetch requests
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
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
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

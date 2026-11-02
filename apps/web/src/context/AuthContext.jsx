import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { API_URL } from '../config'
import { CONNECTION_ERROR } from '../lib/apiResponse'
import { queryClient } from '../lib/queryClient'

const AuthContext = createContext(null)
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_USER = { id: 999999, email: 'dev-test@localhost', name: 'Dev Test User' }

function initialToken() {
  if (DEV_BYPASS) return 'dev-token'
  const session = sessionStorage.getItem('token')
  const legacy = localStorage.getItem('token')
  if (!session && legacy) sessionStorage.setItem('token', legacy)
  localStorage.removeItem('token')
  return session || legacy || null
}

function validUser(user) {
  return (
    user &&
    !Array.isArray(user) &&
    typeof user === 'object' &&
    (typeof user.id === 'number' || (typeof user.id === 'string' && user.id.trim()))
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null)
  const [token, setToken] = useState(initialToken)
  const [loading, setLoading] = useState(!DEV_BYPASS)
  const [authError, setAuthError] = useState(null)
  const tokenRef = useRef(token)
  const userRef = useRef(user)
  const verificationRef = useRef(0)

  const clearSession = useCallback(() => {
    void queryClient.cancelQueries()
    queryClient.clear()
    tokenRef.current = null
    userRef.current = null
    verificationRef.current += 1
    sessionStorage.removeItem('token')
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setAuthError(null)
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    const currentToken = tokenRef.current
    // Clear locally immediately, even when the logout audit service is unavailable.
    clearSession()
    if (currentToken && currentToken !== 'dev-token') {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        })
      } catch {
        /* Local logout already completed. */
      }
    }
  }, [clearSession])

  const refreshUser = useCallback(async () => {
    const currentToken = tokenRef.current
    if (!currentToken) {
      setLoading(false)
      return
    }
    const verification = ++verificationRef.current
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    setLoading(!userRef.current)
    setAuthError(null)
    const isCurrent = () =>
      tokenRef.current === currentToken && verificationRef.current === verification
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        signal: controller.signal
      })
      if (!isCurrent()) return
      if (response.status === 401 || response.status === 403) {
        clearSession()
        return
      }
      if (!response.ok) throw new Error('Session verification unavailable')
      const data = await response.json()
      if (!isCurrent()) return
      if (!validUser(data?.user)) throw new Error('Invalid session response')
      userRef.current = data.user
      setUser(data.user)
    } catch {
      // A retained JWT is a retry credential, not proof of a verified identity.
      if (isCurrent()) setAuthError(CONNECTION_ERROR)
    } finally {
      clearTimeout(timeout)
      if (isCurrent()) setLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    if (DEV_BYPASS) return
    refreshUser()
    return () => {
      verificationRef.current += 1
    }
  }, [refreshUser])

  const login = useCallback((userData, authToken) => {
    if (!validUser(userData) || typeof authToken !== 'string' || !authToken.trim())
      throw new Error('Invalid sign-in response')
    if (userRef.current?.id !== userData.id) {
      void queryClient.cancelQueries()
      queryClient.clear()
    }
    verificationRef.current += 1
    tokenRef.current = authToken
    userRef.current = userData
    sessionStorage.setItem('token', authToken)
    setToken(authToken)
    setUser(userData)
    setAuthError(null)
    setLoading(false)
  }, [])

  const authFetch = useCallback(
    async (url, options = {}) => {
      // A deferred write from a previous account must never adopt the new account's token.
      const currentToken = token
      if (currentToken !== tokenRef.current) throw new Error('Sign-in changed. Please try again.')
      const headers = { ...options.headers }
      if (currentToken) headers.Authorization = `Bearer ${currentToken}`
      if (options.body && !(options.body instanceof FormData))
        headers['Content-Type'] = 'application/json'
      const fullUrl = url.startsWith('/api') ? `${API_URL}${url}` : url
      const response = await fetch(fullUrl, { ...options, headers })
      if (currentToken && tokenRef.current === currentToken && url.startsWith('/api')) {
        let invalidSession = response.status === 401
        if (response.status === 403) {
          // A feature's scope denial must not revoke an otherwise valid sign-in.
          try {
            const body = await response.clone().json()
            invalidSession =
              body?.error === 'Invalid or expired token' ||
              body?.code === 'TOKEN_REVOKED' ||
              body?.code === 'INVALID_TOKEN'
          } catch {
            /* An unreadable forbidden response is not proof of revocation. */
          }
          if (/^\/api(?:\/v1)?\/auth\/me(?:\?|$)/.test(url)) invalidSession = true
        }
        if (invalidSession && tokenRef.current === currentToken) clearSession()
      }
      return response
    },
    [clearSession, token]
  )

  const value = useMemo(
    () => ({ user, token, loading, authError, login, logout, authFetch, refreshUser }),
    [user, token, loading, authError, login, logout, authFetch, refreshUser]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

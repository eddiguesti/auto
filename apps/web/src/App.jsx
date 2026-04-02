import { Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { GOOGLE_CLIENT_ID } from './config'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { authRoutes } from './routes/authRoutes'
import { appRoutes } from './routes/appRoutes'
import { adminRoutes } from './routes/adminRoutes'
import { marketingRoutes } from './routes/marketingRoutes'

// Lazy load components that aren't needed immediately
const CookieConsent = lazy(() => import('./components/CookieConsent'))
const HelpChatbot = lazy(() => import('./components/HelpChatbot'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Minimal loading fallback — keeps UI feel consistent
const PageLoader = () => (
  <div className="min-h-screen bg-parchment flex items-center justify-center">
    <div className="animate-pulse text-warm-brown">Loading...</div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <div className="min-h-screen bg-parchment">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {marketingRoutes()}
                    {authRoutes()}
                    {appRoutes()}
                    {adminRoutes()}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>

                {/* Cookie Consent Banner */}
                <Suspense fallback={null}>
                  <CookieConsent />
                </Suspense>

                {/* Help Chatbot */}
                <Suspense fallback={null}>
                  <HelpChatbot />
                </Suspense>
              </div>
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}

export default App

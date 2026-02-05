import { Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { GOOGLE_CLIENT_ID } from './config'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy load components that aren't needed immediately
const CookieConsent = lazy(() => import('./components/CookieConsent'))
const HelpChatbot = lazy(() => import('./components/HelpChatbot'))

// Lazy load all page components for code splitting
const Home = lazy(() => import('./pages/Home'))
const Chapter = lazy(() => import('./pages/Chapter'))
const Export = lazy(() => import('./pages/Export'))
const VoiceChat = lazy(() => import('./pages/VoiceChat'))
const Settings = lazy(() => import('./pages/Settings'))
const Landing = lazy(() => import('./pages/Landing'))
const LandingDesign1 = lazy(() => import('./pages/LandingDesign1'))
const FacebookLanding = lazy(() => import('./pages/FacebookLanding'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Cookies = lazy(() => import('./pages/Cookies'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const PreviewStyle = lazy(() => import('./pages/PreviewStyle'))

// Minimal loading fallback - keeps UI feel consistent
const PageLoader = () => (
  <div className="min-h-screen bg-parchment flex items-center justify-center">
    <div className="animate-pulse text-warm-brown">Loading...</div>
  </div>
)

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SettingsProvider>
          <div className="min-h-screen bg-parchment">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public pages */}
                <Route path="/" element={<LandingDesign1 />} />
                <Route path="/landing-original" element={<Landing />} />
                <Route path="/welcome" element={<FacebookLanding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />

                {/* Protected pages */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chapter/:chapterId"
                  element={
                    <ProtectedRoute>
                      <Chapter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/export"
                  element={
                    <ProtectedRoute>
                      <Export />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voice"
                  element={
                    <ProtectedRoute>
                      <VoiceChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/preview-style"
                  element={
                    <ProtectedRoute>
                      <PreviewStyle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>

            {/* Cookie Consent Banner - lazy loaded */}
            <Suspense fallback={null}>
              <CookieConsent />
            </Suspense>

            {/* Help Chatbot - lazy loaded */}
            <Suspense fallback={null}>
              <HelpChatbot />
            </Suspense>
          </div>
        </SettingsProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App

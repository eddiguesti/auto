import { Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { lazy, Suspense, Component } from 'react'
import * as Sentry from '@sentry/react'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { GOOGLE_CLIENT_ID } from './config'
import ProtectedRoute from './components/ProtectedRoute'

// Error Boundary to catch React errors gracefully
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info)
    Sentry.captureException(error, { extra: { componentStack: info?.componentStack } })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-parchment flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-serif text-warm-brown mb-4">Something went wrong</h1>
            <p className="text-warm-brown/70 mb-6">
              We hit an unexpected error. Your stories are safe.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.href = '/home'
              }}
              className="px-6 py-3 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Lazy load components that aren't needed immediately
const CookieConsent = lazy(() => import('./components/CookieConsent'))
const HelpChatbot = lazy(() => import('./components/HelpChatbot'))

// Lazy load all page components for code splitting

// Auth pages - login, registration, password flows
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

// Marketing pages - public-facing landing & info pages
const Landing = lazy(() => import('./pages/marketing/Landing'))
const LandingDesign1 = lazy(() => import('./pages/marketing/LandingDesign1'))
const FacebookLanding = lazy(() => import('./pages/marketing/FacebookLanding'))
const HowItWorks = lazy(() => import('./pages/marketing/HowItWorks'))
const Pricing = lazy(() => import('./pages/marketing/Pricing'))
const FAQ = lazy(() => import('./pages/marketing/FAQ'))
const About = lazy(() => import('./pages/marketing/About'))
const Gift = lazy(() => import('./pages/marketing/Gift'))
const SampleMemoir = lazy(() => import('./pages/marketing/SampleMemoir'))
const Blog = lazy(() => import('./pages/marketing/Blog'))
const BlogPost = lazy(() => import('./pages/marketing/BlogPost'))

// Legal pages - terms, privacy, cookies
const Terms = lazy(() => import('./pages/legal/Terms'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const Cookies = lazy(() => import('./pages/legal/Cookies'))

// App pages - core product (protected routes)
const Home = lazy(() => import('./pages/app/Home'))
const Chapter = lazy(() => import('./pages/app/Chapter'))
const Export = lazy(() => import('./pages/app/Export'))
const VoiceChat = lazy(() => import('./pages/app/VoiceChat'))
const Settings = lazy(() => import('./pages/app/Settings'))
const PreviewStyle = lazy(() => import('./pages/app/PreviewStyle'))
const Talk = lazy(() => import('./pages/app/Talk'))

// Minimal loading fallback - keeps UI feel consistent
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
            <div className="min-h-screen bg-parchment">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public pages */}
                  <Route path="/" element={<LandingDesign1 />} />
                  <Route path="/landing-original" element={<Landing />} />
                  <Route path="/welcome" element={<FacebookLanding />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/gift" element={<Gift />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/sample" element={<SampleMemoir />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/talk/:token" element={<Talk />} />

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
    </ErrorBoundary>
  )
}

export default App

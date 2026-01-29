import { Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { GOOGLE_CLIENT_ID } from './config'
import ProtectedRoute from './components/ProtectedRoute'
import CookieConsent from './components/CookieConsent'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Export from './pages/Export'
import VoiceChat from './pages/VoiceChat'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Cookies from './pages/Cookies'
import HowItWorks from './pages/HowItWorks'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <div className="min-h-screen bg-parchment">
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />

            {/* Protected pages */}
            <Route path="/home" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/chapter/:chapterId" element={
              <ProtectedRoute><Chapter /></ProtectedRoute>
            } />
            <Route path="/export" element={
              <ProtectedRoute><Export /></ProtectedRoute>
            } />
            <Route path="/voice" element={
              <ProtectedRoute><VoiceChat /></ProtectedRoute>
            } />
          </Routes>

          {/* Cookie Consent Banner */}
          <CookieConsent />
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App

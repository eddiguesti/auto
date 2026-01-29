import { Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { GOOGLE_CLIENT_ID } from './config'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import Export from './pages/Export'
import VoiceChat from './pages/VoiceChat'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <div className="min-h-screen bg-parchment">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App

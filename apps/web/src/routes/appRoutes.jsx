import { Route } from 'react-router-dom'
import { lazy } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'

const Home = lazy(() => import('../pages/app/Home'))
const Chapter = lazy(() => import('../pages/app/Chapter'))
const ChapterReview = lazy(() => import('../pages/app/ChapterReview'))
const Export = lazy(() => import('../pages/app/Export'))
const VoiceChat = lazy(() => import('../pages/app/VoiceChat'))
const PreviewStyle = lazy(() => import('../pages/app/PreviewStyle'))
const Settings = lazy(() => import('../pages/app/Settings'))
const QuickStory = lazy(() => import('../pages/app/QuickStory'))
const CallMe = lazy(() => import('../pages/app/CallMe'))
const Talk = lazy(() => import('../pages/app/Talk'))

/**
 * App route subtree — all core product pages.
 * Every route (except /talk/:token) requires authentication via <ProtectedRoute>.
 * /talk/:token is a magic-link-accessible page and is intentionally public.
 * Called as a function inside <Routes> so React Router can see the Route elements.
 */
export function appRoutes() {
  return (
    <>
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
        path="/chapter/:chapterId/review"
        element={
          <ProtectedRoute>
            <ChapterReview />
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
      <Route
        path="/quick-story"
        element={
          <ProtectedRoute>
            <QuickStory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/call-me"
        element={
          <ProtectedRoute>
            <CallMe />
          </ProtectedRoute>
        }
      />

      {/* Magic-link token page — auth is handled by the token itself, not ProtectedRoute */}
      <Route path="/talk/:token" element={<Talk />} />
    </>
  )
}

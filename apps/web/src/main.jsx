import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { queryClient } from './lib/queryClient.js'
import { startAnalytics } from './utils/analytics.js'
import './index.css'

// Initialize Sentry error tracking (no-op if DSN not set)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Basic error reporting remains enabled; optional telemetry is disabled.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  })
}

// The SDK is imported only after a real analytics consent choice.
const stopAnalytics = startAnalytics({
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'
})
if (import.meta.hot) import.meta.hot.dispose(stopAnalytics)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
)

// Register service worker for offline support and static asset caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // Check for updates in the background
        reg.update().catch(() => {})
      })
      .catch(err => {
        console.warn('Service worker registration failed:', err)
      })
  })
}

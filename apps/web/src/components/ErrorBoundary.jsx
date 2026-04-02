import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Report to Sentry if available
    try {
      const Sentry = window.__SENTRY__
      if (Sentry?.captureException) {
        Sentry.captureException(error, { extra: info })
      }
    } catch {
      // Sentry not available
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-parchment">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-display text-ink mb-3">Something went wrong</h2>
            <p className="text-sepia/70 mb-6">
              We're sorry for the inconvenience. Your stories are safe.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 border border-sepia/30 text-sepia rounded-xl hover:bg-sepia/5 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/home'
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

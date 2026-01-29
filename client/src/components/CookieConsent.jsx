import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    const allConsent = { necessary: true, analytics: true, marketing: true }
    localStorage.setItem('cookie-consent', JSON.stringify(allConsent))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setVisible(false)
  }

  const acceptSelected = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setVisible(false)
  }

  const rejectAll = () => {
    const minimalConsent = { necessary: true, analytics: false, marketing: false }
    localStorage.setItem('cookie-consent', JSON.stringify(minimalConsent))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-sepia/20 overflow-hidden">
        {!showPreferences ? (
          // Simple view
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🍪</span>
              <div className="flex-1">
                <h3 className="font-display text-xl text-ink mb-2">We value your privacy</h3>
                <p className="text-sm text-warmgray leading-relaxed mb-4">
                  We use cookies to enhance your experience, analyse site traffic, and for marketing purposes.
                  By clicking "Accept All", you consent to our use of cookies.
                  Read our <a href="/privacy" className="text-sepia underline">Privacy Policy</a> and{' '}
                  <a href="/cookies" className="text-sepia underline">Cookie Policy</a> for more information.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={acceptAll}
                    className="px-6 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-sepia transition"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={rejectAll}
                    className="px-6 py-2.5 border border-sepia/30 text-ink rounded-full text-sm font-medium hover:bg-sepia/5 transition"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="px-6 py-2.5 text-sepia text-sm font-medium hover:underline transition"
                  >
                    Manage Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-ink">Cookie Preferences</h3>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-warmgray hover:text-ink"
              >
                ← Back
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="p-4 bg-sepia/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Necessary Cookies</h4>
                  <span className="text-xs bg-sepia/20 text-sepia px-2 py-1 rounded">Always Active</span>
                </div>
                <p className="text-sm text-warmgray">
                  These cookies are essential for the website to function properly. They enable basic features
                  like page navigation, secure areas access, and remembering your login status.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-4 border border-sepia/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Analytics Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sepia"></div>
                  </label>
                </div>
                <p className="text-sm text-warmgray">
                  These cookies help us understand how visitors interact with our website by collecting
                  and reporting information anonymously. This helps us improve our service.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="p-4 border border-sepia/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Marketing Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sepia"></div>
                  </label>
                </div>
                <p className="text-sm text-warmgray">
                  These cookies are used to track visitors across websites. The intention is to display
                  ads that are relevant and engaging for the individual user.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={acceptSelected}
                className="flex-1 px-6 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-sepia transition"
              >
                Save Preferences
              </button>
              <button
                onClick={acceptAll}
                className="px-6 py-2.5 border border-sepia/30 text-ink rounded-full text-sm font-medium hover:bg-sepia/5 transition"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { IconArrowLeft, IconCookie } from '@tabler/icons-react'
import { Badge, Button, Card } from './ui'

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
      <Card padding="md" className="max-w-2xl mx-auto !shadow-lifted">
        {!showPreferences ? (
          // Simple view
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
              <IconCookie size={24} stroke={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg text-ink mb-1.5">We value your privacy</h3>
              <p className="text-sm text-sepia-600 leading-relaxed mb-4">
                We use cookies to enhance your experience, analyse site traffic, and for marketing
                purposes. By clicking "Accept All", you consent to our use of cookies. Read our{' '}
                <a href="/privacy" className="text-bronze-700 hover:text-bronze-800 underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/cookies" className="text-bronze-700 hover:text-bronze-800 underline">
                  Cookie Policy
                </a>{' '}
                for more information.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="md" onClick={acceptAll}>
                  Accept All
                </Button>
                <Button variant="ghost" size="md" onClick={rejectAll}>
                  Reject All
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowPreferences(true)}>
                  Manage Preferences
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg text-ink">Cookie Preferences</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferences(false)}
                icon={<IconArrowLeft size={20} stroke={1.75} />}
              >
                Back
              </Button>
            </div>

            <div className="space-y-3 mb-5">
              {/* Necessary Cookies */}
              <div className="p-4 bg-sepia-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Necessary Cookies</h4>
                  <Badge>Always Active</Badge>
                </div>
                <p className="text-sm text-sepia-600">
                  These cookies are essential for the website to function properly. They enable
                  basic features like page navigation, secure areas access, and remembering your
                  login status.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-4 border border-sepia-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Analytics Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={e => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                      className="sr-only peer"
                      aria-label="Enable analytics cookies"
                    />
                    <div className="w-11 h-6 bg-sepia-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-bronze-500/10 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-sepia-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bronze-500 peer-checked:after:border-surface"></div>
                  </label>
                </div>
                <p className="text-sm text-sepia-600">
                  These cookies help us understand how visitors interact with our website by
                  collecting and reporting information anonymously. This helps us improve our
                  service.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="p-4 border border-sepia-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Marketing Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={e => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                      className="sr-only peer"
                      aria-label="Enable marketing cookies"
                    />
                    <div className="w-11 h-6 bg-sepia-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-bronze-500/10 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-sepia-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bronze-500 peer-checked:after:border-surface"></div>
                  </label>
                </div>
                <p className="text-sm text-sepia-600">
                  These cookies are used to track visitors across websites. The intention is to
                  display ads that are relevant and engaging for the individual user.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="md" onClick={acceptSelected} className="flex-1">
                Save Preferences
              </Button>
              <Button variant="secondary" size="md" onClick={acceptAll}>
                Accept All
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import {
  DEFAULT_CONSENT,
  readCookieConsent,
  saveCookieConsent,
  subscribeCookieConsent
} from '../utils/cookieConsent'

const buttonClass =
  'min-h-11 rounded-lg border border-[#D9D5C9] px-5 py-2.5 text-sm font-medium text-[#233A32] transition hover:bg-[#F4F1E9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#233A32]'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState(
    () => readCookieConsent() || { ...DEFAULT_CONSENT }
  )
  const preferenceHeading = useRef(null)
  const preferencesButton = useRef(null)

  useEffect(() => {
    const timer = !readCookieConsent() ? setTimeout(() => setVisible(true), 1000) : null
    const unsubscribe = subscribeCookieConsent((consent, detail) => {
      clearTimeout(timer)
      setPreferences(consent || { ...DEFAULT_CONSENT })
      setVisible(detail?.reopen || !consent)
      if (detail?.reopen) setShowPreferences(true)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (showPreferences) preferenceHeading.current?.focus()
  }, [showPreferences])

  const save = consent => {
    saveCookieConsent({ ...consent, necessary: true, marketing: false })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 [&_p]:font-sans [&_button]:font-sans"
      style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-h-[70vh] max-w-[760px] overflow-y-auto rounded-xl border border-[#D9D5C9] bg-white p-5 text-[#233A32] shadow-lg sm:p-6">
        {!showPreferences ? (
          <>
            <h3 className="mb-2 font-display text-xl">Your privacy choices</h3>
            <p className="mb-5 text-base leading-relaxed text-[#4F5C54]">
              Essential cookies keep your account working. With your permission, analytics help us
              improve Easy Memoir. You can change your choice in Settings.{' '}
              <a
                href="/privacy"
                className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#233A32]"
              >
                Privacy policy
              </a>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => save({ ...DEFAULT_CONSENT, analytics: true })}
                className={buttonClass}
              >
                Accept analytics
              </button>
              <button onClick={() => save(DEFAULT_CONSENT)} className={buttonClass}>
                Essential only
              </button>
              <button
                ref={preferencesButton}
                onClick={() => setShowPreferences(true)}
                className={`${buttonClass} border-transparent underline underline-offset-4`}
              >
                Preferences
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3
                ref={preferenceHeading}
                tabIndex={-1}
                className="font-display text-xl focus:outline-none"
              >
                Cookie preferences
              </h3>
              <button
                onClick={() => {
                  setShowPreferences(false)
                  requestAnimationFrame(() => preferencesButton.current?.focus())
                }}
                className={buttonClass}
              >
                Back
              </button>
            </div>
            <div className="mb-4 rounded-lg border border-[#D9D5C9] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="font-medium">Essential cookies</h4>
                <span className="text-sm text-[#4F5C54]">Always active</span>
              </div>
              <p className="text-base leading-relaxed text-[#4F5C54]">
                These support sign-in, security and remembering your preferences.
              </p>
            </div>
            <div className="mb-5 rounded-lg border border-[#D9D5C9] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 id="analytics-cookie-label" className="font-medium">
                  Analytics cookies
                </h4>
                <label className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-labelledby="analytics-cookie-label"
                    aria-describedby="analytics-cookie-description"
                    checked={preferences.analytics}
                    onChange={event =>
                      setPreferences(previous => ({ ...previous, analytics: event.target.checked }))
                    }
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="relative h-6 w-11 rounded-full bg-[#D9D5C9] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#233A32] peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#233A32] peer-focus-visible:ring-offset-2"
                  />
                </label>
              </div>
              <p
                id="analytics-cookie-description"
                className="text-base leading-relaxed text-[#4F5C54]"
              >
                Optional usage events tell us which features are useful. Session recording is
                disabled.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => save(preferences)} className={buttonClass}>
                Save preferences
              </button>
              <button onClick={() => save(DEFAULT_CONSENT)} className={buttonClass}>
                Essential only
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

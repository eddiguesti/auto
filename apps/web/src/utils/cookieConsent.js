export const CONSENT_KEY = 'cookie-consent'
export const CONSENT_EVENT = 'easy-memoir:cookie-consent-changed'
export const DEFAULT_CONSENT = Object.freeze({
  necessary: true,
  analytics: false,
  marketing: false
})

let sessionChoice = null

function normalize(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.analytics !== 'boolean' ||
    typeof value.marketing !== 'boolean'
  )
    return null
  return { necessary: true, analytics: value.analytics, marketing: value.marketing }
}

export function readCookieConsent() {
  if (sessionChoice) return { ...sessionChoice }
  try {
    return normalize(JSON.parse(window.localStorage.getItem(CONSENT_KEY)))
  } catch {
    return null
  }
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true
}

export function saveCookieConsent(preferences) {
  const consent = normalize(preferences) || { ...DEFAULT_CONSENT }
  // Keep a real choice for this tab when storage is unavailable, including a
  // rejection that could not overwrite a previously accepted stored choice.
  sessionChoice = consent
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
    sessionChoice = null
    try {
      window.localStorage.setItem('cookie-consent-date', new Date().toISOString())
    } catch {
      /* optional metadata */
    }
  } catch {
    /* choice remains valid for this browser session */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT))
  return consent
}

export function resetCookieConsent() {
  // Reopening choices revokes analytics immediately, including blocked storage.
  sessionChoice = { ...DEFAULT_CONSENT }
  try {
    window.localStorage.removeItem(CONSENT_KEY)
    window.localStorage.removeItem('cookie-consent-date')
    sessionChoice = null
  } catch {
    /* rejection remains valid in memory */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { reopen: true } }))
}

export function subscribeCookieConsent(callback) {
  const notify = event => callback(readCookieConsent(), event?.detail)
  const storageChanged = event => {
    if (event.key !== CONSENT_KEY && event.key !== null) return
    sessionChoice = null
    notify()
  }
  window.addEventListener(CONSENT_EVENT, notify)
  window.addEventListener('storage', storageChanged)
  return () => {
    window.removeEventListener(CONSENT_EVENT, notify)
    window.removeEventListener('storage', storageChanged)
  }
}

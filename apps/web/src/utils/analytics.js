/**
 * Analytics event tracking — fire-and-forget to PostHog or own API endpoint.
 * Call trackEvent() at key conversion points throughout the app.
 */

const ANALYTICS_ENDPOINT = '/api/analytics/event'

export function trackEvent(name, properties = {}) {
  // PostHog integration (if loaded)
  if (window.posthog?.capture) {
    window.posthog.capture(name, properties)
    return
  }

  // Fallback: send to own API (fire and forget)
  try {
    const payload = {
      event: name,
      properties: {
        ...properties,
        url: window.location.pathname,
        referrer: document.referrer || null
      },
      timestamp: Date.now()
    }

    // Use sendBeacon for reliability (survives page unloads)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      )
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {})
    }
  } catch {
    // Analytics should never break the app
  }
}

// Convenience helpers for common events
export const analytics = {
  pageView: page => trackEvent('page_view', { page }),
  signupStarted: () => trackEvent('signup_started'),
  signupCompleted: () => trackEvent('signup_completed'),
  onboardingStarted: () => trackEvent('onboarding_started'),
  onboardingCompleted: () => trackEvent('onboarding_completed'),
  onboardingStep: step => trackEvent('onboarding_step', { step }),
  voiceStarted: chapterId => trackEvent('voice_interview_started', { chapterId }),
  voiceCompleted: (chapterId, questionsAnswered) =>
    trackEvent('voice_interview_completed', { chapterId, questionsAnswered }),
  storySaved: chapterId => trackEvent('story_saved', { chapterId }),
  exportInitiated: type => trackEvent('export_initiated', { type }),
  exportCompleted: type => trackEvent('export_completed', { type }),
  bookOrderStarted: () => trackEvent('book_order_started'),
  bookOrderCompleted: total => trackEvent('book_order_completed', { total }),
  premiumClicked: variant => trackEvent('premium_upgrade_clicked', { variant }),
  premiumCompleted: productId => trackEvent('premium_upgrade_completed', { productId }),
  pricingViewed: () => trackEvent('pricing_page_viewed')
}

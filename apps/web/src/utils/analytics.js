/**
 * Analytics event tracking — fire-and-forget to PostHog or own API endpoint.
 * Call trackEvent() at key conversion points throughout the app.
 */

import { hasAnalyticsConsent, subscribeCookieConsent } from './cookieConsent'
import { scrubAnalyticsEvent, safeTelemetryUrl } from '../lib/errorTelemetry'

const ANALYTICS_ENDPOINT = '/api/analytics/event'
const sdkConsentBoundaries = new WeakMap()
const requestEpoch = Symbol('analytics consent epoch')

// PostHog 1.438.6 checks opt-out when capturing, but queued retries can bypass
// that check. These narrow transport hooks must be reviewed on SDK upgrades.
// Never call shutdown() here: the SDK flushes queues during shutdown.
function installSDKConsentBoundary(sdk, epoch) {
  let boundary = sdkConsentBoundaries.get(sdk)
  if (boundary) {
    boundary.epoch = epoch
    return
  }
  boundary = { epoch }
  sdkConsentBoundaries.set(sdk, boundary)
  const guard = (owner, method) => {
    if (typeof owner?.[method] !== 'function') return
    const original = owner[method]
    owner[method] = function (options, ...args) {
      const active = boundary.epoch()
      if (!active || (options[requestEpoch] && options[requestEpoch] !== active)) return
      options[requestEpoch] = active
      return original.call(this, options, ...args)
    }
  }
  guard(sdk, '_send_request')
  guard(sdk._retryQueue, 'retriableRequest')
  guard(sdk._retryQueue, '_enqueue')
}

export function createAnalyticsController({
  key,
  host = 'https://app.posthog.com',
  loadSDK = () => import('posthog-js')
} = {}) {
  let sdk = null
  let ready = false
  let disposed = false
  let generation = 0
  let importPromise = null
  let consentEpoch = Symbol('initial consent')
  const stopCapture = () => {
    ready = false
    if (!sdk) return
    // Discard captured events, not merely the next pageview.
    if (Array.isArray(sdk._requestQueue?._queue)) sdk._requestQueue._queue.length = 0
    if (Array.isArray(sdk._retryQueue?._queue)) sdk._retryQueue._queue.length = 0
    if (Array.isArray(sdk.__request_queue)) sdk.__request_queue.length = 0
    try {
      sdk.opt_out_capturing()
    } catch {
      /* tracking must never break consent */
    }
    try {
      sdk.stopSessionRecording?.()
    } catch {
      /* recording is disabled as well */
    }
    try {
      sdk.set_config({
        disable_persistence: true,
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false
      })
    } catch {
      /* SDK unavailable */
    }
  }
  const consentChanged = () => {
    const current = ++generation
    consentEpoch = Symbol('updated consent')
    if (!hasAnalyticsConsent() || disposed) {
      stopCapture()
      return
    }
    if (!key) return
    if (!importPromise) importPromise = Promise.resolve().then(loadSDK)
    importPromise
      .then(module => {
        if (disposed || current !== generation || !hasAnalyticsConsent()) return
        const loaded = module.default || module
        if (!sdk) {
          sdk = loaded
          sdk.init(key, {
            api_host: host,
            capture_pageview: false,
            capture_pageleave: false,
            autocapture: false,
            disable_session_recording: true,
            capture_performance: false,
            // This app uses capture events only. Remote flags and extension
            // loaders have their own transports outside before_send/consent.
            advanced_disable_flags: true,
            advanced_disable_feature_flags: true,
            advanced_disable_feature_flags_on_first_load: true,
            disable_external_dependency_loading: true,
            disable_surveys: true,
            disable_surveys_automatic_display: true,
            disable_conversations: true,
            disable_product_tours: true,
            disable_web_experiments: true,
            capture_exceptions: false,
            enable_recording_console_log: false,
            logs: { captureConsoleLogs: false },
            save_campaign_params: false,
            save_referrer: false,
            get_current_url: () => window.location.origin + safeTelemetryUrl(window.location.href),
            opt_out_capturing_by_default: true,
            opt_out_persistence_by_default: true,
            persistence: 'localStorage+cookie',
            before_send: event =>
              hasAnalyticsConsent() && !disposed
                ? scrubAnalyticsEvent(event, { projectKey: key })
                : null
          })
          installSDKConsentBoundary(sdk, () =>
            hasAnalyticsConsent() && !disposed ? consentEpoch : null
          )
        }
        if (!hasAnalyticsConsent() || disposed || current !== generation) {
          stopCapture()
          return
        }
        sdk.set_config({ disable_persistence: false, capture_pageleave: true })
        sdk.opt_in_capturing({ captureEventName: false })
        ready = true
        sdk.capture('$pageview')
      })
      .catch(() => {
        if (current === generation) stopCapture()
        // A failed SDK request is handled; consented events can use the fallback.
      })
  }
  const unsubscribe = subscribeCookieConsent(consentChanged)
  consentChanged()
  return {
    capture(name, properties) {
      if (!hasAnalyticsConsent() || disposed) {
        stopCapture()
        return false
      }
      if (!ready || !sdk) return false
      try {
        const event = scrubAnalyticsEvent({ event: name, properties })
        if (!event) return false
        sdk.capture(event.event, event.properties)
        return true
      } catch {
        return false
      }
    },
    stop() {
      disposed = true
      generation++
      unsubscribe()
      stopCapture()
    }
  }
}

let controller = null
export function startAnalytics(options = {}) {
  controller?.stop()
  const started = createAnalyticsController(options)
  controller = started
  return () => {
    started.stop()
    if (controller === started) controller = null
  }
}

export function trackEvent(name, properties = {}) {
  if (!hasAnalyticsConsent()) return
  if (controller?.capture(name, properties)) return

  // Fallback: send to own API (fire and forget)
  try {
    const payload = scrubAnalyticsEvent({
      event: name,
      properties: {
        ...properties,
        url: window.location.pathname,
        referrer: document.referrer || null
      },
      timestamp: Date.now()
    })
    if (!payload) return

    // Use sendBeacon for reliability (survives page unloads)
    if (!hasAnalyticsConsent()) return
    const sent = navigator.sendBeacon?.(
      ANALYTICS_ENDPOINT,
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    )
    if (!sent && hasAnalyticsConsent()) {
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

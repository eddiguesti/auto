import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CONSENT_KEY,
  DEFAULT_CONSENT,
  saveCookieConsent,
  readCookieConsent,
  hasAnalyticsConsent
} from './cookieConsent'
import { createAnalyticsController, startAnalytics, trackEvent } from './analytics'

const accepted = { ...DEFAULT_CONSENT, analytics: true }
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
const fakeSDK = () => ({
  init: vi.fn(),
  capture: vi.fn(),
  set_config: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  stopSessionRecording: vi.fn()
})
let stops = []
const clearChoice = () => {
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null }))
}

beforeEach(() => {
  clearChoice()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn().mockReturnValue(true)
  })
})
afterEach(() => {
  stops.forEach(stop => stop())
  stops = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  clearChoice()
})

describe('analytics consent enforcement', () => {
  it('discards batch queues and prevents delayed retries after revocation and reacceptance', async () => {
    const sdk = fakeSDK()
    sdk._requestQueue = { _queue: [{ event: 'queued' }] }
    sdk._retryQueue = { _queue: [], retriableRequest: vi.fn(), _enqueue: vi.fn() }
    sdk._send_request = vi.fn()
    const send = sdk._send_request,
      retry = sdk._retryQueue.retriableRequest,
      enqueue = sdk._retryQueue._enqueue
    saveCookieConsent(accepted)
    stops.push(startAnalytics({ key: 'key', loadSDK: () => Promise.resolve({ default: sdk }) }))
    await tick()
    const oldRequest = { data: { event: 'accepted earlier' } }
    sdk._retryQueue.retriableRequest(oldRequest)
    expect(retry).toHaveBeenCalledTimes(1)
    saveCookieConsent(DEFAULT_CONSENT)
    expect(sdk._requestQueue._queue).toHaveLength(0)
    sdk._retryQueue.retriableRequest({ ...oldRequest })
    sdk._retryQueue._enqueue({ ...oldRequest })
    sdk._send_request({ ...oldRequest })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(send).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
    saveCookieConsent(accepted)
    await tick()
    sdk._retryQueue.retriableRequest({ ...oldRequest })
    expect(retry).toHaveBeenCalledTimes(1)
    sdk._retryQueue.retriableRequest({ data: { event: 'new consent' } })
    expect(retry).toHaveBeenCalledTimes(2)
  })
  it('loads no SDK and sends no fallback events before choice or after rejection', async () => {
    const loadSDK = vi.fn().mockResolvedValue({ default: fakeSDK() })
    stops.push(startAnalytics({ key: 'key', loadSDK }))
    trackEvent('before')
    saveCookieConsent(DEFAULT_CONSENT)
    trackEvent('rejected')
    await tick()
    expect(loadSDK).not.toHaveBeenCalled()
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('imports on acceptance and tracks through the same configured SDK', async () => {
    const sdk = fakeSDK(),
      loadSDK = vi.fn().mockResolvedValue({ default: sdk })
    stops.push(startAnalytics({ key: 'key', loadSDK }))
    saveCookieConsent(accepted)
    await tick()
    trackEvent('story_saved', { chapterId: 'early-life' })
    expect(loadSDK).toHaveBeenCalledTimes(1)
    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(sdk.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false })
    expect(sdk.capture).toHaveBeenCalledWith('story_saved', { chapterId: 'early-life' })
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
    expect(sdk.init.mock.calls[0][1].disable_session_recording).toBe(true)
  })

  it('revokes loaded SDK, blocks queued before_send and fallback after cross-tab rejection', async () => {
    const sdk = fakeSDK()
    saveCookieConsent(accepted)
    stops.push(startAnalytics({ key: 'key', loadSDK: () => Promise.resolve({ default: sdk }) }))
    await tick()
    const beforeSend = sdk.init.mock.calls[0][1].before_send
    expect(beforeSend({ event: 'queued' })).toEqual({ event: 'queued' })
    localStorage.setItem(CONSENT_KEY, JSON.stringify(DEFAULT_CONSENT))
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }))
    sdk.capture.mockClear()
    trackEvent('revoked')
    expect(sdk.opt_out_capturing).toHaveBeenCalled()
    expect(sdk.set_config).toHaveBeenCalledWith(
      expect.objectContaining({ disable_persistence: true, capture_pageleave: false })
    )
    expect(beforeSend({ event: 'queued' })).toBeNull()
    expect(sdk.capture).not.toHaveBeenCalled()
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not initialize a late import after consent is revoked', async () => {
    let resolve
    const sdk = fakeSDK(),
      pending = new Promise(done => {
        resolve = done
      })
    stops.push(startAnalytics({ key: 'key', loadSDK: () => pending }))
    saveCookieConsent(accepted)
    await tick()
    saveCookieConsent(DEFAULT_CONSENT)
    resolve({ default: sdk })
    await tick()
    expect(sdk.init).not.toHaveBeenCalled()
    expect(sdk.opt_in_capturing).not.toHaveBeenCalled()
  })

  it('accept-revoke-accept during import initializes once for the current consent', async () => {
    let resolve
    const sdk = fakeSDK(),
      pending = new Promise(done => {
        resolve = done
      })
    stops.push(startAnalytics({ key: 'key', loadSDK: () => pending }))
    saveCookieConsent(accepted)
    saveCookieConsent(DEFAULT_CONSENT)
    saveCookieConsent(accepted)
    resolve({ default: sdk })
    await tick()
    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(sdk.opt_in_capturing).toHaveBeenCalledTimes(1)
  })

  it('handles a failed SDK import and falls back only with current consent', async () => {
    saveCookieConsent(accepted)
    stops.push(startAnalytics({ key: 'key', loadSDK: () => Promise.reject(new Error('offline')) }))
    await tick()
    trackEvent('accepted_fallback')
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
    saveCookieConsent(DEFAULT_CONSENT)
    trackEvent('rejected_fallback')
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
  })

  it('uses fetch when beacon is unavailable or returns false, and never before consent', () => {
    navigator.sendBeacon.mockReturnValue(false)
    trackEvent('blocked')
    expect(fetch).not.toHaveBeenCalled()
    saveCookieConsent(accepted)
    trackEvent('allowed')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/event',
      expect.objectContaining({ method: 'POST', keepalive: true })
    )
  })

  it('rejects malformed or truthy legacy values instead of treating them as consent', () => {
    localStorage.setItem(CONSENT_KEY, '{"analytics":"true","marketing":false}')
    expect(hasAnalyticsConsent()).toBe(false)
    trackEvent('blocked')
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('safe storage failures preserve the explicit session rejection and acceptance', () => {
    saveCookieConsent(accepted)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    saveCookieConsent(DEFAULT_CONSENT)
    expect(readCookieConsent().analytics).toBe(false)
    trackEvent('blocked')
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
    saveCookieConsent(accepted)
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('stopping a controller prevents late SDK initialization', async () => {
    let resolve
    const sdk = fakeSDK(),
      pending = new Promise(done => {
        resolve = done
      })
    saveCookieConsent(accepted)
    const controller = createAnalyticsController({ key: 'key', loadSDK: () => pending })
    controller.stop()
    resolve({ default: sdk })
    await tick()
    expect(sdk.init).not.toHaveBeenCalled()
  })
})

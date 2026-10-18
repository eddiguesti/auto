import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import CookieConsent from './CookieConsent'
import {
  readCookieConsent,
  CONSENT_EVENT,
  resetCookieConsent,
  saveCookieConsent,
  DEFAULT_CONSENT
} from '../utils/cookieConsent'

beforeEach(() => {
  saveCookieConsent(DEFAULT_CONSENT)
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null }))
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
const show = () => {
  render(<CookieConsent />)
  act(() => vi.advanceTimersByTime(1000))
}

describe('cookie choices', () => {
  it('reopens preferences and revokes accepted tracking without a reload even if storage is blocked', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }))
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    act(() => resetCookieConsent())
    expect(readCookieConsent().analytics).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'Analytics cookies' })).not.toBeChecked()
  })
  it('saves essential-only choice and notifies analytics immediately', () => {
    const listener = vi.fn()
    window.addEventListener(CONSENT_EVENT, listener)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }))
    expect(readCookieConsent()).toEqual({ necessary: true, analytics: false, marketing: false })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument()
    window.removeEventListener(CONSENT_EVENT, listener)
  })

  it('uses a named keyboard-focusable analytics checkbox and saves selected preferences', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    const checkbox = screen.getByRole('checkbox', { name: 'Analytics cookies' })
    expect(checkbox).not.toBeChecked()
    checkbox.focus()
    expect(checkbox).toHaveFocus()
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
    expect(readCookieConsent().analytics).toBe(true)
  })

  it('accepts analytics explicitly and remains usable when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }))
    expect(readCookieConsent().analytics).toBe(true)
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument()
  })

  it('reopens safely for an invalidated choice in another tab', () => {
    localStorage.setItem('cookie-consent', JSON.stringify({ analytics: true, marketing: false }))
    render(<CookieConsent />)
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument()
    act(() => {
      localStorage.clear()
      window.dispatchEvent(new StorageEvent('storage', { key: null }))
    })
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toBeInTheDocument()
  })
})

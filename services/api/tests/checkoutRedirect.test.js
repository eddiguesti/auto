import { describe, expect, it } from 'vitest'
import { checkoutRedirectUrl } from '../utils/checkoutRedirect.js'

const app = 'https://easymemoir.co.uk'
const fallback = 'https://easymemoir.co.uk/export?success=true'
describe('Stripe checkout redirects', () => {
  it('accepts and canonicalizes exact app-origin absolute HTTP(S) paths', () => {
    expect(checkoutRedirectUrl(`${app}/export?success=1#book`, app, '/export?success=true')).toBe(
      `${app}/export?success=1#book`
    )
    expect(
      checkoutRedirectUrl('https://EASYMEMOIR.CO.UK:443/export', app, '/export?success=true')
    ).toBe(`${app}/export`)
    expect(
      checkoutRedirectUrl('http://localhost:5173/export', 'http://localhost:5173', '/export')
    ).toBe('http://localhost:5173/export')
  })

  it.each([
    'https://easymemoir.co.uk.attacker.example/export',
    'https://easymemoir.co.uk@attacker.example/export',
    'https://attacker:secret@easymemoir.co.uk/export',
    'https://attacker.example/?next=https://easymemoir.co.uk',
    'http://easymemoir.co.uk/export',
    'https://easymemoir.co.uk:444/export',
    'javascript:alert(1)',
    'data:text/html,redirect',
    '//easymemoir.co.uk/export',
    '/export',
    'not-a-url',
    '',
    undefined,
    null
  ])('falls back for an unsafe or unavailable redirect %j', value => {
    expect(checkoutRedirectUrl(value, app, '/export?success=true')).toBe(fallback)
  })

  it('preserves the separate cancel fallback', () => {
    expect(checkoutRedirectUrl(undefined, app, '/export?cancelled=true')).toBe(
      `${app}/export?cancelled=true`
    )
  })

  it.each(['javascript:alert(1)', 'https://user:secret@easymemoir.co.uk', 'invalid-app-url'])(
    'rejects an invalid configured APP_URL %s',
    value => {
      expect(() => checkoutRedirectUrl(`${app}/export`, value, '/export')).toThrow()
    }
  )
})

import { ApiError } from '../api/errors.js'
import { requireSigningSecret } from '../api/auth.js'
import { escapeHtml } from './security.js'
const encoder = new TextEncoder()
const encode = bytes =>
  btoa(Array.from(bytes, value => String.fromCharCode(value)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
async function key(env, usage) {
  const secret = env.NOTIFICATION_PAYLOAD_KEY || env.JWT_SECRET
  requireSigningSecret(secret)
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`easy-memoir-account-optout-v1:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  )
}
export async function accountOptoutToken(userId, env) {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(env, ['sign']),
    encoder.encode(String(userId))
  )
  return `${userId}.${encode(new Uint8Array(signature))}`
}
export async function verifyAccountOptout(raw, env) {
  try {
    if (typeof raw !== 'string' || raw.length > 100) throw new Error('Invalid token')
    const [id, part, ...rest] = raw.split('.')
    if (
      rest.length ||
      !/^[1-9]\d{0,9}$/.test(id) ||
      Number(id) > 2147483647 ||
      !/^[A-Za-z0-9_-]{43}$/.test(part)
    )
      throw new Error('Invalid token')
    const bytes = Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/')), value =>
      value.charCodeAt(0)
    )
    if (
      encode(bytes) !== part ||
      !(await crypto.subtle.verify('HMAC', await key(env, ['verify']), bytes, encoder.encode(id)))
    )
      throw new Error('Invalid token')
    return Number(id)
  } catch {
    throw new ApiError(400, { error: 'Invalid unsubscribe link' })
  }
}
export function confirmationPage(url, title, description) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><body style="font:20px system-ui;max-width:40rem;margin:4rem auto;padding:1rem"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><form method="post" action="${escapeHtml(url)}"><button style="font:inherit;padding:1rem 2rem" type="submit">Confirm</button></form></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        'Referrer-Policy': 'no-referrer'
      }
    }
  )
}

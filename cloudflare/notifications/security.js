import { ApiError } from '../api/errors.js'
import { requireSigningSecret } from '../api/auth.js'
const encoder = new TextEncoder()
const encode = bytes => btoa(Array.from(bytes, value => String.fromCharCode(value)).join(''))
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0))
async function payloadKey(env) {
  const secret = env.NOTIFICATION_PAYLOAD_KEY || env.JWT_SECRET
  requireSigningSecret(secret)
  const hash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`easy-memoir-notification-v1:${secret}`)
  )
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}
export async function sealNotification(value, env) {
  const text = JSON.stringify(value)
  const plaintext = encoder.encode(text)
  if (plaintext.byteLength > 100000)
    throw new ApiError(413, { error: 'Notification payload too large' })
  const nonce = crypto.getRandomValues(new Uint8Array(12)),
    encrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, await payloadKey(env), plaintext)
    )
  return JSON.stringify({ v: 1, nonce: encode(nonce), ciphertext: encode(encrypted) })
}
export async function openNotification(value, env) {
  const box = JSON.parse(value)
  if (box.v !== 1 || typeof box.ciphertext !== 'string' || box.ciphertext.length > 140000)
    throw new Error('Invalid notification envelope')
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(box.nonce) },
    await payloadKey(env),
    decode(box.ciphertext)
  )
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
export async function verifyTelegramSecret(request, env) {
  const expected = env.TELEGRAM_WEBHOOK_SECRET,
    provided = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (typeof expected !== 'string' || expected.length < 32 || expected.length > 256)
    throw new ApiError(503, { error: 'Telegram webhook is not configured' })
  if (typeof provided !== 'string' || provided.length > 256) return false
  const algorithm = { name: 'HMAC', hash: 'SHA-256' },
    message = encoder.encode('easy-memoir-telegram-webhook-v1')
  const [trusted, candidate] = await Promise.all([
    crypto.subtle.importKey('raw', encoder.encode(expected), algorithm, false, ['verify']),
    crypto.subtle.importKey('raw', encoder.encode(provided || 'invalid'), algorithm, false, [
      'sign'
    ])
  ])
  const signature = await crypto.subtle.sign('HMAC', candidate, message)
  return crypto.subtle.verify('HMAC', trusted, signature, message)
}
export const escapeHtml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  )
export function appUrl(env, path) {
  const origin = new URL(env.APP_URL || 'https://easymemoir.co.uk')
  if (origin.protocol !== 'https:' || origin.username || origin.password)
    throw new ApiError(503, { error: 'Application URL unavailable' })
  return new URL(path, origin).href
}

import { ApiError } from './errors.js'

const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  )

function applicationLink(path, rawToken, env) {
  const url = new URL(env.APP_URL || 'https://easymemoir.co.uk')
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new ApiError(503, { error: 'Email application URL unavailable' })
  const link = new URL(path, url)
  link.searchParams.set('token', rawToken)
  return escape(link.href)
}
const sender = env => env.EMAIL_FROM || 'Easy Memoir <hello@easymemoir.co.uk>'

export function verificationEmail(user, rawToken, env) {
  const link = applicationLink('/verify-email', rawToken, env)
  return {
    from: sender(env),
    to: user.email,
    subject: 'Verify Your Email - Easy Memoir',
    html: `<html lang="en"><body><h1>Verify Your Email</h1><p>Hello ${escape(user.name)},</p><p>Please verify your email address to secure your Easy Memoir account.</p><p><a href="${link}">Verify Email Address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></body></html>`
  }
}
export function passwordResetEmail(user, rawToken, env) {
  const link = applicationLink('/reset-password', rawToken, env)
  return {
    from: sender(env),
    to: user.email,
    subject: 'Reset Your Password - Easy Memoir',
    html: `<html lang="en"><body><h1>Reset Your Password</h1><p>Hello ${escape(user.name)},</p><p>We received a request to reset your Easy Memoir password.</p><p><a href="${link}">Reset Password</a></p><p>This link expires in one hour and can be used only once. If you did not request this email, you can ignore it; your password has not changed.</p></body></html>`
  }
}

export async function sendEmail(message, env, { idempotencyKey } = {}) {
  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== 'string' ||
      !idempotencyKey ||
      idempotencyKey.length > 256 ||
      /[\r\n]/.test(idempotencyKey))
  )
    throw new TypeError('Invalid email idempotency key')
  if (!env.EMAIL_PROVIDER?.fetch && !env.RESEND_API_KEY)
    throw new ApiError(503, { error: 'Email provider unavailable' })
  const request = new Request('https://api.resend.com/emails', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(env.RESEND_API_KEY ? { Authorization: `Bearer ${env.RESEND_API_KEY}` } : {})
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10000)
  })
  const response = await (env.EMAIL_PROVIDER?.fetch
    ? env.EMAIL_PROVIDER.fetch(request)
    : fetch(request))
  if (!response.ok) throw new ApiError(502, { error: 'Email provider unavailable' })
  const reader = response.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 65536) {
        await reader.cancel()
        throw new ApiError(502, { error: 'Email provider response invalid' })
      }
      chunks.push(value)
    }
  const bytes = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.byteLength
  }
  let result
  try {
    result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new ApiError(502, { error: 'Email provider response invalid' })
  }
  if (typeof result.id !== 'string' || !result.id || result.id.length > 255)
    throw new ApiError(502, { error: 'Email provider response invalid' })
  return result.id
}
export const sendVerificationEmail = async (user, rawToken, env) =>
  sendEmail(verificationEmail(user, rawToken, env), env)
export const sendPasswordResetEmail = async (user, rawToken, env) =>
  sendEmail(passwordResetEmail(user, rawToken, env), env)

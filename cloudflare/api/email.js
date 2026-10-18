import { ApiError } from './errors.js'

const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
  )

export function verificationEmail(user, rawToken, env) {
  const url = new URL(env.APP_URL || 'https://easymemoir.co.uk')
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new ApiError(503, { error: 'Email application URL unavailable' })
  const link = new URL('/verify-email', url)
  link.searchParams.set('token', rawToken)
  return {
    from: env.EMAIL_FROM || 'Easy Memoir <hello@easymemoir.co.uk>',
    to: user.email,
    subject: 'Verify Your Email - Easy Memoir',
    html: `<html lang="en"><body><h1>Verify Your Email</h1><p>Hello ${escape(user.name)},</p><p>Please verify your email address to secure your Easy Memoir account.</p><p><a href="${escape(link.href)}">Verify Email Address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></body></html>`
  }
}

export async function sendVerificationEmail(user, rawToken, env) {
  const message = verificationEmail(user, rawToken, env)
  if (!env.EMAIL_PROVIDER?.fetch && !env.RESEND_API_KEY)
    throw new ApiError(503, { error: 'Email provider unavailable' })
  const request = new Request('https://api.resend.com/emails', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      ...(env.RESEND_API_KEY ? { Authorization: `Bearer ${env.RESEND_API_KEY}` } : {})
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10000)
  })
  const response = await (env.EMAIL_PROVIDER?.fetch
    ? env.EMAIL_PROVIDER.fetch(request)
    : fetch(request))
  if (!response.ok) throw new ApiError(502, { error: 'Email provider unavailable' })
  const result = await response.json()
  if (typeof result.id !== 'string' || !result.id)
    throw new ApiError(502, { error: 'Email provider response invalid' })
}

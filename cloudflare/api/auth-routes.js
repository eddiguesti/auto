import { authSchemas } from '../../services/api/schemas/index.js'
import { ApiError, json } from './errors.js'
import { readJson, validate } from './request.js'
import { issueToken, randomHex, requireSigningSecret, requireFullScope } from './auth.js'
import { createAuthRepository } from './auth-repository.js'
import { authRateMode, enforceAuthRateLimit, sha256 } from './auth-rate-limit.js'
import { comparePassword, hashPassword } from './passwords.js'
import { sendVerificationEmail, sendPasswordResetEmail } from './email.js'
import { googleBudgetSubject, verifyGoogleCredential, googleAccount } from './google-auth.js'

// Public account-budget auth parses at most 16 KiB before reserving its D1
// budget. Credentials, opaque recovery tokens and client headers never become
// trusted network identity. Legacy trusted-ingress parsing remains unchanged.
async function readBudgetAuthJson(request) {
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new ApiError(415, { error: 'JSON content type required' })
  const reader = request.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16384) {
        await reader.cancel()
        throw new ApiError(413, { error: 'Request body too large' })
      }
      chunks.push(value)
    }
  try {
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Object required')
    return value
  } catch {
    throw new ApiError(400, { error: 'Validation failed', message: 'body: invalid JSON object' })
  }
}
function accountBudgetSubject(path, input) {
  if (path === '/auth/google') return googleBudgetSubject(input?.credential)
  if (
    !['/auth/login', '/auth/register', '/auth/forgot-password'].includes(path) ||
    typeof input?.email !== 'string'
  )
    return undefined
  const email = input.email.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? `email:${email}`
    : undefined
}

export async function handlePublicAuth({ request, env, db, path, now }) {
  const publicPost = [
    '/auth/login',
    '/auth/google',
    '/auth/register',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password'
  ]
  if (
    !(request.method === 'POST' && publicPost.includes(path)) &&
    !(request.method === 'GET' && path === '/auth/verify-reset-token')
  )
    return null
  const repository = createAuthRepository(db, { wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE })
  let input
  if (authRateMode(env) === 'account-budget' && request.method === 'POST') {
    try {
      input = await readBudgetAuthJson(request)
    } catch (error) {
      // Malformed requests still consume the shared abuse budget.
      await enforceAuthRateLimit(request, env, db, now)
      throw error
    }
  }
  await enforceAuthRateLimit(request, env, db, now, { account: accountBudgetSubject(path, input) })
  if (path === '/auth/verify-reset-token') {
    const raw = new URL(request.url).searchParams.get('token')
    if (!raw) return json({ valid: false, error: 'Token is required' }, 400)
    const valid =
      raw.length <= 512 && Boolean(await repository.findResetToken(await sha256(raw), now))
    return json({ valid })
  }
  input ??= await readJson(request)
  if (path === '/auth/google') {
    requireSigningSecret(env.JWT_SECRET)
    const origin = request.headers.get('Origin')
    if (origin && origin !== new URL(request.url).origin)
      throw new ApiError(403, { error: 'Invalid sign-in origin' })
    const { credential } = validate(input, authSchemas.googleAuth.body)
    const identity = await verifyGoogleCredential(credential, env, now)
    const user = await googleAccount(db, identity, now)
    return json({ user, token: await issueToken(user, env, now) })
  }
  if (path === '/auth/forgot-password') {
    if (!input.email || typeof input.email !== 'string')
      throw new ApiError(400, { error: 'Email is required' })
    const success = {
      success: true,
      message:
        'If an account exists with that email, you will receive a password reset link shortly.'
    }
    const email = input.email.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(success)
    try {
      const user = await repository.findByEmail(email)
      if (user?.password_hash) {
        const raw = randomHex(32)
        if (await repository.createRecoveryToken(user.id, await sha256(raw), now, 'reset'))
          await sendPasswordResetEmail(user, raw, env)
      }
    } catch {
      // The same response covers unknown accounts, send limits and delivery
      // outages. Never disclose credentials, email addresses or recovery tokens.
      console.error('Password recovery request could not deliver an email')
    }
    return json(success)
  }
  if (path === '/auth/reset-password') {
    if (typeof input.token !== 'string' || !input.token)
      throw new ApiError(400, { error: 'Reset token is required' })
    if (typeof input.password !== 'string' || !input.password)
      throw new ApiError(400, { error: 'New password is required' })
    // Login and registration normalize surrounding whitespace in the source API.
    const password = input.password.trim()
    if (password.length < 8)
      throw new ApiError(400, { error: 'Password must be at least 8 characters' })
    if (password.length > 128)
      throw new ApiError(400, { error: 'Password must be at most 128 characters' })
    if (!/[a-z]/.test(password))
      throw new ApiError(400, { error: 'Password must contain a lowercase letter' })
    if (!/[A-Z]/.test(password))
      throw new ApiError(400, { error: 'Password must contain an uppercase letter' })
    if (!/[0-9]/.test(password))
      throw new ApiError(400, { error: 'Password must contain a number' })
    const hash = input.token.length <= 512 ? await sha256(input.token) : ''
    const token = hash && (await repository.findResetToken(hash, now))
    if (
      !token ||
      !(await repository.resetPassword({
        tokenId: token.id,
        userId: token.user_id,
        hash,
        passwordHash: await hashPassword(password),
        now
      }))
    )
      throw new ApiError(400, { error: 'Invalid or expired reset link. Please request a new one.' })
    return json({
      success: true,
      message:
        'Your password has been reset successfully. You can now sign in with your new password.'
    })
  }
  if (path === '/auth/verify-email') {
    if (typeof input.token !== 'string' || !input.token)
      throw new ApiError(400, { error: 'Verification token is required' })
    if (!(await repository.verifyEmail(await sha256(input.token), now)))
      throw new ApiError(400, {
        error: 'Invalid or expired verification link. Please request a new one.'
      })
    return json({ success: true, message: 'Email verified successfully' })
  }
  requireSigningSecret(env.JWT_SECRET)
  if (path === '/auth/login') {
    const { email, password } = validate(input, authSchemas.login.body)
    const user = await repository.findByEmail(email)
    if (!user) throw new ApiError(401, { error: 'Invalid email or password' })
    if (!user.password_hash)
      throw new ApiError(401, { error: 'Please use Google Sign-In for this account' })
    if (!(await comparePassword(password, user.password_hash)))
      throw new ApiError(401, { error: 'Invalid email or password' })
    const { id, name, avatar_url } = user
    return json({
      user: { id, email: user.email, name, avatar_url },
      token: await issueToken(user, env, now)
    })
  }
  const { email, password, name, birthYear, _hp, _ts } = validate(input, authSchemas.register.body)
  if (_hp) throw new ApiError(400, { error: 'Registration failed' })
  if (_ts && now - _ts < 2000)
    throw new ApiError(400, { error: 'Please take your time filling out the form' })
  if (_ts && now - _ts > 3600000) throw new ApiError(400, { error: 'Registration failed' })
  if (await repository.findByEmail(email))
    throw new ApiError(400, {
      error: 'Registration failed. Please try again or use a different email.'
    })
  const rawVerificationToken = randomHex(32)
  const passwordHash = await hashPassword(password)
  const user = await repository.register({
    email,
    passwordHash,
    name,
    birthYear,
    verificationHash: await sha256(rawVerificationToken),
    now
  })
  const token = await issueToken(user, env, now)
  // Source registration remains successful when email delivery fails. No fake
  // delivery success and no token/message/recipient data in logs.
  try {
    await sendVerificationEmail(user, rawVerificationToken, env)
  } catch {
    console.error('Registration verification email was not delivered')
  }
  return json({ user, token }, 201)
}

// Called only after the entrypoint verifies JWT, revocation and active account.
export async function handleAuthenticatedAuth({ request, env, db, path, now, user, claims }) {
  if (request.method !== 'POST' || path !== '/auth/resend-verification') return null
  requireFullScope(claims)
  await enforceAuthRateLimit(request, env, db, now, { account: `user:${user.id}` })
  const repository = createAuthRepository(db, { wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE })
  const current = await repository.findById(user.id)
  if (!current) throw new ApiError(404, { error: 'User not found' })
  if (current.email_verified) return json({ success: true, message: 'Email already verified' })
  if (current.google_id)
    return json({ success: true, message: 'Google accounts are already verified' })
  const raw = randomHex(32)
  if (!(await repository.createRecoveryToken(current.id, await sha256(raw), now, 'verification'))) {
    const latest = await repository.findById(user.id)
    if (latest?.email_verified) return json({ success: true, message: 'Email already verified' })
    if (latest?.google_id)
      return json({ success: true, message: 'Google accounts are already verified' })
    throw new ApiError(429, {
      error: 'Please wait a few minutes before requesting another verification email.',
      retryAfter: 300
    })
  }
  await sendVerificationEmail(current, raw, env)
  return json({ success: true, message: 'Verification email sent. Please check your inbox.' })
}

import { authSchemas } from '../../services/api/schemas/index.js'
import { ApiError, json } from './errors.js'
import { readJson, validate } from './request.js'
import { issueToken, randomHex, requireSigningSecret } from './auth.js'
import { createAuthRepository } from './auth-repository.js'
import { enforceAuthRateLimit, sha256 } from './auth-rate-limit.js'
import { comparePassword, hashPassword } from './passwords.js'
import { sendVerificationEmail } from './email.js'

export async function handlePublicAuth({ request, env, db, path, now }) {
  if (
    request.method !== 'POST' ||
    !['/auth/login', '/auth/register', '/auth/verify-email'].includes(path)
  )
    return null
  const repository = createAuthRepository(db, { wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE })
  await enforceAuthRateLimit(request, env, db, now)
  const input = await readJson(request)
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

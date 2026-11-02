import { ApiError, json } from './errors.js'
import { randomHex } from './auth.js'
import { sha256 } from './auth-rate-limit.js'
import { timestampForStorage } from './value-codecs.js'
import { readNotificationJson } from '../notifications/request.js'
import { reserveNotificationRate } from '../notifications/rate-limit.js'
import { sealNotification, appUrl, escapeHtml } from '../notifications/security.js'
import { confirmationPage } from '../notifications/unsubscribe.js'
export async function handleNewsletter({ request, env, db, path, now }) {
  if (!path.startsWith('/newsletter/')) return null
  if (path === '/newsletter/subscribe' && request.method === 'POST') {
    const input = await readNotificationJson(request, 4096)
    if (input._hp) throw new ApiError(400, { error: 'Subscription failed' })
    if (
      input._ts !== undefined &&
      (!Number.isFinite(input._ts) || now - input._ts < 2000 || now - input._ts > 3600000)
    )
      throw new ApiError(400, { error: 'Please take your time filling out the form' })
    if (typeof input.email !== 'string' || !input.email.trim())
      throw new ApiError(400, { error: 'Email is required' })
    const email = input.email.trim().toLowerCase()
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ApiError(400, { error: 'Please enter a valid email address' })
    await reserveNotificationRate(db, 'newsletter', email, now, {
      window: 3600,
      globalMaximum: 100,
      maximum: 5
    })
    if (
      env.NOTIFICATION_DELIVERY_ENABLED !== 'true' ||
      (!env.EMAIL_PROVIDER?.fetch && !env.RESEND_API_KEY)
    )
      throw new ApiError(503, {
        error: 'Newsletter signup is temporarily unavailable. Please try again later.'
      })
    const confirm = randomHex(32),
      unsubscribe = randomHex(32),
      jobId = crypto.randomUUID(),
      wall = timestampForStorage(now)
    const link = appUrl(env, `/api/newsletter/confirm?token=${confirm}`),
      optout = appUrl(env, `/api/newsletter/unsubscribe?token=${unsubscribe}`)
    const payload = await sealNotification(
      {
        from: env.EMAIL_FROM || 'Easy Memoir <hello@easymemoir.co.uk>',
        to: email,
        subject: 'Confirm your Easy Memoir newsletter subscription',
        text: `Please confirm your newsletter subscription: ${link}\nIf you did not request it, ignore this email or unsubscribe: ${optout}`,
        html: `<html lang="en"><body><h1>Confirm your subscription</h1><p><a href="${escapeHtml(link)}">Confirm my newsletter subscription</a></p><p>If you did not request this email, ignore it or <a href="${escapeHtml(optout)}">unsubscribe</a>.</p></body></html>`,
        headers: {
          'List-Unsubscribe': `<${optout}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      },
      env
    )
    await db.batch([
      db
        .prepare(
          'INSERT INTO newsletter_subscribers(email,unsubscribed_at,source,user_agent) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING'
        )
        .bind(email, wall, 'blog', request.headers.get('User-Agent')?.slice(0, 500) || null),
      db
        .prepare(
          'INSERT INTO native_newsletter_consent(subscriber_id) SELECT id FROM newsletter_subscribers WHERE email=? ON CONFLICT(subscriber_id) DO NOTHING'
        )
        .bind(email),
      db
        .prepare(
          `UPDATE native_newsletter_consent SET revision=revision+1,last_confirmation_at=? WHERE subscriber_id=(SELECT id FROM newsletter_subscribers WHERE email=?) AND (confirmed_at IS NULL OR EXISTS(SELECT 1 FROM newsletter_subscribers WHERE email=? AND unsubscribed_at IS NOT NULL)) AND last_confirmation_at<=? RETURNING subscriber_id`
        )
        .bind(now, email, email, now - 3600000),
      db
        .prepare(
          `INSERT INTO native_notification_jobs(id,occurrence_key,subscriber_id,channel,preference_key,authorization_revision,payload,next_attempt_at,created_at,updated_at)
    SELECT ?,'newsletter-confirm:'||c.subscriber_id||':'||c.revision,c.subscriber_id,'email','newsletter_confirmation',c.revision,?,?,?,? FROM native_newsletter_consent c JOIN newsletter_subscribers n ON n.id=c.subscriber_id WHERE changes()=1 AND n.email=?`
        )
        .bind(jobId, payload, now, now, now, email),
      db
        .prepare(
          `INSERT INTO native_newsletter_tokens(token_hash,subscriber_id,purpose,expires_at,created_at) SELECT ?,subscriber_id,'confirm',?,? FROM native_notification_jobs WHERE id=?`
        )
        .bind(await sha256(confirm), now + 24 * 3600000, now, jobId),
      db
        .prepare(
          `INSERT INTO native_newsletter_tokens(token_hash,subscriber_id,purpose,expires_at,created_at) SELECT ?,subscriber_id,'unsubscribe',?,? FROM native_notification_jobs WHERE id=?`
        )
        .bind(await sha256(unsubscribe), Number.MAX_SAFE_INTEGER, now, jobId)
    ])
    return json({
      success: true,
      message: 'Thank you. If confirmation is needed, please check your inbox for a link.'
    })
  }
  if (
    !['/newsletter/confirm', '/newsletter/unsubscribe'].includes(path) ||
    !['GET', 'POST'].includes(request.method)
  )
    return null
  const purpose = path.endsWith('/confirm') ? 'confirm' : 'unsubscribe',
    raw = new URL(request.url).searchParams.get('token')
  if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw))
    throw new ApiError(400, { error: 'Invalid subscription link' })
  const hash = await sha256(raw),
    token = await db
      .prepare(
        'SELECT subscriber_id,used_at FROM native_newsletter_tokens WHERE token_hash=? AND purpose=? AND expires_at>?'
      )
      .bind(hash, purpose, now)
      .first()
  if (!token) throw new ApiError(400, { error: 'Invalid or expired subscription link' })
  if (request.method === 'GET')
    return confirmationPage(
      request.url,
      purpose === 'confirm' ? 'Confirm newsletter subscription' : 'Unsubscribe from the newsletter',
      purpose === 'confirm'
        ? 'Receive the Easy Memoir newsletter at this email address?'
        : 'Stop newsletter emails for this address?'
    )
  const wall = timestampForStorage(now)
  if (purpose === 'confirm') {
    if (token.used_at !== null) {
      const active = await db
        .prepare(
          'SELECT n.id FROM newsletter_subscribers n JOIN native_newsletter_consent c ON c.subscriber_id=n.id WHERE n.id=? AND n.unsubscribed_at IS NULL AND c.confirmed_at IS NOT NULL'
        )
        .bind(token.subscriber_id)
        .first()
      if (!active)
        throw new ApiError(400, {
          error: 'This confirmation has expired. Please request a new subscription link.'
        })
      return json({ success: true, message: 'Subscription already confirmed.' })
    }
    const rows = await db.batch([
      db
        .prepare(
          "UPDATE native_newsletter_tokens SET used_at=? WHERE token_hash=? AND purpose='confirm' AND used_at IS NULL AND expires_at>? RETURNING subscriber_id"
        )
        .bind(now, hash, now),
      db
        .prepare(
          'UPDATE newsletter_subscribers SET unsubscribed_at=NULL,subscribed_at=? WHERE changes()=1 AND id=? RETURNING id'
        )
        .bind(wall, token.subscriber_id),
      db
        .prepare(
          'UPDATE native_newsletter_consent SET confirmed_at=? WHERE changes()=1 AND subscriber_id=?'
        )
        .bind(now, token.subscriber_id)
    ])
    if (!rows[0].results.length)
      throw new ApiError(409, { error: 'The confirmation link changed; please retry' })
    return json({ success: true, message: 'Your newsletter subscription is confirmed.' })
  }
  await db.batch([
    db
      .prepare('UPDATE newsletter_subscribers SET unsubscribed_at=? WHERE id=?')
      .bind(wall, token.subscriber_id),
    db
      .prepare(
        'UPDATE native_newsletter_consent SET confirmed_at=NULL,revision=revision+1 WHERE subscriber_id=?'
      )
      .bind(token.subscriber_id),
    db
      .prepare(
        "UPDATE native_newsletter_tokens SET used_at=COALESCE(used_at,?) WHERE subscriber_id=? AND purpose='confirm'"
      )
      .bind(now, token.subscriber_id),
    db
      .prepare(
        "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='CONSENT_REVOKED',updated_at=? WHERE subscriber_id=? AND state IN ('pending','processing')"
      )
      .bind(now, token.subscriber_id)
  ])
  return json({ success: true, message: 'You have been unsubscribed.' })
}

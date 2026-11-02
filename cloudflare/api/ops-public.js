import { PRODUCTS, PRINT_PACKAGE } from '../../packages/shared/payment-catalog.js'
import { ApiError, json } from './errors.js'
import { sha256, trustedClientSubject, authRateMode } from './auth-rate-limit.js'
import { verifyToken, requireFullScope } from './auth.js'
import { createRepositories } from './repositories.js'

async function publicBody(request, limit = 32768) {
  const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
  if (!['application/json', 'application/csp-report', 'application/reports+json'].includes(type))
    throw new ApiError(415, { error: 'JSON required' })
  const reader = request.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new ApiError(413, { error: 'Request body too large' })
      }
      chunks.push(value)
    }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new ApiError(400, { error: 'Invalid JSON' })
  }
}
async function publicBudget(request, env, db, namespace, now, maximum) {
  // Public non-auth traffic has its own bounded deployment budget. It never
  // consumes login reservations or trusts spoofable IP headers.
  const started = Math.floor(now / 3_600_000) * 3600,
    key = `budget:ops:${namespace}`
  const statement = (name, max) =>
    db
      .prepare(
        `INSERT INTO auth_rate_limits(subject_hash,window_started_at,attempts) VALUES(?,?,1)
    ON CONFLICT(subject_hash) DO UPDATE SET window_started_at=excluded.window_started_at,
    attempts=CASE WHEN auth_rate_limits.window_started_at=excluded.window_started_at THEN MIN(auth_rate_limits.attempts+1,?) ELSE 1 END RETURNING attempts`
      )
      .bind(name, started, max + 1)
  const global = await statement(key, maximum).first()
  if (global.attempts > maximum) throw new ApiError(429, { error: 'Please try again later' })
  if (authRateMode(env) === 'trusted-ingress') {
    const subject = await trustedClientSubject(request, env)
    const local = await statement(
      `${key}:${await sha256(subject)}`,
      Math.max(5, Math.floor(maximum / 10))
    ).first()
    if (local.attempts > Math.max(5, Math.floor(maximum / 10)))
      throw new ApiError(429, { error: 'Please try again later' })
  }
}
const escape = value =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  )
export function redactSupportText(value) {
  return escape(
    value
      .replace(/https?:\/\/\S+/gi, '[link removed]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
      .replace(
        /\b[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g,
        '[token redacted]'
      )
      .replace(/\b(password|token|secret|api[_ -]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
      .replace(/\b(?:\d[ -]?){13,19}\b/g, '[number redacted]')
  )
}
function supportAnswer(message, env) {
  const value = message.toLowerCase()
  if (/pric|cost|how much|payment/.test(value))
    return `The complete memoir package is £${PRODUCTS.premium_bundle.price / 100} for ${PRINT_PACKAGE.quantity} A5 matte hardback books, up to ${PRINT_PACKAGE.maxPages} pages and ${PRINT_PACKAGE.maxPhotos} colour photo pages, plus 12 months of access and an audiobook. Delivery is to one UK or French address, subject to current checkout availability. See Pricing for the currently available purchases.`
  if (/log.?in|sign.?in|password|account|register/.test(value))
    return 'Use the Login page with your email and password, or Google sign-in when configured. Use Forgot Password to request a password reset. Never share your password or sign-in link in this chat.'
  if (/export|download|epub|pdf|print|book/.test(value))
    return 'Open Preview & Export to review your memoir and the publishing options included in your purchase. EPUB and MP3 generation runs in the background. For a printed package, create and review the PDF proof before approving printing.'
  if (/cover|artwork|design/.test(value))
    return 'Your print proof includes the book title, author and cover. Review the proof carefully before approving the order. Chapter artwork depends on the configured image provider.'
  if (/voice|microphone|speak|phone|record/.test(value))
    return `Open a chapter and choose Talk, then allow microphone access. Final transcripts are saved to your memoir. ${env.TELNYX_CALLS_ENABLED === 'true' && env.TELNYX_CALLBACKS_VERIFIED === 'true' ? 'Phone interviews can also be requested from Call Me.' : 'Phone interviews are not enabled yet; use browser voice chat.'}`
  if (/order|deliver|shipping|track|dispatch/.test(value))
    return 'Check your order status in Preview & Export. Tracking appears after the printer confirms dispatch. This public chat cannot access a private order; ask for human support if you need help.'
  if (/writ|chapter|question|answer/.test(value))
    return 'Choose a chapter to write or record a memory, or use Quick Story for a standalone memory. Review rewritten text before publishing your memoir.'
  return 'I can help with login, writing, voice, pricing, export and printing. Describe the issue without sharing memoir passages, passwords, card details or private sign-in links. Ask for human support if you need someone to review it.'
}
const events = new Set([
  'page_view',
  'signup_started',
  'signup_completed',
  'onboarding_started',
  'onboarding_completed',
  'onboarding_step',
  'voice_interview_started',
  'voice_interview_completed',
  'story_saved',
  'export_initiated',
  'export_completed',
  'book_order_started',
  'book_order_completed',
  'premium_upgrade_clicked',
  'premium_upgrade_completed',
  'pricing_page_viewed'
])
async function counter(db, category, event, now) {
  await db
    .prepare(
      `INSERT INTO native_ops_daily_counters(day,category,event,count) VALUES(?,?,?,1)
    ON CONFLICT(day,category,event) DO UPDATE SET count=MIN(count+1,2147483647)`
    )
    .bind(new Date(now).toISOString().slice(0, 10), category, event)
    .run()
}
export async function handlePublicOps({ request, env, db, path, now = Date.now() }) {
  if (
    !['/support/chat', '/analytics/event', '/csp-report'].includes(path) ||
    request.method !== 'POST'
  )
    return null
  await publicBudget(request, env, db, path, now, path === '/support/chat' ? 100 : 1000)
  const body = await publicBody(request)
  if (path === '/analytics/event') {
    if (!body || typeof body !== 'object' || !events.has(body.event))
      throw new ApiError(400, { error: 'Invalid event' })
    // Deliberately discard all arbitrary properties, paths/referrers, timestamps,
    // user identities and content. Only anonymous daily event counts persist.
    await counter(db, 'analytics', body.event, now)
    return json({ received: true })
  }
  if (path === '/csp-report') {
    const reports = Array.isArray(body)
      ? body.filter(row => row?.type === 'csp-violation').map(row => row.body)
      : body?.['csp-report']
        ? [body['csp-report']]
        : []
    if (reports.length > 20) throw new ApiError(400, { error: 'Too many reports' })
    for (const report of reports) {
      const directive =
        report?.effectiveDirective ||
        report?.['effective-directive'] ||
        report?.['violated-directive']
      const allowed = [
        'script-src',
        'script-src-elem',
        'script-src-attr',
        'style-src',
        'style-src-elem',
        'style-src-attr',
        'img-src',
        'connect-src',
        'font-src',
        'media-src',
        'frame-src',
        'worker-src',
        'default-src',
        'form-action',
        'frame-ancestors',
        'object-src',
        'base-uri'
      ]
      await counter(db, 'csp', allowed.includes(directive) ? directive : 'other', now)
    }
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.length > 2000 ||
    (body.userName != null && (typeof body.userName !== 'string' || body.userName.length > 100)) ||
    (body.userEmail != null &&
      (typeof body.userEmail !== 'string' ||
        body.userEmail.length > 254 ||
        !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(body.userEmail))) ||
    (body.conversationHistory !== undefined &&
      (!Array.isArray(body.conversationHistory) ||
        body.conversationHistory.length > 6 ||
        body.conversationHistory.some(
          row =>
            !row ||
            !['user', 'assistant'].includes(row.role) ||
            typeof row.content !== 'string' ||
            row.content.length > 2000
        )))
  )
    throw new ApiError(400, { error: 'Invalid support message' })
  const escalation = /\b(human|real person|support team|someone|refund|cancel my order)\b/i.test(
    body.message
  )
  if (!escalation) return json({ response: supportAnswer(body.message, env), escalated: false })
  let owner = null
  if (request.headers.has('Authorization')) {
    const token = await verifyToken(request, env.JWT_SECRET, now)
    requireFullScope(token.claims)
    const identity = await createRepositories(db, { wallClockTimeZone: 'UTC' }).authenticate(token)
    if (!identity || identity.revoked)
      throw new ApiError(401, { error: 'Support authorization revoked' })
    owner = identity.user
  }
  const message = redactSupportText(body.message),
    email = owner?.email || body.userEmail?.trim().toLowerCase() || null
  const dedupe = await sha256(
    JSON.stringify([owner?.id || null, email, message, new Date(now).toISOString().slice(0, 10)])
  )
  await db
    .prepare(
      `INSERT INTO native_support_escalations(id,user_id,dedupe_key,contact_email,contact_name,message,conversation,created_at)
    SELECT ?,?,?,?,?,?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)
    ON CONFLICT(dedupe_key) DO NOTHING`
    )
    .bind(
      crypto.randomUUID(),
      owner?.id || null,
      dedupe,
      email,
      owner?.name
        ? redactSupportText(owner.name)
        : body.userName
          ? redactSupportText(body.userName)
          : null,
      message,
      JSON.stringify(
        (body.conversationHistory || []).map(row => ({
          role: row.role,
          content: redactSupportText(row.content)
        }))
      ),
      now,
      owner?.id || null,
      owner?.id || null
    )
    .run()
  const saved = await db
    .prepare('SELECT id,state FROM native_support_escalations WHERE dedupe_key = ?')
    .bind(dedupe)
    .first()
  if (!saved)
    throw new ApiError(401, { error: 'Account unavailable; support request was not saved' })
  return json({
    response: `Your support request has been saved for review. Reference: ${saved.id}. No message has been sent from this chat. You can also email support@easymemoir.co.uk and quote this reference.`,
    escalated: true,
    escalationStatus: saved.state,
    reference: saved.id
  })
}
export async function maintainNativeOps(env, now = Date.now()) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM native_support_escalations WHERE created_at < ?').bind(
      now - 30 * 86_400_000
    ),
    env.DB.prepare('DELETE FROM native_ops_daily_counters WHERE day < ?').bind(
      new Date(now - 90 * 86_400_000).toISOString().slice(0, 10)
    ),
    env.DB.prepare(
      "DELETE FROM auth_rate_limits WHERE subject_hash LIKE 'budget:ops:%' AND window_started_at < ?"
    ).bind(Math.floor(now / 1000) - 86_400)
  ])
}

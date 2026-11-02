import { ApiError } from '../api/errors.js'
import { sha256 } from '../api/auth-rate-limit.js'
import { reserveAIUsage } from '../api/ai-quota.js'
import { rawPhoneBody, issuePhoneTicket } from './security.js'
import {
  admitPhoneInterview,
  beginPhoneDial,
  assertPhoneAuthority,
  bindPhoneControl,
  getPhoneInterview,
  endPhoneInterview,
  finalizePhoneInterview,
  queuePhoneHangup
} from './repository.js'
import { releaseUserVoiceLease } from './leases.js'

export function phoneConfiguration(env) {
  if (env.TELNYX_CALLS_ENABLED !== 'true')
    throw new ApiError(503, {
      error: 'Phone interviews are not enabled yet. Please use voice chat.',
      code: 'PHONE_CALLS_DISABLED'
    })
  if (
    env.TELNYX_CALLBACKS_VERIFIED !== 'true' ||
    !env.TELNYX_API_KEY ||
    !env.GROK_API_KEY ||
    !/^[A-Za-z0-9_-]{1,200}$/.test(env.TELNYX_CONNECTION_ID || '') ||
    !/^\+[1-9]\d{6,14}$/.test(env.TELNYX_PHONE_NUMBER || '') ||
    !env.PHONE_SESSIONS?.getByName ||
    !env.TELNYX_PUBLIC_KEY
  )
    throw new ApiError(503, {
      error: 'Phone interviews are not available yet. Please use voice chat.',
      code: 'PHONE_CONFIGURATION_INCOMPLETE'
    })
  let origin
  try {
    const url = new URL(env.TELNYX_CALLBACK_ORIGIN)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error()
    origin = url.origin
  } catch {
    throw new ApiError(503, {
      error: 'Phone interviews are not available yet',
      code: 'PHONE_CALLBACK_ORIGIN_REQUIRED'
    })
  }
  return { origin }
}

export async function startPhoneInterview(
  { env, db, userId, requestKey, phoneNumber, prompt, identity, explicitConsent = false },
  now = Date.now()
) {
  const { origin } = phoneConfiguration(env)
  const id = crypto.randomUUID(),
    deadline = Math.min(now + 30 * 60_000, identity ? identity.claims.exp * 1000 : Infinity)
  if (deadline < now + 60_000)
    throw new ApiError(401, { error: 'Sign in again before starting a phone interview' })
  const issued = await issuePhoneTicket(id, userId, env, now, deadline)
  const { interview, created } = await admitPhoneInterview(
    db,
    {
      id,
      userId,
      requestKey,
      phoneNumber,
      authentication: identity,
      prompt,
      nonceHash: await sha256(issued.value.nonce),
      streamExpires: issued.value.exp * 1000,
      deadline,
      explicitConsent
    },
    now
  )
  if (!created) return interview
  let effectStarted = false
  try {
    const prepared = await env.PHONE_SESSIONS.getByName(id).prepare(id)
    if (!prepared?.ok)
      throw new ApiError(
        prepared?.error?.status || 503,
        prepared?.error?.body || { error: 'Phone session unavailable' }
      )
    await reserveAIUsage(db, userId, now)
    if (deadline - Date.now() < 60_000)
      throw new ApiError(401, { error: 'Call authorization is about to expire' })
    await beginPhoneDial(db, id, Date.now())
    effectStarted = true
    const url = new URL('/api/telnyx/media-stream', origin)
    url.protocol = 'wss:'
    url.searchParams.set('ticket', issued.ticket)
    const provider = env.TELNYX_FETCH || { fetch }
    const response = await provider.fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: env.TELNYX_CONNECTION_ID,
        to: phoneNumber,
        from: env.TELNYX_PHONE_NUMBER,
        command_id: id,
        timeout_secs: 30,
        retry_on_timeout: false,
        time_limit_secs: Math.max(30, Math.floor((deadline - Date.now() - 30_000) / 1000)),
        answering_machine_detection: 'detect',
        stream_url: url.href,
        stream_track: 'inbound_track',
        stream_codec: 'PCMU',
        stream_bidirectional_mode: 'rtp',
        stream_bidirectional_codec: 'PCMU',
        stream_bidirectional_sampling_rate: 8000,
        webhook_url: new URL('/api/telnyx/webhook', origin).href,
        webhook_url_method: 'POST',
        client_state: btoa(
          JSON.stringify({ requestId: id, userId, streamNonce: issued.value.nonce })
        )
      })
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error('Dial rejected')
    }
    const result = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await rawPhoneBody(response, 64 * 1024))
    )
    const controlId = result.data?.call_control_id
    try {
      await bindPhoneControl(db, id, controlId, Date.now())
      await assertPhoneAuthority(db, id)
    } catch (error) {
      // A dial can resolve after erasure, cancellation, or lease replacement.
      // Retain only the provider control and immediately attempt its hangup.
      if (typeof controlId === 'string' && controlId && controlId.length <= 1024) {
        await queuePhoneHangup(db, id, controlId)
        await processPhoneCommands(env)
      }
      throw error
    }
    await db
      .prepare(
        `UPDATE phone_interviews SET state = 'dialed',updated_at = ? WHERE id = ? AND state IN ('reserved','dial_started','needs_reconciliation') AND ended_at IS NULL`
      )
      .bind(now, id)
      .run()
    return getPhoneInterview(db, id)
  } catch (error) {
    if (effectStarted) {
      await db
        .prepare(
          `UPDATE phone_interviews SET state = 'needs_reconciliation',error_code = 'DIAL_OUTCOME_UNKNOWN',updated_at = ? WHERE id = ? AND state = 'dial_started'`
        )
        .bind(now, id)
        .run()
      // A timeout can follow a successful vendor dial. Keep durable authority
      // and never replay the command automatically; signed callbacks reconcile it.
      throw new ApiError(503, {
        error: 'Your call request may have been accepted. Please wait while we check it.',
        code: 'DIAL_OUTCOME_UNKNOWN',
        request_id: id
      })
    }
    await db
      .prepare(
        "UPDATE phone_interviews SET state = 'failed',error_code = 'PHONE_START_FAILED',updated_at = ? WHERE id = ?"
      )
      .bind(now, id)
      .run()
    await releaseUserVoiceLease(db, userId, id)
    await finalizePhoneInterview(db, id, now)
    if (error instanceof ApiError) throw error
    throw new ApiError(503, {
      error: 'Phone interview could not start',
      code: 'PHONE_START_FAILED'
    })
  }
}

// Idempotent non-dial commands may be retried safely using their stable UUID.
// Even with admission disabled, existing calls can still be hung up.
export async function processPhoneCommands(env, now = Date.now()) {
  if (!env.DB || !env.TELNYX_API_KEY) return { skipped: true, completed: 0, failed: 0 }
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB,
    lease = crypto.randomUUID()
  const { results } = await db
    .prepare(
      `UPDATE phone_commands SET state = 'processing',lease_id = ?,lease_expires = ?,attempts = attempts+1
    WHERE id IN (SELECT id FROM phone_commands WHERE state = 'pending' OR (state = 'processing' AND lease_expires <= ?) ORDER BY created_at LIMIT 20) RETURNING *`
    )
    .bind(lease, now + 60_000, now)
    .all()
  let completed = 0,
    failed = 0
  for (const command of results) {
    try {
      const response = await (env.TELNYX_FETCH || { fetch }).fetch(
        `https://api.telnyx.com/v2/calls/${encodeURIComponent(command.call_control_id)}/actions/hangup`,
        {
          method: 'POST',
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
          headers: {
            Authorization: `Bearer ${env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ command_id: command.id })
        }
      )
      await response.body?.cancel()
      if (!response.ok && response.status !== 404) throw new Error('Hangup not confirmed')
      await db
        .prepare(
          "UPDATE phone_commands SET state = 'completed',completed_at = ?,lease_id = NULL,lease_expires = NULL WHERE id = ? AND lease_id = ?"
        )
        .bind(now, command.id, lease)
        .run()
      completed++
    } catch {
      await db
        .prepare(
          "UPDATE phone_commands SET state = 'pending',lease_id = NULL,lease_expires = NULL WHERE id = ? AND lease_id = ?"
        )
        .bind(command.id, lease)
        .run()
      failed++
    }
  }
  return { claimed: results.length, completed, failed }
}

export async function cancelPhoneInterviewsForUser(db, userId, now = Date.now()) {
  const { results } = await db
    .prepare(
      "SELECT id FROM phone_interviews WHERE user_id = ? AND state NOT IN ('completed','failed','cancelled')"
    )
    .bind(userId)
    .all()
  for (const row of results) await endPhoneInterview(db, row.id, now, 'PHONE_ACCOUNT_REVOKED')
  return results.length
}

export async function enqueueScheduledTopicCall(
  env,
  { userId, prompt, occurrenceKey, now = Date.now() }
) {
  if (env.TELNYX_CALLS_ENABLED !== 'true') return { skipped: true, reason: 'disabled' }
  phoneConfiguration(env)
  if (
    !Number.isSafeInteger(userId) ||
    userId < 1 ||
    typeof occurrenceKey !== 'string' ||
    !occurrenceKey ||
    occurrenceKey.length > 200 ||
    !prompt ||
    typeof prompt.text !== 'string' ||
    !prompt.text.trim() ||
    prompt.text.length > 2000 ||
    ['chapter_id', 'question_id'].some(
      key =>
        prompt[key] !== undefined &&
        (typeof prompt[key] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(prompt[key]))
    )
  )
    throw new ApiError(400, { error: 'Invalid scheduled phone topic' })
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB
  const result = await db
    .prepare(
      `INSERT INTO phone_outreach(id,user_id,occurrence_key,prompt,created_at,expires_at)
    SELECT ?,id,?,?,?,? FROM users WHERE id = ? AND deleted_at IS NULL AND phone_call_consent = 1
    AND phone_number IS NOT NULL AND contact_preference IN ('phone','both') ON CONFLICT(user_id,occurrence_key) DO NOTHING RETURNING id`
    )
    .bind(crypto.randomUUID(), occurrenceKey, JSON.stringify(prompt), now, now + 86_400_000, userId)
    .first()
  return { enqueued: Boolean(result), id: result?.id || null }
}

// Scheduled once per minute. Dial intents use the same stable request key after
// a worker crash; the persisted dial marker prevents automatic repeat dialing.
export async function processPhoneMaintenance(env, now = Date.now()) {
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB
  await db
    .prepare(
      "UPDATE phone_outreach SET state = 'cancelled',lease_id = NULL,lease_expires = NULL WHERE state IN ('pending','processing') AND expires_at <= ?"
    )
    .bind(now)
    .run()
  const { results: abandoned } = await db
    .prepare(
      `SELECT id,user_id,call_control_id FROM phone_interviews WHERE finalized = 0
    AND (deadline <= ? OR state = 'ending' OR (state IN ('reserved','dial_started','dialed','needs_reconciliation') AND created_at < ?)) ORDER BY created_at LIMIT 20`
    )
    .bind(now, now - 60_000)
    .all()
  for (const call of abandoned) {
    await endPhoneInterview(db, call.id, now, 'PHONE_EXPIRED_OR_ABANDONED')
    await finalizePhoneInterview(db, call.id, now)
    await releaseUserVoiceLease(db, call.user_id, call.id)
  }
  let started = 0
  if (env.TELNYX_CALLS_ENABLED === 'true') {
    phoneConfiguration(env)
    const lease = crypto.randomUUID()
    const { results } = await db
      .prepare(
        `UPDATE phone_outreach SET state = 'processing',lease_id = ?,lease_expires = ?
      WHERE id IN (SELECT id FROM phone_outreach WHERE expires_at > ? AND (state = 'pending' OR (state = 'processing' AND lease_expires <= ?)) ORDER BY created_at LIMIT 3) RETURNING *`
      )
      .bind(lease, now + 60_000, now, now)
      .all()
    for (const intent of results) {
      let state = 'cancelled',
        callId = null
      try {
        const user = await db
          .prepare(
            "SELECT phone_number FROM users WHERE id = ? AND deleted_at IS NULL AND phone_call_consent = 1 AND contact_preference IN ('phone','both')"
          )
          .bind(intent.user_id)
          .first()
        if (user && /^\+[1-9]\d{6,14}$/.test(user.phone_number || '')) {
          const call = await startPhoneInterview(
            {
              env,
              db,
              userId: intent.user_id,
              requestKey: intent.id,
              phoneNumber: user.phone_number,
              prompt: JSON.parse(intent.prompt),
              explicitConsent: false
            },
            now
          )
          callId = call.id
          state = ['dial_started', 'needs_reconciliation'].includes(call.state)
            ? 'needs_reconciliation'
            : 'completed'
          started++
        }
      } catch (error) {
        if (error?.body?.code === 'DIAL_OUTCOME_UNKNOWN') {
          state = 'needs_reconciliation'
          callId = error.body.request_id
        } else if (!(error instanceof ApiError)) state = 'needs_reconciliation'
      }
      await db
        .prepare(
          'UPDATE phone_outreach SET state = ?,call_request_id = ?,lease_id = NULL,lease_expires = NULL WHERE id = ? AND lease_id = ?'
        )
        .bind(state, callId, intent.id, lease)
        .run()
    }
  }
  await db
    .prepare(
      "DELETE FROM telnyx_webhook_events WHERE julianday(replace(expires_at,'+00','Z')) <= julianday(?)"
    )
    .bind(new Date(now).toISOString())
    .run()
  await db
    .prepare("DELETE FROM phone_commands WHERE state = 'completed' AND completed_at < ?")
    .bind(now - 7 * 86_400_000)
    .run()
  return { started, ended: abandoned.length, commands: await processPhoneCommands(env, now) }
}

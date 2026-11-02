import { sealNotification, openNotification } from './security.js'
import { sendEmail } from '../api/email.js'
import { timestampForStorage } from '../api/value-codecs.js'
import { defaultNotificationPreferences } from '../api/notifications.js'
import { readProviderJson } from './request.js'

export async function enqueueAccountNotification(
  env,
  db,
  { userId, type, key, subject, message, now = Date.now(), tokenRecord }
) {
  const preferenceKey = type.startsWith('upgrade_reminder_')
    ? 'upgrade_reminders'
    : {
        weekly_topic: 'weekly_digest',
        inactive_reminder: 'daily_reminder',
        family_prompt: 'family_activity'
      }[type] || type
  if (!Object.hasOwn(defaultNotificationPreferences, preferenceKey))
    throw new TypeError('Unknown notification preference')
  const { summary, ...providerMessage } = message
  const id = crypto.randomUUID(),
    payload = await sealNotification(providerMessage, env),
    wall = timestampForStorage(now)
  const statements = [
    db
      .prepare(
        `INSERT INTO notification_queue(user_id,notification_type,channel,subject,body,scheduled_for,created_at)
   SELECT id,?,'email',?,?,?,? FROM users WHERE id=? AND deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM native_notification_jobs WHERE occurrence_key=?) RETURNING id`
      )
      .bind(type, subject, summary || subject, wall, wall, userId, key),
    db
      .prepare(
        `INSERT INTO native_notification_jobs(id,occurrence_key,user_id,queue_id,channel,preference_key,payload,next_attempt_at,created_at,updated_at)
   SELECT ?,?,?,id,'email',?,?,?,?,? FROM notification_queue WHERE changes()=1 AND id=last_insert_rowid() AND user_id=?`
      )
      .bind(id, key, userId, preferenceKey, payload, now, now, now, userId)
  ]
  if (tokenRecord)
    statements.push(
      db
        .prepare(
          `INSERT INTO email_session_tokens(user_id,token_hash,prompt_text,prompt_chapter_id,prompt_question_id,expires_at,created_at)
  SELECT user_id,?,?,?,?,?,? FROM native_notification_jobs WHERE changes()=1 AND id=?`
        )
        .bind(
          tokenRecord.hash,
          tokenRecord.prompt.text,
          tokenRecord.prompt.chapterId,
          tokenRecord.prompt.questionId,
          timestampForStorage(now + 7 * 86400000),
          wall,
          id
        )
    )
  const rows = await db.batch(statements)
  return rows[1].meta.changes > 0
}
export async function enqueueTelegramReply(
  env,
  db,
  { telegramUserId, userId = null, revision, key, text, historyText = text, now = Date.now() }
) {
  const row = await db
    .prepare('SELECT telegram_chat_id FROM telegram_users WHERE id=? AND user_id IS ?')
    .bind(telegramUserId, userId)
    .first()
  if (!row) return false
  const id = crypto.randomUUID(),
    payload = await sealNotification(
      { chat_id: row.telegram_chat_id, text, history_text: historyText },
      env
    )
  const saved = await db
    .prepare(
      `INSERT INTO native_notification_jobs(id,occurrence_key,user_id,telegram_user_id,channel,authorization_revision,payload,next_attempt_at,created_at,updated_at)
  SELECT ?,?,?,t.id,'telegram',?,?,?,?,? FROM telegram_users t JOIN native_telegram_state s ON s.telegram_user_id=t.id
  WHERE t.id=? AND t.user_id IS ? AND s.revision=? AND s.delivery_blocked=0 ON CONFLICT(occurrence_key) DO NOTHING RETURNING id`
    )
    .bind(id, key, userId, revision, payload, now, now, now, telegramUserId, userId, revision)
    .first()
  return Boolean(saved)
}
function preferences(raw) {
  try {
    return { ...defaultNotificationPreferences, ...JSON.parse(raw || '{}') }
  } catch {
    return {}
  }
}
async function authorized(db, job, message) {
  if (job.user_id !== null) {
    const row = await db
      .prepare(
        `SELECT u.email,u.email_verified,g.notification_preferences,o.channel_preferences FROM users u LEFT JOIN user_game_state g ON g.user_id=u.id LEFT JOIN user_onboarding o ON o.user_id=u.id WHERE u.id=? AND u.deleted_at IS NULL`
      )
      .bind(job.user_id)
      .first()
    if (!row) return false
    if (job.channel === 'email') {
      if (!row.email_verified || row.email.toLowerCase() !== String(message.to).toLowerCase())
        return false
      const channels = JSON.parse(row.channel_preferences || '[]')
      if (
        !channels.includes('email') ||
        preferences(row.notification_preferences)[job.preference_key] === false
      )
        return false
    }
  }
  if (job.channel === 'telegram') {
    const row = await db
      .prepare(
        `SELECT t.telegram_chat_id FROM telegram_users t JOIN native_telegram_state s ON s.telegram_user_id=t.id WHERE t.id=? AND t.user_id IS ? AND s.revision=? AND s.delivery_blocked=0`
      )
      .bind(job.telegram_user_id, job.user_id, job.authorization_revision)
      .first()
    return row && row.telegram_chat_id === String(message.chat_id)
  }
  if (job.subscriber_id !== null) {
    const row = await db
      .prepare(
        'SELECT n.email,c.revision,c.confirmed_at FROM newsletter_subscribers n JOIN native_newsletter_consent c ON c.subscriber_id=n.id WHERE n.id=?'
      )
      .bind(job.subscriber_id)
      .first()
    return (
      row &&
      row.email === message.to &&
      row.revision === job.authorization_revision &&
      (job.preference_key === 'newsletter_confirmation'
        ? row.confirmed_at === null
        : row.confirmed_at !== null)
    )
  }
  return job.user_id !== null
}
async function markSending(db, job, message, lease) {
  const now = Date.now(),
    guards = [],
    bindings = [now, now, job.id, lease, now]
  if (job.user_id !== null) {
    if (job.channel === 'email') {
      guards.push(`EXISTS(SELECT 1 FROM users u LEFT JOIN user_game_state g ON g.user_id=u.id LEFT JOIN user_onboarding o ON o.user_id=u.id
        WHERE u.id=? AND u.deleted_at IS NULL AND u.email_verified=1 AND lower(u.email)=?
        AND EXISTS(SELECT 1 FROM json_each(COALESCE(o.channel_preferences,'[]')) WHERE value='email')
        AND COALESCE(json_extract(g.notification_preferences,?),?)=1
        AND NOT EXISTS(SELECT 1 FROM notification_queue n WHERE n.id=? AND n.notification_type='weekly_topic' AND u.contact_preference='phone' AND u.phone_call_consent=1 AND u.phone_number IS NOT NULL))`)
      bindings.push(
        job.user_id,
        String(message.to).toLowerCase(),
        `$.${job.preference_key}`,
        defaultNotificationPreferences[job.preference_key] === true ? 1 : 0,
        job.queue_id
      )
      if (job.preference_key === 'upgrade_reminders') {
        guards.push(
          'EXISTS(SELECT 1 FROM users WHERE id=? AND (premium_until IS NULL OR julianday(premium_until)<=julianday(?)))'
        )
        bindings.push(job.user_id, new Date(now).toISOString())
      }
      if (
        job.preference_key === 'family_activity' &&
        /^family-prompt:\d+$/.test(job.occurrence_key)
      ) {
        guards.push(
          "EXISTS(SELECT 1 FROM family_prompts WHERE id=? AND for_user_id=? AND status='pending')"
        )
        bindings.push(Number(job.occurrence_key.split(':')[1]), job.user_id)
      }
    } else {
      guards.push('EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)')
      bindings.push(job.user_id)
    }
  }
  if (job.channel === 'telegram') {
    guards.push(
      `EXISTS(SELECT 1 FROM telegram_users t JOIN native_telegram_state s ON s.telegram_user_id=t.id WHERE t.id=? AND t.user_id IS ? AND t.telegram_chat_id=? AND s.revision=? AND s.delivery_blocked=0)`
    )
    bindings.push(
      job.telegram_user_id,
      job.user_id,
      String(message.chat_id),
      job.authorization_revision
    )
  }
  if (job.subscriber_id !== null) {
    guards.push(
      `EXISTS(SELECT 1 FROM newsletter_subscribers n JOIN native_newsletter_consent c ON c.subscriber_id=n.id WHERE n.id=? AND n.email=? AND c.revision=? AND ((?='newsletter_confirmation' AND c.confirmed_at IS NULL) OR (?<>'newsletter_confirmation' AND c.confirmed_at IS NOT NULL AND n.unsubscribed_at IS NULL)))`
    )
    bindings.push(
      job.subscriber_id,
      message.to,
      job.authorization_revision,
      job.preference_key,
      job.preference_key
    )
  }
  if (!guards.length) return null
  return db
    .prepare(
      `UPDATE native_notification_jobs SET state='effect_started',first_send_at=COALESCE(first_send_at,?),updated_at=? WHERE id=? AND lease_id=? AND state='processing' AND lease_expires>? AND ${guards.join(' AND ')} RETURNING id`
    )
    .bind(...bindings)
    .first()
}
export async function sendTelegram(env, message) {
  if (
    typeof env.TELEGRAM_BOT_TOKEN !== 'string' ||
    !/^\d+:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN)
  )
    throw new Error('TELEGRAM_UNAVAILABLE')
  if (
    typeof message.text !== 'string' ||
    !message.text ||
    message.text.length > 4096 ||
    !/^\d{1,16}$/.test(String(message.chat_id))
  )
    throw new Error('INVALID_TELEGRAM_MESSAGE')
  const response = await (env.TELEGRAM_FETCH || { fetch }).fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: message.chat_id, text: message.text }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10000)
    }
  )
  let data
  try {
    data = await readProviderJson(response)
  } catch {
    throw new Error('TELEGRAM_RESPONSE_INVALID')
  }
  if (!response.ok || data.ok !== true || !Number.isSafeInteger(data.result?.message_id))
    throw new Error('TELEGRAM_SEND_UNCONFIRMED')
  return String(data.result.message_id)
}
export async function deliverNativeNotifications(env, now = Date.now()) {
  if (env.NOTIFICATION_DELIVERY_ENABLED !== 'true') return { sent: 0, disabled: true }
  const db = env.DB.withSession('first-primary')
  // Telegram has no sendMessage idempotency key. An abandoned marked send stops
  // for review. Resend retries only inside its24-hour idempotency retention.
  await db.batch([
    db
      .prepare(
        "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='NOTIFICATION_EXPIRED',lease_id=NULL,lease_expires=NULL,updated_at=? WHERE state IN ('pending','processing') AND first_send_at IS NULL AND created_at<? AND (state='pending' OR lease_expires<=?)"
      )
      .bind(now, now - 86400000, now),
    db
      .prepare(
        `UPDATE native_notification_jobs SET state='review',error_code='SEND_UNCONFIRMED',lease_id=NULL,lease_expires=NULL,updated_at=? WHERE state='effect_started' AND lease_expires<=? AND (channel='telegram' OR first_send_at<=? OR attempts>=5)`
      )
      .bind(now, now, now - 23 * 3600000),
    db
      .prepare(
        `UPDATE native_notification_jobs SET state='pending',lease_id=NULL,lease_expires=NULL,updated_at=? WHERE ((state='processing' AND lease_expires<=?) OR (state='effect_started' AND channel='email' AND lease_expires<=? AND first_send_at>?)) AND attempts<5`
      )
      .bind(now, now, now, now - 23 * 3600000),
    db
      .prepare(
        `UPDATE native_notification_jobs SET state='failed',error_code='DELIVERY_ATTEMPTS_EXHAUSTED',updated_at=? WHERE (state='pending' OR (state='processing' AND lease_expires<=?)) AND attempts>=5`
      )
      .bind(now, now)
  ])
  const { results } = await db
    .prepare(
      "SELECT id FROM native_notification_jobs WHERE state='pending' AND next_attempt_at<=? AND (channel<>'telegram' OR ?='true') ORDER BY created_at,id LIMIT 20"
    )
    .bind(now, env.TELEGRAM_ENABLED || '')
    .all()
  let sent = 0
  for (const candidate of results) {
    const lease = crypto.randomUUID(),
      clock = Date.now()
    const job = await db
      .prepare(
        `UPDATE native_notification_jobs SET state='processing',lease_id=?,lease_expires=?,attempts=attempts+1,updated_at=? WHERE id=? AND state='pending' AND next_attempt_at<=? AND attempts<5 RETURNING *`
      )
      .bind(lease, clock + 60000, clock, candidate.id, clock)
      .first()
    if (!job) continue
    let marked = false
    try {
      const message = await openNotification(job.payload, env)
      if (!(await authorized(db, job, message))) {
        await db
          .prepare(
            "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='CONSENT_REVOKED',lease_id=NULL,lease_expires=NULL,updated_at=? WHERE id=? AND lease_id=?"
          )
          .bind(Date.now(), job.id, lease)
          .run()
        continue
      }
      const started = await markSending(db, job, message, lease)
      if (!started) {
        await db
          .prepare(
            "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='CONSENT_REVOKED',lease_id=NULL,lease_expires=NULL,updated_at=? WHERE id=? AND lease_id=?"
          )
          .bind(Date.now(), job.id, lease)
          .run()
        continue
      }
      marked = true
      const providerId =
        job.channel === 'email'
          ? await sendEmail(message, env, { idempotencyKey: `notification/${job.id}` })
          : await sendTelegram(env, message)
      const stamp = timestampForStorage(Date.now())
      await db.batch([
        db
          .prepare(
            `UPDATE native_notification_jobs SET state='sent',provider_id=?,payload='{}',error_code=NULL,lease_id=NULL,lease_expires=NULL,updated_at=? WHERE id=? AND lease_id=? RETURNING id`
          )
          .bind(providerId, Date.now(), job.id, lease),
        db
          .prepare(
            'UPDATE notification_queue SET sent_at=?,failed_at=NULL,failure_reason=NULL WHERE changes()=1 AND id=?'
          )
          .bind(stamp, job.queue_id),
        ...(job.channel === 'telegram'
          ? [
              db
                .prepare(
                  `INSERT INTO telegram_messages(telegram_user_id,message_id,direction,content,created_at) SELECT ?,?,'outgoing',?,? WHERE EXISTS(SELECT 1 FROM native_notification_jobs j JOIN telegram_users t ON t.id=j.telegram_user_id JOIN native_telegram_state a ON a.telegram_user_id=t.id WHERE j.id=? AND j.state='sent' AND t.user_id IS j.user_id AND a.revision=j.authorization_revision)`
                )
                .bind(
                  job.telegram_user_id,
                  providerId,
                  message.history_text || message.text,
                  stamp,
                  job.id
                )
            ]
          : [])
      ])
      sent++
    } catch {
      const retry =
        job.channel === 'email' &&
        (!job.first_send_at || Date.now() - job.first_send_at < 23 * 3600000) &&
        job.attempts < 5
      await db
        .prepare(
          `UPDATE native_notification_jobs SET state=?,error_code=?,next_attempt_at=?,lease_id=NULL,lease_expires=NULL,updated_at=? WHERE id=? AND lease_id=?`
        )
        .bind(
          !marked ? 'failed' : retry ? 'pending' : 'review',
          !marked
            ? 'NOTIFICATION_CONFIGURATION_INVALID'
            : retry
              ? 'DELIVERY_RETRY_PENDING'
              : 'SEND_UNCONFIRMED',
          Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6)),
          Date.now(),
          job.id,
          lease
        )
        .run()
    }
  }
  return { sent }
}

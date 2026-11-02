import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { timestampForStorage, createMappedCodec } from './value-codecs.js'
import { readNotificationJson } from '../notifications/request.js'
import { verifyAccountOptout, confirmationPage } from '../notifications/unsubscribe.js'
export const defaultNotificationPreferences = Object.freeze({
  daily_reminder: true,
  streak_warning: true,
  weekly_digest: true,
  family_activity: true,
  achievement_earned: true,
  collection_complete: true,
  upgrade_reminders: false
})
export function notificationPreferences(raw) {
  let prefs
  try {
    prefs = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    throw new ApiError(400, { error: 'Invalid notification preferences' })
  }
  if (
    !prefs ||
    typeof prefs !== 'object' ||
    Array.isArray(prefs) ||
    Object.entries(prefs).some(
      ([key, value]) =>
        !Object.hasOwn(defaultNotificationPreferences, key) || typeof value !== 'boolean'
    )
  )
    throw new ApiError(400, { error: 'Invalid notification preferences' })
  return prefs
}
export function validTimezone(value) {
  if (typeof value !== 'string' || value.length > 100)
    throw new ApiError(400, { error: 'Invalid timezone' })
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: value }).resolvedOptions().timeZone
  } catch {
    throw new ApiError(400, { error: 'Invalid timezone' })
  }
}
export async function handleNotificationOptout({ request, env, db, path, now }) {
  if (path !== '/notifications/unsubscribe' || !['GET', 'POST'].includes(request.method))
    return null
  const raw = new URL(request.url).searchParams.get('token'),
    userId = await verifyAccountOptout(raw, env)
  if (request.method === 'GET')
    return confirmationPage(
      request.url,
      'Unsubscribe from memoir reminders',
      'Stop optional memoir emails for this account?'
    )
  const wall = timestampForStorage(now)
  await db.batch([
    db
      .prepare(`UPDATE user_game_state SET notification_preferences=?,updated_at=? WHERE user_id=?`)
      .bind(
        JSON.stringify(
          Object.fromEntries(Object.keys(defaultNotificationPreferences).map(key => [key, false]))
        ),
        wall,
        userId
      ),
    db
      .prepare(
        `UPDATE user_onboarding SET channel_preferences=(SELECT json_group_array(value) FROM json_each(COALESCE(channel_preferences,'[]')) WHERE value<>'email'),updated_at=? WHERE user_id=?`
      )
      .bind(wall, userId),
    db
      .prepare(
        "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='CONSENT_REVOKED',updated_at=? WHERE user_id=? AND channel='email' AND state IN ('pending','processing')"
      )
      .bind(now, userId)
  ])
  return json({ success: true, message: 'Optional email notifications have been turned off.' })
}
export async function handleNotificationRoutes({ request, env, db, path, user, claims, now }) {
  if (!path.startsWith('/notifications/')) return null
  requireFullScope(claims)
  const codec = createMappedCodec('notification_queue', {
    wallClockTimeZone: env.SOURCE_TIMESTAMP_TIMEZONE
  })
  if (path === '/notifications/history' && request.method === 'GET') {
    const raw = new URL(request.url).searchParams.get('limit'),
      limit = Math.min(Math.max(parseInt(raw) || 20, 1), 100)
    const { results } = await db
      .prepare(
        'SELECT id,notification_type,subject,scheduled_for,sent_at FROM notification_queue WHERE user_id=? ORDER BY scheduled_for DESC,id DESC LIMIT ?'
      )
      .bind(user.id, limit)
      .all()
    return json({ success: true, data: results.map(row => codec.decodeRow(row)) })
  }
  if (path !== '/notifications/preferences') return null
  if (request.method === 'GET') {
    const row = await db
      .prepare(
        'SELECT notification_preferences,preferred_prompt_time,timezone FROM user_game_state WHERE user_id=?'
      )
      .bind(user.id)
      .first()
    return json({
      success: true,
      data: row
        ? { ...row, notification_preferences: JSON.parse(row.notification_preferences || '{}') }
        : {
            notification_preferences: defaultNotificationPreferences,
            preferred_prompt_time: '09:00',
            timezone: 'Europe/London'
          }
    })
  }
  if (request.method !== 'PUT') return null
  const input = await readNotificationJson(request, 4096)
  if (
    Object.keys(input).some(
      key => !['preferences', 'preferredPromptTime', 'timezone'].includes(key)
    )
  )
    throw new ApiError(400, { error: 'Invalid notification setting' })
  const prefs = input.preferences === undefined ? {} : notificationPreferences(input.preferences)
  let time = null,
    timezone = null
  if (input.preferredPromptTime !== undefined) {
    if (
      typeof input.preferredPromptTime !== 'string' ||
      !/^([01]?\d|2[0-3]):[0-5]\d$/.test(input.preferredPromptTime)
    )
      throw new ApiError(400, { error: 'Time must be in HH:MM format' })
    time = input.preferredPromptTime.padStart(5, '0')
  }
  if (input.timezone !== undefined) timezone = validTimezone(input.timezone)
  const wall = timestampForStorage(now)
  await db.batch([
    db
      .prepare(
        `INSERT INTO user_game_state(user_id,game_mode_enabled,notification_preferences,created_at,updated_at) SELECT id,0,?,?,? FROM users WHERE id=? AND deleted_at IS NULL ON CONFLICT(user_id) DO NOTHING`
      )
      .bind(JSON.stringify(defaultNotificationPreferences), wall, wall, user.id),
    db
      .prepare(
        `UPDATE user_game_state SET notification_preferences=json_patch(COALESCE(notification_preferences,'{}'),json(?)),preferred_prompt_time=COALESCE(?,preferred_prompt_time),timezone=COALESCE(?,timezone),updated_at=? WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)`
      )
      .bind(JSON.stringify(prefs), time, timezone, wall, user.id, user.id),
    db
      .prepare(
        `UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='CONSENT_REVOKED',updated_at=? WHERE user_id=? AND state IN ('pending','processing') AND preference_key IN (SELECT key FROM json_each(?) WHERE value=0)`
      )
      .bind(now, user.id, JSON.stringify(prefs))
  ])
  return json({ success: true })
}

import { chapters } from '../../packages/shared/chapters.js'
import { defaultNotificationPreferences, validTimezone } from '../api/notifications.js'
import { timestampForStorage } from '../api/value-codecs.js'
import { randomHex } from '../api/auth.js'
import { sha256 } from '../api/auth-rate-limit.js'
import { nativeDailyPrompt } from '../api/game-core.js'
import { telegramQuestionMap } from './telegram-questions.js'
import { enqueueAccountNotification } from './outbox.js'
import { escapeHtml, appUrl } from './security.js'
import { accountOptoutToken } from './unsubscribe.js'
import { enqueueScheduledTopicCall } from '../phone/calls.js'
const formatters = new Map()
const instant = column =>
  `CASE WHEN substr(${column},-3)='+00' THEN substr(${column},1,length(${column})-3)||'Z' ELSE ${column} END`
const dayOffset = (date, days) =>
  new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10)
export function localNotificationClock(now, timezone) {
  const zone = validTimezone(timezone || 'Europe/London')
  let formatter = formatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      calendar: 'iso8601',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      weekday: 'short'
    })
    if (formatters.size >= 64) formatters.delete(formatters.keys().next().value)
    formatters.set(zone, formatter)
  }
  const parts = Object.fromEntries(
      formatter.formatToParts(now).map(part => [part.type, part.value])
    ),
    date = `${parts.year}-${parts.month}-${parts.day}`,
    weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return {
    date,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekMonday: dayOffset(date, -((weekday + 6) % 7)),
    timezone: zone
  }
}
function parsedInstant(value) {
  if (!value) return null
  const normalized = value.replace(' ', 'T').replace(/\+00$/, 'Z')
  const time = Date.parse(/[Zz]$|[+-]\d\d:\d\d$/.test(normalized) ? normalized : normalized + 'Z')
  return Number.isFinite(time) ? time : null
}
function prefs(raw) {
  try {
    return { ...defaultNotificationPreferences, ...JSON.parse(raw || '{}') }
  } catch {
    return {}
  }
}
function channels(raw) {
  try {
    const value = JSON.parse(raw || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
function subject(value) {
  return Array.from(String(value))
    .filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join('')
    .slice(0, 160)
}
async function messageFor(env, user, title, paragraphs, { magicLink } = {}) {
  const home = appUrl(env, '/home'),
    optout = appUrl(
      env,
      `/api/notifications/unsubscribe?token=${await accountOptoutToken(user.id, env)}`
    ),
    action = magicLink || home
  const text = [
    `Hello ${user.name || 'there'},`,
    ...paragraphs,
    `Continue your memoir: ${action}`,
    `Turn off optional emails: ${optout}`
  ].join('\n\n')
  const summary = [
    `Hello ${user.name || 'there'},`,
    ...paragraphs,
    'Continue in Easy Memoir. Manage optional emails in your settings.'
  ].join('\n\n')
  return {
    from: env.EMAIL_FROM || 'Easy Memoir <hello@easymemoir.co.uk>',
    to: user.email,
    subject: subject(title),
    text,
    summary,
    html: `<html lang="en"><body><h1>${escapeHtml(title)}</h1><p>Hello ${escapeHtml(user.name || 'there')},</p>${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}<p><a href="${escapeHtml(action)}">Continue your memoir</a></p><p><a href="${escapeHtml(optout)}">Turn off optional emails</a></p></body></html>`,
    headers: {
      'List-Unsubscribe': `<${optout}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  }
}
async function pickTopic(db, user, now) {
  const { results } = await db
    .prepare(
      `SELECT p.id,p.prompt_text,p.linked_chapter_id,p.linked_question_id FROM prompt_library p WHERE p.is_active=1 AND p.linked_chapter_id IS NOT NULL AND p.linked_question_id IS NOT NULL
  AND (p.linked_chapter_id='earliest-memories' OR julianday(?)>julianday(?))
  AND NOT EXISTS(SELECT 1 FROM stories s WHERE s.user_id=? AND s.chapter_id=p.linked_chapter_id AND s.question_id=p.linked_question_id AND trim(COALESCE(s.answer,''))<>'')
  ORDER BY EXISTS(SELECT 1 FROM email_session_tokens e WHERE e.user_id=? AND e.prompt_text=p.prompt_text AND julianday(${instant('e.created_at')})>julianday(?)),COALESCE(p.times_used,0),p.id LIMIT 25`
    )
    .bind(
      user.premium_until,
      new Date(now).toISOString(),
      user.id,
      user.id,
      new Date(now - 30 * 86400000).toISOString()
    )
    .all()
  const selected = results.find(row =>
    telegramQuestionMap.has(`${row.linked_chapter_id}:${row.linked_question_id}`)
  )
  if (!selected) return null
  return {
    id: selected.id,
    text: selected.prompt_text,
    chapter_id: selected.linked_chapter_id,
    question_id: selected.linked_question_id
  }
}
async function scheduleUser(env, db, user, now) {
  const clock = localNotificationClock(now, user.timezone),
    preferences = prefs(user.notification_preferences),
    contact = channels(user.channel_preferences)
  const canEmail = Boolean(user.email_verified && user.email && contact.includes('email')),
    canCall = Boolean(
      user.phone_call_consent &&
      user.phone_number &&
      ['phone', 'both'].includes(user.contact_preference)
    ),
    lastStory = parsedInstant(user.last_story_at),
    active = user.current_streak > 0 || (lastStory !== null && now - lastStory < 7 * 86400000),
    wroteToday =
      lastStory !== null && localNotificationClock(lastStory, clock.timezone).date === clock.date
  let queued = 0
  const email = async (type, key, title, paragraphs, options = {}) => {
    if (
      !canEmail ||
      preferences[
        {
          weekly_topic: 'weekly_digest',
          inactive_reminder: 'daily_reminder',
          family_prompt: 'family_activity'
        }[type] || type
      ] === false
    )
      return false
    const message = await messageFor(env, user, title, paragraphs, options)
    const saved = await enqueueAccountNotification(env, db, {
      userId: user.id,
      type,
      key,
      subject: message.subject,
      message,
      now,
      tokenRecord: options.tokenRecord
    })
    if (saved) queued++
    return saved
  }
  const [hour, minute] = /^\d\d:\d\d$/.test(user.preferred_prompt_time || '')
    ? user.preferred_prompt_time.split(':').map(Number)
    : [9, 0]
  if (
    user.game_mode_enabled &&
    active &&
    !wroteToday &&
    clock.minutes >= hour * 60 + minute &&
    preferences.daily_reminder !== false
  )
    await email('daily_reminder', `daily:${user.id}:${clock.date}`, 'Your memory is waiting', [
      'A short memory can add another passage to your life story. Your next question is ready in Easy Memoir.'
    ])
  if (
    user.game_mode_enabled &&
    user.current_streak >= 7 &&
    !wroteToday &&
    clock.minutes >= 23 * 60 &&
    preferences.streak_warning !== false
  )
    await email(
      'streak_warning',
      `streak:${user.id}:${clock.date}`,
      'Keep your memoir streak going',
      [
        `Your current streak is ${user.current_streak} days. If you would like to keep it going, record a memory today.`
      ]
    )
  const digestDue =
    (clock.weekday === 0 && clock.minutes >= 600) || (clock.weekday === 1 && clock.minutes < 600)
  if (
    digestDue &&
    user.game_mode_enabled &&
    preferences.weekly_digest !== false &&
    (user.current_streak > 0 || (lastStory !== null && now - lastStory < 30 * 86400000))
  ) {
    const date = clock.weekday === 0 ? clock.date : dayOffset(clock.date, -1)
    const { results } = await db
      .prepare(
        `SELECT substr(answer,1,100) AS preview FROM stories WHERE user_id=? AND trim(COALESCE(answer,''))<>'' AND julianday(${instant('updated_at')})>julianday(?) ORDER BY updated_at DESC,id DESC LIMIT 5`
      )
      .bind(user.id, new Date(now - 7 * 86400000).toISOString())
      .all()
    await email('weekly_digest', `digest:${user.id}:${date}`, 'Your week in memories', [
      results.length
        ? `This week you recorded ${results.length} recent memories, including: ${results.map(row => row.preview).join(' / ')}`
        : 'Your saved memories are ready whenever you would like to continue.'
    ])
  }
  const weeklyDue =
    (clock.weekday === 1 && clock.minutes >= 360) || (clock.weekday === 2 && clock.minutes < 360)
  if (
    weeklyDue &&
    preferences.weekly_digest !== false &&
    (lastStory === null || now - lastStory < 60 * 86400000)
  ) {
    const topic = await pickTopic(db, user, now)
    if (topic) {
      const key = `weekly-topic:${user.id}:${clock.weekMonday}`
      if (
        canEmail &&
        (['email', 'both'].includes(user.contact_preference || 'email') || !canCall)
      ) {
        const raw = randomHex(32),
          hash = await sha256(raw),
          magicLink = appUrl(env, `/talk/${raw}`)
        const saved = await email(
          'weekly_topic',
          key,
          `This week's topic: ${topic.text}`,
          [
            topic.text,
            'Record an answer in your own words when you are ready. The email link works for seven days.'
          ],
          {
            magicLink,
            tokenRecord: {
              hash,
              prompt: {
                text: topic.text,
                chapterId: topic.chapter_id,
                questionId: topic.question_id
              }
            }
          }
        )
        if (saved)
          await db
            .prepare('UPDATE prompt_library SET times_used=COALESCE(times_used,0)+1 WHERE id=?')
            .bind(topic.id)
            .run()
      }
      if (canCall && contact.includes('phone'))
        await enqueueScheduledTopicCall(env, {
          userId: user.id,
          prompt: topic,
          occurrenceKey: key,
          now
        })
    }
  }
  if (
    weeklyDue &&
    lastStory !== null &&
    now - lastStory >= 7 * 86400000 &&
    user.chapters_done > 0 &&
    user.chapters_done < chapters.length &&
    preferences.daily_reminder !== false
  )
    await email(
      'inactive_reminder',
      `inactive:${user.id}:${clock.weekMonday}`,
      'Your memoir is waiting',
      [
        'Your saved memories are ready whenever you would like to continue. Even a short passage can help capture another part of your story.'
      ]
    )
  if (canEmail) {
    const { results: achievements } = await db
      .prepare(
        `SELECT id,achievement_name,achievement_description FROM achievements a WHERE user_id=? AND julianday(${instant('earned_at')})>julianday(?) AND NOT EXISTS(SELECT 1 FROM native_notification_jobs WHERE occurrence_key='achievement:'||a.id) ORDER BY id LIMIT 5`
      )
      .bind(user.id, new Date(now - 86400000).toISOString())
      .all()
    if (preferences.achievement_earned !== false)
      for (const achievement of achievements)
        await email(
          'achievement_earned',
          `achievement:${achievement.id}`,
          `You earned ${achievement.achievement_name}`,
          [
            achievement.achievement_name,
            achievement.achievement_description || 'Keep capturing your memories in your own words.'
          ]
        )
    const { results: family } = await db
      .prepare(
        `SELECT f.id,f.prompt_text,u.name AS sender FROM family_prompts f LEFT JOIN users u ON u.id=f.from_user_id WHERE f.for_user_id=? AND f.status='pending' AND NOT EXISTS(SELECT 1 FROM native_notification_jobs WHERE occurrence_key='family-prompt:'||f.id) ORDER BY f.id LIMIT 5`
      )
      .bind(user.id)
      .all()
    if (preferences.family_activity !== false)
      for (const item of family)
        await email(
          'family_prompt',
          `family-prompt:${item.id}`,
          'A family question for your memoir',
          ['A family member has a question for your memoir. Sign in to read and respond.']
        )
    const { results: collections } = await db
      .prepare(
        `SELECT p.id,c.collection_name FROM user_collection_progress p JOIN collections c ON c.id=p.collection_id WHERE p.user_id=? AND p.is_complete=1 AND NOT EXISTS(SELECT 1 FROM native_notification_jobs WHERE occurrence_key='collection:'||p.id) ORDER BY p.id LIMIT 5`
      )
      .bind(user.id)
      .all()
    if (preferences.collection_complete !== false)
      for (const item of collections)
        await email(
          'collection_complete',
          `collection:${item.id}`,
          `You completed ${item.collection_name}`,
          [
            `Your ${item.collection_name} collection is complete. Review the memories you have gathered in Easy Memoir.`
          ]
        )
    if (
      preferences.upgrade_reminders === true &&
      (!user.premium_until || parsedInstant(user.premium_until) <= now)
    ) {
      const freeQuestions = [...telegramQuestionMap.values()]
        .filter(question => question.chapterId === 'earliest-memories')
        .map(question => question.questionId)
      const complete = await db
        .prepare(
          `SELECT MAX(s.updated_at) AS completed_at FROM stories s JOIN json_each(?) q ON q.value=s.question_id WHERE s.user_id=? AND s.chapter_id='earliest-memories' AND trim(COALESCE(s.answer,''))<>'' HAVING COUNT(*)=?`
        )
        .bind(JSON.stringify(freeQuestions), user.id, freeQuestions.length)
        .first()
      const completedAt = parsedInstant(complete?.completed_at)
      if (completedAt !== null)
        for (const [index, days] of [1, 4, 8, 14].entries())
          if (now - completedAt >= days * 86400000)
            await email(
              `upgrade_reminder_${index + 1}`,
              `upgrade:${user.id}:${index + 1}`,
              'More chapters of your life story await',
              [
                'Your saved first memories are ready whenever you want to continue. Visit Easy Memoir to see the current memoir options and prices.'
              ]
            )
    }
  }
  if (user.game_mode_enabled && active) await nativeDailyPrompt(db, user.id, now)
  return queued
}
export async function generateNativeNotifications(env, now = Date.now()) {
  if (env.NOTIFICATION_DELIVERY_ENABLED !== 'true') return { queued: 0, disabled: true }
  const db = env.DB.withSession('first-primary'),
    wall = timestampForStorage(now)
  await db
    .prepare(
      "INSERT INTO cron_health(job_name,last_attempt) VALUES('native-notifications',?) ON CONFLICT(job_name) DO UPDATE SET last_attempt=excluded.last_attempt"
    )
    .bind(wall)
    .run()
  await db
    .prepare(
      "INSERT INTO native_notification_cursor(id,last_user_id) VALUES('users',0) ON CONFLICT(id) DO NOTHING"
    )
    .run()
  const cursor = await db
    .prepare("SELECT last_user_id FROM native_notification_cursor WHERE id='users'")
    .first()
  const { results } = await db
    .prepare(
      `SELECT u.id,u.email,u.name,u.email_verified,u.premium_until,u.phone_call_consent,u.phone_number,u.contact_preference,g.notification_preferences,g.preferred_prompt_time,g.timezone,g.game_mode_enabled,g.current_streak,o.channel_preferences,
  (SELECT MAX(updated_at) FROM stories WHERE user_id=u.id AND trim(COALESCE(answer,''))<>'') AS last_story_at,
  (SELECT COUNT(DISTINCT chapter_id) FROM stories WHERE user_id=u.id AND trim(COALESCE(answer,''))<>'') AS chapters_done
  FROM users u LEFT JOIN user_game_state g ON g.user_id=u.id LEFT JOIN user_onboarding o ON o.user_id=u.id WHERE u.deleted_at IS NULL AND u.id>? ORDER BY u.id LIMIT 25`
    )
    .bind(cursor.last_user_id)
    .all()
  let queued = 0,
    failed = 0
  for (const user of results) {
    try {
      queued += await scheduleUser(env, db, user, now)
    } catch {
      failed++
    }
  }
  await db
    .prepare(
      "UPDATE native_notification_cursor SET last_user_id=? WHERE id='users' AND last_user_id=?"
    )
    .bind(results.length ? results.at(-1).id : 0, cursor.last_user_id)
    .run()
  if (!failed)
    await db
      .prepare("UPDATE cron_health SET last_success=? WHERE job_name='native-notifications'")
      .bind(wall)
      .run()
  return { queued, scanned: results.length, failed }
}
export async function cleanupNativeNotifications(env, now = Date.now()) {
  const db = env.DB.withSession('first-primary'),
    cutoff = timestampForStorage(now - 30 * 86400000)
  const hour = Math.floor(now / 3600000)
  const claim = await db
    .prepare(
      "INSERT INTO native_notification_cursor(id,last_user_id) VALUES('cleanup',?) ON CONFLICT(id) DO UPDATE SET last_user_id=excluded.last_user_id WHERE native_notification_cursor.last_user_id<excluded.last_user_id RETURNING id"
    )
    .bind(hour)
    .first()
  if (!claim) return
  try {
    await db.batch([
      db
        .prepare('DELETE FROM auth_rate_limits WHERE window_started_at<?')
        .bind(Math.floor((now - 7 * 86400000) / 1000)),
      db
        .prepare(
          `DELETE FROM token_blacklist WHERE julianday(${instant('expires_at')})<=julianday(?)`
        )
        .bind(new Date(now).toISOString()),
      ...['password_reset_tokens', 'email_verification_tokens', 'email_session_tokens'].map(table =>
        db
          .prepare(`DELETE FROM ${table} WHERE julianday(${instant('expires_at')})<julianday(?)`)
          .bind(new Date(now - 7 * 86400000).toISOString())
      ),
      db.prepare('DELETE FROM native_newsletter_tokens WHERE expires_at<?').bind(now),
      db
        .prepare(
          "UPDATE native_notification_jobs SET payload='{}' WHERE state IN ('sent','cancelled','failed','review') AND updated_at<?"
        )
        .bind(now - 7 * 86400000),
      db
        .prepare(
          "DELETE FROM native_notification_jobs WHERE state IN ('sent','cancelled','failed','review') AND updated_at<?"
        )
        .bind(now - 30 * 86400000),
      db
        .prepare(
          "DELETE FROM native_telegram_inbox WHERE state IN ('completed','cancelled') AND updated_at<?"
        )
        .bind(now - 7 * 86400000),
      db
        .prepare(
          `DELETE FROM telegram_users WHERE user_id IS NULL AND julianday(${instant('updated_at')})<julianday(?) AND NOT EXISTS(SELECT 1 FROM native_notification_jobs j WHERE j.telegram_user_id=telegram_users.id AND j.state='effect_started' AND j.lease_expires>?)`
        )
        .bind(cutoff, now),
      db
        .prepare(
          `DELETE FROM notification_queue WHERE julianday(${instant('created_at')})<julianday(?) AND NOT EXISTS(SELECT 1 FROM native_notification_jobs j WHERE j.queue_id=notification_queue.id AND j.state IN ('pending','processing','effect_started'))`
        )
        .bind(cutoff),
      db
        .prepare(
          `DELETE FROM newsletter_subscribers WHERE id IN (SELECT subscriber_id FROM native_newsletter_consent WHERE confirmed_at IS NULL AND last_confirmation_at<?) AND NOT EXISTS(SELECT 1 FROM native_notification_jobs j WHERE j.subscriber_id=newsletter_subscribers.id AND j.state='effect_started' AND j.lease_expires>?)`
        )
        .bind(now - 30 * 86400000, now)
    ])
  } catch (error) {
    await db
      .prepare(
        "UPDATE native_notification_cursor SET last_user_id=? WHERE id='cleanup' AND last_user_id=?"
      )
      .bind(hour - 1, hour)
      .run()
    throw error
  }
}

import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { sha256 } from './auth-rate-limit.js'
import { timestampForStorage } from './value-codecs.js'
import { readNotificationJson } from '../notifications/request.js'
import { reserveNotificationRate } from '../notifications/rate-limit.js'
import { verifyTelegramSecret, sealNotification } from '../notifications/security.js'
import { telegramQuestionMap } from '../notifications/telegram-questions.js'

export async function handleTelegramWebhook({ request, env, db, path, now }) {
  if (path !== '/webhooks/telegram' || request.method !== 'POST') return null
  if (!(await verifyTelegramSecret(request, env)))
    throw new ApiError(401, { error: 'Invalid webhook signature' })
  if (env.TELEGRAM_ENABLED !== 'true')
    throw new ApiError(503, { error: 'Telegram is temporarily unavailable' })
  const update = await readNotificationJson(request)
  if (!Number.isSafeInteger(update.update_id) || update.update_id < 0)
    throw new ApiError(400, { error: 'Invalid Telegram update' })
  const message = update.message
  // Group/channel posts cannot authorize access to a private memoir account.
  if (
    !message ||
    message.chat?.type !== 'private' ||
    !Number.isSafeInteger(message.chat.id) ||
    message.chat.id < 1 ||
    message.chat.id !== message.from?.id ||
    typeof message.text !== 'string'
  )
    return json({ ok: true, ignored: true })
  if (
    !Number.isSafeInteger(message.message_id) ||
    message.message_id < 1 ||
    message.text.length > 4096
  )
    throw new ApiError(400, { error: 'Invalid Telegram message' })
  const chat = String(message.chat.id),
    text = message.text.trim(),
    wall = timestampForStorage(now)
  await reserveNotificationRate(db, 'telegram-inbound', chat, now, {
    window: 60,
    globalMaximum: 300,
    maximum: 30
  })
  await reserveNotificationRate(db, 'telegram-inbound-day', chat, now, {
    window: 86400,
    globalMaximum: 10000,
    maximum: 500
  })
  const canonical = JSON.stringify({
      updateId: update.update_id,
      chat,
      messageId: message.message_id,
      text
    }),
    hash = await sha256(canonical)
  const profile = field =>
    typeof message.from?.[field] === 'string' ? message.from[field].slice(0, 100) : null
  const rows = await db.batch([
    db
      .prepare(
        `INSERT INTO telegram_users(telegram_chat_id,telegram_username,telegram_first_name,telegram_last_name,created_at,updated_at) VALUES(?,?,?,?,?,?)
   ON CONFLICT(telegram_chat_id) DO UPDATE SET telegram_username=excluded.telegram_username,telegram_first_name=excluded.telegram_first_name,telegram_last_name=excluded.telegram_last_name,updated_at=excluded.updated_at`
      )
      .bind(chat, profile('username'), profile('first_name'), profile('last_name'), wall, wall),
    db
      .prepare(
        'INSERT INTO native_telegram_state(telegram_user_id) SELECT id FROM telegram_users WHERE telegram_chat_id=? ON CONFLICT(telegram_user_id) DO NOTHING'
      )
      .bind(chat),
    db
      .prepare(
        `INSERT INTO native_telegram_inbox(update_id,telegram_user_id,owner_id,authorization_revision,payload_hash,message_id,text,created_at,updated_at)
   SELECT ?,t.id,t.user_id,s.revision,?,?,?,?,? FROM telegram_users t JOIN native_telegram_state s ON s.telegram_user_id=t.id WHERE t.telegram_chat_id=? ON CONFLICT(update_id) DO NOTHING RETURNING update_id`
      )
      .bind(update.update_id, hash, String(message.message_id), text, now, now, chat),
    db
      .prepare(
        `INSERT INTO telegram_messages(telegram_user_id,message_id,direction,content,created_at) SELECT telegram_user_id,message_id,'incoming',text,? FROM native_telegram_inbox WHERE changes()=1 AND update_id=?`
      )
      .bind(wall, update.update_id),
    db
      .prepare('SELECT payload_hash FROM native_telegram_inbox WHERE update_id=?')
      .bind(update.update_id)
  ])
  if (rows[4].results[0]?.payload_hash !== hash)
    throw new ApiError(409, { error: 'Conflicting Telegram update' })
  return json({ ok: true, accepted: rows[2].results.length > 0 })
}
function guestImportStatements(db, { telegramId, userId, claim, context, now }) {
  const statements = [],
    wall = timestampForStorage(now),
    answers = context?.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return statements
  for (const [key, answer] of Object.entries(answers).slice(0, 25)) {
    const question = telegramQuestionMap.get(key)
    if (!question || typeof answer !== 'string' || !answer.trim() || answer.length > 10000) continue
    statements.push(
      db
        .prepare(
          `INSERT INTO stories(user_id,chapter_id,question_id,answer,created_at,updated_at)
   SELECT u.id,?,?,?,?,? FROM users u JOIN telegram_users t ON t.user_id=u.id JOIN native_telegram_state a ON a.telegram_user_id=t.id
   WHERE u.id=? AND u.deleted_at IS NULL AND t.id=? AND a.link_claim=? AND (?='earliest-memories' OR julianday(u.premium_until)>julianday(?))
   ON CONFLICT(user_id,chapter_id,question_id) DO NOTHING RETURNING id`
        )
        .bind(
          question.chapterId,
          question.questionId,
          answer,
          wall,
          wall,
          userId,
          telegramId,
          claim,
          question.chapterId,
          new Date(now).toISOString()
        )
    )
    statements.push(
      db
        .prepare(
          `INSERT INTO story_outbox(id,user_id,story_id,event_type,payload,created_at) SELECT ?,user_id,id,'story-saved',json_object('storyId',id,'userId',user_id,'chapterId',chapter_id,'questionId',question_id,'answer',answer),? FROM stories WHERE changes()=1 AND user_id=? AND chapter_id=? AND question_id=?`
        )
        .bind(crypto.randomUUID(), wall, userId, question.chapterId, question.questionId)
    )
  }
  statements.push(
    db
      .prepare(
        `UPDATE telegram_sessions SET context=json_set(context,'$.answers',json(COALESCE((SELECT json_group_object(g.key,g.value) FROM json_each(json_extract(context,'$.answers')) g WHERE NOT EXISTS(SELECT 1 FROM stories s WHERE s.user_id=? AND s.chapter_id=substr(g.key,1,instr(g.key,':')-1) AND s.question_id=substr(g.key,instr(g.key,':')+1) AND s.answer=g.value)),'{}'))),updated_at=?
  WHERE telegram_user_id=? AND EXISTS(SELECT 1 FROM native_telegram_state a JOIN telegram_users t ON t.id=a.telegram_user_id WHERE t.id=? AND t.user_id=? AND a.link_claim=?)`
      )
      .bind(userId, wall, telegramId, telegramId, userId, claim)
  )
  return statements
}
export async function handleTelegramRoutes({ request, env, db, path, user, claims, now }) {
  if (!path.startsWith('/telegram/')) return null
  requireFullScope(claims)
  if (path === '/telegram/status' && request.method === 'GET') {
    const row = await db
      .prepare(
        `SELECT t.telegram_username,t.telegram_first_name,(SELECT COUNT(*) FROM telegram_sessions s JOIN json_each(json_extract(s.context,'$.answers')) a WHERE s.telegram_user_id=t.id) AS pending_answers FROM telegram_users t WHERE t.user_id=? ORDER BY t.id LIMIT 1`
      )
      .bind(user.id)
      .first()
    return json(
      row
        ? {
            connected: true,
            username: row.telegram_username,
            firstName: row.telegram_first_name,
            pendingAnswers: row.pending_answers
          }
        : { connected: false }
    )
  }
  if (path === '/telegram/unlink' && request.method === 'DELETE') {
    const wall = timestampForStorage(now)
    await db.batch([
      db
        .prepare(
          "UPDATE native_notification_jobs SET state='cancelled',payload='{}',error_code='LINK_REVOKED',updated_at=? WHERE user_id=? AND channel='telegram' AND state IN ('pending','processing')"
        )
        .bind(now, user.id),
      db
        .prepare(
          "UPDATE native_telegram_inbox SET state='cancelled',error_code='LINK_REVOKED',updated_at=? WHERE owner_id=? AND state IN ('pending','processing')"
        )
        .bind(now, user.id),
      db
        .prepare(
          'DELETE FROM telegram_messages WHERE telegram_user_id IN (SELECT id FROM telegram_users WHERE user_id=?)'
        )
        .bind(user.id),
      db
        .prepare(
          "UPDATE telegram_sessions SET context='{}',session_state='idle',current_chapter_id=NULL,current_question_id=NULL,updated_at=? WHERE telegram_user_id IN (SELECT id FROM telegram_users WHERE user_id=?)"
        )
        .bind(wall, user.id),
      db
        .prepare(
          'UPDATE native_telegram_state SET revision=revision+1,link_claim=NULL WHERE telegram_user_id IN (SELECT id FROM telegram_users WHERE user_id=?)'
        )
        .bind(user.id),
      db
        .prepare(
          'UPDATE telegram_users SET user_id=NULL,guest_name=NULL,guest_email=NULL,is_registered=0,link_code=NULL,link_code_expires=NULL,updated_at=? WHERE user_id=?'
        )
        .bind(wall, user.id)
    ])
    return json({ success: true, message: 'Telegram disconnected' })
  }
  if (path !== '/telegram/verify-link' || request.method !== 'POST') return null
  await reserveNotificationRate(db, 'telegram-link', String(user.id), now)
  const input = await readNotificationJson(request, 1024),
    code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : ''
  if (!/^[A-F0-9]{8}$/.test(code)) throw new ApiError(400, { error: 'Invalid or expired code' })
  const hash = await sha256(code),
    link = await db
      .prepare(
        `SELECT t.id,t.telegram_chat_id,s.context,a.revision FROM telegram_users t JOIN native_telegram_state a ON a.telegram_user_id=t.id LEFT JOIN telegram_sessions s ON s.telegram_user_id=t.id
  WHERE t.link_code=? AND t.user_id IS NULL AND julianday(t.link_code_expires)>julianday(?)`
      )
      .bind(hash, new Date(now).toISOString())
      .first()
  if (!link) throw new ApiError(400, { error: 'Invalid or expired code' })
  const claim = crypto.randomUUID(),
    wall = timestampForStorage(now),
    jobId = crypto.randomUUID()
  const payload = await sealNotification(
    {
      chat_id: link.telegram_chat_id,
      text: 'Your Telegram is now connected to your Easy Memoir account. Type /interview to continue capturing your memories.'
    },
    env
  )
  let context
  try {
    context = JSON.parse(link.context || '{}')
  } catch {
    context = {}
  }
  const rows = await db.batch([
    db
      .prepare(
        `UPDATE telegram_users SET user_id=?,is_registered=1,link_code=NULL,link_code_expires=NULL,updated_at=?
   WHERE id=? AND user_id IS NULL AND link_code=? AND julianday(link_code_expires)>julianday(?)
   AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM telegram_users WHERE user_id=?) RETURNING id`
      )
      .bind(user.id, wall, link.id, hash, new Date(now).toISOString(), user.id, user.id),
    db
      .prepare(
        'UPDATE native_telegram_state SET revision=revision+1,link_claim=? WHERE changes()=1 AND telegram_user_id=?'
      )
      .bind(claim, link.id),
    ...guestImportStatements(db, { telegramId: link.id, userId: user.id, claim, context, now }),
    db
      .prepare(
        `INSERT INTO native_notification_jobs(id,occurrence_key,user_id,telegram_user_id,channel,authorization_revision,payload,next_attempt_at,created_at,updated_at)
   SELECT ?,?,?,t.id,'telegram',a.revision,?,?,?,? FROM telegram_users t JOIN native_telegram_state a ON a.telegram_user_id=t.id WHERE t.id=? AND t.user_id=? AND a.link_claim=?`
      )
      .bind(
        jobId,
        `telegram-linked:${link.id}:${claim}`,
        user.id,
        payload,
        now,
        now,
        now,
        link.id,
        user.id,
        claim
      ),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM telegram_sessions s JOIN json_each(json_extract(s.context,'$.answers')) a WHERE s.telegram_user_id=?"
      )
      .bind(link.id)
  ])
  if (!rows[0].results.length)
    throw new ApiError(400, { error: 'Invalid, expired or already linked code' })
  return json({
    success: true,
    message: 'Account linked successfully',
    pendingAnswers: rows.at(-1).results[0].count
  })
}

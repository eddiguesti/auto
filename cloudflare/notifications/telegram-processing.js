import { randomHex } from '../api/auth.js'
import { sha256 } from '../api/auth-rate-limit.js'
import { timestampForStorage } from '../api/value-codecs.js'
import { sealNotification, appUrl } from './security.js'
import { telegramQuestions, telegramQuestionMap } from './telegram-questions.js'
const keys = JSON.stringify(
  telegramQuestions.map(question => `${question.chapterId}:${question.questionId}`)
)
const questionText = question =>
  `${question.chapterTitle}\n\n${question.text}${question.hint ? `\n\n${question.hint}` : ''}`
const guarded = `EXISTS(SELECT 1 FROM native_telegram_inbox i JOIN native_telegram_state a ON a.telegram_user_id=i.telegram_user_id JOIN telegram_users t ON t.id=a.telegram_user_id
 WHERE i.update_id=? AND i.lease_id=? AND i.state='completed' AND a.lease_id=? AND a.revision=i.authorization_revision AND t.user_id IS i.owner_id)`

async function processMessage(env, db, inbox, lease) {
  const row = await db
    .prepare(
      `SELECT t.*,a.revision,a.last_update_id,s.id AS session_id,s.session_state,s.current_chapter_id,s.current_question_id,s.context,u.premium_until,u.deleted_at
  FROM telegram_users t JOIN native_telegram_state a ON a.telegram_user_id=t.id JOIN telegram_sessions s ON s.telegram_user_id=t.id LEFT JOIN users u ON u.id=t.user_id WHERE t.id=? AND a.lease_id=?`
    )
    .bind(inbox.telegram_user_id, lease)
    .first()
  if (!row) return false
  let context
  try {
    context = JSON.parse(row.context || '{}')
  } catch {
    context = {}
  }
  const now = Date.now(),
    wall = timestampForStorage(now),
    premium =
      row.user_id !== null &&
      row.deleted_at === null &&
      new Date(row.premium_until || 0).getTime() > now
  const allowed = telegramQuestions.filter(
    question => premium || question.chapterId === 'earliest-memories'
  )
  const { results } =
    row.user_id !== null
      ? await db
          .prepare(
            `SELECT s.chapter_id||':'||s.question_id AS key FROM stories s JOIN json_each(?) q ON q.value=s.chapter_id||':'||s.question_id WHERE s.user_id=? AND s.answer IS NOT NULL AND trim(s.answer)<>''`
          )
          .bind(keys, row.user_id)
          .all()
      : { results: [] }
  const answered = new Set(
    row.user_id !== null ? results.map(result => result.key) : Object.keys(context.answers || {})
  )
  let state = row.session_state,
    chapter = row.current_chapter_id,
    question = row.current_question_id,
    nextContext = { ...context },
    reply = '',
    historyText,
    saveAnswer = null,
    linkCode = null,
    name = null,
    email = null,
    registered = null
  const text = inbox.text,
    command = text.startsWith('/') ? text.split(/\s+/)[0].split('@')[0].toLowerCase() : null
  const current = telegramQuestionMap.get(`${chapter}:${question}`)
  const next = skip =>
    allowed.find(
      candidate =>
        !answered.has(`${candidate.chapterId}:${candidate.questionId}`) &&
        (!skip || candidate !== current)
    )
  const selectQuestion = candidate => {
    if (!candidate) {
      state = 'completed'
      reply = `You have completed the available interview questions. Your saved memories are kept in Easy Memoir. Visit ${appUrl(env, '/home')} to review them.`
      return
    }
    state = 'waiting_answer'
    chapter = candidate.chapterId
    question = candidate.questionId
    reply = questionText(candidate)
  }
  if (command === '/start') {
    if (row.user_id !== null || row.is_registered) {
      state = 'idle'
      reply =
        'Welcome back. Type /interview to continue, /progress for progress, /link to connect your web account, or /help.'
    } else {
      state = 'registering'
      nextContext = { ...context, step: 'name' }
      reply =
        'Welcome to Easy Memoir. What should I call you? Please type your name. Until you link an account, inactive guest drafts are kept for up to 30 days.'
    }
  } else if (command === '/help')
    reply =
      'Easy Memoir commands: /start, /interview, /progress, /link, /skip, /help. Your memoir account must be linked before answers sync with the website.'
  else if (command === '/link') {
    if (row.user_id !== null)
      reply = 'Your Telegram is already connected to your Easy Memoir account.'
    else {
      linkCode = randomHex(4).toUpperCase()
      reply = `Open ${appUrl(env, '/settings')} and choose Connect Telegram. Enter this code: ${linkCode}\nThe code expires in 15 minutes.`
      historyText = 'An expiring account-link code was sent.'
    }
  } else if (command === '/progress')
    reply = `Questions answered: ${answered.size}/${premium ? telegramQuestions.length : allowed.length}. Type /interview to continue.`
  else if (command === '/interview') {
    if (!row.is_registered && row.user_id === null)
      reply = 'Please type /start to register, or /link to connect your existing account.'
    else if (
      state === 'waiting_answer' &&
      current &&
      allowed.includes(current) &&
      !answered.has(`${chapter}:${question}`)
    )
      reply = questionText(current)
    else selectQuestion(next(false))
  } else if (command === '/skip') {
    if (state !== 'waiting_answer')
      reply = 'There is no question to skip. Type /interview to begin.'
    else selectQuestion(next(true))
  } else if (command) reply = 'Unknown command. Type /help for available commands.'
  else if (state === 'registering') {
    if (context.step === 'name') {
      if (!text || text.length > 100) reply = 'Please enter a name of at most 100 characters.'
      else {
        name = text
        nextContext = { ...context, step: 'email', name: text }
        reply =
          'Thank you. What is your email address? This does not link an existing memoir account; use /link for that.'
      }
    } else if (context.step === 'email') {
      if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
        reply = 'Please enter a valid email address.'
      else {
        email = text.toLowerCase()
        registered = 1
        state = 'idle'
        nextContext = { ...context }
        delete nextContext.step
        reply =
          'You are ready. Type /interview to begin, or /link to connect your Easy Memoir account.'
      }
    } else {
      state = 'idle'
      reply = 'Please type /start to begin.'
    }
  } else if (state === 'waiting_answer' && current && allowed.includes(current)) {
    answered.add(`${chapter}:${question}`)
    if (row.user_id !== null) saveAnswer = { chapterId: chapter, questionId: question, text }
    else {
      nextContext = {
        ...context,
        answers: { ...context.answers, [`${chapter}:${question}`]: text }
      }
      if (JSON.stringify(nextContext).length > 100000) throw new Error('GUEST_INTERVIEW_LIMIT')
    }
    const candidate = next(false)
    selectQuestion(candidate)
    reply = `Your answer is kept.\n\n${reply}`
  } else reply = 'Type /interview to continue your memoir, or /help for commands.'
  const payload = await sealNotification(
      { chat_id: row.telegram_chat_id, text: reply, history_text: historyText || reply },
      env
    ),
    jobId = crypto.randomUUID()
  const contextJson = JSON.stringify(nextContext)
  const storedAnswer =
    'EXISTS(SELECT 1 FROM stories WHERE user_id=? AND chapter_id=? AND question_id=? AND answer=?)'
  const answerBindings = saveAnswer
    ? [row.user_id, saveAnswer.chapterId, saveAnswer.questionId, saveAnswer.text]
    : []
  const conflictText = saveAnswer
    ? reply.replace(
        'Your answer is kept.',
        'Your existing website answer was kept. This Telegram draft needs review and is included in your account data download.'
      )
    : null
  const conflictPayload = saveAnswer
    ? await sealNotification(
        { chat_id: row.telegram_chat_id, text: conflictText, history_text: conflictText },
        env
      )
    : null
  // JSON path/value is a pair. The conflict branch retains the incoming draft
  // separately when another editor saved this question before the bot answer.
  const contextExpression = saveAnswer
    ? `CASE WHEN ${storedAnswer} THEN ? ELSE json_set(?,?,?) END`
    : '?'
  const contextBindings = saveAnswer
    ? [
        ...answerBindings,
        contextJson,
        contextJson,
        `$.answers."${saveAnswer.chapterId}:${saveAnswer.questionId}"`,
        saveAnswer.text
      ]
    : [contextJson]
  const outgoingExpression = saveAnswer ? `CASE WHEN ${storedAnswer} THEN ? ELSE ? END` : '?'
  const outgoingBindings = saveAnswer ? [...answerBindings, payload, conflictPayload] : [payload]
  const checks = [inbox.update_id, lease, lease]
  const statements = [
    db
      .prepare(
        `UPDATE native_telegram_inbox SET state='completed',updated_at=? WHERE update_id=? AND lease_id=? AND state='processing'
   AND EXISTS(SELECT 1 FROM native_telegram_state a JOIN telegram_users t ON t.id=a.telegram_user_id JOIN telegram_sessions s ON s.telegram_user_id=t.id
    WHERE t.id=? AND a.lease_id=? AND a.revision=native_telegram_inbox.authorization_revision AND t.user_id IS native_telegram_inbox.owner_id
    AND s.context IS ? AND s.current_chapter_id IS ? AND s.current_question_id IS ? AND s.session_state IS ?)
   ${saveAnswer ? `AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL AND (?='earliest-memories' OR julianday(premium_until)>julianday(?)))` : ''} RETURNING update_id`
      )
      .bind(
        now,
        inbox.update_id,
        lease,
        row.id,
        lease,
        row.context,
        row.current_chapter_id,
        row.current_question_id,
        row.session_state,
        ...(saveAnswer ? [row.user_id, saveAnswer.chapterId, new Date(now).toISOString()] : [])
      )
  ]
  if (saveAnswer) {
    statements.push(
      db
        .prepare(
          `INSERT INTO stories(user_id,chapter_id,question_id,answer,created_at,updated_at)
   SELECT ?,?,?,?,?,? WHERE ${guarded} ON CONFLICT(user_id,chapter_id,question_id) DO NOTHING RETURNING id`
        )
        .bind(
          row.user_id,
          saveAnswer.chapterId,
          saveAnswer.questionId,
          saveAnswer.text,
          wall,
          wall,
          ...checks
        )
    )
    statements.push(
      db
        .prepare(
          `INSERT INTO story_outbox(id,user_id,story_id,event_type,payload,created_at) SELECT ?,user_id,id,'story-saved',json_object('storyId',id,'userId',user_id,'chapterId',chapter_id,'questionId',question_id,'answer',answer),? FROM stories WHERE changes()=1 AND user_id=? AND chapter_id=? AND question_id=?`
        )
        .bind(crypto.randomUUID(), wall, row.user_id, saveAnswer.chapterId, saveAnswer.questionId)
    )
  }
  statements.push(
    db
      .prepare(
        `UPDATE telegram_users SET guest_name=COALESCE(?,guest_name),guest_email=COALESCE(?,guest_email),is_registered=COALESCE(?,is_registered),updated_at=? WHERE id=? AND ${guarded}`
      )
      .bind(name, email, registered, wall, row.id, ...checks),
    db
      .prepare(
        `UPDATE telegram_sessions SET session_state=?,current_chapter_id=?,current_question_id=?,context=${contextExpression},updated_at=? WHERE telegram_user_id=? AND ${guarded}`
      )
      .bind(state, chapter, question, ...contextBindings, wall, row.id, ...checks),
    db
      .prepare(
        `INSERT INTO native_notification_jobs(id,occurrence_key,user_id,telegram_user_id,channel,authorization_revision,payload,next_attempt_at,created_at,updated_at)
   SELECT ?,?,?,?,?,?,${outgoingExpression},?,?,? WHERE ${guarded} ON CONFLICT(occurrence_key) DO NOTHING`
      )
      .bind(
        jobId,
        `telegram-reply:${inbox.update_id}`,
        row.user_id,
        row.id,
        'telegram',
        row.revision,
        ...outgoingBindings,
        now,
        now,
        now,
        ...checks
      ),
    db
      .prepare(
        `UPDATE native_telegram_state SET last_update_id=MAX(last_update_id,?),lease_id=NULL,lease_expires=NULL WHERE telegram_user_id=? AND lease_id=? AND ${guarded}`
      )
      .bind(inbox.update_id, row.id, lease, ...checks)
  )
  if (linkCode)
    statements.splice(
      statements.length - 1,
      0,
      db
        .prepare(
          `UPDATE telegram_users SET link_code=?,link_code_expires=?,updated_at=? WHERE id=? AND user_id IS NULL AND ${guarded}`
        )
        .bind(
          await sha256(linkCode),
          new Date(now + 15 * 60000).toISOString(),
          wall,
          row.id,
          ...checks
        )
    )
  const saved = await db.batch(statements)
  if (!saved[0].results.length) return false
  return true
}
export async function processTelegramInbox(env, now = Date.now()) {
  if (env.TELEGRAM_ENABLED !== 'true') return { processed: 0, disabled: true }
  const db = env.DB.withSession('first-primary')
  await db.batch([
    db
      .prepare(
        "UPDATE native_telegram_inbox SET state='pending',lease_id=NULL,lease_expires=NULL WHERE state='processing' AND lease_expires<=? AND attempts<5"
      )
      .bind(now),
    db
      .prepare(
        "UPDATE native_telegram_inbox SET state='failed',error_code='PROCESSING_ATTEMPTS_EXHAUSTED' WHERE state IN ('pending','processing') AND attempts>=5 AND (lease_expires IS NULL OR lease_expires<=?)"
      )
      .bind(now)
  ])
  const { results } = await db
    .prepare(
      "SELECT update_id,telegram_user_id FROM native_telegram_inbox WHERE state='pending' ORDER BY update_id LIMIT 20"
    )
    .all()
  let processed = 0
  for (const candidate of results) {
    const lease = crypto.randomUUID(),
      clock = Date.now(),
      wall = timestampForStorage(clock)
    const claims = await db.batch([
      db
        .prepare(
          `UPDATE native_telegram_state SET lease_id=?,lease_expires=? WHERE telegram_user_id=? AND (lease_id IS NULL OR lease_expires<=?) RETURNING telegram_user_id`
        )
        .bind(lease, clock + 60000, candidate.telegram_user_id, clock),
      db
        .prepare(
          `UPDATE native_telegram_inbox SET state='processing',lease_id=?,lease_expires=?,attempts=attempts+1,updated_at=? WHERE changes()=1 AND update_id=? AND state='pending' RETURNING *`
        )
        .bind(lease, clock + 60000, clock, candidate.update_id),
      db
        .prepare(
          `INSERT INTO telegram_sessions(telegram_user_id,created_at,updated_at) SELECT ?,?,? WHERE changes()=1 ON CONFLICT(telegram_user_id) DO NOTHING`
        )
        .bind(candidate.telegram_user_id, wall, wall)
    ])
    const inbox = claims[1].results[0]
    if (!inbox) {
      await db
        .prepare(
          'UPDATE native_telegram_state SET lease_id=NULL,lease_expires=NULL WHERE telegram_user_id=? AND lease_id=?'
        )
        .bind(candidate.telegram_user_id, lease)
        .run()
      continue
    }
    const authority = await db
      .prepare(
        `SELECT a.revision,a.last_update_id,t.user_id FROM native_telegram_state a JOIN telegram_users t ON t.id=a.telegram_user_id WHERE t.id=? AND a.lease_id=? AND (t.user_id IS NULL OR EXISTS(SELECT 1 FROM users WHERE id=t.user_id AND deleted_at IS NULL))`
      )
      .bind(inbox.telegram_user_id, lease)
      .first()
    if (
      !authority ||
      authority.revision !== inbox.authorization_revision ||
      authority.user_id !== inbox.owner_id ||
      authority.last_update_id >= inbox.update_id
    ) {
      await db.batch([
        db
          .prepare(
            "UPDATE native_telegram_inbox SET state='cancelled',error_code='LINK_OR_ORDER_CHANGED',updated_at=? WHERE update_id=? AND lease_id=?"
          )
          .bind(clock, inbox.update_id, lease),
        db
          .prepare(
            'UPDATE native_telegram_state SET lease_id=NULL,lease_expires=NULL WHERE telegram_user_id=? AND lease_id=?'
          )
          .bind(inbox.telegram_user_id, lease)
      ])
      continue
    }
    try {
      if (await processMessage(env, db, inbox, lease)) processed++
      else throw new Error('INTERVIEW_CHANGED')
    } catch {
      await db.batch([
        db
          .prepare(
            "UPDATE native_telegram_inbox SET state='pending',lease_id=NULL,lease_expires=NULL,error_code='PROCESSING_RETRY_PENDING',updated_at=? WHERE update_id=? AND lease_id=? AND state='processing'"
          )
          .bind(Date.now(), inbox.update_id, lease),
        db
          .prepare(
            'UPDATE native_telegram_state SET lease_id=NULL,lease_expires=NULL WHERE telegram_user_id=? AND lease_id=?'
          )
          .bind(inbox.telegram_user_id, lease)
      ])
    }
  }
  return { processed }
}

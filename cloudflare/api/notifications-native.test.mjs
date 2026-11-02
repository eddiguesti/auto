import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import { sqlStatements } from './fixtures/sql-statements.mjs'
import { seedNativeGameCatalog } from './game-catalog.js'
import { localNotificationClock } from '../notifications/schedule.js'
const secret = 'fake-notification-secret-at-least-32-characters',
  webhookSecret = 'fake-telegram-webhook-secret-at-least-32-characters'
let runtime, db, emails, telegram, emailFails, telegramFails, emailHold
before(async () => {
  const outfile = fileURLToPath(
    new URL('../../.cloudflare/api-tests/notification-worker.mjs', import.meta.url)
  )
  await build({
    entryPoints: [
      fileURLToPath(new URL('./fixtures/notifications-test-worker.js', import.meta.url))
    ],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers', 'node:buffer'],
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'notifications',
      modules: true,
      scriptPath: outfile,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NOTIFICATION_DELIVERY_ENABLED: 'true',
        TELEGRAM_ENABLED: 'true',
        TELEGRAM_BOT_TOKEN: '123456:fake_bot_key_32_characters_or_more',
        TELEGRAM_WEBHOOK_SECRET: webhookSecret,
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC',
        APP_URL: 'https://app.invalid'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000084' },
      serviceBindings: {
        EMAIL_PROVIDER: async request => {
          emails.push({ headers: [...request.headers], body: await request.json() })
          if (emailHold) await emailHold
          if (emailFails) throw new Error('simulated transport failure')
          return Response.json({ id: `fake-email-${emails.length}` })
        },
        TELEGRAM_FETCH: async request => {
          telegram.push({ url: request.url, body: await request.json() })
          if (telegramFails) throw new Error('simulated transport failure')
          return Response.json({ ok: true, result: { message_id: telegram.length } })
        }
      }
    })
  )
  db = await runtime.getD1Database('DB')
  for (const file of [
    '../db/schema.sql',
    ...(await readdir(new URL('./migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql'))
      .sort()
      .map(name => `./migrations/${name}`)
  ])
    await db.batch(
      sqlStatements(await readFile(new URL(file, import.meta.url), 'utf8')).map(sql =>
        db.prepare(sql)
      )
    )
  await seedNativeGameCatalog(db)
})
after(async () => runtime?.dispose())
beforeEach(async () => {
  emails = []
  telegram = []
  emailFails = false
  telegramFails = false
  emailHold = null
  await db.batch(
    [
      'native_notification_jobs',
      'native_notification_cursor',
      'native_telegram_inbox',
      'telegram_users',
      'newsletter_subscribers',
      'auth_rate_limits',
      'users'
    ].map(table => db.prepare(`DELETE FROM ${table}`))
  )
  await db
    .prepare(
      "INSERT INTO users(id,email,name,email_verified,premium_until) VALUES(1,'writer@example.invalid','Writer',1,'2099-01-01 00:00:00'),(2,'other@example.invalid','Other',1,NULL)"
    )
    .run()
  await db
    .prepare(
      'INSERT INTO user_onboarding(user_id,channel_preferences) VALUES(1,\'["email","telegram"]\'),(2,\'["email"]\')'
    )
    .run()
})
const auth = (id = 1, extra = {}) =>
  `Bearer ${jwt.sign({ id, email: `writer${id}@example.invalid`, ...extra }, secret, { expiresIn: '1h' })}`
function call(path, { method = 'POST', body = {}, authorization = auth(), headers = {} } = {}) {
  return runtime.dispatchFetch(`https://app.invalid/api${path}`, {
    method,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      'Content-Type': 'application/json',
      ...headers
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) })
  })
}
const tick = kind => runtime.dispatchFetch(`https://app.invalid/__test__/${kind}`)
function update(id, text, chatId = 12345) {
  return {
    update_id: id,
    message: {
      message_id: id,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: 'private' },
      from: { id: chatId, first_name: 'Mary', username: 'mary' },
      text
    }
  }
}
const webhook = body =>
  call('/webhooks/telegram', {
    body,
    authorization: null,
    headers: { 'X-Telegram-Bot-Api-Secret-Token': webhookSecret }
  })

test('notification preferences validate booleans/timezones, preserve other flags and remain owner/full-scope isolated', async () => {
  assert.equal(
    (
      await call('/notifications/preferences', {
        method: 'PUT',
        body: {
          preferences: { daily_reminder: false },
          preferredPromptTime: '9:30',
          timezone: 'Europe/Madrid'
        }
      })
    ).status,
    200
  )
  const response = await call('/notifications/preferences', { method: 'GET' }),
    data = (await response.json()).data
  assert.equal(data.notification_preferences.daily_reminder, false)
  assert.equal(data.notification_preferences.weekly_digest, true)
  assert.equal(data.preferred_prompt_time, '09:30')
  assert.equal(data.timezone, 'Europe/Madrid')
  assert.equal(
    (await call('/notifications/preferences', { method: 'PUT', body: { timezone: 'Not/A_Zone' } }))
      .status,
    400
  )
  assert.equal(
    (
      await call('/notifications/preferences', {
        method: 'PUT',
        body: { preferences: { daily_reminder: 'false' } }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await call('/notifications/preferences', {
        method: 'GET',
        authorization: auth(1, { scope: 'magic_link' })
      })
    ).status,
    403
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM user_game_state WHERE user_id=2').first())
      .count,
    0
  )
})
test('Telegram authenticates before durable acknowledgement, rejects conflicting replays and never processes a private account through group messages', async () => {
  assert.equal(
    (await call('/webhooks/telegram', { body: update(1, '/start'), authorization: null })).status,
    401
  )
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM native_telegram_inbox').first()).count,
    0
  )
  const first = await webhook(update(1, '/start'))
  assert.equal(first.status, 200)
  assert.equal((await first.json()).accepted, true)
  assert.equal(
    (await db.prepare('SELECT content FROM telegram_messages').first()).content,
    '/start'
  )
  assert.equal((await (await webhook(update(1, '/start'))).json()).accepted, false)
  assert.equal((await webhook(update(1, 'different text'))).status, 409)
  const group = update(2, '/progress')
  group.message.chat.type = 'group'
  assert.equal((await webhook(group)).status, 200)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM native_telegram_inbox').first()).count,
    1
  )
  assert.equal(telegram.length, 0)
})
test('a D1 inbox failure returns503 and rolls back the incoming message instead of losing it after acknowledgement', async () => {
  await db
    .prepare(
      "CREATE TRIGGER fail_telegram_inbox BEFORE INSERT ON native_telegram_inbox BEGIN SELECT RAISE(ABORT,'storage unavailable'); END"
    )
    .run()
  try {
    assert.equal((await webhook(update(1, '/start'))).status, 503)
  } finally {
    await db.prepare('DROP TRIGGER fail_telegram_inbox').run()
  }
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM telegram_messages').first()).count,
    0
  )
  assert.equal((await webhook(update(1, '/start'))).status, 200)
})
test('Telegram guest registration and answers commit before replies, and hashed one-time link codes migrate answers without overwriting web edits', async () => {
  for (const [id, text] of [
    [1, '/start'],
    [2, 'Mary Smith'],
    [3, 'mary@example.invalid'],
    [4, '/interview'],
    [5, 'A precious first memory'],
    [6, '/link']
  ]) {
    assert.equal((await webhook(update(id, text))).status, 200)
    const processed = await tick('inbox')
    assert.equal(processed.status, 200)
    assert.equal((await processed.json()).processed, 1)
    assert.equal((await tick('deliver')).status, 200)
  }
  const linkMessage = telegram.find(item => item.body.text.includes('Enter this code:')).body.text,
    code = /code: ([A-F0-9]{8})/.exec(linkMessage)[1]
  const stored = await db.prepare('SELECT link_code FROM telegram_users').first()
  assert.notEqual(stored.link_code, code)
  assert.equal(stored.link_code.length, 64)
  assert.ok(
    !(await db
      .prepare(
        "SELECT content FROM telegram_messages WHERE direction='outgoing' AND content LIKE '%Enter this code:%'"
      )
      .first())
  )
  const context = JSON.parse(
      (await db.prepare('SELECT context FROM telegram_sessions').first()).context
    ),
    [pair] = Object.keys(context.answers),
    [chapter, question] = pair.split(':')
  await db
    .prepare('INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES(1,?,?,?)')
    .bind(chapter, question, 'A newer web answer')
    .run()
  const linked = await call('/telegram/verify-link', { body: { code } })
  assert.equal(linked.status, 200)
  assert.equal(
    (await db.prepare('SELECT answer FROM stories').first()).answer,
    'A newer web answer'
  )
  assert.equal(
    JSON.parse((await db.prepare('SELECT context FROM telegram_sessions').first()).context).answers[
      pair
    ],
    'A precious first memory'
  )
  assert.equal(
    (await call('/telegram/verify-link', { body: { code }, authorization: auth(2) })).status,
    400
  )
  const status = await call('/telegram/status', { method: 'GET' })
  assert.equal((await status.json()).connected, true)
})
test('newsletter confirmation is encrypted, email-idempotent and cannot reactivate consent through an old confirmation after unsubscribe', async () => {
  assert.equal(
    (
      await call('/newsletter/subscribe', {
        body: { email: ' NEWS@EXAMPLE.INVALID ', _ts: Date.now() - 3000 },
        authorization: null
      })
    ).status,
    200
  )
  assert.ok(
    (await db.prepare('SELECT unsubscribed_at FROM newsletter_subscribers').first()).unsubscribed_at
  )
  const job = await db.prepare('SELECT payload FROM native_notification_jobs').first()
  assert.ok(!job.payload.includes('news@example.invalid'))
  assert.ok(!job.payload.includes('token='))
  await tick('deliver')
  assert.equal(emails.length, 1)
  const html = emails[0].body.html,
    confirm = /\/confirm\?token=([a-f0-9]{64})/.exec(html)[1],
    unsubscribe = /\/unsubscribe\?token=([a-f0-9]{64})/.exec(html)[1]
  assert.ok(
    emails[0].headers.some(
      ([key, value]) => key === 'idempotency-key' && value.startsWith('notification/')
    )
  )
  const confirmPage = await call(`/newsletter/confirm?token=${confirm}`, {
    method: 'GET',
    authorization: null
  })
  assert.equal(confirmPage.status, 200)
  assert.ok(
    (await db.prepare('SELECT unsubscribed_at FROM newsletter_subscribers').first())
      .unsubscribed_at,
    'link previews do not confirm consent'
  )
  assert.equal(
    (await call(`/newsletter/confirm?token=${confirm}`, { authorization: null })).status,
    200
  )
  assert.equal(
    (await db.prepare('SELECT unsubscribed_at FROM newsletter_subscribers').first())
      .unsubscribed_at,
    null
  )
  assert.equal(
    (await call(`/newsletter/unsubscribe?token=${unsubscribe}`, { authorization: null })).status,
    200
  )
  assert.equal(
    (await call(`/newsletter/confirm?token=${confirm}`, { authorization: null })).status,
    400
  )
  assert.ok(
    (await db.prepare('SELECT unsubscribed_at FROM newsletter_subscribers').first()).unsubscribed_at
  )
  await tick('deliver')
  assert.equal(emails.length, 1)
})
test('email retries reuse one immutable provider idempotency key while ambiguous Telegram sends stop for review', async () => {
  await call('/newsletter/subscribe', {
    body: { email: 'retry@example.invalid' },
    authorization: null
  })
  emailFails = true
  await tick('deliver')
  assert.equal(emails.length, 1)
  assert.equal(
    (await db.prepare('SELECT state FROM native_notification_jobs').first()).state,
    'pending'
  )
  await db
    .prepare('UPDATE native_notification_jobs SET next_attempt_at=?')
    .bind(Date.now() - 1)
    .run()
  emailFails = false
  await tick('deliver')
  assert.equal(emails.length, 2)
  assert.deepEqual(emails[0], emails[1])
  await webhook(update(1, '/start'))
  await tick('inbox')
  telegramFails = true
  await tick('deliver')
  assert.equal(telegram.length, 1)
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM native_notification_jobs WHERE channel='telegram'")
        .first()
    ).state,
    'review'
  )
  await tick('deliver')
  assert.equal(telegram.length, 1)
})

async function generate(at) {
  return runtime.dispatchFetch(`https://app.invalid/__test__/generate?now=${Date.parse(at)}`)
}
async function resetScan() {
  await db.prepare("UPDATE native_notification_cursor SET last_user_id=0 WHERE id='users'").run()
}
async function enqueue(key, type = 'daily_reminder') {
  return runtime.dispatchFetch('https://app.invalid/__test__/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 1,
      type,
      key,
      subject: 'A memoir reminder',
      message: {
        from: 'Memoir <hello@example.invalid>',
        to: 'writer@example.invalid',
        subject: 'A memoir reminder',
        text: 'Your saved memoir is ready.',
        html: '<p>Your saved memoir is ready.</p>',
        summary: 'Your saved memoir is ready.'
      }
    })
  })
}
async function waitForEmail() {
  const until = Date.now() + 3000
  while (!emails.length && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(emails.length, 1)
}
test('local schedule clocks preserve London DST changes and a repeated fall-back hour creates only one daily occurrence', async () => {
  assert.equal(
    localNotificationClock(Date.parse('2026-10-25T00:30:00Z'), 'Europe/London').minutes,
    90
  )
  assert.equal(
    localNotificationClock(Date.parse('2026-10-25T01:30:00Z'), 'Europe/London').minutes,
    90
  )
  await db
    .prepare(
      "INSERT INTO user_game_state(user_id,game_mode_enabled,current_streak,preferred_prompt_time,timezone) VALUES(1,1,1,'01:30','Europe/London')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,updated_at) VALUES(1,'earliest-memories','test-activity','A memory','2026-10-24 12:00:00')"
    )
    .run()
  const first = await generate('2026-10-25T00:30:00Z')
  assert.equal(first.status, 200)
  assert.equal((await first.json()).failed, 0)
  await resetScan()
  assert.equal((await generate('2026-10-25T01:30:00Z')).status, 200)
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM native_notification_jobs WHERE occurrence_key='daily:1:2026-10-25'"
        )
        .first()
    ).count,
    1
  )
  assert.equal(emails.length, 0, 'generation creates durable intent without sending')
})
test('a skipped spring-forward preferred time runs at the first later local minute instead of being lost', async () => {
  await db
    .prepare(
      "INSERT INTO user_game_state(user_id,game_mode_enabled,current_streak,preferred_prompt_time,timezone) VALUES(1,1,1,'01:30','Europe/London')"
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,updated_at) VALUES(1,'earliest-memories','test-activity','A memory','2026-03-28 12:00:00')"
    )
    .run()
  await generate('2026-03-29T00:59:00Z')
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM native_notification_jobs WHERE occurrence_key LIKE 'daily:1:%'"
        )
        .first()
    ).count,
    0
  )
  await resetScan()
  const response = await generate('2026-03-29T01:00:00Z')
  assert.equal((await response.json()).failed, 0)
  assert.equal(
    (
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM native_notification_jobs WHERE occurrence_key='daily:1:2026-03-29'"
        )
        .first()
    ).count,
    1
  )
})
test('concurrent weekly scans reserve one hashed prompt-bound magic link per owner/local week and do not expose bearer URLs in history', async () => {
  const results = await Promise.all([
    generate('2026-11-09T06:00:00Z'),
    generate('2026-11-09T06:00:00Z')
  ])
  for (const response of results) {
    assert.equal(response.status, 200)
    assert.equal((await response.json()).failed, 0)
  }
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM native_notification_jobs WHERE user_id=1 AND occurrence_key='weekly-topic:1:2026-11-09'"
    )
    .first()
  assert.equal(row.count, 1)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM email_session_tokens WHERE user_id=1').first())
      .count,
    1
  )
  const token = await db
    .prepare(
      'SELECT token_hash,prompt_chapter_id,prompt_question_id FROM email_session_tokens WHERE user_id=2'
    )
    .first()
  assert.equal(token.token_hash.length, 64)
  assert.equal(token.prompt_chapter_id, 'earliest-memories')
  assert.ok(token.prompt_question_id)
  const history = await db
    .prepare(
      "SELECT body FROM notification_queue WHERE user_id=1 AND notification_type='weekly_topic'"
    )
    .first()
  assert.ok(!history.body.includes('token='))
  assert.ok(!history.body.includes('/talk/'))
})
test('consent withdrawal cancels queued messages and an active external send fences account erasure until its receipt commits', async () => {
  await call('/notifications/preferences', {
    method: 'PUT',
    body: { preferences: { daily_reminder: true } }
  })
  await enqueue('consent-first')
  await enqueue('consent-second')
  let release
  emailHold = new Promise(resolve => {
    release = resolve
  })
  const delivery = tick('deliver')
  try {
    await waitForEmail()
    await assert.rejects(
      db.prepare('DELETE FROM users WHERE id=1').run(),
      /EXTERNAL_ACCOUNT_WORK_PENDING/
    )
    assert.equal(
      (
        await call('/notifications/preferences', {
          method: 'PUT',
          body: { preferences: { daily_reminder: false } }
        })
      ).status,
      200
    )
  } finally {
    release()
  }
  assert.equal((await delivery).status, 200)
  assert.equal(emails.length, 1)
  const rows = (
    await db.prepare('SELECT state FROM native_notification_jobs ORDER BY occurrence_key').all()
  ).results
  assert.deepEqual(rows.map(row => row.state).sort(), ['cancelled', 'sent'])
  await db.prepare('DELETE FROM users WHERE id=1').run()
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) AS count FROM native_notification_jobs WHERE user_id=1')
        .first()
    ).count,
    0
  )
})
test('unlinked/revoked Telegram inbox work cannot mutate an account or send a queued old-owner reply', async () => {
  await webhook(update(1, '/link'))
  await tick('inbox')
  await tick('deliver')
  const code = /code: ([A-F0-9]{8})/.exec(telegram[0].body.text)[1]
  assert.equal((await call('/telegram/verify-link', { body: { code } })).status, 200)
  await webhook(update(2, '/interview'))
  assert.equal((await call('/telegram/unlink', { method: 'DELETE' })).status, 200)
  await tick('inbox')
  await tick('deliver')
  assert.equal(telegram.length, 1)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM stories WHERE user_id=1').first()).count,
    0
  )
  assert.equal(
    (await db.prepare('SELECT state FROM native_telegram_inbox WHERE update_id=2').first()).state,
    'cancelled'
  )
  assert.equal((await db.prepare('SELECT user_id FROM telegram_users').first()).user_id, null)
})
test('an expired uncertain email send stops outside the provider idempotency window and hourly cleanup removes only expired guest/provider data', async () => {
  await call('/notifications/preferences', {
    method: 'PUT',
    body: { preferences: { daily_reminder: true } }
  })
  await enqueue('expired-provider-effect')
  await db
    .prepare(
      "UPDATE native_notification_jobs SET state='effect_started',lease_expires=?,first_send_at=?"
    )
    .bind(Date.now() - 1, Date.now() - 25 * 3600000)
    .run()
  await tick('deliver')
  assert.equal(emails.length, 0)
  assert.equal(
    (await db.prepare('SELECT state FROM native_notification_jobs').first()).state,
    'review'
  )
  await db
    .prepare(
      "INSERT INTO telegram_users(telegram_chat_id,updated_at) VALUES('999','2000-01-01 00:00:00'),('888',CURRENT_TIMESTAMP)"
    )
    .run()
  const response = await runtime.dispatchFetch('https://app.invalid/__test__/cleanup')
  assert.equal(response.status, 200)
  assert.equal(
    (
      await db
        .prepare("SELECT COUNT(*) AS count FROM telegram_users WHERE telegram_chat_id='999'")
        .first()
    ).count,
    0
  )
  assert.equal(
    (
      await db
        .prepare("SELECT COUNT(*) AS count FROM telegram_users WHERE telegram_chat_id='888'")
        .first()
    ).count,
    1
  )
})

test('concurrent newsletter requests and Telegram code claims commit one owner/confirmation without duplicating sends', async () => {
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      call('/newsletter/subscribe', {
        body: { email: 'one-request@example.invalid' },
        authorization: null
      })
    )
  )
  assert.ok(responses.every(response => response.status === 200))
  assert.equal(
    (
      await db
        .prepare(
          'SELECT COUNT(*) AS count FROM native_notification_jobs WHERE subscriber_id IS NOT NULL'
        )
        .first()
    ).count,
    1
  )
  await webhook(update(1, '/link'))
  await tick('inbox')
  await tick('deliver')
  const code = /code: ([A-F0-9]{8})/.exec(telegram[0].body.text)[1]
  const claims = await Promise.all([
    call('/telegram/verify-link', { body: { code }, authorization: auth(1) }),
    call('/telegram/verify-link', { body: { code }, authorization: auth(2) })
  ])
  assert.equal(claims.filter(response => response.status === 200).length, 1)
  assert.equal(claims.filter(response => response.status === 400).length, 1)
  const linked = await db.prepare('SELECT user_id,link_code FROM telegram_users').first()
  assert.ok([1, 2].includes(linked.user_id))
  assert.equal(linked.link_code, null)
})
test('delivery feature flags prevent provider effects and pause Telegram independently from email', async () => {
  await webhook(update(1, '/start'))
  await tick('inbox')
  await call('/newsletter/subscribe', {
    body: { email: 'flag@example.invalid' },
    authorization: null
  })
  assert.equal((await tick('deliver-disabled')).status, 200)
  assert.equal(emails.length, 0)
  assert.equal(telegram.length, 0)
  assert.equal((await tick('deliver-telegram-disabled')).status, 200)
  assert.equal(emails.length, 1)
  assert.equal(telegram.length, 0)
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM native_notification_jobs WHERE channel='telegram'")
        .first()
    ).state,
    'pending'
  )
  await tick('deliver')
  assert.equal(telegram.length, 1)
})
test('the Telegram transport rejects redirects without following them or exposing bot credentials to a new origin', async () => {
  const { sendTelegram } = await import('../notifications/outbox.js')
  const calls = []
  await assert.rejects(
    sendTelegram(
      {
        TELEGRAM_BOT_TOKEN: '123456:fake_bot_key_32_characters_or_more',
        TELEGRAM_FETCH: {
          async fetch(url, options) {
            calls.push({ url, redirect: options.redirect })
            return new Response('', {
              status: 302,
              headers: { Location: 'https://attacker.invalid' }
            })
          }
        }
      },
      { chat_id: '12345', text: 'A synthetic message' }
    )
  )
  assert.equal(calls.length, 1)
  assert.equal(calls[0].redirect, 'manual')
  assert.ok(calls[0].url.startsWith('https://api.telegram.org/bot'))
})

test('signed account email unsubscribe requires confirmation, rejects another-user forgery and leaves transactional Telegram replies alone', async () => {
  const { accountOptoutToken } = await import('../notifications/unsubscribe.js')
  const { enqueueTelegramReply } = await import('../notifications/outbox.js')
  await call('/notifications/preferences', {
    method: 'PUT',
    body: { preferences: { daily_reminder: true } }
  })
  await enqueue('optout-email')
  await db
    .prepare("INSERT INTO telegram_users(id,telegram_chat_id,user_id) VALUES(1,'12345',1)")
    .run()
  await db.prepare('INSERT INTO native_telegram_state(telegram_user_id) VALUES(1)').run()
  await enqueueTelegramReply({ JWT_SECRET: secret }, db, {
    telegramUserId: 1,
    userId: 1,
    revision: 0,
    key: 'optout-bot-reply',
    text: 'A requested bot reply'
  })
  const token = await accountOptoutToken(1, { JWT_SECRET: secret })
  assert.equal(
    (
      await call(`/notifications/unsubscribe?token=${token}`, {
        method: 'GET',
        authorization: null
      })
    ).status,
    200
  )
  assert.equal(
    JSON.parse(
      (
        await db
          .prepare('SELECT notification_preferences FROM user_game_state WHERE user_id=1')
          .first()
      ).notification_preferences
    ).daily_reminder,
    true
  )
  assert.equal(
    (
      await call(`/notifications/unsubscribe?token=2.${token.split('.')[1]}`, {
        authorization: null
      })
    ).status,
    400
  )
  assert.equal(
    (await call(`/notifications/unsubscribe?token=${token}`, { authorization: null })).status,
    200
  )
  assert.deepEqual(
    JSON.parse(
      (await db.prepare('SELECT channel_preferences FROM user_onboarding WHERE user_id=1').first())
        .channel_preferences
    ),
    ['telegram']
  )
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM native_notification_jobs WHERE occurrence_key='optout-email'")
        .first()
    ).state,
    'cancelled'
  )
  assert.equal(
    (
      await db
        .prepare(
          "SELECT state FROM native_notification_jobs WHERE occurrence_key='optout-bot-reply'"
        )
        .first()
    ).state,
    'pending'
  )
})

test('a Telegram answer arriving after an independent web edit retains both versions and exposes the pending review count', async () => {
  await db
    .prepare(
      "INSERT INTO telegram_users(id,telegram_chat_id,user_id,is_registered) VALUES(1,'12345',1,1)"
    )
    .run()
  await db.prepare('INSERT INTO native_telegram_state(telegram_user_id) VALUES(1)').run()
  await webhook(update(1, '/interview'))
  await tick('inbox')
  const session = await db
    .prepare('SELECT current_chapter_id,current_question_id FROM telegram_sessions')
    .first()
  await db
    .prepare(
      "INSERT INTO stories(user_id,chapter_id,question_id,answer,compiled_content) VALUES(1,?,?,'A newer web version','Polished version')"
    )
    .bind(session.current_chapter_id, session.current_question_id)
    .run()
  await webhook(update(2, 'A different Telegram version'))
  await tick('inbox')
  const story = await db.prepare('SELECT answer,compiled_content FROM stories').first()
  assert.equal(story.answer, 'A newer web version')
  assert.equal(story.compiled_content, 'Polished version')
  const status = await call('/telegram/status', { method: 'GET' })
  assert.equal((await status.json()).pendingAnswers, 1)
  const context = JSON.parse(
    (await db.prepare('SELECT context FROM telegram_sessions').first()).context
  )
  assert.equal(
    context.answers[`${session.current_chapter_id}:${session.current_question_id}`],
    'A different Telegram version'
  )
  await tick('deliver')
  assert.ok(telegram.some(item => item.body.text.includes('This Telegram draft needs review')))
})

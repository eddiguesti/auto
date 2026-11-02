import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import jwt from 'jsonwebtoken'
import { handleAccountRoutes } from './account.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const bundle = fileURLToPath(
  new URL('../../.cloudflare/api-tests/account-worker.mjs', import.meta.url)
)
const secret = 'account-native-test-secret-at-least-32-characters'
let runtime, db

before(async () => {
  // Exercise the integrated Worker in real workerd; no mocked database or auth.
  await build({
    entryPoints: [`${root}/cloudflare/api-staging.js`],
    outfile: bundle,
    bundle: true,
    external: ['cloudflare:workers', 'node:buffer'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022'
  })
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'account-native-test',
      modules: true,
      scriptPath: bundle,
      compatibilityDate: '2026-10-09',
      compatibilityFlags: ['nodejs_compat'],
      bindings: {
        JWT_SECRET: secret,
        NATIVE_API_STAGE: 'local-d1-slice',
        SOURCE_TIMESTAMP_TIMEZONE: 'UTC'
      },
      d1Databases: { DB: '00000000-0000-0000-0000-000000000004' }
    })
  )
  db = await runtime.getD1Database('DB')
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
  await db.batch(
    schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => db.prepare(s))
  )
  for (const file of [
    '0001_story_outbox.sql',
    '0002_auth_rate_limits.sql',
    '0003_generation_jobs.sql',
    '0004_payments.sql',
    '0005_voice_compilation.sql',
    '0006_writing.sql',
    '0007_game.sql',
    '0008_magic_voice.sql',
    '0009_print_artwork.sql',
    '0010_phone.sql',
    '0011_notifications.sql',
    '0012_ops.sql'
  ]) {
    let source = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8')
    const triggers = [...source.matchAll(/CREATE TRIGGER[\s\S]*? END;/g)].map(match => match[0])
    for (const trigger of triggers) source = source.replace(trigger, '')
    await db.batch(
      source
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(sql => sql.trim())
        .filter(Boolean)
        .map(sql => db.prepare(sql))
    )
    for (const trigger of triggers) await db.prepare(trigger).run()
  }
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  await db.prepare('DELETE FROM native_refund_attempts').run()
  await db.prepare('DELETE FROM native_notification_jobs').run()
  await db.prepare('DELETE FROM telegram_users').run()
  await db.prepare('DELETE FROM newsletter_subscribers').run()
  await db.prepare('DELETE FROM print_orders').run()
  await db.prepare('DELETE FROM generation_jobs').run()
  await db.prepare('DELETE FROM native_checkouts').run()
  await db.prepare('DELETE FROM users').run()
  await db.prepare('DELETE FROM token_blacklist').run()
  await db
    .prepare(
      `INSERT INTO users (id,email,name,created_at) VALUES
    (1,'one@example.com','One','2020-01-01 12:34:56.123456'),
    (2,'two@example.com','Two','2020-01-01 12:34:56.123456')`
    )
    .run()
})

test('support export preserves every owned conversation without claiming anonymous email matches', async () => {
  const epoch = Date.now()
  await db.batch(
    Array.from({ length: 103 }, (_, index) =>
      db
        .prepare(
          `INSERT INTO native_support_escalations
        (id,user_id,dedupe_key,contact_email,contact_name,message,conversation,state,created_at)
        VALUES(?,1,?,'one@example.com','One',?,?,'saved',?)`
        )
        .bind(
          `owned-${String(index).padStart(3, '0')}`,
          `INTERNAL_SUPPORT_DEDUPE_${index}`,
          `Support question ${index}`,
          JSON.stringify([{ role: 'user', content: `A saved conversation ${index}` }]),
          epoch
        )
    )
  )
  await db.batch([
    db
      .prepare(
        `INSERT INTO native_support_escalations
      (id,user_id,dedupe_key,contact_email,message,conversation,created_at)
      VALUES('anonymous',NULL,'anonymous','one@example.com','UNOWNED_SUPPORT','[]',?)`
      )
      .bind(epoch),
    db
      .prepare(
        `INSERT INTO native_support_escalations
      (id,user_id,dedupe_key,contact_email,message,conversation,created_at)
      VALUES('other',2,'other','one@example.com','UNOWNED_SUPPORT','[]',?)`
      )
      .bind(epoch)
  ])
  const response = await request('/api/user/export-data')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.exportComplete, true)
  assert.equal(data.supportEscalations.length, 103)
  assert.equal(new Set(data.supportEscalations.map(row => row.id)).size, 103)
  assert.deepEqual(data.supportEscalations[102].conversation, [
    { role: 'user', content: 'A saved conversation 102' }
  ])
  assert.equal(data.supportEscalations[0].created_at, new Date(epoch).toISOString())
  assert.equal(JSON.stringify(data).includes('UNOWNED_SUPPORT'), false)
  assert.equal(JSON.stringify(data).includes('INTERNAL_SUPPORT_DEDUPE'), false)
})

test('owner financial export agrees with payment history while excluding administrator and refund claim credentials', async () => {
  const epoch = Date.now()
  await db.batch([
    db.prepare(`INSERT INTO payments(id,user_id,product_id,product_type,amount,currency,status)
      VALUES(81,1,'printed_book','premium_bundle',25000,'gbp','completed'),
      (82,2,'printed_book','premium_bundle',25000,'gbp','completed')`),
    db.prepare(`INSERT INTO refund_requests(id,user_id,payment_id,type,amount,status)
      VALUES(91,1,81,'full',25000,'pending'),(92,2,82,'full',25000,'pending')`),
    db
      .prepare(
        `INSERT INTO native_admin_premium_grants(id,user_id,actor_id,months,expires_at,created_at)
      VALUES('owned-grant',1,2,12,'2027-11-03 12:00:00',?),
      ('other-grant',2,1,3,'2027-02-03 12:00:00',?)`
      )
      .bind(epoch, epoch),
    db
      .prepare(
        `INSERT INTO native_refund_attempts
      (id,user_id,payment_id,refund_request_id,actor_id,stripe_session_id,amount,currency,
      idempotency_key,state,lease_id,lease_expires,error_code,created_at,updated_at)
      VALUES('owned-refund',1,81,91,2,'cs_owned',25000,'gbp','INTERNAL_REFUND_KEY','pending',
      'INTERNAL_REFUND_LEASE',?,'STRIPE_PENDING',?,?),
      ('other-refund',2,82,92,1,'cs_other',25000,'gbp','other-key','created',NULL,NULL,NULL,?,?)`
      )
      .bind(epoch + 90000, epoch, epoch, epoch, epoch)
  ])
  const response = await request('/api/user/export-data')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.exportComplete, true)
  assert.equal(data.premiumGrants.length, 1)
  assert.equal(data.premiumGrants[0].months, 12)
  assert.equal(data.premiumGrants[0].expires_at, '2027-11-03T12:00:00.000Z')
  assert.equal(data.refundAttempts.length, 1)
  assert.equal(data.refundAttempts[0].payment_id, data.payments[0].id)
  assert.equal(data.refundAttempts[0].refund_request_id, data.refundRequests[0].id)
  assert.equal(data.refundAttempts[0].amount, data.payments[0].amount)
  assert.equal(data.refundAttempts[0].state, 'pending')
  assert.equal(data.refundAttempts[0].error_code, 'STRIPE_PENDING')
  assert.equal(data.refundAttempts[0].created_at, new Date(epoch).toISOString())
  assert.equal('actor_id' in data.refundAttempts[0], false)
  assert.equal('actor_id' in data.premiumGrants[0], false)
  assert.equal(JSON.stringify(data).includes('INTERNAL_REFUND_'), false)
  assert.equal(JSON.stringify(data).includes('other-refund'), false)
})

test('export includes native author snapshots, artwork prompts, print and checkout state without internal credentials', async () => {
  const job = crypto.randomUUID(),
    otherJob = crypto.randomUUID(),
    art = crypto.randomUUID(),
    otherArt = crypto.randomUUID(),
    order = crypto.randomUUID(),
    epoch = Date.now()
  await db.batch([
    db
      .prepare(
        `INSERT INTO generation_jobs(id,user_id,owner_id,kind,request_key,payload,state,lease_token,safe_cleanup_after,created_at,updated_at)
      VALUES(?,1,1,'style','saved-style',?,'completed','INTERNAL_LEASE_MUST_NOT_EXPORT',?,?,?)`
      )
      .bind(
        job,
        JSON.stringify({
          tones: ['formal'],
          narrative: null,
          authorStyle: 'austen',
          maxStoryId: 105,
          providerSecret: 'INTERNAL_PROVIDER_MUST_NOT_EXPORT'
        }),
        epoch + 3600000,
        epoch,
        epoch
      ),
    db
      .prepare(
        `INSERT INTO generation_jobs(id,user_id,owner_id,kind,request_key,payload,safe_cleanup_after,created_at,updated_at)
      VALUES(?,2,2,'epub','other','{"private":"OTHER_ACCOUNT_NATIVE_CONTENT"}',?,?,?)`
      )
      .bind(otherJob, epoch + 3600000, epoch, epoch),
    db
      .prepare('INSERT INTO writing_style_runs(job_id,user_id,initialized_at) VALUES(?,1,?)')
      .bind(job, epoch),
    db
      .prepare(
        `INSERT INTO native_artwork_jobs(id,user_id,chapter_id,prompt,object_key,state,lease_token,next_attempt_at,created_at,updated_at)
      VALUES(?,1,'earliest-memories','Our harbour at dawn','artwork/1/owned','completed','INTERNAL_ART_LEASE',?,?,?)`
      )
      .bind(art, epoch, epoch, epoch),
    db
      .prepare(
        `INSERT INTO native_artwork_jobs(id,user_id,chapter_id,prompt,object_key,state,next_attempt_at,created_at,updated_at)
      VALUES(?,2,'childhood','OTHER_ACCOUNT_NATIVE_CONTENT','artwork/2/owned','completed',?,?,?)`
      )
      .bind(otherArt, epoch, epoch, epoch),
    db
      .prepare(
        `INSERT INTO print_orders(id,user_id,title,text_key,cover_key,page_count,colour_pages,product_sku) VALUES(?,1,'Book','print/1/text','print/1/cover',32,0,'A5')`
      )
      .bind(order),
    db
      .prepare(
        `INSERT INTO native_print_dispatch(order_id,user_id,state,lease_token,next_attempt_at,updated_at) VALUES(?,1,'queued','INTERNAL_PRINT_LEASE',?,?)`
      )
      .bind(order, epoch, epoch),
    db.prepare(`INSERT INTO native_checkouts(stripe_session_id,user_id,product_id,product_type,amount,currency,created_at)
      VALUES('cs_native_owned',1,'printed_book','premium_bundle',25000,'gbp','2026-11-01 12:00:00')`)
  ])
  await db.batch(
    Array.from({ length: 105 }, (_, index) =>
      db
        .prepare(
          `INSERT INTO writing_style_items(job_id,user_id,source_id,story_id,source_answer,source_original,source_updated_at,state)
    VALUES(?,1,?,NULL,?,?,'2026-11-01 12:00:00','completed')`
        )
        .bind(job, index + 1, `Saved source ${index + 1}`, `Original memory ${index + 1}`)
    )
  )
  const response = await request('/api/user/export-data')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.exportComplete, true)
  assert.equal(data.generationJobs.length, 1)
  assert.deepEqual(data.generationJobs[0].payload, {
    tones: ['formal'],
    narrative: null,
    authorStyle: 'austen',
    maxStoryId: 105
  })
  assert.match(data.generationJobs[0].created_at, /Z$/)
  assert.equal(data.writingStyleHistory.length, 105)
  assert.equal(new Set(data.writingStyleHistory.map(row => row.source_id)).size, 105)
  assert.equal(
    data.writingStyleHistory.find(row => row.source_id === 105).source_original,
    'Original memory 105'
  )
  assert.equal(data.writingStyleRuns[0].job_id, job)
  assert.equal(data.artworkJobs.length, 1)
  assert.equal(data.artworkJobs[0].prompt, 'Our harbour at dawn')
  assert.equal(data.printDispatch[0].order_id, order)
  assert.equal(data.nativeCheckouts[0].amount, 25000)
  assert.equal(JSON.stringify(data).includes('INTERNAL_'), false)
  assert.equal(JSON.stringify(data).includes('OTHER_ACCOUNT_NATIVE_CONTENT'), false)
})

test('export preserves queued story, phone and Telegram memories while omitting every transport credential', async () => {
  const epoch = Date.now(),
    phone = crypto.randomUUID(),
    event = crypto.randomUUID(),
    storyId = 777
  await db.prepare('UPDATE users SET email_verified=1 WHERE id=1').run()
  await db
    .prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer) VALUES(?,1,'earliest-memories','q-original','Current answer')"
    )
    .bind(storyId)
    .run()
  const voice = await db
    .prepare(
      "INSERT INTO voice_sessions(user_id,chapter_id) VALUES(1,'earliest-memories') RETURNING id"
    )
    .first()
  const telegram = await db
    .prepare(
      "INSERT INTO telegram_users(telegram_chat_id,user_id,telegram_username,link_code) VALUES('account-one-chat',1,'One','INTERNAL_ACTIVE_LINK') RETURNING id"
    )
    .first()
  const subscriber = await db
    .prepare(
      "INSERT INTO newsletter_subscribers(email,source) VALUES('one@example.com','blog') RETURNING id"
    )
    .first()
  await db.batch([
    db
      .prepare(
        `INSERT INTO story_outbox(id,user_id,story_id,event_type,payload,state,created_at,claim_token)
      VALUES(?,1,?,'story-saved','{"answer":"An earlier saved memory"}','pending','2026-11-01 12:00:00','INTERNAL_OUTBOX_CLAIM')`
      )
      .bind(crypto.randomUUID(), storyId),
    db
      .prepare(
        `INSERT INTO voice_compilation_jobs(session_id,user_id,state,lease_id,updated_at) VALUES(?,1,'pending','INTERNAL_VOICE_LEASE','2026-11-01 12:00:00')`
      )
      .bind(voice.id),
    db
      .prepare(
        `INSERT INTO game_completion_claims(kind,prompt_id,user_id,token,story_id,created_at) VALUES('daily',42,1,'INTERNAL_GAME_COMPLETION',?,'2026-11-01 12:00:00')`
      )
      .bind(storyId),
    db.prepare(
      "INSERT INTO game_shield_claims(user_id,date,token) VALUES(1,'2026-11-01','INTERNAL_GAME_SHIELD')"
    ),
    db
      .prepare(
        `INSERT INTO phone_interviews(id,user_id,request_key,phone_number,authentication,prompt_text,chapter_id,question_id,source_answer,source_version,stream_nonce_hash,stream_expires,lease_id,deadline,created_at,updated_at)
      VALUES(?,1,'call-one','+447700900001','{"private":"INTERNAL_PHONE_AUTH"}','Tell me about the harbour','earliest-memories','q-phone','Before the call','2026-11-01 12:00:00','INTERNAL_PHONE_NONCE',?,'INTERNAL_PHONE_LEASE',?,?,?)`
      )
      .bind(phone, epoch + 60000, epoch + 60000, epoch, epoch),
    db
      .prepare(
        `INSERT INTO phone_transcript_events(request_id,user_id,event_id,mutation_token,transcript,created_at) VALUES(?,1,?,'INTERNAL_PHONE_MUTATION','We walked along the harbour.',?)`
      )
      .bind(phone, event, epoch),
    db
      .prepare(
        `INSERT INTO native_telegram_state(telegram_user_id,link_claim,lease_id,last_update_id) VALUES(?,'INTERNAL_LINK_CLAIM','INTERNAL_TELEGRAM_LEASE',101)`
      )
      .bind(telegram.id),
    db
      .prepare(
        `INSERT INTO native_telegram_inbox(update_id,telegram_user_id,owner_id,authorization_revision,payload_hash,message_id,text,lease_id,created_at,updated_at)
      VALUES(101,?,1,1,'INTERNAL_HASH','telegram-msg','A pending Telegram memory.','INTERNAL_INBOX_LEASE',?,?)`
      )
      .bind(telegram.id, epoch, epoch),
    db
      .prepare(
        `INSERT INTO telegram_messages(telegram_user_id,direction,content) VALUES(?,'outgoing','A safe reply without link codes.')`
      )
      .bind(telegram.id),
    db
      .prepare(
        `INSERT INTO native_newsletter_consent(subscriber_id,confirmed_at,last_confirmation_at) VALUES(?,?,?)`
      )
      .bind(subscriber.id, epoch, epoch),
    db
      .prepare(
        `INSERT INTO native_notification_jobs(id,occurrence_key,user_id,channel,payload,lease_id,next_attempt_at,created_at,updated_at)
      VALUES(?,'INTERNAL_OCCURRENCE',1,'email','{"ciphertext":"INTERNAL_ENCRYPTED_ENVELOPE"}','INTERNAL_SEND_LEASE',?,?,?)`
      )
      .bind(crypto.randomUUID(), epoch, epoch, epoch),
    db.prepare(
      `INSERT INTO notification_queue(user_id,notification_type,channel,subject,body,scheduled_for) VALUES(1,'weekly_digest','email','Your memoir','A safe saved notification rendition.','2026-11-01 12:00:00')`
    )
  ])
  const response = await request('/api/user/export-data')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.storySaveHistory[0].payload.answer, 'An earlier saved memory')
  assert.equal(data.voiceCompilationJobs[0].session_id, voice.id)
  assert.equal(data.gameCompletions[0].prompt_id, 42)
  assert.equal(data.gameShields[0].date, '2026-11-01')
  assert.equal(data.phoneInterviews[0].source_answer, 'Before the call')
  assert.equal(data.phoneInterviews[0].phone_number, '+447700900001')
  assert.equal(data.phoneTranscriptHistory[0].transcript, 'We walked along the harbour.')
  assert.equal(data.telegramAccounts[0].telegram_username, 'One')
  assert.equal(data.telegramInbox[0].text, 'A pending Telegram memory.')
  assert.equal(data.telegramDeliveryState[0].delivery_blocked, false)
  assert.equal(data.telegramMessages[0].content, 'A safe reply without link codes.')
  assert.equal(data.newsletterSubscriptions[0].email, 'one@example.com')
  assert.match(data.newsletterConsent[0].confirmed_at, /Z$/)
  assert.equal(data.notificationJobs.length, 1)
  assert.equal(data.notifications[0].body, 'A safe saved notification rendition.')
  assert.equal(JSON.stringify(data).includes('INTERNAL_'), false)
  await db.prepare('UPDATE users SET email_verified=0 WHERE id=1').run()
  const unverified = await (await request('/api/user/export-data')).json()
  assert.deepEqual(unverified.newsletterSubscriptions, [])
  assert.deepEqual(unverified.newsletterConsent, [])
})
function token(id = 1, extra = {}) {
  return jwt.sign(
    { id, email: `${id === 1 ? 'one' : 'two'}@example.com`, jti: crypto.randomUUID(), ...extra },
    secret,
    { expiresIn: '1h' }
  )
}
async function request(path, { method = 'GET', body, auth = token() } = {}) {
  return runtime.dispatchFetch(`http://localhost${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
}

test('both prefixes require verified identity; account settings reject scoped tokens', async () => {
  for (const prefix of ['/api', '/api/v1']) {
    assert.equal((await request(`${prefix}/user/phone-settings`, { auth: null })).status, 401)
    assert.equal(
      (await request(`${prefix}/user/export-data`, { auth: token(1, { scope: 'magic_link' }) }))
        .status,
      403
    )
    assert.equal(
      (await request(`${prefix}/onboarding/status`, { auth: token(1, { scope: 'magic_link' }) }))
        .status,
      403
    )
  }
  const revoked = token()
  const claims = jwt.decode(revoked)
  await db
    .prepare('INSERT INTO token_blacklist (jti,user_id,expires_at) VALUES (?,?,?)')
    .bind(claims.jti, 1, '2099-01-01 00:00:00+00')
    .run()
  assert.equal((await request('/api/user/export-data', { auth: revoked })).status, 401)
})

test('phone updates validate E.164, preserve omissions, persist false, and cannot select another owner', async () => {
  const save = await request('/api/user/phone-settings', {
    method: 'PUT',
    body: { phoneNumber: '+447700900000', phoneCallConsent: true, contactPreference: 'both' }
  })
  assert.deepEqual(await save.json(), {
    phone_number: '+447700900000',
    phone_call_consent: true,
    contact_preference: 'both'
  })
  const decline = await request('/api/v1/user/phone-settings', {
    method: 'PUT',
    body: { phoneCallConsent: false }
  })
  assert.equal((await decline.json()).phone_call_consent, false)
  assert.equal(
    (await (await request('/api/user/phone-settings')).json()).phone_number,
    '+447700900000'
  )
  assert.deepEqual(await (await request('/api/user/phone-settings', { auth: token(2) })).json(), {
    phone_number: null,
    phone_call_consent: false,
    contact_preference: 'email'
  })
  for (const body of [{ phoneNumber: '07700900000' }, { contactPreference: 'sms' }, { userId: 2 }])
    assert.equal((await request('/api/user/phone-settings', { method: 'PUT', body })).status, 400)
})

test('onboarding creates first-use rows and preserves supplied context between updates', async () => {
  assert.deepEqual(await (await request('/api/onboarding/status')).json(), {
    completed: false,
    isNewUser: true
  })
  assert.equal(
    (
      await request('/api/onboarding/context-form', {
        method: 'POST',
        body: {
          name: ' Alice ',
          birthPlace: 'York',
          birthCountry: 'UK',
          birthYear: '1952',
          additionalContext: 'The garden'
        }
      })
    ).status,
    200
  )
  assert.equal(
    (
      await request('/api/v1/onboarding/preference', {
        method: 'POST',
        body: { preference: 'type' }
      })
    ).status,
    200
  )
  await request('/api/onboarding/context-form', {
    method: 'POST',
    body: { birthCountry: 'England' }
  })
  assert.deepEqual(await (await request('/api/onboarding/status')).json(), {
    completed: false,
    preference: 'type',
    birthPlace: 'York',
    birthCountry: 'England',
    birthYear: 1952,
    isNewUser: false
  })
  assert.equal((await db.prepare('SELECT name FROM users WHERE id=1').first()).name, 'Alice')
  assert.deepEqual(await (await request('/api/onboarding/status', { auth: token(2) })).json(), {
    completed: false,
    isNewUser: true
  })
  for (const body of [
    { birthYear: '1952oops' },
    { birthYear: 1899 },
    { birthYear: 9999 },
    { name: 'a'.repeat(101) },
    { additionalContext: 'a'.repeat(5001) },
    { userId: 2 }
  ])
    assert.equal(
      (await request('/api/onboarding/context-form', { method: 'POST', body })).status,
      400
    )
})

test('context name and onboarding update roll back together on a D1 constraint failure', async () => {
  await db
    .prepare(
      "CREATE TRIGGER reject_context BEFORE INSERT ON user_onboarding WHEN NEW.birth_place = 'blocked' BEGIN SELECT RAISE(ABORT, 'blocked'); END"
    )
    .run()
  try {
    assert.equal(
      (
        await request('/api/onboarding/context-form', {
          method: 'POST',
          body: { name: 'Changed', birthPlace: 'blocked' }
        })
      ).status,
      503
    )
    assert.equal((await db.prepare('SELECT name FROM users WHERE id=1').first()).name, 'One')
    assert.equal(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
  } finally {
    await db.prepare('DROP TRIGGER reject_context').run()
  }
})

test('channels persist without prior onboarding, deduplicate, and reject unknown choices', async () => {
  const saved = await request('/api/onboarding/channel-preferences', {
    method: 'POST',
    body: { channels: ['webapp', 'email', 'email'] }
  })
  assert.deepEqual(await saved.json(), { success: true, channels: ['webapp', 'email'] })
  assert.deepEqual(
    JSON.parse(
      (await db.prepare('SELECT channel_preferences FROM user_onboarding WHERE user_id=1').first())
        .channel_preferences
    ),
    ['webapp', 'email']
  )
  for (const channels of [[], ['sms'], [4], 'email'])
    assert.equal(
      (await request('/api/onboarding/channel-preferences', { method: 'POST', body: { channels } }))
        .status,
      400
    )
})

test('completion persists for first use and never promises unimplemented artwork', async () => {
  const response = await request('/api/onboarding/complete', { method: 'POST' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    message: 'Onboarding complete.',
    artwork: { status: 'unavailable', code: 'ARTWORK_UNAVAILABLE' }
  })
  assert.equal((await (await request('/api/onboarding/status')).json()).completed, true)
  assert.equal(await db.prepare('SELECT * FROM chapter_images WHERE user_id=1').first(), null)
})

test('export decodes dates, JSON arrays, and booleans without another owner data or password hashes', async () => {
  await db.batch([
    db.prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer,created_at) VALUES(1,1,'earliest-memories','q','Owner','2020-01-01 12:34:56.123456'),(2,2,'childhood','q','Secret','2020-01-01 12:34:56')"
    ),
    db.prepare(
      "INSERT INTO photos(story_id,user_id,filename) VALUES(1,1,'mine.webp'),(2,2,'private.webp'),(1,2,'inconsistent.webp'),(1,NULL,'legacy.webp'),(NULL,1,'unlinked.webp'),(NULL,2,'private-unlinked.webp'),(2,1,'wrong-story.webp')"
    ),
    db.prepare(
      `INSERT INTO user_onboarding(user_id,additional_context,onboarding_completed) VALUES(1,'{"details":["Garden"]}',1)`
    ),
    db.prepare(
      `INSERT INTO user_style_preferences(user_id,tones) VALUES(1,'["warm","reflective"]')`
    ),
    db.prepare(`INSERT INTO book_covers(user_id,color_scheme) VALUES(1,'{"cover":"forest"}')`),
    db.prepare(
      'INSERT INTO user_game_state(user_id,daily_prompt_completed_today,game_mode_enabled) VALUES(1,1,0)'
    )
  ])
  const response = await request('/api/v1/user/export-data')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  const data = await response.json()
  assert.equal(data.user.accountCreated, '2020-01-01T12:34:56.123Z')
  assert.equal(data.stories[0].created_at, '2020-01-01T12:34:56.123Z')
  assert.equal(data.stories.length, 1)
  assert.deepEqual(data.photos.map(p => p.filename).sort(), [
    'legacy.webp',
    'mine.webp',
    'unlinked.webp',
    'wrong-story.webp'
  ])
  assert.deepEqual(data.onboarding[0].additional_context, { details: ['Garden'] })
  assert.equal(data.onboarding[0].onboarding_completed, true)
  assert.deepEqual(data.stylePreferences[0].tones, ['warm', 'reflective'])
  assert.deepEqual(data.coverDesigns[0].color_scheme, { cover: 'forest' })
  assert.equal(data.gameProgress[0].daily_prompt_completed_today, true)
  assert.equal(data.gameProgress[0].game_mode_enabled, false)
  assert.equal(JSON.stringify(data).includes('password_hash'), false)
  assert.equal(JSON.stringify(data).includes('Secret'), false)
})

test('reset is owner-scoped and atomic; existing private artwork prevents unsafe cleanup', async () => {
  await db
    .prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type'),(2,'voice')")
    .run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,generation_status) VALUES(1,'earliest-memories','failed'),(2,'earliest-memories','completed')"
    )
    .run()
  assert.equal((await request('/api/onboarding/reset', { method: 'DELETE' })).status, 200)
  assert.equal(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
  assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=2').first(), null)
  await db.prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type')").run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,image_url) VALUES(1,'earliest-memories','https://media.example.invalid/private.webp')"
    )
    .run()
  const response = await request('/api/onboarding/reset', { method: 'DELETE' })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, 'MEDIA_CLEANUP_UNAVAILABLE')
  assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
})

test('reset rolls back onboarding when image metadata deletion fails', async () => {
  await db.prepare("INSERT INTO user_onboarding(user_id,input_preference) VALUES(1,'type')").run()
  await db
    .prepare(
      "INSERT INTO chapter_images(user_id,chapter_id,generation_status) VALUES(1,'earliest-memories','failed')"
    )
    .run()
  await db
    .prepare(
      "CREATE TRIGGER reject_reset BEFORE DELETE ON chapter_images BEGIN SELECT RAISE(ABORT, 'blocked'); END"
    )
    .run()
  try {
    assert.equal((await request('/api/onboarding/reset', { method: 'DELETE' })).status, 503)
    assert.notEqual(await db.prepare('SELECT * FROM user_onboarding WHERE user_id=1').first(), null)
    assert.notEqual(await db.prepare('SELECT * FROM chapter_images WHERE user_id=1').first(), null)
  } finally {
    await db.prepare('DROP TRIGGER reject_reset').run()
  }
})

test('complete account erasure removes only its owner', async () => {
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 2)
  assert.equal((await request('/api/user/delete-account', { method: 'DELETE' })).status, 200)
  assert.deepEqual((await db.prepare('SELECT id FROM users').all()).results, [{ id: 2 }])
})

async function directExport({ auth = token(), openExportSession = () => db } = {}) {
  return handleAccountRoutes({
    request: new Request('https://example.test/api/user/export-data', {
      headers: { Authorization: `Bearer ${auth}` }
    }),
    path: '/user/export-data',
    db,
    claims: jwt.decode(auth),
    wallClockTimeZone: 'UTC',
    readJson: request => request.json(),
    openExportSession
  })
}

test('streamed export matches every Node-owned group and retains new manuscript, voice and fulfilment records', async () => {
  const printId = crypto.randomUUID(),
    uploadId = crypto.randomUUID(),
    jobId = crypto.randomUUID()
  await db.batch([
    db.prepare(
      "UPDATE users SET password_hash='not-exported',phone_number='+447700900000',phone_call_consent=1 WHERE id=1"
    ),
    db.prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer,compiled_content) VALUES(1,1,'earliest-memories','q','Raw','Compiled')"
    ),
    db.prepare(
      `INSERT INTO chapter_reviews(user_id,chapter_id,polished_text,clio_history) VALUES(1,'earliest-memories','Final edited chapter','[{"role":"user","content":"My correction"}]')`
    ),
    db.prepare(
      "INSERT INTO free_stories(user_id,title,content) VALUES(1,'Standalone','My extra memory'),(2,'Other owner','Private other memory')"
    ),
    db.prepare(
      "INSERT INTO memos(user_id,audio_url,transcript) VALUES(1,'/api/voice/uploads/example','Memo text')"
    ),
    db.prepare(
      `INSERT INTO voice_sessions(user_id,chapter_id,session_transcripts) VALUES(1,'earliest-memories','[{"user_transcript":"Voice memory"}]')`
    ),
    db.prepare(
      "INSERT INTO telnyx_calls(user_id,call_control_id,transcript_saved) VALUES(1,'call-owned',1)"
    ),
    db
      .prepare(
        `INSERT INTO print_orders(id,user_id,title,text_key,cover_key,page_count,colour_pages,product_sku,shipping_address) VALUES(?,1,'My book','print/text','print/cover',32,0,'a5','{"city":"York"}')`
      )
      .bind(printId),
    db
      .prepare(
        "INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES(?,1,'owned-recording','audio/webm','Voice upload text')"
      )
      .bind(uploadId),
    db.prepare("INSERT INTO generated_exports(user_id,format) VALUES(1,'epub')"),
    db.prepare('INSERT INTO audiobook_generation_requests(user_id,job_id) VALUES(1,?)').bind(jobId),
    db.prepare("INSERT INTO settings(user_id,name) VALUES(1,'Author name')"),
    db.prepare(
      "INSERT INTO voice_models(user_id,fish_model_id,consent_given) VALUES(1,'owned-voice',1)"
    ),
    db.prepare("INSERT INTO audiobooks(user_id,filename,voice_type) VALUES(1,'owned.mp3','custom')")
  ])
  const response = await request('/api/user/export-data')
  assert.equal(response.status, 200)
  const data = await response.json()
  const nodeSource = await readFile(
    new URL('../../services/api/routes/user.js', import.meta.url),
    'utf8'
  )
  const groupObject = nodeSource.split('const groups = {')[1].split('\n    const exportData')[0]
  const expected = [...groupObject.matchAll(/^ {6}(\w+):/gm)].map(match => match[1])
  assert.equal(expected.length, 39)
  for (const group of expected)
    assert.ok(Array.isArray(data[group]), `${group} must be a complete array`)
  assert.equal(data.exportComplete, true)
  assert.match(data.exportConsistency, /not a single point-in-time/)
  assert.equal(data.user.phone_number, '+447700900000')
  assert.equal(data.user.phone_call_consent, true)
  assert.equal(data.stories[0].compiled_content, 'Compiled')
  assert.equal(data.chapterReviews[0].polished_text, 'Final edited chapter')
  assert.equal(data.chapterReviews[0].clio_history[0].content, 'My correction')
  assert.equal(data.freeStories.length, 1)
  assert.equal(data.memos[0].transcript, 'Memo text')
  assert.equal(data.voiceSessions[0].session_transcripts[0].user_transcript, 'Voice memory')
  assert.equal(data.phoneCalls[0].transcript_saved, true)
  assert.equal(data.printOrders[0].id, printId)
  assert.deepEqual(data.printOrders[0].shipping_address, { city: 'York' })
  assert.equal(data.voiceUploads[0].id, uploadId)
  assert.equal(data.audiobookRequests[0].job_id, jobId)
  assert.equal(data.voiceSamples[0].consent_given, true)
  assert.equal(data.settings[0].name, 'Author name')
  assert.equal(JSON.stringify(data).includes('not-exported'), false)
  assert.equal(JSON.stringify(data).includes('Private other memory'), false)
})

test('export follows keyset pages past the previous 10000-story cap without duplication or omission', async () => {
  await db
    .prepare(
      `WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n < 10037)
    INSERT INTO stories(id,user_id,chapter_id,question_id,answer) SELECT n*2,1,'earliest-memories','q-'||n,'Memory '||n FROM numbers`
    )
    .run()
  await db
    .prepare(
      "INSERT INTO stories(id,user_id,chapter_id,question_id,answer) VALUES(1,2,'earliest-memories','other','Private other story')"
    )
    .run()
  const data = await (await request('/api/user/export-data')).json()
  assert.equal(data.stories.length, 10037)
  assert.equal(new Set(data.stories.map(story => story.id)).size, 10037)
  assert.equal(data.stories[0].id, 2)
  assert.equal(data.stories.at(-1).id, 20074)
  assert.equal(data.exportComplete, true)
})

test('byte-budgeted export pages preserve oversized escaped transcripts instead of treating a short page as completion', async () => {
  const answer = '"\\\n'.repeat(120000)
  await db.batch(
    [1, 2, 3].map(id =>
      db
        .prepare('INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES(1,?,?,?)')
        .bind('earliest-memories', `large-${id}`, answer)
    )
  )
  const data = await (await request('/api/user/export-data')).json()
  assert.equal(data.stories.length, 3)
  for (const story of data.stories) assert.equal(story.answer, answer)
  assert.equal(data.exportComplete, true)
})

test('export requires an authoritative session factory before returning any private response', async () => {
  await assert.rejects(
    () => directExport({ openExportSession: null }),
    error => error.status === 503 && error.body.code === 'EXPORT_AUTHORIZATION_UNAVAILABLE'
  )
})

test('mid-export revocation, account deletion and revocation-table failures abort rather than emit valid partial JSON', async () => {
  await db
    .prepare(
      `WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n < 205)
    INSERT INTO stories(user_id,chapter_id,question_id,answer) SELECT 1,'earliest-memories','q-'||n,'Memory '||n FROM numbers`
    )
    .run()
  for (const mode of ['revoked', 'invalidated', 'deleted', 'database-error']) {
    const auth = token()
    const claims = jwt.decode(auth)
    let calls = 0
    const openExportSession = async () => {
      if (++calls === 4) {
        if (mode === 'revoked')
          await db
            .prepare(
              "INSERT INTO token_blacklist(jti,user_id,expires_at) VALUES(?,1,'2099-01-01 00:00:00+00')"
            )
            .bind(claims.jti)
            .run()
        if (mode === 'invalidated')
          await db
            .prepare(
              "INSERT INTO user_token_invalidation(user_id,invalidated_at) VALUES(1,'2099-01-01 00:00:00+00')"
            )
            .run()
        if (mode === 'deleted')
          await db.prepare("UPDATE users SET deleted_at='2026-01-01 00:00:00+00' WHERE id=1").run()
        if (mode === 'database-error')
          await db.prepare('ALTER TABLE token_blacklist RENAME TO unavailable_blacklist').run()
      }
      return db
    }
    try {
      const response = await directExport({ auth, openExportSession })
      await assert.rejects(() => response.json(), /Account export interrupted/)
      assert.ok(calls >= 4)
    } finally {
      if (mode === 'database-error')
        await db.prepare('ALTER TABLE unavailable_blacklist RENAME TO token_blacklist').run()
      await db.prepare('DELETE FROM token_blacklist').run()
      await db.prepare('DELETE FROM user_token_invalidation').run()
      await db.prepare('UPDATE users SET deleted_at=NULL WHERE id=1').run()
    }
  }
})

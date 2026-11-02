import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { handleNativeGame } from './game.js'
import { ApiError } from './errors.js'
import { seedNativeGameCatalog, buildNativeGameSeedStatements } from './game-catalog.js'
import {
  nativeDailyPrompt,
  completeNativeGamePrompt,
  recordNativeGameActivity,
  processNativeGameOutbox
} from './game-core.js'
import { createRepositories } from './repositories.js'
import { chapters } from '../../apps/web/src/data/chapters.js'

let runtime, db, clock
const initialTime = Date.parse('2026-11-02T12:00:00Z')
before(async () => {
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: 'native-game-test',
      modules: true,
      script: 'export default { fetch() { return new Response("test only") } }',
      compatibilityDate: '2026-10-09',
      d1Databases: { DB: 'game-db' }
    })
  )
  db = await runtime.getD1Database('DB')
  for (const name of [
    '../db/schema.sql',
    './migrations/0001_story_outbox.sql',
    './migrations/0007_game.sql'
  ]) {
    const statements = (await readFile(new URL(name, import.meta.url), 'utf8'))
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map(sql => sql.trim())
      .filter(Boolean)
    await db.batch(statements.map(sql => db.prepare(sql)))
  }
  await seedNativeGameCatalog(db)
})
after(async () => {
  await runtime?.dispose()
})
beforeEach(async () => {
  clock = initialTime
  await db.prepare('DELETE FROM users').run()
  await db.batch(
    [1, 2, 3, 4].map(id =>
      db
        .prepare('INSERT INTO users(id,email,name) VALUES(?,?,?)')
        .bind(id, `user${id}@example.test`, `User ${id}`)
    )
  )
})
async function route(
  path,
  { method = 'GET', body, userId = 1, scope, environment = {}, database = db } = {}
) {
  const request = new Request(`https://example.test/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  try {
    return await handleNativeGame({
      request,
      db: database,
      env: environment,
      path: path.split('?')[0],
      user: { id: userId },
      claims: { id: userId, ...(scope ? { scope } : {}) },
      now: clock
    })
  } catch (error) {
    if (error instanceof ApiError) return Response.json(error.body, { status: error.status })
    throw error
  }
}
const data = async response => (await response.json()).data
const count = async table => (await db.prepare(`SELECT COUNT(*) n FROM ${table}`).first()).n
async function story(userId, chapter, question, answer = 'A preserved memory') {
  return db
    .prepare(
      'INSERT INTO stories(user_id,chapter_id,question_id,answer) VALUES(?,?,?,?) RETURNING id'
    )
    .bind(userId, chapter, question, answer)
    .first()
}
async function circle(userId, name) {
  return data(
    await route('/game/circle/create', { method: 'POST', body: { circleName: name }, userId })
  )
}

test('static D1 catalog initialization is complete, idempotent and refuses conflicting data without overwriting', async () => {
  assert.equal(buildNativeGameSeedStatements().length, 190)
  assert.deepEqual(await seedNativeGameCatalog(db), {
    alreadySeeded: true,
    prompts: 108,
    collections: 8,
    items: 41,
    achievements: 33
  })
  assert.equal(await count('prompt_library'), 108)
  assert.equal(await count('collections'), 8)
  assert.equal(await count('collection_items'), 41)
  assert.equal(await count('game_achievement_definitions'), 33)
  const original = await db.prepare('SELECT prompt_text FROM prompt_library WHERE id = 1').first()
  await db
    .prepare("UPDATE prompt_library SET prompt_text = 'existing custom catalog' WHERE id = 1")
    .run()
  try {
    await assert.rejects(seedNativeGameCatalog(db), /NOT_EMPTY_OR_MATCHING/)
    assert.equal(
      (await db.prepare('SELECT prompt_text FROM prompt_library WHERE id = 1').first()).prompt_text,
      'existing custom catalog'
    )
    assert.equal(await count('prompt_library'), 108)
  } finally {
    await db
      .prepare('UPDATE prompt_library SET prompt_text = ? WHERE id = 1')
      .bind(original.prompt_text)
      .run()
  }
  const moved = await db
    .prepare("SELECT completion_criteria FROM collection_items WHERE item_key = 'meeting-partner'")
    .first()
  if (moved) assert.equal(JSON.parse(moved.completion_criteria).chapter_id, 'love-relationships')
})

test('brand-new account dashboard works with real booleans, zero stats and populated collections', async () => {
  const response = await route('/game/state')
  assert.equal(response.status, 200)
  const state = await data(response)
  assert.equal(state.gameMode.enabled, false)
  assert.equal(state.streak.current, 0)
  assert.equal(state.streak.shieldsAvailable, 1)
  assert.equal(state.stats.totalMemories, 0)
  assert.equal(state.collections.length, 8)
  assert(state.collections.every(row => row.is_complete === false && row.items_completed === 0))
  assert.equal(state.familyCircle, null)
  assert.equal(state.todaysPrompt, null)
  assert.equal(typeof state.settings.notificationPreferences.daily_reminder, 'boolean')
  assert.equal((await route('/game/state', { scope: 'interview' })).status, 403)
  assert.equal((await route('/game/enable', { method: 'POST', body: {} })).status, 200)
  assert.equal((await data(await route('/game/state'))).gameMode.enabled, true)
  assert.equal((await route('/game/disable', { method: 'POST', body: {} })).status, 200)
})

test('settings validate timezone/time/preferences and merge only the authenticated user settings', async () => {
  assert.equal(
    (await route('/game/settings', { method: 'PUT', body: { timezone: 'Invalid/Zone' } })).status,
    400
  )
  assert.equal(
    (await route('/game/settings', { method: 'PUT', body: { preferredPromptTime: '29:88' } }))
      .status,
    400
  )
  assert.equal(
    (
      await route('/game/settings', {
        method: 'PUT',
        body: { notificationPreferences: { daily_reminder: 'false' } }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await route('/game/settings', {
        method: 'PUT',
        body: {
          timezone: 'Europe/Madrid',
          preferredPromptTime: '18:45',
          notificationPreferences: { daily_reminder: false }
        }
      })
    ).status,
    200
  )
  const state = await data(await route('/game/state'))
  assert.equal(state.settings.timezone, 'Europe/Madrid')
  assert.equal(state.settings.preferredPromptTime, '18:45')
  assert.equal(state.settings.notificationPreferences.daily_reminder, false)
  assert.equal(state.settings.notificationPreferences.weekly_digest, true)
  assert.equal(
    (await data(await route('/game/state', { userId: 2 }))).settings.timezone,
    'Europe/London'
  )
})

test('concurrent daily first visits create one prompt; concurrent completion saves and counts one memory', async () => {
  const prompts = await Promise.all(
    [route('/game/prompt/today'), route('/game/prompt/today')].map(async result =>
      data(await result)
    )
  )
  assert.equal(prompts[0].id, prompts[1].id)
  assert.equal(await count('daily_prompts'), 1)
  const path = `/game/prompt/${prompts[0].id}/complete`
  const responses = await Promise.all([
    route(path, { method: 'POST', body: { answer: 'One answer to keep' } }),
    route(path, { method: 'POST', body: { answer: 'A concurrent answer' } })
  ])
  assert.equal(responses.filter(response => response.status === 200).length, 1)
  assert(responses.every(response => [200, 400, 409].includes(response.status)))
  assert.equal(await count('stories'), 1)
  assert.equal(await count('game_completion_claims'), 1)
  assert.equal(await count('story_outbox'), 1)
  const state = await data(await route('/game/state'))
  assert.equal(state.stats.totalMemories, 1)
  assert.equal(state.stats.promptsCompletedThisWeek, 1)
  assert.equal(state.streak.current, 1)
  const history = await data(await route('/game/streak/history'))
  assert.equal(history.length, 1)
  assert.equal(history[0].had_activity, true)
  assert.equal(history[0].streak_on_this_day, 1)
  const processed = await processNativeGameOutbox({ DB: db }, clock)
  assert.equal(processed.completed, 1)
  assert.equal((await processNativeGameOutbox({ DB: db }, clock)).completed, 0)
  assert.equal((await data(await route('/game/state'))).streak.current, 1)
})

test('linked prompt edits invalidate compiled prose and ownership checks reject external/foreign recording attachments', async () => {
  const existing = await story(1, 'earliest-memories', 'first-memory', 'Old memory')
  await db
    .prepare('UPDATE stories SET compiled_content = ?,compiled_at = ? WHERE id = ?')
    .bind('Stale compiled prose', '2026-11-01 00:00:00', existing.id)
    .run()
  const prompt = await nativeDailyPrompt(db, 1, clock)
  await db
    .prepare('UPDATE daily_prompts SET linked_chapter_id = ?,linked_question_id = ? WHERE id = ?')
    .bind('earliest-memories', 'first-memory', prompt.id)
    .run()
  const recording = crypto.randomUUID()
  await db
    .prepare(
      'INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES(?,2,?,?,?)'
    )
    .bind(recording, `recordings/${recording}.webm`, 'audio/webm', 'Their private transcript')
    .run()
  const path = `/game/prompt/${prompt.id}/complete`
  assert.equal(
    (await route(path, { method: 'POST', body: { answer: 'Unauthorized answer' }, userId: 2 }))
      .status,
    404
  )
  assert.equal(
    (
      await route(path, {
        method: 'POST',
        body: { answer: 'Invalid audio URL', audioUrl: 'https://other.test/audio' }
      })
    ).status,
    400
  )
  assert.equal(
    (
      await route(path, {
        method: 'POST',
        body: { answer: 'Foreign audio', audioUrl: `/api/voice/uploads/${recording}` }
      })
    ).status,
    403
  )
  assert.equal(
    (await route(path, { method: 'POST', body: { answer: 'Edited memory' } })).status,
    200
  )
  const saved = await db
    .prepare('SELECT answer,compiled_content,compiled_at FROM stories WHERE id = ?')
    .bind(existing.id)
    .first()
  assert.equal(saved.answer, 'Edited memory')
  assert.equal(saved.compiled_content, null)
  assert.equal(saved.compiled_at, null)
  assert.equal(await count('stories'), 1)
})

test('one recording cannot be attached concurrently to two daily memories and failed batches roll back all core writes', async () => {
  const first = await nativeDailyPrompt(db, 1, clock),
    recording = crypto.randomUUID()
  const second = await db
    .prepare(
      "INSERT INTO daily_prompts(user_id,prompt_date,prompt_type,prompt_text) VALUES(1,'2026-11-01','quick','Another prompt') RETURNING id"
    )
    .first()
  await db
    .prepare(
      'INSERT INTO voice_uploads(id,user_id,object_key,content_type,transcript) VALUES(?,1,?,?,?)'
    )
    .bind(recording, `recordings/${recording}.webm`, 'audio/webm', 'My transcript')
    .run()
  const body = { answer: 'A recorded memory', audioUrl: `/api/voice/uploads/${recording}` }
  const responses = await Promise.all(
    [first.id, second.id].map(id => route(`/game/prompt/${id}/complete`, { method: 'POST', body }))
  )
  assert.equal(responses.filter(response => response.status === 200).length, 1)
  assert.equal(await count('stories'), 1)
  const another = await nativeDailyPrompt(db, 2, clock)
  const broken = {
    prepare: sql => db.prepare(sql),
    batch: queries =>
      db.batch([
        ...queries,
        db.prepare("INSERT INTO users(id,email) VALUES(1,'duplicate@example.test')")
      ])
  }
  await assert.rejects(
    completeNativeGamePrompt(broken, 2, another.id, { answer: 'Must roll back' }, clock)
  )
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories WHERE user_id = 2').first()).n, 0)
  assert.equal(
    (await db.prepare('SELECT COUNT(*) n FROM game_completion_claims WHERE user_id = 2').first()).n,
    0
  )
  assert.equal(
    (await db.prepare('SELECT status FROM daily_prompts WHERE id = ?').bind(another.id).first())
      .status,
    'pending'
  )
})

test('shields are consumed once for a missed day and preserve a streak without inventing activity', async () => {
  await recordNativeGameActivity(db, 1, clock, '2026-10-31')
  const results = await Promise.all(
    Array.from({ length: 3 }, () => route('/game/streak/use-shield', { method: 'POST', body: {} }))
  )
  assert.equal(results.filter(response => response.status === 200).length, 1)
  let state = await data(await route('/game/state'))
  assert.equal(state.streak.shieldsAvailable, 0)
  assert.equal(state.streak.current, 1)
  await recordNativeGameActivity(db, 1, clock)
  state = await data(await route('/game/state'))
  assert.equal(state.streak.current, 2)
  assert.equal(state.streak.longest, 2)
  assert.equal(
    (
      await db
        .prepare(
          "SELECT had_activity,shield_used FROM streak_history WHERE user_id = 1 AND date = '2026-11-01'"
        )
        .first()
    ).had_activity,
    0
  )
})

test('collections reflect actual owned stories and award a real escaped SVG badge without provider placeholders', async () => {
  let collections = await data(await route('/game/collections'))
  const family = collections.find(row => row.key === 'family')
  assert.equal(family.items.length, 5)
  for (const item of family.items)
    await story(1, item.completion_criteria.chapter_id, item.completion_criteria.question_id)
  collections = await data(await route('/game/collections'))
  assert.equal(collections.find(row => row.key === 'family').itemsCompleted, 5)
  const detail = await data(await route('/game/collections/family'))
  assert.equal(detail.isComplete, true)
  assert(detail.items.every(row => row.isCompleted && row.name && row.storyPreview))
  const reward = await data(
    await route('/game/collections/family/claim-reward', { method: 'POST', body: {} })
  )
  assert.equal(reward.artworkType, 'badge')
  assert(reward.artworkUrl.startsWith('data:image/svg+xml;base64,'))
  const svg = Buffer.from(reward.artworkUrl.split(',')[1], 'base64').toString('utf8')
  assert(svg.includes('Family Portrait'))
  assert.doesNotMatch(svg, /<script|foreignObject|placeholder\.com|(?:href|src)=/)
  assert.equal(
    (await data(await route('/game/collections/family/claim-reward', { method: 'POST', body: {} })))
      .alreadyClaimed,
    true
  )
  assert.equal(
    (await route('/game/collections/family/claim-reward', { method: 'POST', body: {}, userId: 2 }))
      .status,
    400
  )
  assert.equal(
    (await data(await route('/game/collections', { userId: 2 }))).find(row => row.key === 'family')
      .itemsCompleted,
    0
  )
})

test('achievements and progress are owner scoped and follow actual core/optional question definitions', async () => {
  await story(1, 'earliest-memories', 'first-memory')
  await story(1, 'earliest-memories', 'not-a-ui-question')
  await story(
    1,
    chapters.find(row => row.optional).id,
    chapters.find(row => row.optional).questions[0].id
  )
  const achievements = await data(await route('/game/achievements'))
  assert(
    achievements.some(row => row.achievement_key === 'memories_1' && row.seen_by_user === false)
  )
  await route('/game/achievements/mark-seen', {
    method: 'POST',
    body: { achievementKeys: ['memories_1'] },
    userId: 2
  })
  assert.equal(
    (
      await db
        .prepare(
          "SELECT seen_by_user FROM achievements WHERE user_id = 1 AND achievement_key = 'memories_1'"
        )
        .first()
    ).seen_by_user,
    0
  )
  await route('/game/achievements/mark-seen', {
    method: 'POST',
    body: { achievementKeys: ['memories_1'] }
  })
  assert.equal(
    (
      await db
        .prepare(
          "SELECT seen_by_user FROM achievements WHERE user_id = 1 AND achievement_key = 'memories_1'"
        )
        .first()
    ).seen_by_user,
    1
  )
  const progress = await data(await route('/game/memoir-progress'))
  assert.equal(progress.chapters.length, 24)
  assert.equal(progress.overall.answeredQuestions, 1)
  assert.equal(
    progress.overall.totalQuestions,
    chapters.filter(row => !row.optional).reduce((total, row) => total + row.questions.length, 0)
  )
})

test('circle joins enforce capacity atomically, owner-only controls and private activity previews', async () => {
  const created = await circle(1, 'My family circle')
  await db.prepare('UPDATE memory_circles SET max_members = 2 WHERE id = ?').bind(created.id).run()
  const joins = await Promise.all(
    [2, 3].map(userId =>
      route(`/game/circle/join/${created.inviteCode}`, { method: 'POST', body: {}, userId })
    )
  )
  assert.equal(joins.filter(response => response.status === 200).length, 1)
  const helper = (
    await db.prepare("SELECT user_id FROM memory_circle_members WHERE role = 'helper'").first()
  ).user_id
  assert.equal(
    (await route('/game/circle/regenerate-invite', { method: 'POST', body: {}, userId: helper }))
      .status,
    403
  )
  await story(1, 'earliest-memories', 'first-memory', 'A very private raw memoir secret')
  const view = await data(await route('/game/circle', { userId: helper }))
  assert.equal(view.inviteCode, null)
  assert.equal(view.members.length, 2)
  assert(view.recentActivity.every(row => !row.preview.includes('private raw memoir secret')))
  const owner = view.members.find(row => row.role === 'owner')
  assert.equal((await route(`/game/circle/member/${owner.id}`, { method: 'DELETE' })).status, 403)
  assert.equal((await route('/game/circle/leave', { method: 'POST', body: {} })).status, 400)
  assert.equal(
    (await route('/game/circle/create', { method: 'POST', body: { circleName: 'Another circle' } }))
      .status,
    400
  )
})

test('family prompts and encouragements require membership/recipient ownership; answers save once', async () => {
  const created = await circle(1, 'Family')
  await route(`/game/circle/join/${created.inviteCode}`, { method: 'POST', body: {}, userId: 2 })
  const prompt = await data(
    await route('/game/circle/prompt', {
      method: 'POST',
      body: { forUserId: 2, promptText: 'Tell me about childhood' }
    })
  )
  assert.equal(
    (
      await route('/game/circle/prompt', {
        method: 'POST',
        body: { forUserId: 2, promptText: 'Foreign member prompt' },
        userId: 3
      })
    ).status,
    403
  )
  assert.equal(
    (
      await route(`/game/circle/prompt/${prompt.id}/answer`, {
        method: 'POST',
        body: { answer: 'Wrong owner' }
      })
    ).status,
    404
  )
  const answers = await Promise.all(
    [1, 2].map(() =>
      route(`/game/circle/prompt/${prompt.id}/answer`, {
        method: 'POST',
        body: { answer: 'My family memory' },
        userId: 2
      })
    )
  )
  assert.equal(answers.filter(response => response.status === 200).length, 1)
  const saved = await db.prepare('SELECT id FROM stories WHERE user_id = 2').first()
  assert.equal(
    (
      await route('/game/circle/encourage', {
        method: 'POST',
        body: { forUserId: 2, type: 'heart', relatedStoryId: saved.id }
      })
    ).status,
    200
  )
  const foreign = await story(3, 'earliest-memories', 'first-memory', 'Another account secret')
  assert.equal(
    (
      await route('/game/circle/encourage', {
        method: 'POST',
        body: { forUserId: 2, type: 'heart', relatedStoryId: foreign.id }
      })
    ).status,
    403
  )
  const received = await data(
    await route('/game/circle/encouragements?unreadOnly=true', { userId: 2 })
  )
  assert.equal(received.length, 1)
  assert.equal(received[0].seen_by_recipient, false)
  await route('/game/circle/encouragements/mark-seen', { method: 'POST', body: {}, userId: 2 })
  assert.equal(
    (await data(await route('/game/circle/encouragements?unreadOnly=true', { userId: 2 }))).length,
    0
  )
  const member = await db.prepare('SELECT id FROM memory_circle_members WHERE user_id = 2').first()
  assert.equal(
    (await route(`/game/circle/member/${member.id}`, { method: 'DELETE', userId: 3 })).status,
    403
  )
  assert.equal((await route(`/game/circle/member/${member.id}`, { method: 'DELETE' })).status, 200)
  assert.equal(
    (
      await route('/game/circle/prompt', {
        method: 'POST',
        body: { forUserId: 2, promptText: 'After leaving' }
      })
    ).status,
    403
  )
})

test('raw story outbox activity is delivered idempotently and unsafe dev triggers remain forbidden', async () => {
  const repository = createRepositories(db, {
    wallClockTimeZone: 'UTC',
    now: () => new Date(clock)
  })
  await repository.saveStory(1, {
    chapterId: 'earliest-memories',
    questionId: 'first-memory',
    answer: 'A raw edited memory'
  })
  assert.equal((await processNativeGameOutbox({ DB: db }, clock)).completed, 1)
  assert.equal((await processNativeGameOutbox({ DB: db }, clock)).completed, 0)
  const state = await data(await route('/game/state'))
  assert.equal(state.stats.totalMemories, 1)
  assert.equal(state.streak.current, 1)
  assert.equal(
    (
      await route('/game/admin/trigger-daily', {
        method: 'POST',
        body: {},
        environment: { ENABLE_DEV_GAME_ENDPOINTS: 'true' }
      })
    ).status,
    403
  )
})

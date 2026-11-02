// The UI's pure data module is the authoritative question set; the shared
// publishing chapter list intentionally contains titles only.
import { chapters } from '../../apps/web/src/data/chapters.js'
import { ApiError } from './errors.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { achievementDefinitions } from './game-catalog.js'

export const gameCodec = table => createMappedCodec(table, { wallClockTimeZone: 'UTC' })
export const gameId = value => {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647)
    throw new ApiError(400, { success: false, error: 'Invalid identifier' })
  return Number(value)
}
export const gameDay = now => new Date(now).toISOString().slice(0, 10)
const monday = now => {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return gameDay(date)
}

export async function ensureNativeGameState(db, userId, now) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO user_game_state (user_id, game_mode_enabled, last_shield_reset, created_at, updated_at)
      SELECT id, 0, ?, ?, ? FROM users WHERE id = ? AND deleted_at IS NULL ON CONFLICT (user_id) DO NOTHING`
      )
      .bind(monday(now), timestampForStorage(now), timestampForStorage(now), userId),
    db
      .prepare(
        `UPDATE user_game_state SET streak_shields_available = CASE WHEN last_shield_reset IS NULL THEN streak_shields_available ELSE MIN(streak_shields_available + 1, 3) END,
      streak_shields_used_this_week = 0, last_shield_reset = ? WHERE user_id = ? AND (last_shield_reset IS NULL OR last_shield_reset < ?)`
      )
      .bind(monday(now), userId, monday(now))
  ])
  const row = await db
    .prepare('SELECT * FROM user_game_state WHERE user_id = ?')
    .bind(userId)
    .first()
  if (!row) throw new ApiError(401, { error: 'Account unavailable' })
  return gameCodec('user_game_state').decodeRow(row)
}

export async function syncNativeCollections(db, userId, now) {
  const answered = `ci.completion_type = 'question' AND EXISTS (SELECT 1 FROM stories s WHERE s.user_id = ?
    AND s.chapter_id = json_extract(ci.completion_criteria, '$.chapter_id') AND s.question_id = json_extract(ci.completion_criteria, '$.question_id')
    AND s.answer IS NOT NULL AND trim(s.answer) <> '')`
  const count = `(SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id AND ${answered})`
  await db
    .prepare(
      `INSERT INTO user_collection_progress (user_id, collection_id, items_completed, completed_items, is_complete, completed_at, created_at, updated_at)
    SELECT ?, c.id, ${count}, (SELECT json_group_array(item_key) FROM (SELECT ci.item_key FROM collection_items ci
      WHERE ci.collection_id = c.id AND ${answered} ORDER BY ci.display_order, ci.id)), ${count} >= c.required_items,
      CASE WHEN ${count} >= c.required_items THEN ? ELSE NULL END, ?, ? FROM collections c
    WHERE c.is_active = 1 AND EXISTS (SELECT 1 FROM users u WHERE u.id = ? AND u.deleted_at IS NULL)
    ON CONFLICT (user_id, collection_id) DO UPDATE SET items_completed = excluded.items_completed,
      completed_items = excluded.completed_items, is_complete = excluded.is_complete,
      completed_at = CASE WHEN excluded.is_complete = 1 THEN COALESCE(user_collection_progress.completed_at, excluded.completed_at) ELSE NULL END,
      updated_at = excluded.updated_at`
    )
    .bind(
      userId,
      userId,
      userId,
      userId,
      userId,
      timestampForStorage(now),
      timestampForStorage(now),
      timestampForStorage(now),
      userId
    )
    .run()
}

export async function awardNativeAchievement(db, userId, key, now) {
  const definition = achievementDefinitions.find(item => item.key === key)
  if (!definition) return null
  const saved = await db
    .prepare(
      `INSERT INTO achievements (user_id,achievement_key,achievement_name,achievement_description,achievement_icon,achievement_type,earned_at)
    SELECT id,?,?,?,?,?,? FROM users WHERE id = ? AND deleted_at IS NULL
    ON CONFLICT (user_id,achievement_key) DO NOTHING RETURNING *`
    )
    .bind(
      key,
      definition.name,
      definition.description,
      definition.icon,
      definition.type,
      timestampForStorage(now),
      userId
    )
    .first()
  return saved ? gameCodec('achievements').decodeRow(saved) : null
}

export async function syncNativeGameStats(db, userId, now) {
  await ensureNativeGameState(db, userId, now)
  const today = gameDay(now),
    yesterday = gameDay(now - 86_400_000)
  // Consecutive calendar groups include shield days; shields preserve a chain
  // but do not invent an authored-memory day. Window SQL avoids JS read/write races.
  await db
    .prepare(
      `WITH days AS (SELECT date, had_activity,
      julianday(date) - ROW_NUMBER() OVER (ORDER BY date) AS chain FROM streak_history
      WHERE user_id = ? AND date <= ? AND (had_activity = 1 OR shield_used = 1)),
    chains AS (SELECT chain, SUM(had_activity = 1) AS length, MAX(date) AS last_day FROM days GROUP BY chain)
    UPDATE user_game_state SET
      current_streak = COALESCE((SELECT length FROM chains WHERE last_day >= ? ORDER BY last_day DESC LIMIT 1),0),
      longest_streak = MAX(longest_streak, COALESCE((SELECT MAX(length) FROM chains),0)),
      last_activity_date = (SELECT MAX(date) FROM streak_history WHERE user_id = ? AND had_activity = 1),
      daily_prompt_completed_today = EXISTS(SELECT 1 FROM daily_prompts WHERE user_id = ? AND prompt_date = ? AND status = 'completed'),
      prompts_completed_this_week = (SELECT COUNT(*) FROM daily_prompts WHERE user_id = ? AND prompt_date >= ? AND status = 'completed'),
      total_memories = (SELECT COUNT(*) FROM stories WHERE user_id = ? AND answer IS NOT NULL AND trim(answer) <> ''),
      total_people_mentioned = (SELECT COUNT(*) FROM memory_entities WHERE user_id = ? AND entity_type = 'person'),
      total_places_mentioned = (SELECT COUNT(*) FROM memory_entities WHERE user_id = ? AND entity_type = 'place'), updated_at = ?
    WHERE user_id = ?`
    )
    .bind(
      userId,
      today,
      yesterday,
      userId,
      userId,
      today,
      userId,
      monday(now),
      userId,
      userId,
      userId,
      timestampForStorage(now),
      userId
    )
    .run()
  await syncNativeCollections(db, userId, now)
  const state = await db
    .prepare('SELECT * FROM user_game_state WHERE user_id = ?')
    .bind(userId)
    .first()
  const complete = await db
    .prepare(
      'SELECT COUNT(*) AS n FROM user_collection_progress WHERE user_id = ? AND is_complete = 1'
    )
    .bind(userId)
    .first()
  const metrics = {
    streak: state.current_streak,
    milestone: state.total_memories,
    people: state.total_people_mentioned,
    places: state.total_places_mentioned,
    collection: complete.n
  }
  const awarded = []
  for (const definition of achievementDefinitions)
    if (definition.threshold && metrics[definition.type] >= definition.threshold) {
      const row = await awardNativeAchievement(db, userId, definition.key, now)
      if (row) awarded.push(row)
    }
  return { state: gameCodec('user_game_state').decodeRow(state), newAchievements: awarded }
}

export async function recordNativeGameActivity(db, userId, now, date = gameDay(now)) {
  await ensureNativeGameState(db, userId, now)
  await db
    .prepare(
      `INSERT INTO streak_history (user_id,date,had_activity,prompt_completed)
    SELECT id,?,1,1 FROM users WHERE id = ? AND deleted_at IS NULL
    ON CONFLICT (user_id,date) DO UPDATE SET had_activity = 1, prompt_completed = 1`
    )
    .bind(date, userId)
    .run()
  const result = await syncNativeGameStats(db, userId, now)
  await db
    .prepare(
      `WITH days AS (SELECT date,had_activity,julianday(date) - ROW_NUMBER() OVER (ORDER BY date) chain
    FROM streak_history WHERE user_id = ? AND (had_activity = 1 OR shield_used = 1))
    UPDATE streak_history AS h SET streak_on_this_day = COALESCE((SELECT SUM(d.had_activity = 1) FROM days d
      WHERE d.chain = (SELECT chain FROM days WHERE date = h.date) AND d.date <= h.date),0) WHERE h.user_id = ?`
    )
    .bind(userId, userId)
    .run()
  return result
}

export async function nativeDailyPrompt(db, userId, now) {
  const today = gameDay(now)
  await ensureNativeGameState(db, userId, now)
  const existing = await db
    .prepare('SELECT * FROM daily_prompts WHERE user_id = ? AND prompt_date = ?')
    .bind(userId, today)
    .first()
  if (existing) return gameCodec('daily_prompts').decodeRow(existing)
  // Prefer unanswered question pairs and avoid recent text. Uniqueness on
  // (user,date) makes two concurrent first visits return the same prompt.
  await db
    .prepare(
      `INSERT INTO daily_prompts (user_id,prompt_date,prompt_type,prompt_category,prompt_text,prompt_hint,linked_chapter_id,linked_question_id,created_at)
    SELECT u.id, ?, p.prompt_type,p.prompt_category,p.prompt_text,p.prompt_hint,p.linked_chapter_id,p.linked_question_id,?
    FROM users u JOIN user_game_state g ON g.user_id = u.id JOIN prompt_library p ON p.is_active = 1
    WHERE u.id = ? AND u.deleted_at IS NULL AND COALESCE(p.min_streak_days,0) <= g.current_streak
    ORDER BY EXISTS(SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.chapter_id = p.linked_chapter_id
      AND s.question_id = p.linked_question_id AND s.answer IS NOT NULL AND trim(s.answer) <> ''),
      EXISTS(SELECT 1 FROM daily_prompts d WHERE d.user_id = u.id AND d.prompt_text = p.prompt_text AND d.prompt_date >= ?),
      p.id LIMIT 1 ON CONFLICT (user_id,prompt_date) DO NOTHING`
    )
    .bind(today, timestampForStorage(now), userId, gameDay(now - 30 * 86_400_000))
    .run()
  const row = await db
    .prepare('SELECT * FROM daily_prompts WHERE user_id = ? AND prompt_date = ?')
    .bind(userId, today)
    .first()
  if (!row)
    throw new ApiError(503, {
      error: 'Daily prompt catalog has not been initialized',
      code: 'GAME_CATALOG_NOT_INITIALIZED'
    })
  return gameCodec('daily_prompts').decodeRow(row)
}

export async function completeNativeGamePrompt(
  db,
  userId,
  promptId,
  { answer, audioUrl },
  now,
  kind = 'daily'
) {
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 100_000)
    throw new ApiError(400, { error: 'A memory answer is required (maximum 100000 characters)' })
  const table = kind === 'daily' ? 'daily_prompts' : 'family_prompts',
    owner = kind === 'daily' ? 'user_id' : 'for_user_id'
  const prompt = await db
    .prepare(`SELECT * FROM ${table} WHERE id = ? AND ${owner} = ?`)
    .bind(promptId, userId)
    .first()
  if (!prompt) throw new ApiError(404, { error: 'Prompt not found' })
  if (
    (kind === 'daily' && prompt.status === 'completed') ||
    (kind === 'family' && prompt.status !== 'pending')
  )
    throw new ApiError(400, { error: 'Prompt already answered or declined' })
  let recording = null
  if (audioUrl) {
    recording = /^\/api\/voice\/uploads\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i.exec(
      audioUrl
    )?.[1]
    if (!recording)
      throw new ApiError(400, { error: 'Use an uploaded recording from your account' })
    const owned = await db
      .prepare('SELECT story_id FROM voice_uploads WHERE id = ? AND user_id = ?')
      .bind(recording, userId)
      .first()
    if (!owned) throw new ApiError(403, { error: 'Recording does not belong to your account' })
    if (owned.story_id !== null)
      throw new ApiError(400, { error: 'Recording is already attached to a memory' })
  }
  const token = crypto.randomUUID(),
    stamp = timestampForStorage(now)
  const linked = kind === 'daily' && prompt.linked_chapter_id && prompt.linked_question_id
  const chapter =
    kind === 'daily' ? (linked ? prompt.linked_chapter_id : 'daily-prompts') : 'family-prompts'
  const question =
    kind === 'daily'
      ? linked
        ? prompt.linked_question_id
        : `prompt-${promptId}`
      : `family-${promptId}`
  const words = answer.trim().split(/\s+/).length
  const created = Date.parse(String(prompt.created_at).replace(' ', 'T') + 'Z')
  const seconds = Number.isFinite(created)
    ? Math.min(2147483647, Math.max(0, Math.round((now - created) / 1000)))
    : 0
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO game_completion_claims (kind,prompt_id,user_id,token,created_at)
      SELECT ?,p.id,?,?,? FROM ${table} p JOIN users u ON u.id = p.${owner}
      WHERE p.id = ? AND p.${owner} = ? AND p.status ${kind === 'daily' ? "<> 'completed'" : "= 'pending'"} AND u.deleted_at IS NULL
      AND (? IS NULL OR EXISTS(SELECT 1 FROM voice_uploads v WHERE v.id = ? AND v.user_id = u.id AND v.story_id IS NULL))
      ON CONFLICT(kind,prompt_id) DO NOTHING RETURNING token`
      )
      .bind(kind, userId, token, stamp, promptId, userId, recording, recording),
    db
      .prepare(
        `INSERT INTO stories (user_id,chapter_id,question_id,answer,created_at,updated_at)
      SELECT user_id,?,?,?,?,? FROM game_completion_claims WHERE token = ?
      ON CONFLICT(user_id,chapter_id,question_id) DO UPDATE SET answer = excluded.answer,compiled_content = NULL,compiled_at = NULL,updated_at = excluded.updated_at`
      )
      .bind(chapter, question, answer, stamp, stamp, token),
    db
      .prepare(
        `UPDATE game_completion_claims SET story_id = (SELECT id FROM stories WHERE user_id = ? AND chapter_id = ? AND question_id = ?) WHERE token = ?`
      )
      .bind(userId, chapter, question, token),
    db
      .prepare(
        'UPDATE voice_uploads SET story_id = (SELECT story_id FROM game_completion_claims WHERE token = ?) WHERE id = ? AND user_id = ? AND story_id IS NULL AND EXISTS(SELECT 1 FROM game_completion_claims WHERE token = ?)'
      )
      .bind(token, recording, userId, token),
    db
      .prepare(
        kind === 'daily'
          ? `UPDATE daily_prompts SET status = 'completed', answered_at = ?, answer_story_id = (SELECT story_id FROM game_completion_claims WHERE token = ?), time_to_complete_seconds = ?,word_count = ?
      WHERE id = ? AND user_id = ? AND EXISTS(SELECT 1 FROM game_completion_claims WHERE token = ?)`
          : `UPDATE family_prompts SET status = 'answered', answered_at = ?, answered_story_id = (SELECT story_id FROM game_completion_claims WHERE token = ?)
      WHERE id = ? AND for_user_id = ? AND EXISTS(SELECT 1 FROM game_completion_claims WHERE token = ?)`
      )
      .bind(
        ...(kind === 'daily'
          ? [stamp, token, seconds, words, promptId, userId, token]
          : [stamp, token, promptId, userId, token])
      ),
    db
      .prepare(
        `INSERT INTO story_outbox (id,user_id,story_id,event_type,payload,created_at)
      SELECT token,user_id,story_id,'story-saved',json_object('storyId',story_id,'userId',user_id),? FROM game_completion_claims WHERE token = ?`
      )
      .bind(stamp, token)
  ])
  if (!result[0].results.length)
    throw new ApiError(409, { error: 'Prompt or recording changed; no duplicate memory was saved' })
  const saved = await db
    .prepare('SELECT story_id FROM game_completion_claims WHERE token = ?')
    .bind(token)
    .first()
  let state = { current_streak: 0 },
    newAchievements = []
  // The core memory and durable outbox are already committed. Engagement is
  // idempotently retried by the outbox worker if this optional refresh fails.
  try {
    ;({ state, newAchievements } = await recordNativeGameActivity(db, userId, now))
  } catch {
    /* durable intent retained */
  }
  if (kind === 'family')
    await awardNativeAchievement(db, userId, 'family_prompt', now).catch(() => {})
  return {
    storyId: saved.story_id,
    streak: { current: state.current_streak, isNewRecord: false },
    stats: { timeToComplete: seconds, wordCount: words },
    newAchievements,
    celebration: { type: 'memory_saved', message: 'Memory preserved forever.' }
  }
}

export async function processNativeGameOutbox(env, now = Date.now()) {
  const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB,
    token = crypto.randomUUID()
  const { results } = await db
    .prepare(
      `UPDATE story_outbox SET state = 'processing', claim_token = ?, lease_until = ?, attempts = attempts + 1
    WHERE id IN (SELECT id FROM story_outbox WHERE state = 'pending' OR (state = 'processing' AND lease_until <= ?) ORDER BY created_at LIMIT 20) RETURNING id,user_id,created_at`
    )
    .bind(token, now + 60_000, now)
    .all()
  let completed = 0
  for (const event of results) {
    await recordNativeGameActivity(db, event.user_id, now, event.created_at.slice(0, 10))
    await db
      .prepare(
        "UPDATE story_outbox SET state = 'completed', updated_at = ?,claim_token = NULL,lease_until = NULL WHERE id = ? AND claim_token = ?"
      )
      .bind(timestampForStorage(now), event.id, token)
      .run()
    completed++
  }
  return { claimed: results.length, completed }
}

export function nativeMemoirProgress(rows) {
  const chapterProgress = chapters.map(chapter => {
    const answered = rows
      .filter(
        row =>
          row.chapter_id === chapter.id &&
          row.answer?.trim() &&
          chapter.questions.some(question => question.id === row.question_id)
      )
      .map(row => row.question_id)
    const total = chapter.questions.length,
      completed = Math.min(total, answered.length),
      percentage = Math.round((completed / total) * 100)
    return {
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      optional: Boolean(chapter.optional),
      totalQuestions: total,
      completedQuestions: completed,
      percentage,
      status: percentage === 100 ? 'complete' : percentage ? 'in_progress' : 'not_started',
      answeredQuestionIds: answered
    }
  })
  const core = chapterProgress.filter(row => !row.optional)
  const totalQuestions = core.reduce((sum, row) => sum + row.totalQuestions, 0),
    answeredQuestions = core.reduce((sum, row) => sum + row.completedQuestions, 0)
  const gaps = core
    .filter(row => row.status !== 'complete')
    .sort(
      (a, b) =>
        (a.status === 'in_progress' ? 0 : 1) - (b.status === 'in_progress' ? 0 : 1) ||
        a.percentage - b.percentage
    )
    .slice(0, 3)
    .map(row => ({
      chapterId: row.id,
      chapterTitle: row.title,
      reason:
        row.status === 'not_started'
          ? `You haven't started "${row.title}" yet`
          : `"${row.title}" is ${row.percentage}% complete`
    }))
  return {
    overall: {
      totalQuestions,
      answeredQuestions,
      percentage: Math.round((answeredQuestions / totalQuestions) * 100),
      chaptersComplete: core.filter(row => row.status === 'complete').length,
      chaptersInProgress: core.filter(row => row.status === 'in_progress').length,
      chaptersNotStarted: core.filter(row => row.status === 'not_started').length
    },
    chapters: chapterProgress,
    suggestedGaps: gaps,
    nextRecommendedChapter: gaps[0]?.chapterId || null
  }
}

import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson, validate } from './request.js'
import { gameSchemas } from '../../services/api/schemas/index.js'
import { timestampForStorage } from './value-codecs.js'
export { processNativeGameOutbox } from './game-core.js'
import { handleNativeCircles } from './game-circles.js'
import {
  gameCodec,
  gameId,
  gameDay,
  ensureNativeGameState,
  syncNativeGameStats,
  syncNativeCollections,
  nativeDailyPrompt,
  completeNativeGamePrompt,
  nativeMemoirProgress
} from './game-core.js'

const escaped = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]
  )

async function collectionData(db, userId, key) {
  const { results } = await db
    .prepare(
      `SELECT c.*,COALESCE(p.items_completed,0) items_completed,COALESCE(p.completed_items,'[]') completed_items,
    COALESCE(p.is_complete,0) is_complete,p.completed_at,p.reward_artwork_url FROM collections c
    LEFT JOIN user_collection_progress p ON p.collection_id = c.id AND p.user_id = ? WHERE c.is_active = 1 ${key ? 'AND c.collection_key = ?' : ''}
    ORDER BY c.display_order,c.id`
    )
    .bind(userId, ...(key ? [key] : []))
    .all()
  const items = await db
    .prepare(
      `SELECT ci.*,substr(s.answer,1,100) story_preview FROM collection_items ci LEFT JOIN stories s
    ON s.user_id = ? AND s.chapter_id = json_extract(ci.completion_criteria,'$.chapter_id') AND s.question_id = json_extract(ci.completion_criteria,'$.question_id')
    AND s.answer IS NOT NULL AND trim(s.answer) <> '' ORDER BY ci.collection_id,ci.display_order,ci.id`
    )
    .bind(userId)
    .all()
  return results.map(raw => {
    const {
      items_completed,
      completed_items,
      is_complete,
      completed_at,
      reward_artwork_url,
      ...catalog
    } = raw
    const row = gameCodec('collections').decodeRow(catalog),
      completed = JSON.parse(completed_items)
    return {
      id: row.id,
      key: row.collection_key,
      name: row.collection_name,
      description: row.collection_description,
      icon: row.collection_icon,
      requiredItems: row.required_items,
      itemsCompleted: items_completed,
      isComplete: Boolean(is_complete),
      completedAt: completed_at
        ? gameCodec('user_collection_progress').decodeRow({ completed_at }).completed_at
        : null,
      rewardArtworkUrl: reward_artwork_url,
      rewardArtworkPrompt: row.reward_artwork_prompt,
      items: items.results
        .filter(item => item.collection_id === row.id)
        .map(item => {
          const criteria = JSON.parse(item.completion_criteria)
          return {
            id: item.id,
            key: item.item_key,
            item_key: item.item_key,
            name: item.item_name,
            item_name: item.item_name,
            description: item.item_description,
            item_description: item.item_description,
            completion_type: item.completion_type,
            completion_criteria: criteria,
            isCompleted: Boolean(item.story_preview) || completed.includes(item.item_key),
            storyPreview: item.story_preview ? item.story_preview + '...' : null,
            linkedChapter: criteria.chapter_id,
            linkedQuestion: criteria.question_id
          }
        })
    }
  })
}

export async function handleNativeGame({ request, env, db, user, claims, path, now = Date.now() }) {
  if (!/^\/game(?:\/|$)/.test(path)) return null
  requireFullScope(claims)
  const method = request.method,
    userId = user.id,
    stamp = timestampForStorage(now)
  const circle = await handleNativeCircles({ request, db, user, path, now })
  if (circle) return circle
  if (path === '/game/state' && method === 'GET') {
    const { state } = await syncNativeGameStats(db, userId, now)
    const [prompt, achievements, memories, collections, family, pending] = await db.batch([
      db
        .prepare(
          'SELECT id,prompt_text,prompt_hint,prompt_type,prompt_category,status FROM daily_prompts WHERE user_id = ? AND prompt_date = ?'
        )
        .bind(userId, gameDay(now)),
      db
        .prepare(
          'SELECT achievement_key,achievement_name,achievement_description,achievement_icon,earned_at FROM achievements WHERE user_id = ? AND seen_by_user = 0 ORDER BY earned_at DESC,id DESC LIMIT 5'
        )
        .bind(userId),
      db
        .prepare(
          "SELECT COUNT(*) total_stories,COUNT(DISTINCT chapter_id) chapters_started FROM stories WHERE user_id = ? AND answer IS NOT NULL AND trim(answer) <> ''"
        )
        .bind(userId),
      db
        .prepare(
          `SELECT c.collection_key,c.collection_name,c.collection_icon,c.required_items,COALESCE(p.items_completed,0) items_completed,COALESCE(p.is_complete,0) is_complete
        FROM collections c LEFT JOIN user_collection_progress p ON p.collection_id = c.id AND p.user_id = ? WHERE c.is_active = 1 ORDER BY c.display_order,c.id`
        )
        .bind(userId),
      db
        .prepare(
          `SELECT c.id,c.circle_name,(SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = c.id) member_count
        FROM memory_circle_members m JOIN memory_circles c ON c.id = m.circle_id WHERE m.user_id = ?`
        )
        .bind(userId),
      db
        .prepare(
          "SELECT COUNT(*) n FROM family_prompts WHERE for_user_id = ? AND status = 'pending'"
        )
        .bind(userId)
    ])
    return json({
      success: true,
      data: {
        gameMode: { enabled: state.game_mode_enabled, canSwitch: true },
        streak: {
          current: state.current_streak,
          longest: state.longest_streak,
          lastActivity: state.last_activity_date,
          shieldsAvailable: state.streak_shields_available,
          shieldsUsedThisWeek: state.streak_shields_used_this_week
        },
        todaysPrompt: prompt.results[0] || null,
        stats: {
          totalMemories: memories.results[0].total_stories,
          chaptersStarted: memories.results[0].chapters_started,
          peopleCount: state.total_people_mentioned,
          placesCount: state.total_places_mentioned,
          promptsCompletedThisWeek: state.prompts_completed_this_week
        },
        collections: collections.results.map(row => ({
          ...row,
          is_complete: Boolean(row.is_complete)
        })),
        recentAchievements: achievements.results.map(row =>
          gameCodec('achievements').decodeRow(row)
        ),
        familyCircle: family.results[0] || null,
        pendingFamilyPrompts: pending.results[0].n,
        settings: {
          notificationPreferences: state.notification_preferences,
          preferredPromptTime: state.preferred_prompt_time,
          timezone: state.timezone
        }
      }
    })
  }
  if (['/game/enable', '/game/disable'].includes(path) && method === 'POST') {
    await ensureNativeGameState(db, userId, now)
    await db
      .prepare('UPDATE user_game_state SET game_mode_enabled = ?,updated_at = ? WHERE user_id = ?')
      .bind(path.endsWith('enable') ? 1 : 0, stamp, userId)
      .run()
    return json({
      success: true,
      message: path.endsWith('enable') ? 'Memory Quest mode enabled' : 'Returned to Classic mode'
    })
  }
  if (path === '/game/settings' && method === 'PUT') {
    const body = await readJson(request),
      updates = [],
      values = []
    if (
      Object.keys(body).some(
        key => !['notificationPreferences', 'preferredPromptTime', 'timezone'].includes(key)
      )
    )
      throw new ApiError(400, { error: 'Invalid game settings' })
    if (body.notificationPreferences !== undefined) {
      const prefs = body.notificationPreferences
      if (
        !prefs ||
        Array.isArray(prefs) ||
        Object.keys(prefs).some(
          key =>
            !['daily_reminder', 'streak_warning', 'weekly_digest', 'family_activity'].includes(key)
        ) ||
        Object.values(prefs).some(value => typeof value !== 'boolean')
      )
        throw new ApiError(400, { error: 'Invalid notification preferences' })
      updates.push(
        "notification_preferences = json_patch(COALESCE(notification_preferences,'{}'),?)"
      )
      values.push(JSON.stringify(prefs))
    }
    if (body.preferredPromptTime !== undefined) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.preferredPromptTime))
        throw new ApiError(400, { error: 'Use HH:MM for preferred prompt time' })
      updates.push('preferred_prompt_time = ?')
      values.push(body.preferredPromptTime)
    }
    if (body.timezone !== undefined) {
      if (typeof body.timezone !== 'string' || body.timezone.length > 100)
        throw new ApiError(400, { error: 'Invalid time zone' })
      try {
        new Intl.DateTimeFormat('en', { timeZone: body.timezone }).format(now)
      } catch {
        throw new ApiError(400, { error: 'Invalid time zone' })
      }
      updates.push('timezone = ?')
      values.push(body.timezone)
    }
    await ensureNativeGameState(db, userId, now)
    if (updates.length)
      await db
        .prepare(
          `UPDATE user_game_state SET ${updates.join(', ')},updated_at = ? WHERE user_id = ?`
        )
        .bind(...values, stamp, userId)
        .run()
    return json({ success: true, message: 'Settings updated' })
  }
  if (path === '/game/prompt/today' && method === 'GET') {
    const prompt = await nativeDailyPrompt(db, userId, now)
    return json({
      success: true,
      data: {
        id: prompt.id,
        date: prompt.prompt_date,
        type: prompt.prompt_type,
        category: prompt.prompt_category,
        text: prompt.prompt_text,
        hint: prompt.prompt_hint,
        linkedChapter: prompt.linked_chapter_id,
        linkedQuestion: prompt.linked_question_id,
        status: prompt.status,
        estimatedMinutes:
          prompt.prompt_type === 'quick' ? 2 : prompt.prompt_type === 'story' ? 7 : 12
      }
    })
  }
  const complete = /^\/game\/prompt\/([^/]+)\/complete$/.exec(path)
  if (complete && method === 'POST') {
    const body = validate(await readJson(request), gameSchemas.completePrompt.body)
    return json({
      success: true,
      data: await completeNativeGamePrompt(db, userId, gameId(complete[1]), body, now)
    })
  }
  const skip = /^\/game\/prompt\/([^/]+)\/skip$/.exec(path)
  if (skip && method === 'POST') {
    const { reason = 'user_skipped' } = await readJson(request)
    if (typeof reason !== 'string' || reason.length > 500)
      throw new ApiError(400, { error: 'Invalid skip reason' })
    const row = await db
      .prepare(
        "UPDATE daily_prompts SET status = 'skipped',skipped_at = ?,skip_reason = ? WHERE id = ? AND user_id = ? AND status <> 'completed' RETURNING id"
      )
      .bind(stamp, reason, gameId(skip[1]), userId)
      .first()
    if (!row) throw new ApiError(404, { error: 'Pending prompt not found' })
    return json({
      success: true,
      message: 'Prompt skipped. Complete tomorrow to maintain your streak!',
      streakAtRisk: true
    })
  }
  if (path === '/game/prompts/history' && method === 'GET') {
    const params = new URL(request.url).searchParams,
      limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit')) || 20)),
      offset = Math.max(0, Number.parseInt(params.get('offset')) || 0)
    if (!Number.isSafeInteger(offset)) throw new ApiError(400, { error: 'Invalid pagination' })
    const [rows, total] = await db.batch([
      db
        .prepare(
          `SELECT p.id,p.prompt_date,p.prompt_type,p.prompt_category,p.prompt_text,p.status,p.answered_at,p.word_count,s.answer
        FROM daily_prompts p LEFT JOIN stories s ON s.id = p.answer_story_id AND s.user_id = p.user_id WHERE p.user_id = ? ORDER BY p.prompt_date DESC,p.id DESC LIMIT ? OFFSET ?`
        )
        .bind(userId, limit, offset),
      db.prepare('SELECT COUNT(*) n FROM daily_prompts WHERE user_id = ?').bind(userId)
    ])
    return json({
      success: true,
      data: {
        prompts: rows.results.map(row => gameCodec('daily_prompts').decodeRow(row)),
        total: total.results[0].n,
        limit,
        offset
      }
    })
  }
  if (path === '/game/streak/use-shield' && method === 'POST') {
    await ensureNativeGameState(db, userId, now)
    const yesterday = gameDay(now - 86_400_000),
      token = crypto.randomUUID()
    const result = await db.batch([
      db
        .prepare(
          `INSERT INTO game_shield_claims(user_id,date,token) SELECT user_id,?,? FROM user_game_state
        WHERE user_id = ? AND streak_shields_available > 0 AND NOT EXISTS (SELECT 1 FROM streak_history WHERE user_id = ? AND date = ? AND (had_activity = 1 OR shield_used = 1))
        ON CONFLICT(user_id,date) DO NOTHING RETURNING token`
        )
        .bind(yesterday, token, userId, userId, yesterday),
      db
        .prepare(
          `INSERT INTO streak_history(user_id,date,had_activity,shield_used,streak_on_this_day)
        SELECT g.user_id,?,0,1,g.current_streak FROM user_game_state g JOIN game_shield_claims c ON c.user_id = g.user_id WHERE c.token = ?
        ON CONFLICT(user_id,date) DO UPDATE SET shield_used = 1`
        )
        .bind(yesterday, token),
      db
        .prepare(
          `UPDATE user_game_state SET streak_shields_available = streak_shields_available - 1,streak_shields_used_this_week = streak_shields_used_this_week + 1,
        updated_at = ? WHERE user_id = ? AND EXISTS(SELECT 1 FROM game_shield_claims WHERE token = ?) RETURNING streak_shields_available`
        )
        .bind(stamp, userId, token)
    ])
    if (!result[0].results.length)
      throw new ApiError(400, {
        success: false,
        message: 'No shield is available or needed for yesterday'
      })
    await syncNativeGameStats(db, userId, now)
    return json({
      success: true,
      message: 'Streak shield activated',
      shieldsRemaining: result[2].results[0].streak_shields_available
    })
  }
  if (path === '/game/streak/history' && method === 'GET') {
    const days = Math.min(
      365,
      Math.max(1, Number.parseInt(new URL(request.url).searchParams.get('days')) || 30)
    )
    const { results } = await db
      .prepare(
        'SELECT date,had_activity,streak_on_this_day,shield_used,prompt_completed FROM streak_history WHERE user_id = ? AND date >= ? ORDER BY date DESC'
      )
      .bind(userId, gameDay(now - days * 86_400_000))
      .all()
    return json({
      success: true,
      data: results.map(row => gameCodec('streak_history').decodeRow(row))
    })
  }
  if (path === '/game/achievements' && method === 'GET') {
    await syncNativeGameStats(db, userId, now)
    const { results } = await db
      .prepare(
        'SELECT achievement_key,achievement_name,achievement_description,achievement_icon,achievement_type,earned_at,seen_by_user FROM achievements WHERE user_id = ? ORDER BY earned_at DESC,id DESC'
      )
      .bind(userId)
      .all()
    return json({
      success: true,
      data: results.map(row => gameCodec('achievements').decodeRow(row))
    })
  }
  if (path === '/game/achievements/mark-seen' && method === 'POST') {
    const { achievementKeys = [] } = await readJson(request)
    if (
      !Array.isArray(achievementKeys) ||
      achievementKeys.length > 100 ||
      achievementKeys.some(key => typeof key !== 'string' || !/^[a-z0-9_]{1,100}$/.test(key))
    )
      throw new ApiError(400, { error: 'Invalid achievement keys' })
    await db
      .prepare(
        'UPDATE achievements SET seen_by_user = 1 WHERE user_id = ? AND achievement_key IN (SELECT value FROM json_each(?))'
      )
      .bind(userId, JSON.stringify(achievementKeys))
      .run()
    return json({ success: true })
  }
  if (path === '/game/memoir-progress' && method === 'GET') {
    const { results } = await db
      .prepare(
        "SELECT chapter_id,question_id,CASE WHEN answer IS NOT NULL AND trim(answer) <> '' THEN 'answered' ELSE NULL END answer FROM stories WHERE user_id = ?"
      )
      .bind(userId)
      .all()
    return json({ success: true, data: nativeMemoirProgress(results) })
  }
  if (path === '/game/collections/sync' && method === 'POST') {
    await syncNativeCollections(db, userId, now)
    const rows = await collectionData(db, userId)
    return json({
      success: true,
      data: rows.map(row => ({
        collection: row.key,
        itemsCompleted: row.itemsCompleted,
        isComplete: row.isComplete
      }))
    })
  }
  if (path === '/game/collections' && method === 'GET') {
    await syncNativeCollections(db, userId, now)
    return json({ success: true, data: await collectionData(db, userId) })
  }
  const reward = /^\/game\/collections\/([a-z0-9-]+)\/claim-reward$/.exec(path)
  if (reward && method === 'POST') {
    await syncNativeCollections(db, userId, now)
    const collection = (await collectionData(db, userId, reward[1]))[0]
    if (!collection) throw new ApiError(404, { error: 'Collection not found' })
    if (!collection.isComplete) throw new ApiError(400, { error: 'Collection not yet complete' })
    if (collection.rewardArtworkUrl)
      return json({
        success: true,
        data: {
          artworkUrl: collection.rewardArtworkUrl,
          artworkType: 'badge',
          alreadyClaimed: true
        }
      })
    // An actual earned vector badge, not a placeholder or a claimed AI image.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="32" fill="#f8f0dc"/><circle cx="400" cy="250" r="125" fill="#173e35"/><path d="M330 210h55q15 0 15 15q0-15 15-15h55v105h-55q-15 0-15 15q0-15-15-15h-55z" fill="none" stroke="#ebd48a" stroke-width="8"/><text x="400" y="440" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="#173e35">${escaped(collection.name)}</text><text x="400" y="490" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#556e56">Collection complete · Easy Memoir</text></svg>`
    const url = `data:image/svg+xml;base64,${btoa(Array.from(new TextEncoder().encode(svg), byte => String.fromCharCode(byte)).join(''))}`
    await db
      .prepare(
        'UPDATE user_collection_progress SET reward_artwork_url = COALESCE(reward_artwork_url,?),updated_at = ? WHERE user_id = ? AND collection_id = ? AND is_complete = 1'
      )
      .bind(url, stamp, userId, collection.id)
      .run()
    const saved = await db
      .prepare(
        'SELECT reward_artwork_url FROM user_collection_progress WHERE user_id = ? AND collection_id = ?'
      )
      .bind(userId, collection.id)
      .first()
    return json({
      success: true,
      data: {
        artworkUrl: saved.reward_artwork_url,
        artworkType: 'badge',
        alreadyClaimed: false,
        message: 'Your collection badge is ready'
      }
    })
  }
  const detail = /^\/game\/collections\/([a-z0-9-]+)$/.exec(path)
  if (detail && method === 'GET') {
    await syncNativeCollections(db, userId, now)
    const collection = (await collectionData(db, userId, detail[1]))[0]
    if (!collection) throw new ApiError(404, { error: 'Collection not found' })
    return json({ success: true, data: collection })
  }
  if (/^\/game\/admin\/trigger-(daily|weekly)$/.test(path) && method === 'POST') {
    if (!user.is_admin || env.ENABLE_DEV_GAME_ENDPOINTS !== 'true')
      throw new ApiError(403, { success: false, message: 'Admin only' })
    await syncNativeGameStats(db, userId, now)
    return json({ success: true, message: 'Your game state has been refreshed' })
  }
  return null
}

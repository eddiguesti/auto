import { ApiError, json } from './errors.js'
import { readJson, validate } from './request.js'
import { gameSchemas, circlePromptSchemas } from '../../services/api/schemas/index.js'
import { gameCodec, gameId, completeNativeGamePrompt, awardNativeAchievement } from './game-core.js'
import { timestampForStorage } from './value-codecs.js'

const invite = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
const sameCircle = `SELECT a.circle_id FROM memory_circle_members a JOIN memory_circle_members b ON b.circle_id = a.circle_id
  JOIN users ua ON ua.id = a.user_id JOIN users ub ON ub.id = b.user_id WHERE a.user_id = ? AND b.user_id = ? AND ua.deleted_at IS NULL AND ub.deleted_at IS NULL`

export async function handleNativeCircles({ request, db, user, path, now }) {
  if (!path.startsWith('/game/circle')) return null
  const method = request.method,
    userId = user.id,
    stamp = timestampForStorage(now)
  const decode = (table, rows) =>
    rows.map(row => {
      const joined = {},
        stored = {}
      const extras = new Set([
        'from_user_name',
        'from_user_avatar',
        'for_user_name',
        'for_user_avatar',
        'name',
        'avatar_url',
        'streak'
      ])
      for (const [key, value] of Object.entries(row))
        (extras.has(key) ? joined : stored)[key] = value
      return { ...gameCodec(table).decodeRow(stored), ...joined }
    })
  if (path === '/game/circle/create' && method === 'POST') {
    const { circleName } = validate(await readJson(request), gameSchemas.createCircle.body)
    const code = invite(),
      expires = timestampForStorage(now + 7 * 86_400_000)
    const result = await db.batch([
      db
        .prepare(
          `INSERT INTO memory_circles(owner_user_id,circle_name,invite_code,invite_code_expires,created_at,updated_at)
        SELECT id,?,?,?,?,? FROM users u WHERE id = ? AND deleted_at IS NULL AND NOT EXISTS
          (SELECT 1 FROM memory_circle_members m WHERE m.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM memory_circles c WHERE c.owner_user_id = u.id) RETURNING id`
        )
        .bind(circleName, code, expires, stamp, stamp, userId),
      db
        .prepare(
          `INSERT INTO memory_circle_members(circle_id,user_id,role,display_name,joined_at)
        SELECT c.id,u.id,'owner',u.name,? FROM memory_circles c JOIN users u ON u.id = c.owner_user_id
        WHERE c.invite_code = ? AND u.id = ?`
        )
        .bind(stamp, code, userId)
    ])
    if (!result[0].results.length)
      throw new ApiError(400, { success: false, message: 'You already belong to a Memory Circle' })
    return json({
      success: true,
      data: {
        id: result[0].results[0].id,
        name: circleName,
        inviteCode: code,
        inviteCodeExpires: gameCodec('memory_circles').decodeRow({ invite_code_expires: expires })
          .invite_code_expires
      }
    })
  }
  if (path === '/game/circle' && method === 'GET') {
    const circle = await db
      .prepare(
        `SELECT c.*,m.role FROM memory_circle_members m JOIN memory_circles c ON c.id = m.circle_id WHERE m.user_id = ?`
      )
      .bind(userId)
      .first()
    if (!circle) return json({ success: true, data: null })
    const [members, activity, prompts] = await db.batch([
      db
        .prepare(
          `SELECT m.id,m.user_id,m.role,m.display_name,m.joined_at,m.last_active_at,u.name,u.avatar_url,
        COALESCE(g.current_streak,0) streak FROM memory_circle_members m JOIN users u ON u.id = m.user_id
        LEFT JOIN user_game_state g ON g.user_id = u.id WHERE m.circle_id = ? AND u.deleted_at IS NULL
        ORDER BY m.role = 'owner' DESC,m.joined_at,m.id`
        )
        .bind(circle.id),
      // Membership shares activity metadata, not raw private memoir snippets.
      db
        .prepare(
          `SELECT 'story' type,s.user_id,u.name user_name,s.chapter_id,s.created_at activity_time,'A new memory was saved.' preview
        FROM stories s JOIN users u ON u.id = s.user_id JOIN memory_circle_members m ON m.user_id = u.id
        WHERE m.circle_id = ? AND u.deleted_at IS NULL AND s.answer IS NOT NULL AND trim(s.answer) <> '' AND s.created_at >= ?
        ORDER BY s.created_at DESC,s.id DESC LIMIT 10`
        )
        .bind(circle.id, timestampForStorage(now - 7 * 86_400_000)),
      db
        .prepare(
          `SELECT p.*,COALESCE(u.name,'Former member') from_user_name FROM family_prompts p LEFT JOIN users u ON u.id = p.from_user_id
        WHERE p.for_user_id = ? AND p.circle_id = ? AND p.status = 'pending' ORDER BY p.created_at DESC,p.id DESC LIMIT 100`
        )
        .bind(userId, circle.id)
    ])
    const decoded = gameCodec('memory_circles').decodeRow({
      invite_code_expires: circle.invite_code_expires
    })
    return json({
      success: true,
      data: {
        id: circle.id,
        name: circle.circle_name,
        myRole: circle.role,
        inviteCode: circle.role === 'owner' ? circle.invite_code : null,
        inviteCodeExpires: circle.role === 'owner' ? decoded.invite_code_expires : null,
        members: decode('memory_circle_members', members.results).map(row => ({
          id: row.id,
          userId: row.user_id,
          name: row.display_name || row.name,
          avatarUrl: row.avatar_url,
          role: row.role,
          streak: row.streak,
          joinedAt: row.joined_at,
          lastActiveAt: row.last_active_at
        })),
        recentActivity: activity.results.map(row => ({
          ...row,
          activity_time: gameCodec('stories').decodeRow({ created_at: row.activity_time })
            .created_at
        })),
        pendingPrompts: decode('family_prompts', prompts.results)
      }
    })
  }
  const join = /^\/game\/circle\/join\/([^/]+)$/.exec(path)
  if (join && method === 'POST') {
    const { inviteCode } = validate(
      { inviteCode: join[1] },
      gameSchemas.joinCircle.params,
      'params'
    )
    const { displayName } = validate(await readJson(request), gameSchemas.joinCircle.body)
    const circle = await db
      .prepare(
        'SELECT id,circle_name FROM memory_circles WHERE invite_code = ? AND invite_code_expires > ?'
      )
      .bind(inviteCode.toUpperCase(), stamp)
      .first()
    if (!circle)
      throw new ApiError(404, { success: false, message: 'Invalid or expired invite code' })
    const result = await db
      .prepare(
        `INSERT INTO memory_circle_members(circle_id,user_id,role,display_name,joined_at)
      SELECT c.id,u.id,'helper',COALESCE(?,u.name),? FROM memory_circles c JOIN users u ON u.id = ? AND u.deleted_at IS NULL
      WHERE c.id = ? AND c.invite_code = ? AND c.invite_code_expires > ?
      AND NOT EXISTS(SELECT 1 FROM memory_circle_members WHERE user_id = u.id)
      AND (SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = c.id) < c.max_members RETURNING id`
      )
      .bind(displayName || null, stamp, userId, circle.id, inviteCode.toUpperCase(), stamp)
      .first()
    if (!result)
      throw new ApiError(400, {
        success: false,
        message: 'This circle is full or you already belong to a circle'
      })
    await awardNativeAchievement(db, userId, 'family_joined', now).catch(() => {})
    return json({
      success: true,
      message: `Joined ${circle.circle_name}`,
      data: { circleId: circle.id, circleName: circle.circle_name }
    })
  }
  if (path === '/game/circle/regenerate-invite' && method === 'POST') {
    const code = invite(),
      expires = timestampForStorage(now + 7 * 86_400_000)
    const row = await db
      .prepare(
        'UPDATE memory_circles SET invite_code = ?,invite_code_expires = ?,updated_at = ? WHERE owner_user_id = ? RETURNING id'
      )
      .bind(code, expires, stamp, userId)
      .first()
    if (!row)
      throw new ApiError(403, {
        success: false,
        message: 'Only the circle owner can change invitations'
      })
    return json({
      success: true,
      data: { inviteCode: code, expiresAt: new Date(now + 7 * 86_400_000).toISOString() }
    })
  }
  const member = /^\/game\/circle\/member\/([^/]+)$/.exec(path)
  if (member && method === 'DELETE') {
    const id = gameId(member[1])
    const row = await db
      .prepare(
        `DELETE FROM memory_circle_members WHERE id = ? AND role <> 'owner'
      AND circle_id IN (SELECT id FROM memory_circles WHERE owner_user_id = ?) RETURNING id`
      )
      .bind(id, userId)
      .first()
    if (!row)
      throw new ApiError(403, {
        success: false,
        message: 'Only an owner can remove a helper from their circle'
      })
    return json({ success: true, message: 'Member removed' })
  }
  if (path === '/game/circle/leave' && method === 'POST') {
    const row = await db
      .prepare(
        "DELETE FROM memory_circle_members WHERE user_id = ? AND role <> 'owner' RETURNING id"
      )
      .bind(userId)
      .first()
    if (!row)
      throw new ApiError(400, {
        success: false,
        message: 'Owners cannot leave their circle, or you are not a member'
      })
    return json({ success: true, message: 'Left the Memory Circle' })
  }
  if (path === '/game/circle/prompt' && method === 'POST') {
    const body = validate(await readJson(request), circlePromptSchemas.send.body)
    const saved = await db
      .prepare(
        `INSERT INTO family_prompts(circle_id,from_user_id,for_user_id,prompt_text,prompt_note,created_at)
      SELECT circle_id,?,?,?,?,? FROM (${sameCircle}) LIMIT 1 RETURNING *`
      )
      .bind(
        userId,
        body.forUserId,
        body.promptText,
        body.promptNote || null,
        stamp,
        userId,
        body.forUserId
      )
      .first()
    if (!saved)
      throw new ApiError(403, {
        success: false,
        message: 'You can only send prompts to members of your circle'
      })
    return json({ success: true, data: gameCodec('family_prompts').decodeRow(saved) })
  }
  if (path === '/game/circle/prompts' && method === 'GET') {
    const [received, sent] = await db.batch([
      db
        .prepare(
          `SELECT p.*,COALESCE(u.name,'Former member') from_user_name,u.avatar_url from_user_avatar FROM family_prompts p
        LEFT JOIN users u ON u.id = p.from_user_id WHERE p.for_user_id = ? ORDER BY p.created_at DESC,p.id DESC LIMIT 20`
        )
        .bind(userId),
      db
        .prepare(
          `SELECT p.*,u.name for_user_name,u.avatar_url for_user_avatar FROM family_prompts p
        JOIN users u ON u.id = p.for_user_id WHERE p.from_user_id = ? ORDER BY p.created_at DESC,p.id DESC LIMIT 20`
        )
        .bind(userId)
    ])
    return json({
      success: true,
      data: {
        received: decode('family_prompts', received.results),
        sent: decode('family_prompts', sent.results)
      }
    })
  }
  const answer = /^\/game\/circle\/prompt\/([^/]+)\/answer$/.exec(path)
  if (answer && method === 'POST') {
    const id = gameId(answer[1]),
      body = validate(await readJson(request), circlePromptSchemas.answer.body)
    const result = await completeNativeGamePrompt(db, userId, id, body, now, 'family')
    return json({ success: true, data: { storyId: result.storyId } })
  }
  const decline = /^\/game\/circle\/prompt\/([^/]+)\/decline$/.exec(path)
  if (decline && method === 'POST') {
    const row = await db
      .prepare(
        "UPDATE family_prompts SET status = 'declined',declined_at = ? WHERE id = ? AND for_user_id = ? AND status = 'pending' RETURNING id"
      )
      .bind(stamp, gameId(decline[1]), userId)
      .first()
    if (!row) throw new ApiError(404, { error: 'Pending prompt not found' })
    return json({ success: true })
  }
  if (path === '/game/circle/encourage' && method === 'POST') {
    const body = validate(await readJson(request), circlePromptSchemas.encourage.body)
    const row = await db
      .prepare(
        `INSERT INTO family_encouragements(circle_id,from_user_id,for_user_id,encouragement_type,message,related_story_id,created_at)
      SELECT circle_id,?,?,?,?,?,? FROM (${sameCircle}) WHERE ? IS NULL OR EXISTS(SELECT 1 FROM stories s WHERE s.id = ? AND s.user_id = ?) LIMIT 1 RETURNING id`
      )
      .bind(
        userId,
        body.forUserId,
        body.type || 'heart',
        body.message || null,
        body.relatedStoryId || null,
        stamp,
        userId,
        body.forUserId,
        body.relatedStoryId || null,
        body.relatedStoryId || null,
        body.forUserId
      )
      .first()
    if (!row)
      throw new ApiError(403, { error: 'Recipient and related memory must belong to your circle' })
    return json({ success: true })
  }
  if (path === '/game/circle/encouragements' && method === 'GET') {
    const unread = new URL(request.url).searchParams.get('unreadOnly') === 'true'
    const { results } = await db
      .prepare(
        `SELECT e.*,COALESCE(u.name,'Former member') from_user_name,u.avatar_url from_user_avatar
      FROM family_encouragements e LEFT JOIN users u ON u.id = e.from_user_id WHERE e.for_user_id = ?
      ${unread ? 'AND e.seen_by_recipient = 0' : ''} ORDER BY e.created_at DESC,e.id DESC LIMIT 50`
      )
      .bind(userId)
      .all()
    return json({ success: true, data: decode('family_encouragements', results) })
  }
  if (path === '/game/circle/encouragements/mark-seen' && method === 'POST') {
    await db
      .prepare(
        'UPDATE family_encouragements SET seen_by_recipient = 1 WHERE for_user_id = ? AND seen_by_recipient = 0'
      )
      .bind(userId)
      .run()
    return json({ success: true })
  }
  return null
}

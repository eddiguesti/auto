import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson } from './request.js'
import { createMappedCodec, timestampForStorage } from './value-codecs.js'
import { processNativeRefund } from './ops-refunds.js'

export async function assertOpsAdmin(db, user, claims) {
  requireFullScope(claims)
  if (
    !user ||
    !(await db
      .prepare('SELECT id FROM users WHERE id = ? AND is_admin = 1 AND deleted_at IS NULL')
      .bind(user.id)
      .first())
  )
    throw new ApiError(403, { error: 'Administrator access required' })
}
function integer(value, field, max = 2147483647) {
  if (
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > max
  )
    throw new ApiError(400, { error: `Invalid ${field}` })
  return Number(value)
}
function pagination(request) {
  const params = new URL(request.url).searchParams,
    page = integer(params.get('page') || '1', 'page', 10000),
    limit = integer(params.get('limit') || '20', 'limit', 100)
  return { page, limit, offset: (page - 1) * limit, search: params.get('q') || '' }
}
const userColumns = `u.id,u.email,u.name,u.created_at,u.premium_until,u.is_admin,
  (SELECT COUNT(*) FROM stories s WHERE s.user_id=u.id) AS story_count`
const userRow = row => {
  const { story_count, ...mapped } = row
  return {
    ...createMappedCodec('users', { wallClockTimeZone: 'UTC' }).decodeRow(mapped),
    ...(story_count === undefined ? {} : { story_count })
  }
}
const paymentRow = row => {
  const { user_email, user_name, refund_state, ...mapped } = row
  return {
    ...createMappedCodec('payments', { wallClockTimeZone: 'UTC' }).decodeRow(mapped),
    ...(user_email === undefined ? {} : { user_email, user_name, refund_state })
  }
}
const actor = 'EXISTS(SELECT 1 FROM users a WHERE a.id=? AND a.is_admin=1 AND a.deleted_at IS NULL)'

export async function handleAdminOps({ request, env, db, user, claims, path, now = Date.now() }) {
  if (!path.startsWith('/admin/')) return null
  await assertOpsAdmin(db, user, claims)
  if (path === '/admin/metrics' && request.method === 'GET') {
    const row = await db
      .prepare(
        `SELECT
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS totalUsers,
      (SELECT COUNT(DISTINCT s.user_id) FROM stories s JOIN users u ON u.id=s.user_id WHERE u.deleted_at IS NULL AND julianday(s.created_at)>=julianday(?)-7) AS activeUsers7d,
      (SELECT COUNT(*) FROM stories s JOIN users u ON u.id=s.user_id WHERE u.deleted_at IS NULL) AS totalStories,
      (SELECT COUNT(*) FROM payments WHERE status='completed') AS totalPayments,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='completed' AND lower(currency)='gbp') AS revenueTotal`
      )
      .bind(new Date(now).toISOString())
      .first()
    return json(row)
  }
  if (path === '/admin/users' && request.method === 'GET') {
    const { page, limit, offset, search } = pagination(request)
    if (search.length > 200) throw new ApiError(400, { error: 'Search too long' })
    // Literal substring search: SQL wildcards are not accepted as a query language.
    const query = `%${search.replace(/[\\%_]/g, character => '\\' + character)}%`
    const where =
      "u.deleted_at IS NULL AND (u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')"
    const [count, rows] = await db.batch([
      db.prepare(`SELECT COUNT(*) AS n FROM users u WHERE ${where}`).bind(query, query),
      db
        .prepare(
          `SELECT ${userColumns} FROM users u WHERE ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT ? OFFSET ?`
        )
        .bind(query, query, limit, offset)
    ])
    return json({
      users: rows.results.map(userRow),
      meta: { total: count.results[0].n, page, limit }
    })
  }
  const detail = /^\/admin\/users\/([^/]+)$/.exec(path)
  if (detail && request.method === 'GET') {
    const id = integer(detail[1], 'user ID')
    const row = await db
      .prepare(
        `SELECT ${userColumns},u.birth_year,u.avatar_url,u.email_verified FROM users u WHERE u.id=? AND u.deleted_at IS NULL`
      )
      .bind(id)
      .first()
    if (!row) throw new ApiError(404, { error: 'User not found' })
    const { results } = await db
      .prepare(
        'SELECT id,product_id,product_type,amount,currency,status,created_at FROM payments WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100'
      )
      .bind(id)
      .all()
    return json({
      user: { ...userRow(row), storyCount: row.story_count },
      payments: results.map(paymentRow)
    })
  }
  const premium = /^\/admin\/users\/([^/]+)\/premium$/.exec(path)
  if (premium && request.method === 'POST') {
    const id = integer(premium[1], 'user ID'),
      body = await readJson(request)
    if (
      Object.keys(body).some(key => key !== 'months') ||
      !Number.isInteger(body.months) ||
      body.months < 1 ||
      body.months > 120
    )
      throw new ApiError(400, { error: 'Months must be an integer from 1 to120' })
    const grant = crypto.randomUUID(),
      stamp = timestampForStorage(now)
    const result = await db.batch([
      db
        .prepare(
          `UPDATE users SET premium_until = datetime(CASE WHEN julianday(premium_until)>julianday(?) THEN premium_until ELSE ? END,'+' || ? || ' months','floor'),updated_at=?
        WHERE id=? AND deleted_at IS NULL AND ${actor} RETURNING id,email,premium_until`
        )
        .bind(stamp, stamp, body.months, stamp, id, user.id),
      db
        .prepare(
          `INSERT INTO native_admin_premium_grants(id,user_id,actor_id,months,expires_at,created_at)
        SELECT ?,id,?,?,premium_until,? FROM users WHERE id=? AND deleted_at IS NULL AND updated_at=? AND ${actor}`
        )
        .bind(grant, user.id, body.months, now, id, stamp, user.id),
      db
        .prepare(
          `INSERT INTO native_ops_audit(id,actor_id,subject_id,action,details,created_at)
        SELECT id,actor_id,user_id,'premium_granted',json_object('months',months,'expiresAt',expires_at),created_at FROM native_admin_premium_grants WHERE id=?`
        )
        .bind(grant)
    ])
    if (!result[0].results.length)
      throw new ApiError(404, { error: 'User unavailable or administrator access revoked' })
    return json({ user: userRow(result[0].results[0]) })
  }
  if (path === '/admin/payments' && request.method === 'GET') {
    const { page, limit, offset } = pagination(request)
    const [count, rows] = await db.batch([
      db.prepare('SELECT COUNT(*) AS n FROM payments'),
      db
        .prepare(
          `SELECT p.id,p.user_id,p.product_id,p.product_type,p.amount,p.currency,p.status,p.created_at,u.email AS user_email,u.name AS user_name,
        (SELECT state FROM native_refund_attempts a WHERE a.payment_id=p.id) AS refund_state
        FROM payments p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`
        )
        .bind(limit, offset)
    ])
    return json({
      payments: rows.results.map(paymentRow),
      meta: { total: count.results[0].n, page, limit }
    })
  }
  const refund = /^\/admin\/refunds\/([^/]+)\/process$/.exec(path)
  if (refund && request.method === 'POST')
    return processNativeRefund({
      db,
      env,
      paymentId: integer(refund[1], 'payment ID'),
      actorId: user.id,
      now
    })
  return null
}

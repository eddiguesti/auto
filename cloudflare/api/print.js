import { PRINT_PACKAGE } from '../../packages/shared/payment-catalog.js'
import { ApiError, json } from './errors.js'
import { requireFullScope } from './auth.js'
import { readJson } from './request.js'
import { timestampForStorage } from './value-codecs.js'
import { resolveNativeManuscript } from './writing-manuscript.js'
import { generateInterior, generateCover } from './print-pdf.js'
import {
  nativeBookvault,
  printConfigurationReady,
  requirePrintConfiguration,
  validatePrintShipping
} from './print-provider.js'
import { printPdfResponse } from './print-files.js'

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/
const FONT_KEY = 'assets/fonts/NotoSerif-Regular.ttf'
const FONT_HASH = 'c8f669ceb2c9c60ccf55198b305e08a997ffca79a38cc7eeb551e643cbe66505'
const CREDIT = `SELECT e.id FROM print_entitlements e JOIN payments p ON p.stripe_session_id=e.stripe_session_id AND p.user_id=e.user_id AND p.status='completed'
  WHERE e.user_id=? AND e.package_version=? AND e.quantity=? AND NOT EXISTS(SELECT 1 FROM print_orders o WHERE o.entitlement_id=e.id) ORDER BY e.created_at,e.id LIMIT 1`
async function credit(db, userId) {
  return db.prepare(CREDIT).bind(userId, PRINT_PACKAGE.version, PRINT_PACKAGE.quantity).first()
}
async function fontBytes(env) {
  const object = await env.MEDIA.get(FONT_KEY)
  if (!object || object.size > 1024 * 1024)
    throw new ApiError(503, {
      error: 'The licensed print font is unavailable',
      code: 'PRINT_FONT_UNAVAILABLE'
    })
  const bytes = new Uint8Array(await object.arrayBuffer())
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value =>
    value.toString(16).padStart(2, '0')
  ).join('')
  if (hash !== FONT_HASH)
    throw new ApiError(503, {
      error: 'Print font verification failed',
      code: 'PRINT_FONT_UNAVAILABLE'
    })
  return bytes
}

export async function handleNativePrint({
  request,
  env,
  db,
  path,
  user,
  claims,
  now = Date.now()
}) {
  if (!/^\/print(?:\/|$)/.test(path)) return null
  requireFullScope(claims)
  const method = request.method,
    userId = user.id
  if (path === '/print/status' && method === 'GET') {
    const [unused, orders, legacy] = await Promise.all([
      credit(db, userId),
      db
        .prepare(
          "SELECT id,status,title,page_count,colour_pages,tracking_url,tracking_number,provider_status FROM print_orders WHERE user_id=? ORDER BY (status='proof'),created_at DESC,id DESC LIMIT 10"
        )
        .bind(userId)
        .all(),
      db
        .prepare(
          `SELECT id FROM payments p WHERE p.user_id=? AND p.status='completed' AND p.product_type IN ('book','premium_bundle') AND NOT EXISTS(SELECT 1 FROM print_entitlements e WHERE e.stripe_session_id=p.stripe_session_id) LIMIT 1`
        )
        .bind(userId)
        .first()
    ])
    return json({
      available: printConfigurationReady(env),
      package: PRINT_PACKAGE,
      hasEntitlement: Boolean(unused),
      hasLegacyPackage: Boolean(legacy),
      orders: orders.results
    })
  }
  if (path === '/print/proof' && method === 'POST') {
    requirePrintConfiguration(env)
    if (!(await credit(db, userId)))
      throw new ApiError(403, {
        error: 'Purchase the complete memoir package before preparing your print proof.'
      })
    const body = await readJson(request),
      title = body.title,
      author = body.author,
      photoIds = body.photoIds
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 160 ||
      typeof author !== 'string' ||
      !author.trim() ||
      author.length > 100
    )
      throw new ApiError(400, { error: 'Enter a book title and author name.' })
    if (
      !Array.isArray(photoIds) ||
      photoIds.length > 8 ||
      new Set(photoIds).size !== photoIds.length ||
      photoIds.some(id => !Number.isInteger(id) || id < 1)
    )
      throw new ApiError(400, { error: 'Choose up to eight photographs.' })
    const recent = await db
      .prepare(
        'SELECT COUNT(*) count FROM print_orders WHERE user_id=? AND julianday(created_at)>julianday(?)'
      )
      .bind(userId, new Date(now - 3600000).toISOString())
      .first()
    if (recent.count >= 10)
      throw new ApiError(429, {
        error: 'Please wait before preparing another proof.',
        retryAfter: 3600
      })
    const rows = await resolveNativeManuscript(db, userId),
      photos = rows.flatMap(row => row.photos || [])
    const selected = photoIds.map(id => photos.find(photo => photo.id === id))
    if (selected.some(photo => !photo))
      throw new ApiError(403, { error: 'One selected photograph does not belong to your memoir.' })
    const font = await fontBytes(env)
    let photoBytes = 0,
      pngPixels = 0
    const interior = await generateInterior({
      title: title.trim(),
      author: author.trim(),
      stories: rows,
      photos: selected,
      fontBytes: font,
      readPhoto: async key => {
        const object = await env.MEDIA.get(key)
        if (!object) return null
        photoBytes += object.size
        if (photoBytes > 16 * 1024 * 1024)
          throw new ApiError(413, {
            error: 'Choose smaller JPEG photographs; print photos must total under 16 MiB.'
          })
        const bytes = new Uint8Array(await object.arrayBuffer())
        if (bytes[0] === 0x89 && bytes.length >= 24) {
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
          pngPixels += view.getUint32(16) * view.getUint32(20)
          if (pngPixels > 8000000)
            throw new ApiError(413, {
              error: 'Use smaller PNG photographs or upload JPEG versions for this proof.'
            })
        }
        return bytes
      }
    })
    const specification = await nativeBookvault(env).specification(
      interior.pageCount,
      interior.colourPages
    )
    const cover = await generateCover({
      title: title.trim(),
      author: author.trim(),
      ...specification,
      fontBytes: font
    })
    const id = crypto.randomUUID(),
      textKey = `print/${userId}/${id}/text.pdf`,
      coverKey = `print/${userId}/${id}/cover.pdf`,
      stamp = timestampForStorage(now, 'instant')
    const reserved = await db.batch(
      [textKey, coverKey].map(key =>
        db
          .prepare(
            `INSERT INTO media_deletion_jobs(object_key,next_attempt_at,created_at)
      SELECT ?,?,? FROM users WHERE id=? AND deleted_at IS NULL RETURNING object_key`
          )
          .bind(key, timestampForStorage(Date.now() + 3600000, 'instant'), stamp, userId)
      )
    )
    if (reserved.some(result => !result.results.length))
      throw new ApiError(401, { error: 'Account unavailable' })
    // Cleanup intents survive partial R2 puts and isolate termination. Author
    // ownership is rechecked when both immutable proof objects commit to D1.
    await env.MEDIA.put(textKey, interior.bytes, {
      httpMetadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' }
    })
    await env.MEDIA.put(coverKey, cover, {
      httpMetadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' }
    })
    const [saved] = await db.batch([
      db
        .prepare(
          `INSERT INTO print_orders(id,user_id,title,text_key,cover_key,page_count,colour_pages,product_sku,created_at,updated_at)
        SELECT ?,id,?,?,?,?,?,?,?,? FROM users WHERE id=? AND deleted_at IS NULL RETURNING id`
        )
        .bind(
          id,
          title.trim(),
          textKey,
          coverKey,
          interior.pageCount,
          interior.colourPages,
          specification.sku,
          stamp,
          stamp,
          userId
        ),
      db
        .prepare(
          'DELETE FROM media_deletion_jobs WHERE object_key IN (?,?) AND EXISTS(SELECT 1 FROM print_orders WHERE id=? AND user_id=?)'
        )
        .bind(textKey, coverKey, id, userId)
    ])
    if (!saved.results.length) throw new ApiError(401, { error: 'Account unavailable' })
    return json({ id, pageCount: interior.pageCount, colourPages: interior.colourPages }, 201)
  }
  const proof = /^\/print\/([^/]+)\/proof\/(text|cover)$/.exec(path)
  if (proof && method === 'GET') {
    if (!UUID.test(proof[1])) throw new ApiError(404, { error: 'Proof not found' })
    const row = await db
      .prepare('SELECT text_key,cover_key FROM print_orders WHERE id=? AND user_id=?')
      .bind(proof[1], userId)
      .first()
    if (!row) throw new ApiError(404, { error: 'Proof not found' })
    return printPdfResponse(env, row[`${proof[2]}_key`])
  }
  const approval = /^\/print\/([^/]+)\/approve$/.exec(path)
  if (approval && method === 'POST') {
    requirePrintConfiguration(env)
    if (!UUID.test(approval[1])) throw new ApiError(404, { error: 'Proof not found' })
    const body = await readJson(request)
    if (body.approved !== true)
      throw new ApiError(400, { error: 'Review and approve both print PDFs first.' })
    const address = validatePrintShipping(body.address),
      id = approval[1],
      stamp = timestampForStorage(now, 'instant')
    const result = await db.batch([
      db
        .prepare(
          `UPDATE print_orders SET entitlement_id=(${CREDIT}),shipping_address=?,status='queued',approved_at=?,updated_at=?
        WHERE id=? AND user_id=? AND status='proof' AND EXISTS(${CREDIT}) AND EXISTS(SELECT 1 FROM users WHERE id=print_orders.user_id AND deleted_at IS NULL) RETURNING id`
        )
        .bind(
          userId,
          PRINT_PACKAGE.version,
          PRINT_PACKAGE.quantity,
          JSON.stringify(address),
          stamp,
          stamp,
          id,
          userId,
          userId,
          PRINT_PACKAGE.version,
          PRINT_PACKAGE.quantity
        ),
      db
        .prepare(
          `INSERT INTO native_print_dispatch(order_id,user_id,next_attempt_at,updated_at) SELECT id,user_id,?,? FROM print_orders WHERE id=? AND user_id=? AND status='queued' ON CONFLICT(order_id) DO NOTHING`
        )
        .bind(now, now, id, userId),
      db
        .prepare(
          `INSERT INTO native_print_outbox(order_id) SELECT order_id FROM native_print_dispatch WHERE order_id=? AND user_id=? ON CONFLICT(order_id) DO NOTHING`
        )
        .bind(id, userId)
    ])
    if (!result[0].results.length) {
      const current = await db
        .prepare('SELECT status FROM print_orders WHERE id=? AND user_id=?')
        .bind(id, userId)
        .first()
      if (!current) throw new ApiError(404, { error: 'Proof not found' })
      if (current.status !== 'proof') return json({ id, status: current.status })
      throw new ApiError(403, { error: 'There is no unused print package on your account.' })
    }
    return json({ id, status: 'queued' }, 202)
  }
  return null
}

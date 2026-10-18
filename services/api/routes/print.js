import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { storyRepository } from '../repositories/storyRepository.js'
import { objectStorage } from '../utils/objectStorage.js'
import { PRINT_PACKAGE } from '../../../packages/shared/payment-catalog.js'
import {
  bookvault,
  printConfigurationReady,
  requirePrintConfiguration,
  validateShipping
} from '../services/bookvault.js'
import { generateInterior, generateCover } from '../services/memoirPrintPdf.js'
import { verifyPrintFileToken } from '../services/printFiles.js'
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors.js'

const router = Router()
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
async function entitlement(db, userId) {
  const { rows } = await db.query(
    `SELECT e.id FROM print_entitlements e
    JOIN payments p ON p.stripe_session_id = e.stripe_session_id AND p.status = 'completed'
    WHERE e.user_id = $1 AND NOT EXISTS (SELECT 1 FROM print_orders o WHERE o.entitlement_id = e.id)
    ORDER BY e.created_at LIMIT 1`,
    [userId]
  )
  return rows[0] || null
}

router.get(
  '/status',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const [credit, result, legacy] = await Promise.all([
      entitlement(db, req.user.id),
      db.query(
        `SELECT id, status, title, page_count, colour_pages, tracking_url, tracking_number, provider_status
      FROM print_orders WHERE user_id = $1 ORDER BY (status='proof'),created_at DESC LIMIT 10`,
        [req.user.id]
      ),
      db.query(
        `SELECT id FROM payments p WHERE p.user_id=$1 AND p.status='completed'
        AND p.product_type IN ('book','premium_bundle')
        AND NOT EXISTS (SELECT 1 FROM print_entitlements e WHERE e.stripe_session_id=p.stripe_session_id) LIMIT 1`,
        [req.user.id]
      )
    ])
    res.json({
      available: printConfigurationReady(),
      package: PRINT_PACKAGE,
      hasEntitlement: Boolean(credit),
      hasLegacyPackage: legacy.rows.length > 0,
      orders: result.rows
    })
  })
)

router.post(
  '/proof',
  requireDb,
  asyncHandler(async (req, res) => {
    requirePrintConfiguration()
    const db = req.app.locals.db,
      userId = req.user.id
    if (!(await entitlement(db, userId)))
      throw new ForbiddenError(
        'Purchase the complete memoir package before preparing your print proof.'
      )
    const title = req.body.title,
      author = req.body.author
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 160 ||
      typeof author !== 'string' ||
      !author.trim() ||
      author.length > 100
    )
      throw new ValidationError('Enter a book title and author name.')
    const recent = await db.query(
      "SELECT COUNT(*) AS count FROM print_orders WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
      [userId]
    )
    if (Number(recent.rows[0].count) >= 10)
      throw new ValidationError('Please wait before preparing another proof.')
    const stories = await storyRepository.findWithPhotos(db, userId)
    const allPhotos = stories.flatMap(story => story.photos || [])
    const requested = req.body.photoIds
    if (
      !Array.isArray(requested) ||
      requested.length > 8 ||
      new Set(requested).size !== requested.length ||
      requested.some(id => !Number.isInteger(id))
    )
      throw new ValidationError('Choose up to eight photographs.')
    const photos = requested.map(id => allPhotos.find(photo => photo.id === id))
    if (photos.some(photo => !photo))
      throw new ForbiddenError('One of the selected photographs does not belong to your memoir.')
    const interior = await generateInterior({
      title: title.trim(),
      author: author.trim(),
      stories,
      photos,
      readPhoto: key => objectStorage.read(key)
    })
    const specification = await bookvault.specification(interior.pageCount, interior.colourPages)
    const cover = await generateCover({
      title: title.trim(),
      author: author.trim(),
      ...specification
    })
    const id = randomUUID(),
      textKey = `print/${userId}/${id}/text.pdf`,
      coverKey = `print/${userId}/${id}/cover.pdf`
    await objectStorage.put(textKey, interior.bytes, 'application/pdf')
    await objectStorage.put(coverKey, cover, 'application/pdf')
    await db.query(
      `INSERT INTO print_orders (id,user_id,title,text_key,cover_key,page_count,colour_pages,product_sku)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        userId,
        title.trim(),
        textKey,
        coverKey,
        interior.pageCount,
        interior.colourPages,
        specification.sku
      ]
    )
    res.status(201).json({ id, pageCount: interior.pageCount, colourPages: interior.colourPages })
  })
)

router.get(
  '/:id/proof/:type',
  requireDb,
  asyncHandler(async (req, res) => {
    if (!uuid.test(req.params.id) || !['text', 'cover'].includes(req.params.type))
      throw new NotFoundError('Proof')
    const { rows } = await req.app.locals.db.query(
      'SELECT text_key, cover_key FROM print_orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!rows[0]) throw new NotFoundError('Proof')
    await sendFile(res, rows[0][`${req.params.type}_key`])
  })
)

router.post(
  '/:id/approve',
  requireDb,
  asyncHandler(async (req, res) => {
    requirePrintConfiguration()
    if (!uuid.test(req.params.id)) throw new NotFoundError('Proof')
    if (req.body.approved !== true)
      throw new ValidationError('Review and approve both print PDFs first.')
    const address = validateShipping(req.body.address)
    if (address.countryCode === 'FR' && !(Number(process.env.BOOKVAULT_FR_DECLARED_VALUE_GBP) > 0))
      throw new ValidationError(
        'French delivery is being configured. Please contact support before submitting.'
      )
    const client = await req.app.locals.db.connect()
    try {
      await client.query('BEGIN')
      // Lock the user to serialize all approvals, including approvals for different proofs.
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id])
      const { rows } = await client.query(
        'SELECT status FROM print_orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [req.params.id, req.user.id]
      )
      if (!rows[0]) throw new NotFoundError('Proof')
      if (rows[0].status !== 'proof') {
        await client.query('COMMIT')
        return res.json({ id: req.params.id, status: rows[0].status })
      }
      const credit = await entitlement(client, req.user.id)
      if (!credit) throw new ForbiddenError('There is no unused print package on your account.')
      await client.query(
        `UPDATE print_orders SET entitlement_id=$1,shipping_address=$2,status='queued',approved_at=NOW(),updated_at=NOW()
      WHERE id=$3`,
        [credit.id, JSON.stringify(address), req.params.id]
      )
      await client.query('COMMIT')
      res.status(202).json({ id: req.params.id, status: 'queued' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })
)

async function sendFile(res, key) {
  const object = await objectStorage.get(key)
  if (!object) throw new NotFoundError('Print file')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', 'inline; filename="memoir-proof.pdf"')
  object.body.on('error', error => res.destroy(error))
  object.body.pipe(res)
}

// Capability URLs grant the printer access to just these two immutable PDFs for seven days.
export async function servePrintFile(req, res, next) {
  try {
    const { id, type } = req.params
    if (!uuid.test(id) || !verifyPrintFileToken(id, type, req.query.expires, req.query.token))
      return res.status(403).json({ error: 'Print file link expired or invalid' })
    const { rows } = await req.app.locals.db.query(
      `SELECT o.text_key,o.cover_key FROM print_orders o JOIN print_entitlements e ON e.id=o.entitlement_id
       JOIN payments p ON p.stripe_session_id=e.stripe_session_id AND p.status='completed'
       WHERE o.id=$1 AND o.approved_at IS NOT NULL`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Print file not found' })
    await sendFile(res, rows[0][`${type}_key`])
  } catch (error) {
    next(error)
  }
}

export default router

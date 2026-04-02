import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { coverSchemas } from '../schemas/index.js'
import { createLogger } from '../utils/logger.js'
import { authenticateToken } from '../middleware/auth.js'
import { coverRepository } from '../repositories/coverRepository.js'

const router = Router()
const logger = createLogger('covers')

// Book format presets
const BOOK_FORMATS = {
  paperback: {
    id: 'paperback',
    name: 'Paperback',
    description: 'Classic softcover memoir',
    icon: 'paperback',
    price: '£29',
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'PB',
      paper: '060UC',
      color: 'FC',
      finish: 'M'
    }
  },
  hardcover: {
    id: 'hardcover',
    name: 'Hardcover',
    description: 'Premium quality keepsake',
    icon: 'hardcover',
    price: '£49',
    popular: true,
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'CW',
      paper: '080CW',
      color: 'FC',
      finish: 'G'
    }
  },
  deluxe: {
    id: 'deluxe',
    name: 'Deluxe Heirloom',
    description: 'Linen cover with gold foil',
    icon: 'deluxe',
    price: '£79',
    luluConfig: {
      trimSize: '0600X0900',
      binding: 'LW',
      paper: '080CW',
      color: 'FC',
      finish: 'M',
      linen: 'N',
      foil: 'G'
    }
  }
}

// Get available book formats
router.get('/options', (_req, res) => {
  res.json({
    bookFormats: Object.values(BOOK_FORMATS)
  })
})

// Get user's saved book cover metadata
router.get(
  '/saved',
  authenticateToken,
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const cover = await coverRepository.findByUser(db, userId)
    res.json({ cover: cover || null })
  })
)

// Save/update user's book cover metadata (title, author)
router.post(
  '/save',
  authenticateToken,
  requireDb,
  validate(coverSchemas.save),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { templateId, title, author, spineText, colorScheme, customSettings } = req.body

    logger.info('Saving book cover', { userId, requestId: req.id })

    const cover = await coverRepository.upsert(db, userId, {
      templateId,
      title,
      author,
      spineText,
      colorScheme,
      customSettings
    })

    logger.info('Book cover saved', { userId, coverId: cover.id, requestId: req.id })

    res.json({
      success: true,
      cover
    })
  })
)

export default router
export { BOOK_FORMATS }

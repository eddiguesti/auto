import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../db/index.js'

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
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const result = await query(`SELECT * FROM book_covers WHERE user_id = $1`, [userId])

    if (result.rows.length === 0) {
      return res.json({ cover: null })
    }

    res.json({ cover: result.rows[0] })
  })
)

// Save/update user's book cover metadata (title, author)
router.post(
  '/save',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { templateId, title, author, spineText, colorScheme, customSettings } = req.body

    logger.info('Saving book cover', { userId, requestId: req.id })

    const result = await query(
      `INSERT INTO book_covers (
        user_id, template_id, title, author,
        spine_text, color_scheme, custom_settings, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        title = EXCLUDED.title,
        author = EXCLUDED.author,
        spine_text = EXCLUDED.spine_text,
        color_scheme = EXCLUDED.color_scheme,
        custom_settings = EXCLUDED.custom_settings,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId,
        templateId || 'default',
        title,
        author,
        spineText,
        JSON.stringify(colorScheme || {}),
        JSON.stringify(customSettings || {})
      ]
    )

    logger.info('Book cover saved', { userId, coverId: result.rows[0].id, requestId: req.id })

    res.json({
      success: true,
      cover: result.rows[0]
    })
  })
)

export default router
export { BOOK_FORMATS }

import { Router } from 'express'
// epub-gen-memory is dynamically imported to ensure polyfills load first
import { chapters } from '@easy-memoir/shared/chapters'
import { getStoriesWithPhotos } from '../utils/storyRepository.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

/**
 * Escape HTML entities to prevent XSS in EPUB content
 */
function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Generate EPUB eBook
router.get('/epub', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Get user settings for name
  const settingsResult = await db.query('SELECT name FROM settings WHERE user_id = $1', [userId])
    const userName = settingsResult.rows[0]?.name || 'My'

    // Get all stories with photos
    const storiesResult = await getStoriesWithPhotos(db, userId)

    // Organize stories by chapter
    const stories = {}
    storiesResult.forEach(story => {
      if (!stories[story.chapter_id]) {
        stories[story.chapter_id] = {}
      }
      stories[story.chapter_id][story.question_id] = story
    })

    // Build EPUB content
    const epubChapters = []

    // Escape user name for safe HTML insertion
    const safeUserName = escapeHtml(userName)

    // Title page
    epubChapters.push({
      title: 'Title Page',
      content: `
        <div style="text-align: center; padding: 100px 20px;">
          <h1 style="font-size: 2.5em; margin-bottom: 20px;">${safeUserName}'s Life Story</h1>
          <p style="font-style: italic; font-size: 1.2em; color: #666;">An Autobiography</p>
          <p style="margin-top: 50px; color: #999;">${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}</p>
        </div>
      `
    })

    // Process each chapter
    for (const chapter of chapters) {
      const chapterStories = stories[chapter.id]
      if (!chapterStories) continue

      const storiesWithContent = Object.values(chapterStories).filter(s => s.answer?.trim())
      if (storiesWithContent.length === 0) continue

      let chapterContent = `
        <div style="text-align: center; padding: 40px 0; border-bottom: 1px solid #ddd; margin-bottom: 30px;">
          <h2 style="font-size: 1.8em; margin-bottom: 10px;">${chapter.title}</h2>
          <p style="color: #666; font-style: italic;">${chapter.subtitle}</p>
        </div>
      `

      // Sort stories by question_id to maintain consistent order
      storiesWithContent.sort((a, b) => a.question_id.localeCompare(b.question_id))

      for (const story of storiesWithContent) {
        if (!story?.answer?.trim()) continue

        // Convert answer to HTML paragraphs with XSS protection
        const paragraphs = story.answer
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p)
          .map(p => `<p style="margin-bottom: 1em; line-height: 1.6;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
          .join('')

        chapterContent += `
          <div style="margin-bottom: 40px;">
            <div style="color: #444;">
              ${paragraphs}
            </div>
          </div>
        `
      }

      epubChapters.push({
        title: chapter.title,
        content: chapterContent
      })
    }

    // End page
    epubChapters.push({
      title: 'The End',
      content: `
        <div style="text-align: center; padding: 100px 20px;">
          <p style="font-style: italic; color: #666; font-size: 1.2em;">"Every life is a story worth telling."</p>
          <p style="margin-top: 40px; color: #999;">Created with EasyMemoir</p>
        </div>
      `
    })

    // Generate EPUB - dynamically import to ensure polyfills are loaded first
    const { default: Epub } = await import('epub-gen-memory')

    const options = {
      title: `${safeUserName}'s Life Story`,
      author: safeUserName,
      publisher: 'EasyMemoir',
      cover: null, // Could add cover image later
      css: `
        body { font-family: Georgia, serif; line-height: 1.6; }
        h1, h2, h3 { font-family: Georgia, serif; }
        p { text-indent: 0; margin-bottom: 1em; }
      `,
      content: epubChapters
    }

    const epubBuffer = await Epub(options)

    // Set headers for download
  res.setHeader('Content-Type', 'application/epub+zip')
  res.setHeader('Content-Disposition', `attachment; filename="${userName.replace(/[^a-zA-Z0-9]/g, '_')}_Life_Story.epub"`)
  res.send(Buffer.from(epubBuffer))
}))

// Check export status/eligibility
router.get('/status', requireDb, asyncHandler(async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  // Check user's subscription/payment status
  const userResult = await db.query(`
      SELECT u.*,
        (SELECT COUNT(*) FROM stories WHERE user_id = u.id AND answer IS NOT NULL AND answer != '') as story_count
      FROM users u WHERE u.id = $1
    `, [userId])

    const user = userResult.rows[0]
    const storyCount = parseInt(user.story_count) || 0

    // Check if user has paid for export
    const paymentResult = await db.query(`
      SELECT * FROM payments
      WHERE user_id = $1 AND product_type = 'export' AND status = 'completed'
      ORDER BY created_at DESC LIMIT 1
    `, [userId])

    const hasPaid = paymentResult.rows.length > 0

    // Early adopter check (first 100 users get free export)
    const earlyAdopterResult = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE id <= $1
    `, [userId])
    const isEarlyAdopter = parseInt(earlyAdopterResult.rows[0].count) <= 100

  res.json({
    storyCount,
    canExport: hasPaid || isEarlyAdopter,
    isEarlyAdopter,
    hasPaid,
    exportPrice: 9.99 // Price for non-early adopters
  })
}))

export default router

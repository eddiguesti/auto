import { Router } from 'express'
import Epub from 'epub-gen-memory'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load chapters data - we duplicate the structure here to avoid complex imports
const chapters = [
  { id: 'earliest-memories', title: 'Earliest Memories', subtitle: 'Ages 0-5' },
  { id: 'childhood', title: 'Childhood', subtitle: 'Ages 6-12' },
  { id: 'school-days', title: 'School Days', subtitle: 'Education Years' },
  { id: 'teenage-years', title: 'Teenage Years', subtitle: 'Coming of Age' },
  { id: 'young-adulthood', title: 'Young Adulthood', subtitle: 'Starting Out' },
  { id: 'family-career', title: 'Family & Career', subtitle: 'Building a Life' },
  { id: 'wisdom-reflections', title: 'Wisdom & Reflections', subtitle: 'Looking Back' }
]

const router = Router()

// Generate EPUB eBook
router.get('/epub', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    // Get user settings for name
    const settingsResult = await db.query('SELECT name FROM settings WHERE user_id = $1', [userId])
    const userName = settingsResult.rows[0]?.name || 'My'

    // Get all stories
    const storiesResult = await db.query(`
      SELECT s.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'filename', p.filename, 'caption', p.caption)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as photos
      FROM stories s
      LEFT JOIN photos p ON p.story_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id
    `, [userId])

    // Organize stories by chapter
    const stories = {}
    storiesResult.rows.forEach(story => {
      if (!stories[story.chapter_id]) {
        stories[story.chapter_id] = {}
      }
      stories[story.chapter_id][story.question_id] = story
    })

    // Build EPUB content
    const epubChapters = []

    // Title page
    epubChapters.push({
      title: 'Title Page',
      content: `
        <div style="text-align: center; padding: 100px 20px;">
          <h1 style="font-size: 2.5em; margin-bottom: 20px;">${userName}'s Life Story</h1>
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

        // Convert answer to HTML paragraphs
        const paragraphs = story.answer
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p)
          .map(p => `<p style="margin-bottom: 1em; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`)
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

    // Generate EPUB
    const options = {
      title: `${userName}'s Life Story`,
      author: userName,
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

  } catch (err) {
    console.error('EPUB generation error:', err)
    res.status(500).json({ error: 'Failed to generate eBook' })
  }
})

// Check export status/eligibility
router.get('/status', async (req, res) => {
  const db = req.app.locals.db
  const userId = req.user.id

  try {
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
  } catch (err) {
    console.error('Export status error:', err)
    res.status(500).json({ error: 'Failed to check export status' })
  }
})

export default router

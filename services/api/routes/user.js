import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import { authLogger } from '../utils/logger.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Export all user data (GDPR compliant)
router.get(
  '/export-data',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    authLogger.info('User data export requested', { userId, requestId: req.id })

    // Fetch user profile
    const userResult = await db.query(
      'SELECT id, email, name, birth_year, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    // Fetch all data in parallel with LIMIT caps
    const [
      storiesResult,
      imagesResult,
      gameResult,
      photosResult,
      onboardingResult,
      styleResult,
      coverResult,
      achievementsResult,
      entitiesResult
    ] = await Promise.all([
      db.query(
        `SELECT chapter_id, question_id, answer, original_answer, style_applied, created_at, updated_at
         FROM stories WHERE user_id = $1
         ORDER BY chapter_id, question_id LIMIT 10000`,
        [userId]
      ),
      db.query(
        `SELECT chapter_id, image_url, prompt_used, generation_status, created_at
         FROM chapter_images WHERE user_id = $1 LIMIT 1000`,
        [userId]
      ),
      db.query(
        `SELECT current_streak, longest_streak, total_memories, daily_prompt_completed_today,
                game_mode_enabled, created_at, updated_at
         FROM user_game_state WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT p.filename, p.original_name, p.caption, s.chapter_id, p.created_at
         FROM photos p
         JOIN stories s ON p.story_id = s.id
         WHERE s.user_id = $1 LIMIT 5000`,
        [userId]
      ),
      db.query(
        `SELECT input_preference, birth_place, birth_country, birth_year,
                additional_context, onboarding_completed, created_at
         FROM user_onboarding WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT tones, narrative, author_style, applied_at, created_at
         FROM user_style_preferences WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT template_id, title, author, front_cover_url, back_cover_url,
                color_scheme, created_at
         FROM book_covers WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT achievement_type, achievement_key, achievement_name,
                achievement_description, earned_at
         FROM achievements WHERE user_id = $1
         ORDER BY earned_at DESC LIMIT 1000`,
        [userId]
      ),
      db.query(
        `SELECT entity_type, name, description, first_mentioned_chapter, mention_count
         FROM memory_entities WHERE user_id = $1
         ORDER BY mention_count DESC LIMIT 5000`,
        [userId]
      )
    ])

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
        birthYear: user.birth_year,
        avatarUrl: user.avatar_url,
        accountCreated: user.created_at
      },
      stories: storiesResult.rows.map(s => ({
        chapterId: s.chapter_id,
        questionId: s.question_id,
        answer: s.answer,
        originalAnswer: s.original_answer,
        styleApplied: s.style_applied,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      })),
      chapterImages: imagesResult.rows.map(i => ({
        chapterId: i.chapter_id,
        imageUrl: i.image_url,
        prompt: i.prompt_used,
        status: i.generation_status,
        createdAt: i.created_at
      })),
      photos: photosResult.rows.map(p => ({
        filename: p.filename,
        originalName: p.original_name,
        caption: p.caption,
        chapterId: p.chapter_id,
        createdAt: p.created_at
      })),
      achievements: achievementsResult.rows.map(a => ({
        type: a.achievement_type,
        key: a.achievement_key,
        name: a.achievement_name,
        description: a.achievement_description,
        earnedAt: a.earned_at
      })),
      memoryEntities: entitiesResult.rows.map(e => ({
        type: e.entity_type,
        name: e.name,
        description: e.description,
        firstMentionedChapter: e.first_mentioned_chapter,
        mentionCount: e.mention_count
      })),
      gameProgress: gameResult.rows[0] || null,
      onboarding: onboardingResult.rows[0] || null,
      stylePreferences: styleResult.rows[0] || null,
      coverDesign: coverResult.rows[0] || null
    }

    authLogger.info('User data export completed', { userId, requestId: req.id })
    res.json(exportData)
  })
)

// Delete user account and all associated data
router.delete(
  '/delete-account',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    authLogger.info('Account deletion requested', { userId, requestId: req.id })

    // Start transaction for atomic deletion
    const client = await db.connect()

    try {
      await client.query('BEGIN')

      // Delete in order respecting foreign key constraints

      // Delete related records from tables with story references first
      await client.query(
        `
        DELETE FROM memory_mentions WHERE story_id IN (SELECT id FROM stories WHERE user_id = $1)
      `,
        [userId]
      )
      await client.query(
        `
        DELETE FROM photos WHERE story_id IN (SELECT id FROM stories WHERE user_id = $1)
      `,
        [userId]
      )
      await client.query(
        `
        DELETE FROM followups WHERE story_id IN (SELECT id FROM stories WHERE user_id = $1)
      `,
        [userId]
      )

      // Delete memory relationships (depends on memory_entities)
      await client.query(
        `
        DELETE FROM memory_relationships WHERE entity1_id IN (SELECT id FROM memory_entities WHERE user_id = $1)
           OR entity2_id IN (SELECT id FROM memory_entities WHERE user_id = $1)
      `,
        [userId]
      )

      // Delete memory entities
      await client.query('DELETE FROM memory_entities WHERE user_id = $1', [userId])

      // Delete stories
      await client.query('DELETE FROM stories WHERE user_id = $1', [userId])

      // Delete chapter images
      await client.query('DELETE FROM chapter_images WHERE user_id = $1', [userId])

      // Delete user game state
      await client.query('DELETE FROM user_game_state WHERE user_id = $1', [userId])

      // Delete daily prompts
      await client.query('DELETE FROM daily_prompts WHERE user_id = $1', [userId])

      // Delete achievements
      await client.query('DELETE FROM achievements WHERE user_id = $1', [userId])

      // Delete user collection progress
      await client.query('DELETE FROM user_collection_progress WHERE user_id = $1', [userId])

      // Delete streak history
      await client.query('DELETE FROM streak_history WHERE user_id = $1', [userId])

      // Delete family encouragements
      await client.query(
        'DELETE FROM family_encouragements WHERE for_user_id = $1 OR from_user_id = $1',
        [userId]
      )

      // Delete family prompts
      await client.query('DELETE FROM family_prompts WHERE for_user_id = $1 OR from_user_id = $1', [
        userId
      ])

      // Delete memory circle memberships
      await client.query('DELETE FROM memory_circle_members WHERE user_id = $1', [userId])

      // Delete owned memory circles (cascade will handle members)
      await client.query('DELETE FROM memory_circles WHERE owner_user_id = $1', [userId])

      // Delete onboarding data
      await client.query('DELETE FROM user_onboarding WHERE user_id = $1', [userId])

      // Delete user style preferences
      await client.query('DELETE FROM user_style_preferences WHERE user_id = $1', [userId])

      // Delete book covers
      await client.query('DELETE FROM book_covers WHERE user_id = $1', [userId])

      // Delete voice models
      await client.query('DELETE FROM voice_models WHERE user_id = $1', [userId])

      // Delete audiobooks
      await client.query('DELETE FROM audiobooks WHERE user_id = $1', [userId])

      // Delete payments
      await client.query('DELETE FROM payments WHERE user_id = $1', [userId])

      // Delete notification queue
      await client.query('DELETE FROM notification_queue WHERE user_id = $1', [userId])

      // Delete telegram sessions and messages (via telegram_users)
      await client.query(
        `
        DELETE FROM telegram_sessions WHERE telegram_user_id IN (SELECT id FROM telegram_users WHERE user_id = $1)
      `,
        [userId]
      )
      await client.query(
        `
        DELETE FROM telegram_messages WHERE telegram_user_id IN (SELECT id FROM telegram_users WHERE user_id = $1)
      `,
        [userId]
      )
      await client.query('DELETE FROM telegram_users WHERE user_id = $1', [userId])

      // Delete settings
      await client.query('DELETE FROM settings WHERE user_id = $1', [userId])

      // Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId])

      await client.query('COMMIT')

      authLogger.info('Account deleted successfully', { userId, requestId: req.id })
      res.json({ success: true, message: 'Account deleted successfully' })
    } catch (err) {
      await client.query('ROLLBACK')
      authLogger.error('Account deletion failed', {
        userId,
        error: err.message,
        requestId: req.id
      })
      throw err
    } finally {
      client.release()
    }
  })
)

export default router

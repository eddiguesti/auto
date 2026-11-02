import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireDb } from '../middleware/requireDb.js'
import validate from '../middleware/validate.js'
import { userSchemas } from '../schemas/index.js'
import { authLogger } from '../utils/logger.js'
import { scheduleAccountMediaDeletion } from '../services/mediaDeletion.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Update phone call settings
router.put(
  '/phone-settings',
  requireDb,
  validate(userSchemas.phoneSettings),
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id
    const { phoneNumber, phoneCallConsent, contactPreference } = req.validatedBody

    await db.query(
      `UPDATE users SET
        phone_number = COALESCE($2, phone_number),
        phone_call_consent = COALESCE($3, phone_call_consent),
        contact_preference = COALESCE($4, contact_preference),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, phoneNumber || null, phoneCallConsent ?? null, contactPreference || null]
    )

    // Return current settings
    const result = await db.query(
      `SELECT phone_number, phone_call_consent, contact_preference FROM users WHERE id = $1`,
      [userId]
    )

    res.json({
      phone_number: result.rows[0]?.phone_number,
      phone_call_consent: result.rows[0]?.phone_call_consent,
      contact_preference: result.rows[0]?.contact_preference
    })
  })
)

// Get current phone settings
router.get(
  '/phone-settings',
  requireDb,
  asyncHandler(async (req, res) => {
    const db = req.app.locals.db
    const userId = req.user.id

    const result = await db.query(
      `SELECT phone_number, phone_call_consent, contact_preference FROM users WHERE id = $1`,
      [userId]
    )

    res.json({
      phone_number: result.rows[0]?.phone_number || null,
      phone_call_consent: result.rows[0]?.phone_call_consent || false,
      contact_preference: result.rows[0]?.contact_preference || 'email'
    })
  })
)

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
      'SELECT id, email, name, birth_year, avatar_url, premium_until, email_verified, phone_number, phone_call_consent, contact_preference, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    // Each owned group is complete. Authentication credentials and unconsumed
    // login/reset tokens are deliberately excluded from a personal-data export.
    const groups = {
      stories: 'SELECT * FROM stories WHERE user_id=$1 ORDER BY chapter_id, question_id',
      chapterReviews: 'SELECT * FROM chapter_reviews WHERE user_id=$1',
      freeStories: 'SELECT * FROM free_stories WHERE user_id=$1 ORDER BY created_at, id',
      memos: 'SELECT * FROM memos WHERE user_id=$1 ORDER BY created_at, id',
      voiceUploads: 'SELECT * FROM voice_uploads WHERE user_id=$1',
      voiceSessions: 'SELECT * FROM voice_sessions WHERE user_id=$1 ORDER BY id',
      phoneCalls: 'SELECT * FROM telnyx_calls WHERE user_id=$1 ORDER BY id',
      photos:
        'SELECT p.* FROM photos p LEFT JOIN stories s ON s.id=p.story_id WHERE p.user_id=$1 OR s.user_id=$1 ORDER BY p.id',
      chapterImages: 'SELECT * FROM chapter_images WHERE user_id=$1',
      coverDesigns: 'SELECT * FROM book_covers WHERE user_id=$1',
      settings: 'SELECT * FROM settings WHERE user_id=$1',
      gameProgress: 'SELECT * FROM user_game_state WHERE user_id=$1',
      onboarding: 'SELECT * FROM user_onboarding WHERE user_id=$1',
      stylePreferences: 'SELECT * FROM user_style_preferences WHERE user_id=$1',
      achievements: 'SELECT * FROM achievements WHERE user_id=$1 ORDER BY earned_at',
      memoryEntities: 'SELECT * FROM memory_entities WHERE user_id=$1',
      memoryRelationships:
        'SELECT r.* FROM memory_relationships r JOIN memory_entities e ON e.id=r.entity1_id WHERE e.user_id=$1',
      memoryMentions:
        'SELECT m.* FROM memory_mentions m JOIN memory_entities e ON e.id=m.entity_id WHERE e.user_id=$1',
      dailyPrompts: 'SELECT * FROM daily_prompts WHERE user_id=$1',
      familyPrompts: 'SELECT * FROM family_prompts WHERE from_user_id=$1 OR for_user_id=$1',
      familyEncouragements:
        'SELECT * FROM family_encouragements WHERE from_user_id=$1 OR for_user_id=$1',
      circleMemberships: 'SELECT * FROM memory_circle_members WHERE user_id=$1',
      collectionProgress: 'SELECT * FROM user_collection_progress WHERE user_id=$1',
      streakHistory: 'SELECT * FROM streak_history WHERE user_id=$1',
      payments:
        'SELECT id, product_id, product_type, amount, currency, status, created_at FROM payments WHERE user_id=$1',
      refundRequests: 'SELECT * FROM refund_requests WHERE user_id=$1',
      printOrders: 'SELECT * FROM print_orders WHERE user_id=$1',
      voiceSamples:
        'SELECT fish_model_id, consent_given, created_at FROM voice_models WHERE user_id=$1',
      audiobooks: 'SELECT * FROM audiobooks WHERE user_id=$1',
      generatedExports: 'SELECT * FROM generated_exports WHERE user_id=$1',
      audiobookRequests: 'SELECT * FROM audiobook_generation_requests WHERE user_id=$1',
      printEntitlements: 'SELECT * FROM print_entitlements WHERE user_id=$1',
      aiUsage: 'SELECT * FROM ai_usage WHERE user_id=$1',
      ownedCircles: 'SELECT * FROM memory_circles WHERE owner_user_id=$1',
      followUps: 'SELECT f.* FROM followups f JOIN stories s ON s.id=f.story_id WHERE s.user_id=$1',
      paymentEvents: 'SELECT * FROM payments_audit_log WHERE user_id=$1',
      notifications: 'SELECT * FROM notification_queue WHERE user_id=$1',
      telegramMessages:
        'SELECT m.* FROM telegram_messages m JOIN telegram_users u ON u.id=m.telegram_user_id WHERE u.user_id=$1',
      telegramSessions:
        'SELECT s.* FROM telegram_sessions s JOIN telegram_users u ON u.id=s.telegram_user_id WHERE u.user_id=$1'
    }
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        ...user,
        birthYear: user.birth_year,
        avatarUrl: user.avatar_url,
        accountCreated: user.created_at
      },
      excluded: ['Password hashes and authentication tokens'],
      ...Object.fromEntries(
        await Promise.all(
          Object.entries(groups).map(async ([name, sql]) => [
            name,
            (await db.query(sql, [userId])).rows
          ])
        )
      )
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
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId])
      await scheduleAccountMediaDeletion(client, userId)
      // These non-cascading story references must be removed before stories.
      await client.query(
        'DELETE FROM family_encouragements WHERE for_user_id=$1 OR from_user_id=$1 OR related_story_id IN (SELECT id FROM stories WHERE user_id=$1)',
        [userId]
      )
      await client.query(
        'DELETE FROM family_prompts WHERE for_user_id=$1 OR from_user_id=$1 OR answered_story_id IN (SELECT id FROM stories WHERE user_id=$1)',
        [userId]
      )
      await client.query(
        'DELETE FROM daily_prompts WHERE user_id=$1 OR answer_story_id IN (SELECT id FROM stories WHERE user_id=$1)',
        [userId]
      )

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
        DELETE FROM photos WHERE user_id=$1 OR story_id IN (SELECT id FROM stories WHERE user_id = $1)
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

      // Delete free stories
      await client.query('DELETE FROM free_stories WHERE user_id = $1', [userId])

      // Delete book covers
      await client.query('DELETE FROM book_covers WHERE user_id = $1', [userId])

      // Delete voice models
      await client.query('DELETE FROM voice_models WHERE user_id = $1', [userId])

      // Delete audiobooks
      await client.query('DELETE FROM audiobooks WHERE user_id = $1', [userId])

      // Delete payments
      await client.query('DELETE FROM payments WHERE user_id = $1', [userId])

      // Delete lulu order tracking
      await client.query('DELETE FROM lulu_orders WHERE user_id = $1', [userId])

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

      // Authentication rejects every token whose account no longer exists.
      // No post-commit revocation write can turn a successful delete into a 500.
      authLogger.info('Account deleted successfully', { userId, requestId: req.id })
      res.json({
        success: true,
        mediaCleanup: 'scheduled',
        message: 'Account deleted. Stored media removal is scheduled.'
      })
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

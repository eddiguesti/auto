// /life-story/server/routes/game.js

import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createDailyPrompt } from '../utils/promptSelector.js';
import { recordActivity, syncMemoryCounts } from '../utils/gameStateManager.js';
import { generateUniqueInviteCode } from '../utils/inviteCode.js';
import validate from '../middleware/validate.js';
import { gameSchemas } from '../schemas/index.js';
import cache, { cacheKeys, invalidateUserCache } from '../utils/cache.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('game');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/game/state
 * Get user's complete game state including streak, stats, and settings
 */
router.get('/state', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // OPTIMIZED: Run all queries in parallel instead of sequentially
  const [
    gameState,
    todayPrompt,
    recentAchievements,
    memoryCounts,
    entityCounts,
    collectionProgress,
    familyCircle,
    pendingFamilyPrompts
  ] = await Promise.all([
    // Get or create game state
    getOrCreateGameState(userId),

    // Get today's prompt status
    pool.query(
      `SELECT id, prompt_text, prompt_hint, prompt_type, prompt_category, status
       FROM daily_prompts
       WHERE user_id = $1 AND prompt_date = $2`,
      [userId, today]
    ),

    // Get recent achievements (unseen)
    pool.query(
      `SELECT achievement_key, achievement_name, achievement_description, achievement_icon, earned_at
       FROM achievements
       WHERE user_id = $1 AND seen_by_user = false
       ORDER BY earned_at DESC
       LIMIT 5`,
      [userId]
    ),

    // Get memory counts
    pool.query(
      `SELECT
         COUNT(*) as total_stories,
         COUNT(DISTINCT chapter_id) as chapters_started
       FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
      [userId]
    ),

    // Get people and places from memory graph
    pool.query(
      `SELECT entity_type, COUNT(*) as count
       FROM memory_entities
       WHERE user_id = $1
       GROUP BY entity_type`,
      [userId]
    ),

    // Get collection progress summary
    pool.query(
      `SELECT
         c.collection_key,
         c.collection_name,
         c.collection_icon,
         c.required_items,
         COALESCE(ucp.items_completed, 0) as items_completed,
         COALESCE(ucp.is_complete, false) as is_complete
       FROM collections c
       LEFT JOIN user_collection_progress ucp ON c.id = ucp.collection_id AND ucp.user_id = $1
       WHERE c.is_active = true
       ORDER BY c.display_order`,
      [userId]
    ),

    // Get family circle info if exists
    pool.query(
      `SELECT mc.id, mc.circle_name,
         (SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = mc.id) as member_count
       FROM memory_circles mc
       WHERE mc.owner_user_id = $1
       UNION
       SELECT mc.id, mc.circle_name,
         (SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = mc.id) as member_count
       FROM memory_circle_members mcm
       JOIN memory_circles mc ON mcm.circle_id = mc.id
       WHERE mcm.user_id = $1`,
      [userId]
    ),

    // Get pending family prompts
    pool.query(
      `SELECT COUNT(*) as count
       FROM family_prompts
       WHERE for_user_id = $1 AND status = 'pending'`,
      [userId]
    )
  ]);

  const entities = {};
  entityCounts.rows.forEach(row => {
    entities[row.entity_type] = parseInt(row.count);
  });

  res.json({
    success: true,
    data: {
      gameMode: {
        enabled: gameState.game_mode_enabled,
        canSwitch: true
      },
      streak: {
        current: gameState.current_streak,
        longest: gameState.longest_streak,
        lastActivity: gameState.last_activity_date,
        shieldsAvailable: gameState.streak_shields_available,
        shieldsUsedThisWeek: gameState.streak_shields_used_this_week
      },
      todaysPrompt: todayPrompt.rows[0] || null,
      stats: {
        totalMemories: parseInt(memoryCounts.rows[0]?.total_stories || 0),
        chaptersStarted: parseInt(memoryCounts.rows[0]?.chapters_started || 0),
        peopleCount: entities.person || 0,
        placesCount: entities.place || 0,
        promptsCompletedThisWeek: gameState.prompts_completed_this_week
      },
      collections: collectionProgress.rows,
      recentAchievements: recentAchievements.rows,
      familyCircle: familyCircle.rows[0] || null,
      pendingFamilyPrompts: parseInt(pendingFamilyPrompts.rows[0]?.count || 0),
      settings: {
        notificationPreferences: gameState.notification_preferences,
        preferredPromptTime: gameState.preferred_prompt_time,
        timezone: gameState.timezone
      }
    }
  });
}));

/**
 * POST /api/game/enable
 * Enable game mode for user
 */
router.post('/enable', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await pool.query(
    `UPDATE user_game_state
     SET game_mode_enabled = true, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  invalidateUserCache(userId);
  res.json({ success: true, message: 'Memory Quest mode enabled' });
}));

/**
 * POST /api/game/disable
 * Disable game mode (return to classic mode)
 */
router.post('/disable', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await pool.query(
    `UPDATE user_game_state
     SET game_mode_enabled = false, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  invalidateUserCache(userId);
  res.json({ success: true, message: 'Returned to Classic mode' });
}));

/**
 * PUT /api/game/settings
 * Update game settings
 */
router.put('/settings', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notificationPreferences, preferredPromptTime, timezone } = req.body;

  const updates = [];
  const values = [userId];
  let paramIndex = 2;

  if (notificationPreferences !== undefined) {
    updates.push(`notification_preferences = $${paramIndex++}`);
    values.push(JSON.stringify(notificationPreferences));
  }

  if (preferredPromptTime !== undefined) {
    updates.push(`preferred_prompt_time = $${paramIndex++}`);
    values.push(preferredPromptTime);
  }

  if (timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(timezone);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE user_game_state SET ${updates.join(', ')} WHERE user_id = $1`,
      values
    );
    invalidateUserCache(userId);
  }

  res.json({ success: true, message: 'Settings updated' });
}));

/**
 * POST /api/game/streak/use-shield
 * Use a streak shield to protect streak after missing a day
 */
router.post('/streak/use-shield', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if user has shields available
  const state = await pool.query(
    `SELECT streak_shields_available, current_streak
     FROM user_game_state
     WHERE user_id = $1`,
    [userId]
  );

  if (!state.rows[0] || state.rows[0].streak_shields_available < 1) {
    return res.status(400).json({
      success: false,
      message: 'No streak shields available'
    });
  }

  // Use shield
  await pool.query(
    `UPDATE user_game_state
     SET streak_shields_available = streak_shields_available - 1,
         streak_shields_used_this_week = streak_shields_used_this_week + 1,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  // Record in history
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  await pool.query(
    `INSERT INTO streak_history (user_id, date, had_activity, streak_on_this_day, shield_used)
     VALUES ($1, $2, false, $3, true)
     ON CONFLICT (user_id, date) DO UPDATE SET shield_used = true`,
    [userId, yesterdayStr, state.rows[0].current_streak]
  );

  res.json({
    success: true,
    message: 'Streak shield activated',
    shieldsRemaining: state.rows[0].streak_shields_available - 1
  });
}));

/**
 * GET /api/game/streak/history
 * Get streak history for visualization
 */
router.get('/streak/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Validate and sanitize days parameter (between 1 and 365)
  const rawDays = parseInt(req.query.days) || 30;
  const days = Math.min(Math.max(rawDays, 1), 365);

  const history = await pool.query(
    `SELECT date, had_activity, streak_on_this_day, shield_used, prompt_completed
     FROM streak_history
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT $2`,
    [userId, days]
  );

  res.json({
    success: true,
    data: history.rows
  });
}));

/**
 * POST /api/game/achievements/mark-seen
 * Mark achievements as seen by user
 */
router.post('/achievements/mark-seen', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { achievementKeys } = req.body;

  if (achievementKeys && achievementKeys.length > 0) {
    await pool.query(
      `UPDATE achievements
       SET seen_by_user = true
       WHERE user_id = $1 AND achievement_key = ANY($2)`,
      [userId, achievementKeys]
    );
  }

  res.json({ success: true });
}));

/**
 * GET /api/game/achievements
 * Get all achievements for user
 */
router.get('/achievements', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const achievements = await pool.query(
    `SELECT achievement_key, achievement_name, achievement_description,
            achievement_icon, achievement_type, earned_at, seen_by_user
     FROM achievements
     WHERE user_id = $1
     ORDER BY earned_at DESC`,
    [userId]
  );

  res.json({
    success: true,
    data: achievements.rows
  });
}));

// Helper function to get or create game state
async function getOrCreateGameState(userId) {
  // Try to get existing state
  let result = await pool.query(
    `SELECT * FROM user_game_state WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Create new game state
    result = await pool.query(
      `INSERT INTO user_game_state (user_id)
       VALUES ($1)
       RETURNING *`,
      [userId]
    );
  }

  return result.rows[0];
}

// Export helper for use in other routes
export { getOrCreateGameState };

// ==================== MEMOIR PROGRESS ENDPOINTS ====================

/**
 * GET /api/game/memoir-progress
 * Get detailed memoir progress - which chapters/questions are complete
 * This allows the app to know where the user is in their memoir journey
 */
router.get('/memoir-progress', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Define chapter structure (matches client/src/data/chapters.js)
  const chapters = [
    { id: 'earliest-memories', title: 'Earliest Memories', subtitle: 'Ages 0-5', totalQuestions: 8 },
    { id: 'childhood', title: 'Childhood', subtitle: 'Ages 6-12', totalQuestions: 10 },
    { id: 'school-days', title: 'School Days', subtitle: 'Education Years', totalQuestions: 10 },
    { id: 'teenage-years', title: 'Teenage Years', subtitle: 'Coming of Age', totalQuestions: 11 },
    { id: 'key-people', title: 'Key People', subtitle: 'Those Who Shaped You', totalQuestions: 8 },
    { id: 'young-adulthood', title: 'Young Adulthood', subtitle: 'Starting Out', totalQuestions: 10 },
    { id: 'family-career', title: 'Family & Career', subtitle: 'Building a Life', totalQuestions: 10 },
    { id: 'world-around-you', title: 'The World Around You', subtitle: 'History & Culture', totalQuestions: 8 },
    { id: 'passions-beliefs', title: 'Passions & Beliefs', subtitle: 'What Matters to You', totalQuestions: 8 },
    { id: 'wisdom-reflections', title: 'Wisdom & Reflections', subtitle: 'Looking Back', totalQuestions: 10 }
  ];

  // Get answered questions per chapter
  const answeredResult = await pool.query(
    `SELECT chapter_id, question_id,
            CASE WHEN answer IS NOT NULL AND answer != '' THEN true ELSE false END as is_answered
     FROM stories
     WHERE user_id = $1`,
    [userId]
  );

  // Build progress map
  const answeredMap = {};
  answeredResult.rows.forEach(row => {
    if (!answeredMap[row.chapter_id]) {
      answeredMap[row.chapter_id] = { answered: [], total: 0 };
    }
    if (row.is_answered) {
      answeredMap[row.chapter_id].answered.push(row.question_id);
    }
  });

  // Calculate progress for each chapter
  const chapterProgress = chapters.map(chapter => {
    const progress = answeredMap[chapter.id] || { answered: [], total: 0 };
    const completedCount = progress.answered.length;
    const percentage = Math.round((completedCount / chapter.totalQuestions) * 100);

    return {
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      totalQuestions: chapter.totalQuestions,
      completedQuestions: completedCount,
      percentage,
      status: percentage === 100 ? 'complete' : percentage > 0 ? 'in_progress' : 'not_started',
      answeredQuestionIds: progress.answered
    };
  });

  // Calculate overall memoir progress
  const totalQuestions = chapters.reduce((sum, c) => sum + c.totalQuestions, 0);
  const totalAnswered = chapterProgress.reduce((sum, c) => sum + c.completedQuestions, 0);
  const overallPercentage = Math.round((totalAnswered / totalQuestions) * 100);

  // Identify gaps - chapters that need attention
  const gaps = chapterProgress
    .filter(c => c.status !== 'complete')
    .sort((a, b) => {
      // Prioritize chapters that are in progress but incomplete
      if (a.status === 'in_progress' && b.status === 'not_started') return -1;
      if (a.status === 'not_started' && b.status === 'in_progress') return 1;
      // Then by percentage (lower first)
      return a.percentage - b.percentage;
    })
    .slice(0, 3)
    .map(c => ({
      chapterId: c.id,
      chapterTitle: c.title,
      reason: c.status === 'not_started'
        ? `You haven't started "${c.title}" yet`
        : `"${c.title}" is ${c.percentage}% complete`
    }));

  res.json({
    success: true,
    data: {
      overall: {
        totalQuestions,
        answeredQuestions: totalAnswered,
        percentage: overallPercentage,
        chaptersComplete: chapterProgress.filter(c => c.status === 'complete').length,
        chaptersInProgress: chapterProgress.filter(c => c.status === 'in_progress').length,
        chaptersNotStarted: chapterProgress.filter(c => c.status === 'not_started').length
      },
      chapters: chapterProgress,
      suggestedGaps: gaps,
      nextRecommendedChapter: gaps[0]?.chapterId || null
    }
  });
}));

// ==================== DAILY PROMPT ENDPOINTS ====================

/**
 * GET /api/game/prompt/today
 * Get today's prompt (creates one if doesn't exist)
 */
router.get('/prompt/today', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get or create today's prompt
  const prompt = await createDailyPrompt(userId);

  res.json({
    success: true,
    data: {
      id: prompt.id,
      date: prompt.prompt_date,
      type: prompt.prompt_type,
      category: prompt.prompt_category,
      text: prompt.prompt_text,
      hint: prompt.prompt_hint,
      linkedChapter: prompt.linked_chapter_id,
      linkedQuestion: prompt.linked_question_id,
      status: prompt.status,
      estimatedMinutes: prompt.prompt_type === 'quick' ? 2 : prompt.prompt_type === 'story' ? 7 : 12
    }
  });
}));

/**
 * POST /api/game/prompt/:promptId/complete
 * Complete a daily prompt with an answer
 */
router.post('/prompt/:promptId/complete', validate(gameSchemas.completePrompt), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { promptId } = req.validatedParams;
  const { answer } = req.validatedBody;

  // Get the prompt
  const prompt = await pool.query(
    `SELECT * FROM daily_prompts WHERE id = $1 AND user_id = $2`,
    [promptId, userId]
  );

  if (prompt.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Prompt not found'
    });
  }

  const promptData = prompt.rows[0];

  if (promptData.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Prompt already completed'
    });
  }

  const startTime = promptData.created_at;
  const endTime = new Date();
  const timeToComplete = Math.round((endTime - new Date(startTime)) / 1000);
  const wordCount = answer.trim().split(/\s+/).length;

  // Start transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Save the answer to stories table if linked to a question
    let storyId = null;
    if (promptData.linked_chapter_id && promptData.linked_question_id) {
      const storyResult = await client.query(
        `INSERT INTO stories (user_id, chapter_id, question_id, answer)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, chapter_id, question_id)
         DO UPDATE SET answer = EXCLUDED.answer, updated_at = NOW()
         RETURNING id`,
        [userId, promptData.linked_chapter_id, promptData.linked_question_id, answer]
      );
      storyId = storyResult.rows[0].id;
    } else {
      // Save as a standalone story entry
      const storyResult = await client.query(
        `INSERT INTO stories (user_id, chapter_id, question_id, answer)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 'daily-prompts', `prompt-${promptId}`, answer]
      );
      storyId = storyResult.rows[0].id;
    }

    // Update the prompt status
    await client.query(
      `UPDATE daily_prompts
       SET status = 'completed',
           answered_at = NOW(),
           answer_story_id = $1,
           time_to_complete_seconds = $2,
           word_count = $3
       WHERE id = $4`,
      [storyId, timeToComplete, wordCount, promptId]
    );

    await client.query('COMMIT');

    // Invalidate cache since game state changed
    invalidateUserCache(userId);

    // Record activity and update streak (outside transaction)
    const streakResult = await recordActivity(userId);

    // Sync memory counts
    await syncMemoryCounts(userId);

    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(userId, {
      type: 'prompt_completed',
      streak: streakResult.currentStreak,
      wordCount
    });

    // Check collection progress
    if (promptData.linked_question_id) {
      await updateCollectionProgress(userId, promptData.linked_chapter_id, promptData.linked_question_id);
    }

    res.json({
      success: true,
      data: {
        storyId,
        streak: {
          current: streakResult.currentStreak,
          isNewRecord: streakResult.isNewRecord
        },
        stats: {
          timeToComplete,
          wordCount
        },
        newAchievements,
        celebration: {
          type: streakResult.isNewRecord ? 'new_record' : 'memory_saved',
          message: streakResult.isNewRecord
            ? `New record! ${streakResult.currentStreak} days in a row!`
            : 'Memory preserved forever.'
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

/**
 * POST /api/game/prompt/:promptId/skip
 * Skip today's prompt (preserves streak for grace period)
 */
router.post('/prompt/:promptId/skip', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { promptId } = req.params;
  const { reason } = req.body;

  // Update prompt status
  await pool.query(
    `UPDATE daily_prompts
     SET status = 'skipped',
         skipped_at = NOW(),
         skip_reason = $1
     WHERE id = $2 AND user_id = $3`,
    [reason || 'user_skipped', promptId, userId]
  );

  res.json({
    success: true,
    message: 'Prompt skipped. Complete tomorrow to maintain your streak!',
    streakAtRisk: true
  });
}));

/**
 * GET /api/game/prompts/history
 * Get history of past prompts
 */
router.get('/prompts/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Validate and sanitize pagination parameters
  const rawLimit = parseInt(req.query.limit) || 20;
  const rawOffset = parseInt(req.query.offset) || 0;
  const limit = Math.min(Math.max(rawLimit, 1), 100); // Max 100 items
  const offset = Math.max(rawOffset, 0);

  const prompts = await pool.query(
    `SELECT
       dp.id, dp.prompt_date, dp.prompt_type, dp.prompt_category,
       dp.prompt_text, dp.status, dp.answered_at, dp.word_count,
       s.answer
     FROM daily_prompts dp
     LEFT JOIN stories s ON dp.answer_story_id = s.id
     WHERE dp.user_id = $1
     ORDER BY dp.prompt_date DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const total = await pool.query(
    `SELECT COUNT(*) FROM daily_prompts WHERE user_id = $1`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      prompts: prompts.rows,
      total: parseInt(total.rows[0].count),
      limit,
      offset
    }
  });
}));

// ==================== HELPER FUNCTIONS ====================

// Helper function to check and award achievements
async function checkAndAwardAchievements(userId, context) {
  const newAchievements = [];

  try {
    // Get current stats
    const stats = await pool.query(
      `SELECT current_streak, longest_streak, total_memories
       FROM user_game_state
       WHERE user_id = $1`,
      [userId]
    );

    const { current_streak, total_memories } = stats.rows[0] || {};

    // Streak achievements
    const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
    for (const milestone of streakMilestones) {
      if (current_streak >= milestone) {
        const awarded = await awardAchievement(userId, `streak_${milestone}`);
        if (awarded) newAchievements.push(awarded);
      }
    }

    // Memory count achievements
    const memoryMilestones = [1, 10, 25, 50, 75, 100];
    for (const milestone of memoryMilestones) {
      if (total_memories >= milestone) {
        const awarded = await awardAchievement(userId, `memories_${milestone}`);
        if (awarded) newAchievements.push(awarded);
      }
    }

    return newAchievements;
  } catch (error) {
    logger.error('Error checking achievements', { error: error.message, userId });
    return [];
  }
}

// Helper function to award an achievement
async function awardAchievement(userId, achievementKey) {
  try {
    // Check if already earned
    const existing = await pool.query(
      `SELECT id FROM achievements WHERE user_id = $1 AND achievement_key = $2`,
      [userId, achievementKey]
    );

    if (existing.rows.length > 0) {
      return null; // Already has this achievement
    }

    // Get achievement definition
    const definitions = {
      'streak_3': { name: 'Getting Started', description: '3 days in a row', icon: 'flame', type: 'streak' },
      'streak_7': { name: 'One Week Wonder', description: '7 days in a row', icon: 'flame', type: 'streak' },
      'streak_14': { name: 'Fortnight of Memories', description: '14 days in a row', icon: 'flame', type: 'streak' },
      'streak_30': { name: 'Month of Memories', description: '30 days in a row', icon: 'flame', type: 'streak' },
      'streak_60': { name: 'Legacy Builder', description: '60 days in a row', icon: 'flame', type: 'streak' },
      'streak_100': { name: 'Century of Stories', description: '100 days in a row', icon: 'flame', type: 'streak' },
      'streak_365': { name: 'Year of Your Life', description: '365 days in a row', icon: 'flame', type: 'streak' },
      'memories_1': { name: 'First Memory', description: 'Your journey begins', icon: 'bookmark', type: 'milestone' },
      'memories_10': { name: 'Getting Warmed Up', description: '10 memories captured', icon: 'bookmark', type: 'milestone' },
      'memories_25': { name: 'Story Collector', description: '25 memories captured', icon: 'bookmark', type: 'milestone' },
      'memories_50': { name: 'Memory Keeper', description: '50 memories captured', icon: 'bookmark', type: 'milestone' },
      'memories_75': { name: 'Almost There', description: '75 memories captured', icon: 'bookmark', type: 'milestone' },
      'memories_100': { name: 'Century of Memories', description: '100 memories captured', icon: 'crown', type: 'milestone' },
      'collection_first': { name: 'Collector', description: 'Completed your first collection', icon: 'layers', type: 'collection' },
      'collection_half': { name: 'Avid Collector', description: 'Completed 4 collections', icon: 'layers', type: 'collection' },
      'collection_all': { name: 'Master Collector', description: 'Completed all collections', icon: 'award', type: 'collection' },
      'family_joined': { name: 'Family Connection', description: 'Joined a Memory Circle', icon: 'users', type: 'family' },
      'family_prompt': { name: 'Family Storyteller', description: 'Answered a family prompt', icon: 'heart', type: 'family' },
      'family_creator': { name: 'Circle Creator', description: 'Created a Memory Circle', icon: 'users', type: 'family' }
    };

    const def = definitions[achievementKey];
    if (!def) return null;

    // Award the achievement
    const result = await pool.query(
      `INSERT INTO achievements (user_id, achievement_key, achievement_name, achievement_description, achievement_icon, achievement_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, achievementKey, def.name, def.description, def.icon, def.type]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error awarding achievement', { error: error.message, userId, achievementKey });
    return null;
  }
}

// Helper function to update collection progress
async function updateCollectionProgress(userId, chapterId, questionId) {
  try {
    // Find collection items that match this question
    const matchingItems = await pool.query(
      `SELECT ci.id, ci.item_key, ci.collection_id, c.collection_key, c.required_items
       FROM collection_items ci
       JOIN collections c ON ci.collection_id = c.id
       WHERE ci.completion_type = 'question'
         AND ci.completion_criteria->>'chapter_id' = $1
         AND ci.completion_criteria->>'question_id' = $2`,
      [chapterId, questionId]
    );

    for (const item of matchingItems.rows) {
      // Get or create user progress for this collection
      const progress = await pool.query(
        `INSERT INTO user_collection_progress (user_id, collection_id, completed_items)
         VALUES ($1, $2, '[]')
         ON CONFLICT (user_id, collection_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [userId, item.collection_id]
      );

      const currentProgress = progress.rows[0];
      const completedItems = currentProgress.completed_items || [];

      // Add this item if not already completed
      if (!completedItems.includes(item.item_key)) {
        completedItems.push(item.item_key);
        const isComplete = completedItems.length >= item.required_items;

        await pool.query(
          `UPDATE user_collection_progress
           SET completed_items = $1,
               items_completed = $2,
               is_complete = $3,
               completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END,
               updated_at = NOW()
           WHERE user_id = $4 AND collection_id = $5`,
          [JSON.stringify(completedItems), completedItems.length, isComplete, userId, item.collection_id]
        );

        // Award collection achievement if completed
        if (isComplete) {
          await awardAchievement(userId, 'collection_first');

          // Check if all collections complete
          const allComplete = await pool.query(
            `SELECT COUNT(*) as complete_count
             FROM user_collection_progress
             WHERE user_id = $1 AND is_complete = true`,
            [userId]
          );

          if (parseInt(allComplete.rows[0].complete_count) >= 4) {
            await awardAchievement(userId, 'collection_half');
          }
          if (parseInt(allComplete.rows[0].complete_count) >= 8) {
            await awardAchievement(userId, 'collection_all');
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error updating collection progress', { error: error.message, userId, chapterId, questionId });
  }
}

// ==================== COLLECTIONS ENDPOINTS ====================

/**
 * GET /api/game/collections
 * Get all collections with user progress
 */
router.get('/collections', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const collections = await pool.query(
    `SELECT
       c.id,
       c.collection_key,
       c.collection_name,
       c.collection_description,
       c.collection_icon,
       c.required_items,
       c.reward_artwork_prompt,
       COALESCE(ucp.items_completed, 0) as items_completed,
       COALESCE(ucp.completed_items, '[]') as completed_items,
       COALESCE(ucp.is_complete, false) as is_complete,
       ucp.completed_at,
       ucp.reward_artwork_url
     FROM collections c
     LEFT JOIN user_collection_progress ucp
       ON c.id = ucp.collection_id AND ucp.user_id = $1
     WHERE c.is_active = true
     ORDER BY c.display_order`,
    [userId]
  );

  // OPTIMIZED: Fetch all items and stories in bulk instead of N+1 queries
  const collectionIds = collections.rows.map(c => c.id)

  // Get all items for all collections in one query
  const allItemsResult = await pool.query(
    `SELECT
       ci.id,
       ci.collection_id,
       ci.item_key,
       ci.item_name,
       ci.item_description,
       ci.completion_type,
       ci.completion_criteria,
       ci.display_order
     FROM collection_items ci
     WHERE ci.collection_id = ANY($1)
     ORDER BY ci.collection_id, ci.display_order`,
    [collectionIds]
  )

  // Get all answered stories for this user (for completion checking)
  const answeredStories = await pool.query(
    `SELECT chapter_id, question_id FROM stories
     WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
    [userId]
  )

  // Build a Set for O(1) lookup of answered questions
  const answeredSet = new Set(
    answeredStories.rows.map(s => `${s.chapter_id}:${s.question_id}`)
  )

  // Group items by collection and check completion status
  const itemsByCollection = new Map()
  for (const item of allItemsResult.rows) {
    if (!itemsByCollection.has(item.collection_id)) {
      itemsByCollection.set(item.collection_id, [])
    }

    // Check completion status
    const collection = collections.rows.find(c => c.id === item.collection_id)
    const completedItemKeys = JSON.parse(collection?.completed_items || '[]')
    let isCompleted = completedItemKeys.includes(item.item_key)

    // Double-check against actual story data using our preloaded set
    if (!isCompleted && item.completion_type === 'question' && item.completion_criteria) {
      const criteria = item.completion_criteria
      isCompleted = answeredSet.has(`${criteria.chapter_id}:${criteria.question_id}`)
    }

    itemsByCollection.get(item.collection_id).push({
      id: item.id,
      item_key: item.item_key,
      item_name: item.item_name,
      item_description: item.item_description,
      completion_type: item.completion_type,
      completion_criteria: item.completion_criteria,
      isCompleted
    })
  }

  // Build final response
  const collectionsWithItems = collections.rows.map(collection => ({
    id: collection.id,
    key: collection.collection_key,
    name: collection.collection_name,
    description: collection.collection_description,
    icon: collection.collection_icon,
    requiredItems: collection.required_items,
    itemsCompleted: collection.items_completed,
    isComplete: collection.is_complete,
    completedAt: collection.completed_at,
    rewardArtworkUrl: collection.reward_artwork_url,
    items: itemsByCollection.get(collection.id) || []
  }))

  res.json({
    success: true,
    data: collectionsWithItems
  });
}));

/**
 * GET /api/game/collections/:collectionKey
 * Get a single collection with detailed progress
 */
router.get('/collections/:collectionKey', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { collectionKey } = req.params;

  const collection = await pool.query(
    `SELECT
       c.*,
       COALESCE(ucp.items_completed, 0) as user_items_completed,
       COALESCE(ucp.completed_items, '[]') as user_completed_items,
       COALESCE(ucp.is_complete, false) as user_is_complete,
       ucp.completed_at,
       ucp.reward_artwork_url
     FROM collections c
     LEFT JOIN user_collection_progress ucp
       ON c.id = ucp.collection_id AND ucp.user_id = $1
     WHERE c.collection_key = $2`,
    [userId, collectionKey]
  );

  if (collection.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Collection not found'
    });
  }

  const col = collection.rows[0];

  // Get items with completion status
  const items = await pool.query(
    `SELECT * FROM collection_items WHERE collection_id = $1 ORDER BY display_order`,
    [col.id]
  );

  const completedItemKeys = JSON.parse(col.user_completed_items || '[]');

  const itemsWithStatus = await Promise.all(
    items.rows.map(async (item) => {
      let isCompleted = completedItemKeys.includes(item.item_key);
      let storyPreview = null;

      if (item.completion_type === 'question') {
        const criteria = item.completion_criteria;
        const story = await pool.query(
          `SELECT id, answer FROM stories
           WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
           AND answer IS NOT NULL AND answer != ''`,
          [userId, criteria.chapter_id, criteria.question_id]
        );

        if (story.rows.length > 0) {
          isCompleted = true;
          // Get first 100 chars of answer as preview
          storyPreview = story.rows[0].answer.substring(0, 100) + '...';
        }
      }

      return {
        key: item.item_key,
        name: item.item_name,
        description: item.item_description,
        isCompleted,
        storyPreview,
        linkedChapter: item.completion_criteria?.chapter_id,
        linkedQuestion: item.completion_criteria?.question_id
      };
    })
  );

  res.json({
    success: true,
    data: {
      key: col.collection_key,
      name: col.collection_name,
      description: col.collection_description,
      icon: col.collection_icon,
      requiredItems: col.required_items,
      itemsCompleted: col.user_items_completed,
      isComplete: col.user_is_complete,
      completedAt: col.completed_at,
      rewardArtworkUrl: col.reward_artwork_url,
      rewardArtworkPrompt: col.reward_artwork_prompt,
      items: itemsWithStatus
    }
  });
}));

/**
 * POST /api/game/collections/:collectionKey/claim-reward
 * Generate and claim the artwork reward for a completed collection
 */
router.post('/collections/:collectionKey/claim-reward', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { collectionKey } = req.params;

  // Get collection and user progress
  const collection = await pool.query(
    `SELECT c.*, ucp.is_complete, ucp.reward_artwork_url
     FROM collections c
     JOIN user_collection_progress ucp ON c.id = ucp.collection_id
     WHERE c.collection_key = $1 AND ucp.user_id = $2`,
    [collectionKey, userId]
  );

  if (collection.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Collection not found or not started'
    });
  }

  const col = collection.rows[0];

  if (!col.is_complete) {
    return res.status(400).json({
      success: false,
      message: 'Collection not yet complete'
    });
  }

  if (col.reward_artwork_url) {
    return res.json({
      success: true,
      data: {
        artworkUrl: col.reward_artwork_url,
        alreadyClaimed: true
      }
    });
  }

  // Generate artwork using existing chapter-images logic
  // This would call the Replicate API with the collection's reward_artwork_prompt
  // For now, return a placeholder and note to implement

  const placeholderUrl = `https://placeholder.com/collection-${collectionKey}.jpg`;

  await pool.query(
    `UPDATE user_collection_progress
     SET reward_artwork_url = $1, updated_at = NOW()
     WHERE user_id = $2 AND collection_id = $3`,
    [placeholderUrl, userId, col.id]
  );

  res.json({
    success: true,
    data: {
      artworkUrl: placeholderUrl,
      alreadyClaimed: false,
      message: 'Reward artwork generation initiated'
    }
  });
}));

/**
 * POST /api/game/collections/sync
 * Sync collection progress with actual story data
 */
router.post('/collections/sync', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all collections
  const collections = await pool.query(
    `SELECT c.id, c.collection_key, c.required_items
     FROM collections c
     WHERE c.is_active = true`
  );

  const results = [];

  for (const collection of collections.rows) {
    // Get items for this collection
    const items = await pool.query(
      `SELECT item_key, completion_type, completion_criteria
       FROM collection_items
       WHERE collection_id = $1`,
      [collection.id]
    );

    const completedItems = [];

    for (const item of items.rows) {
      if (item.completion_type === 'question') {
        const criteria = item.completion_criteria;
        const story = await pool.query(
          `SELECT id FROM stories
           WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
           AND answer IS NOT NULL AND answer != ''`,
          [userId, criteria.chapter_id, criteria.question_id]
        );

        if (story.rows.length > 0) {
          completedItems.push(item.item_key);
        }
      }
    }

    const isComplete = completedItems.length >= collection.required_items;

    // Upsert progress
    await pool.query(
      `INSERT INTO user_collection_progress (user_id, collection_id, items_completed, completed_items, is_complete, completed_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, collection_id) DO UPDATE SET
         items_completed = $3,
         completed_items = $4,
         is_complete = $5,
         completed_at = CASE WHEN $5 AND user_collection_progress.completed_at IS NULL THEN NOW() ELSE user_collection_progress.completed_at END,
         updated_at = NOW()`,
      [userId, collection.id, completedItems.length, JSON.stringify(completedItems), isComplete]
    );

    results.push({
      collection: collection.collection_key,
      itemsCompleted: completedItems.length,
      isComplete
    });
  }

  res.json({
    success: true,
    data: results
  });
}));

// ============================================
// FAMILY CIRCLE ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/create
 * Create a new memory circle (family group)
 */
router.post('/circle/create', validate(gameSchemas.createCircle), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { circleName } = req.validatedBody;

  // Check if user already owns a circle
  const existing = await pool.query(
    'SELECT id FROM memory_circles WHERE owner_user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'You already have a Memory Circle'
    });
  }

  // Generate unique invite code
  const inviteCode = await generateUniqueInviteCode(pool);

  // Set invite code to expire in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create circle
  const circle = await pool.query(
    `INSERT INTO memory_circles (owner_user_id, circle_name, invite_code, invite_code_expires)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, circleName || 'My Memory Circle', inviteCode, expiresAt]
  );

  // Add owner as member
  await pool.query(
    `INSERT INTO memory_circle_members (circle_id, user_id, role, display_name)
     VALUES ($1, $2, 'owner', (SELECT name FROM users WHERE id = $2))`,
    [circle.rows[0].id, userId]
  );

  // Award achievement
  await awardAchievement(userId, 'family_creator');

  res.json({
    success: true,
    data: {
      id: circle.rows[0].id,
      name: circle.rows[0].circle_name,
      inviteCode: circle.rows[0].invite_code,
      inviteCodeExpires: circle.rows[0].invite_code_expires
    }
  });
}));

/**
 * GET /api/game/circle
 * Get user's memory circle (owned or member)
 */
router.get('/circle', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find circle user is part of
  const membership = await pool.query(
    `SELECT mc.*, mcm.role
     FROM memory_circle_members mcm
     JOIN memory_circles mc ON mcm.circle_id = mc.id
     WHERE mcm.user_id = $1`,
    [userId]
  );

  if (membership.rows.length === 0) {
    return res.json({
      success: true,
      data: null
    });
  }

  const circle = membership.rows[0];

  // Get all members
  const members = await pool.query(
    `SELECT mcm.id, mcm.user_id, mcm.role, mcm.display_name, mcm.joined_at, mcm.last_active_at,
            u.name, u.avatar_url,
            (SELECT current_streak FROM user_game_state WHERE user_id = mcm.user_id) as streak
     FROM memory_circle_members mcm
     JOIN users u ON mcm.user_id = u.id
     WHERE mcm.circle_id = $1
     ORDER BY mcm.role = 'owner' DESC, mcm.joined_at`,
    [circle.id]
  );

  // Get recent activity
  const recentActivity = await pool.query(
    `SELECT
       'story' as type,
       s.user_id,
       u.name as user_name,
       s.chapter_id,
       s.created_at as activity_time,
       LEFT(s.answer, 50) as preview
     FROM stories s
     JOIN users u ON s.user_id = u.id
     JOIN memory_circle_members mcm ON s.user_id = mcm.user_id
     WHERE mcm.circle_id = $1
       AND s.answer IS NOT NULL
       AND s.created_at > NOW() - INTERVAL '7 days'
     ORDER BY s.created_at DESC
     LIMIT 10`,
    [circle.id]
  );

  // Get pending prompts for this user
  const pendingPrompts = await pool.query(
    `SELECT fp.*, u.name as from_user_name
     FROM family_prompts fp
     JOIN users u ON fp.from_user_id = u.id
     WHERE fp.for_user_id = $1 AND fp.status = 'pending'
     ORDER BY fp.created_at DESC`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      id: circle.id,
      name: circle.circle_name,
      inviteCode: circle.role === 'owner' ? circle.invite_code : null,
      inviteCodeExpires: circle.role === 'owner' ? circle.invite_code_expires : null,
      myRole: circle.role,
      members: members.rows.map(m => ({
        id: m.id,
        userId: m.user_id,
        name: m.display_name || m.name,
        avatarUrl: m.avatar_url,
        role: m.role,
        streak: m.streak || 0,
        joinedAt: m.joined_at,
        lastActiveAt: m.last_active_at
      })),
      recentActivity: recentActivity.rows,
      pendingPrompts: pendingPrompts.rows
    }
  });
}));

/**
 * POST /api/game/circle/join/:inviteCode
 * Join a memory circle with invite code
 */
router.post('/circle/join/:inviteCode', validate(gameSchemas.joinCircle), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { inviteCode } = req.validatedParams;
  const { displayName } = req.validatedBody || {};

  // Find circle with this code
  const circle = await pool.query(
    `SELECT * FROM memory_circles
     WHERE invite_code = $1 AND invite_code_expires > NOW()`,
    [inviteCode.toUpperCase()]
  );

  if (circle.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Invalid or expired invite code'
    });
  }

  const circleData = circle.rows[0];

  // Check if already a member
  const existing = await pool.query(
    'SELECT id FROM memory_circle_members WHERE circle_id = $1 AND user_id = $2',
    [circleData.id, userId]
  );

  if (existing.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'You are already a member of this circle'
    });
  }

  // Check member limit
  const memberCount = await pool.query(
    'SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = $1',
    [circleData.id]
  );

  if (parseInt(memberCount.rows[0].count) >= circleData.max_members) {
    return res.status(400).json({
      success: false,
      message: 'This circle is full'
    });
  }

  // Get user's name if displayName not provided
  let name = displayName;
  if (!name) {
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    name = user.rows[0]?.name;
  }

  // Join circle
  await pool.query(
    `INSERT INTO memory_circle_members (circle_id, user_id, role, display_name)
     VALUES ($1, $2, 'helper', $3)`,
    [circleData.id, userId, name]
  );

  // Award achievement
  await awardAchievement(userId, 'family_joined');

  res.json({
    success: true,
    message: `Joined ${circleData.circle_name}`,
    data: {
      circleId: circleData.id,
      circleName: circleData.circle_name
    }
  });
}));

/**
 * POST /api/game/circle/regenerate-invite
 * Generate a new invite code (owner only)
 */
router.post('/circle/regenerate-invite', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const circle = await pool.query(
    'SELECT id FROM memory_circles WHERE owner_user_id = $1',
    [userId]
  );

  if (circle.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'You do not own a Memory Circle'
    });
  }

  const newCode = await generateUniqueInviteCode(pool);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await pool.query(
    `UPDATE memory_circles
     SET invite_code = $1, invite_code_expires = $2, updated_at = NOW()
     WHERE id = $3`,
    [newCode, expiresAt, circle.rows[0].id]
  );

  res.json({
    success: true,
    data: {
      inviteCode: newCode,
      expiresAt
    }
  });
}));

/**
 * DELETE /api/game/circle/member/:memberId
 * Remove a member from circle (owner only)
 */
router.delete('/circle/member/:memberId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { memberId } = req.params;

  // Check user is owner
  const circle = await pool.query(
    `SELECT mc.id
     FROM memory_circles mc
     WHERE mc.owner_user_id = $1`,
    [userId]
  );

  if (circle.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Only the circle owner can remove members'
    });
  }

  // Check member exists and is not the owner
  const member = await pool.query(
    `SELECT user_id, role FROM memory_circle_members
     WHERE id = $1 AND circle_id = $2`,
    [memberId, circle.rows[0].id]
  );

  if (member.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Member not found'
    });
  }

  if (member.rows[0].role === 'owner') {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove the owner'
    });
  }

  await pool.query(
    'DELETE FROM memory_circle_members WHERE id = $1',
    [memberId]
  );

  res.json({ success: true, message: 'Member removed' });
}));

/**
 * POST /api/game/circle/leave
 * Leave a memory circle (non-owner)
 */
router.post('/circle/leave', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const membership = await pool.query(
    `SELECT mcm.id, mcm.role, mc.id as circle_id
     FROM memory_circle_members mcm
     JOIN memory_circles mc ON mcm.circle_id = mc.id
     WHERE mcm.user_id = $1`,
    [userId]
  );

  if (membership.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'You are not in a Memory Circle'
    });
  }

  if (membership.rows[0].role === 'owner') {
    return res.status(400).json({
      success: false,
      message: 'Owners cannot leave. Transfer ownership or delete the circle.'
    });
  }

  await pool.query(
    'DELETE FROM memory_circle_members WHERE id = $1',
    [membership.rows[0].id]
  );

  res.json({ success: true, message: 'Left the Memory Circle' });
}));

// ============================================
// FAMILY PROMPTS ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/prompt
 * Send a prompt to another family member
 */
router.post('/circle/prompt', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { forUserId, promptText, promptNote } = req.body;

  if (!promptText || promptText.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Prompt text is required'
    });
  }

  // Check both users are in the same circle
  const membership = await pool.query(
    `SELECT mcm1.circle_id
     FROM memory_circle_members mcm1
     JOIN memory_circle_members mcm2 ON mcm1.circle_id = mcm2.circle_id
     WHERE mcm1.user_id = $1 AND mcm2.user_id = $2`,
    [userId, forUserId]
  );

  if (membership.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'You can only send prompts to members of your circle'
    });
  }

  const circleId = membership.rows[0].circle_id;

  // Create the prompt
  const prompt = await pool.query(
    `INSERT INTO family_prompts (circle_id, from_user_id, for_user_id, prompt_text, prompt_note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [circleId, userId, forUserId, promptText.trim(), promptNote?.trim()]
  );

  res.json({
    success: true,
    data: prompt.rows[0]
  });
}));

/**
 * GET /api/game/circle/prompts
 * Get prompts sent to and from user
 */
router.get('/circle/prompts', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Prompts received
  const received = await pool.query(
    `SELECT fp.*, u.name as from_user_name, u.avatar_url as from_user_avatar
     FROM family_prompts fp
     JOIN users u ON fp.from_user_id = u.id
     WHERE fp.for_user_id = $1
     ORDER BY fp.created_at DESC
     LIMIT 20`,
    [userId]
  );

  // Prompts sent
  const sent = await pool.query(
    `SELECT fp.*, u.name as for_user_name, u.avatar_url as for_user_avatar
     FROM family_prompts fp
     JOIN users u ON fp.for_user_id = u.id
     WHERE fp.from_user_id = $1
     ORDER BY fp.created_at DESC
     LIMIT 20`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      received: received.rows,
      sent: sent.rows
    }
  });
}));

/**
 * POST /api/game/circle/prompt/:promptId/answer
 * Answer a family prompt
 */
router.post('/circle/prompt/:promptId/answer', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { promptId } = req.params;
  const { answer } = req.body;

  // Get the prompt
  const prompt = await pool.query(
    'SELECT * FROM family_prompts WHERE id = $1 AND for_user_id = $2',
    [promptId, userId]
  );

  if (prompt.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Prompt not found'
    });
  }

  if (prompt.rows[0].status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Prompt already answered or declined'
    });
  }

  // Save as a story
  const story = await pool.query(
    `INSERT INTO stories (user_id, chapter_id, question_id, answer)
     VALUES ($1, 'family-prompts', $2, $3)
     RETURNING id`,
    [userId, `family-${promptId}`, answer]
  );

  // Update prompt status
  await pool.query(
    `UPDATE family_prompts
     SET status = 'answered', answered_story_id = $1, answered_at = NOW()
     WHERE id = $2`,
    [story.rows[0].id, promptId]
  );

  // Record activity
  await recordActivity(userId);

  // Award achievement
  await awardAchievement(userId, 'family_prompt');

  res.json({
    success: true,
    data: {
      storyId: story.rows[0].id
    }
  });
}));

/**
 * POST /api/game/circle/prompt/:promptId/decline
 * Decline a family prompt
 */
router.post('/circle/prompt/:promptId/decline', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { promptId } = req.params;

  await pool.query(
    `UPDATE family_prompts
     SET status = 'declined', declined_at = NOW()
     WHERE id = $1 AND for_user_id = $2 AND status = 'pending'`,
    [promptId, userId]
  );

  res.json({ success: true });
}));

// ============================================
// ENCOURAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/encourage
 * Send encouragement to a family member
 */
router.post('/circle/encourage', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { forUserId, type = 'heart', message, relatedStoryId } = req.body;

  // Check in same circle
  const membership = await pool.query(
    `SELECT mcm1.circle_id
     FROM memory_circle_members mcm1
     JOIN memory_circle_members mcm2 ON mcm1.circle_id = mcm2.circle_id
     WHERE mcm1.user_id = $1 AND mcm2.user_id = $2`,
    [userId, forUserId]
  );

  if (membership.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'You can only encourage members of your circle'
    });
  }

  await pool.query(
    `INSERT INTO family_encouragements (circle_id, from_user_id, for_user_id, encouragement_type, message, related_story_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [membership.rows[0].circle_id, userId, forUserId, type, message, relatedStoryId]
  );

  res.json({ success: true });
}));

/**
 * GET /api/game/circle/encouragements
 * Get encouragements received
 */
router.get('/circle/encouragements', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { unreadOnly = false } = req.query;

  let query = `
    SELECT fe.*, u.name as from_user_name, u.avatar_url as from_user_avatar
    FROM family_encouragements fe
    JOIN users u ON fe.from_user_id = u.id
    WHERE fe.for_user_id = $1
  `;

  if (unreadOnly === 'true') {
    query += ` AND fe.seen_by_recipient = false`;
  }

  query += ` ORDER BY fe.created_at DESC LIMIT 50`;

  const encouragements = await pool.query(query, [userId]);

  res.json({
    success: true,
    data: encouragements.rows
  });
}));

/**
 * POST /api/game/circle/encouragements/mark-seen
 * Mark encouragements as seen
 */
router.post('/circle/encouragements/mark-seen', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await pool.query(
    `UPDATE family_encouragements
     SET seen_by_recipient = true
     WHERE for_user_id = $1 AND seen_by_recipient = false`,
    [userId]
  );

  res.json({ success: true });
}));

// ============== Admin/Dev Endpoints ==============

/**
 * POST /api/game/admin/trigger-daily
 * Manually trigger daily tasks (for testing)
 */
router.post('/admin/trigger-daily', asyncHandler(async (req, res) => {
  // TODO: Add proper admin role check
  // For now, just allow authenticated users to trigger in dev
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }

  const { runDailyTasks } = await import('../cron/dailyTasks.js');
  await runDailyTasks();
  res.json({ success: true, message: 'Daily tasks triggered' });
}));

/**
 * POST /api/game/admin/trigger-weekly
 * Manually trigger weekly tasks (for testing)
 */
router.post('/admin/trigger-weekly', asyncHandler(async (req, res) => {
  // TODO: Add proper admin role check
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }

  const { runWeeklyTasks } = await import('../cron/weeklyTasks.js');
  await runWeeklyTasks();
  res.json({ success: true, message: 'Weekly tasks triggered' });
}));

export default router;

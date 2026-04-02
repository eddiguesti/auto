// /life-story/services/api/services/gameService.js

import pool from '../db/index.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('gameService')

/**
 * Get or create a user's game state using a single UPSERT query.
 * Replaces the previous SELECT-then-INSERT pattern to avoid race conditions.
 */
export async function getOrCreateGameState(userId) {
  const result = await pool.query(
    `INSERT INTO user_game_state (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  )
  return result.rows[0]
}

/**
 * Check and award achievements based on user context.
 * Returns an array of newly awarded achievements.
 */
export async function checkAndAwardAchievements(userId, context) {
  const newAchievements = []

  try {
    const stats = await pool.query(
      `SELECT current_streak, longest_streak, total_memories
       FROM user_game_state
       WHERE user_id = $1`,
      [userId]
    )

    const { current_streak, total_memories } = stats.rows[0] || {}

    // Streak achievements
    const streakMilestones = [3, 7, 14, 30, 60, 100, 365]
    for (const milestone of streakMilestones) {
      if (current_streak >= milestone) {
        const awarded = await awardAchievement(userId, `streak_${milestone}`)
        if (awarded) newAchievements.push(awarded)
      }
    }

    // Memory count achievements
    const memoryMilestones = [1, 10, 25, 50, 75, 100]
    for (const milestone of memoryMilestones) {
      if (total_memories >= milestone) {
        const awarded = await awardAchievement(userId, `memories_${milestone}`)
        if (awarded) newAchievements.push(awarded)
      }
    }

    return newAchievements
  } catch (error) {
    logger.error('Error checking achievements', { error: error.message, userId })
    return []
  }
}

/**
 * Achievement definitions keyed by achievement_key.
 */
const ACHIEVEMENT_DEFINITIONS = {
  streak_3: {
    name: 'Getting Started',
    description: '3 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_7: {
    name: 'One Week Wonder',
    description: '7 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_14: {
    name: 'Fortnight of Memories',
    description: '14 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_30: {
    name: 'Month of Memories',
    description: '30 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_60: {
    name: 'Legacy Builder',
    description: '60 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_100: {
    name: 'Century of Stories',
    description: '100 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  streak_365: {
    name: 'Year of Your Life',
    description: '365 days in a row',
    icon: 'flame',
    type: 'streak'
  },
  memories_1: {
    name: 'First Memory',
    description: 'Your journey begins',
    icon: 'bookmark',
    type: 'milestone'
  },
  memories_10: {
    name: 'Getting Warmed Up',
    description: '10 memories captured',
    icon: 'bookmark',
    type: 'milestone'
  },
  memories_25: {
    name: 'Story Collector',
    description: '25 memories captured',
    icon: 'bookmark',
    type: 'milestone'
  },
  memories_50: {
    name: 'Memory Keeper',
    description: '50 memories captured',
    icon: 'bookmark',
    type: 'milestone'
  },
  memories_75: {
    name: 'Almost There',
    description: '75 memories captured',
    icon: 'bookmark',
    type: 'milestone'
  },
  memories_100: {
    name: 'Century of Memories',
    description: '100 memories captured',
    icon: 'crown',
    type: 'milestone'
  },
  collection_first: {
    name: 'Collector',
    description: 'Completed your first collection',
    icon: 'layers',
    type: 'collection'
  },
  collection_half: {
    name: 'Avid Collector',
    description: 'Completed 4 collections',
    icon: 'layers',
    type: 'collection'
  },
  collection_all: {
    name: 'Master Collector',
    description: 'Completed all collections',
    icon: 'award',
    type: 'collection'
  },
  family_joined: {
    name: 'Family Connection',
    description: 'Joined a Memory Circle',
    icon: 'users',
    type: 'family'
  },
  family_prompt: {
    name: 'Family Storyteller',
    description: 'Answered a family prompt',
    icon: 'heart',
    type: 'family'
  },
  family_creator: {
    name: 'Circle Creator',
    description: 'Created a Memory Circle',
    icon: 'users',
    type: 'family'
  }
}

/**
 * Award a single achievement to a user if not already earned.
 * Uses INSERT ON CONFLICT DO NOTHING to atomically prevent duplicate awards.
 * Returns the achievement row on success, null if already earned or unknown key.
 */
export async function awardAchievement(userId, achievementKey) {
  try {
    const def = ACHIEVEMENT_DEFINITIONS[achievementKey]
    if (!def) return null

    const result = await pool.query(
      `INSERT INTO achievements (user_id, achievement_key, achievement_name, achievement_description, achievement_icon, achievement_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, achievement_key) DO NOTHING
       RETURNING *`,
      [userId, achievementKey, def.name, def.description, def.icon, def.type]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Error awarding achievement', { error: error.message, userId, achievementKey })
    return null
  }
}

/**
 * Update collection progress when a question is answered.
 * Uses a transaction with SELECT FOR UPDATE to prevent concurrent duplicate writes.
 * Awards collection achievements when thresholds are met.
 */
export async function updateCollectionProgress(userId, chapterId, questionId) {
  try {
    const matchingItems = await pool.query(
      `SELECT ci.id, ci.item_key, ci.collection_id, c.collection_key, c.required_items
       FROM collection_items ci
       JOIN collections c ON ci.collection_id = c.id
       WHERE ci.completion_type = 'question'
         AND ci.completion_criteria->>'chapter_id' = $1
         AND ci.completion_criteria->>'question_id' = $2`,
      [chapterId, questionId]
    )

    for (const item of matchingItems.rows) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Ensure row exists
        await client.query(
          `INSERT INTO user_collection_progress (user_id, collection_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, collection_id) DO NOTHING`,
          [userId, item.collection_id]
        )

        // Lock the row for this transaction — prevents concurrent read-modify-write
        const progress = await client.query(
          `SELECT completed_items, items_completed, is_complete
           FROM user_collection_progress
           WHERE user_id = $1 AND collection_id = $2
           FOR UPDATE`,
          [userId, item.collection_id]
        )

        const currentProgress = progress.rows[0]
        const completedItems = currentProgress.completed_items || []

        if (!completedItems.includes(item.item_key)) {
          const newItems = [...completedItems, item.item_key]
          const isComplete = newItems.length >= item.required_items

          await client.query(
            `UPDATE user_collection_progress
             SET completed_items = $1,
                 items_completed = $2,
                 is_complete = $3,
                 completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END,
                 updated_at = NOW()
             WHERE user_id = $4 AND collection_id = $5`,
            [JSON.stringify(newItems), newItems.length, isComplete, userId, item.collection_id]
          )

          await client.query('COMMIT')

          if (isComplete) {
            await awardAchievement(userId, 'collection_first')

            const allComplete = await pool.query(
              `SELECT COUNT(*) as complete_count
               FROM user_collection_progress
               WHERE user_id = $1 AND is_complete = true`,
              [userId]
            )

            const count = parseInt(allComplete.rows[0].complete_count)
            if (count >= 4) await awardAchievement(userId, 'collection_half')
            if (count >= 8) await awardAchievement(userId, 'collection_all')
          }
        } else {
          await client.query('ROLLBACK')
        }
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }
  } catch (error) {
    logger.error('Error updating collection progress', {
      error: error.message,
      userId,
      chapterId,
      questionId
    })
  }
}

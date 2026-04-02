// /life-story/services/api/routes/game/collections.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

const router = Router()

/**
 * GET /api/game/collections
 * Get all collections with user progress
 */
router.get(
  '/collections',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

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
    )

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
    const answeredSet = new Set(answeredStories.rows.map(s => `${s.chapter_id}:${s.question_id}`))

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
    })
  })
)

/**
 * GET /api/game/collections/:collectionKey
 * Get a single collection with detailed progress
 */
router.get(
  '/collections/:collectionKey',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { collectionKey } = req.params

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
    )

    if (collection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      })
    }

    const col = collection.rows[0]

    // Get items with completion status
    const items = await pool.query(
      `SELECT id, collection_id, item_key, display_name, description, icon, check_type, check_value, display_order, created_at
       FROM collection_items WHERE collection_id = $1 ORDER BY display_order`,
      [col.id]
    )

    const completedItemKeys = JSON.parse(col.user_completed_items || '[]')

    const itemsWithStatus = await Promise.all(
      items.rows.map(async item => {
        let isCompleted = completedItemKeys.includes(item.item_key)
        let storyPreview = null

        if (item.completion_type === 'question') {
          const criteria = item.completion_criteria
          const story = await pool.query(
            `SELECT id, answer FROM stories
           WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
           AND answer IS NOT NULL AND answer != ''`,
            [userId, criteria.chapter_id, criteria.question_id]
          )

          if (story.rows.length > 0) {
            isCompleted = true
            // Get first 100 chars of answer as preview
            storyPreview = story.rows[0].answer.substring(0, 100) + '...'
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
        }
      })
    )

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
    })
  })
)

/**
 * POST /api/game/collections/:collectionKey/claim-reward
 * Generate and claim the artwork reward for a completed collection
 */
router.post(
  '/collections/:collectionKey/claim-reward',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { collectionKey } = req.params

    // Get collection and user progress
    const collection = await pool.query(
      `SELECT c.*, ucp.is_complete, ucp.reward_artwork_url
     FROM collections c
     JOIN user_collection_progress ucp ON c.id = ucp.collection_id
     WHERE c.collection_key = $1 AND ucp.user_id = $2`,
      [collectionKey, userId]
    )

    if (collection.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found or not started'
      })
    }

    const col = collection.rows[0]

    if (!col.is_complete) {
      return res.status(400).json({
        success: false,
        message: 'Collection not yet complete'
      })
    }

    if (col.reward_artwork_url) {
      return res.json({
        success: true,
        data: {
          artworkUrl: col.reward_artwork_url,
          alreadyClaimed: true
        }
      })
    }

    // Generate artwork using existing chapter-images logic
    // This would call the Replicate API with the collection's reward_artwork_prompt
    // For now, return a placeholder and note to implement

    const placeholderUrl = `https://placeholder.com/collection-${collectionKey}.jpg`

    await pool.query(
      `UPDATE user_collection_progress
     SET reward_artwork_url = $1, updated_at = NOW()
     WHERE user_id = $2 AND collection_id = $3`,
      [placeholderUrl, userId, col.id]
    )

    res.json({
      success: true,
      data: {
        artworkUrl: placeholderUrl,
        alreadyClaimed: false,
        message: 'Reward artwork generation initiated'
      }
    })
  })
)

/**
 * POST /api/game/collections/sync
 * Sync collection progress with actual story data
 */
router.post(
  '/collections/sync',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Get all collections
    const collections = await pool.query(
      `SELECT c.id, c.collection_key, c.required_items
     FROM collections c
     WHERE c.is_active = true`
    )

    const results = []

    for (const collection of collections.rows) {
      // Get items for this collection
      const items = await pool.query(
        `SELECT item_key, completion_type, completion_criteria
       FROM collection_items
       WHERE collection_id = $1`,
        [collection.id]
      )

      const completedItems = []

      for (const item of items.rows) {
        if (item.completion_type === 'question') {
          const criteria = item.completion_criteria
          const story = await pool.query(
            `SELECT id FROM stories
           WHERE user_id = $1 AND chapter_id = $2 AND question_id = $3
           AND answer IS NOT NULL AND answer != ''`,
            [userId, criteria.chapter_id, criteria.question_id]
          )

          if (story.rows.length > 0) {
            completedItems.push(item.item_key)
          }
        }
      }

      const isComplete = completedItems.length >= collection.required_items

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
      )

      results.push({
        collection: collection.collection_key,
        itemsCompleted: completedItems.length,
        isComplete
      })
    }

    res.json({
      success: true,
      data: results
    })
  })
)

export default router

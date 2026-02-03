// /life-story/server/routes/notifications.js

import express from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT notification_preferences, preferred_prompt_time, timezone
     FROM user_game_state
     WHERE user_id = $1`,
    [userId]
  );

  res.json({
    success: true,
    data: result.rows[0] || {
      notification_preferences: {
        daily_reminder: true,
        streak_warning: true,
        weekly_digest: true,
        family_activity: true,
        achievement_earned: true
      },
      preferred_prompt_time: '09:00',
      timezone: 'Europe/London'
    }
  });
}));

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { preferences, preferredPromptTime, timezone } = req.body;

  const updates = [];
  const values = [userId];
  let paramIndex = 2;

  if (preferences) {
    updates.push(`notification_preferences = $${paramIndex++}`);
    values.push(JSON.stringify(preferences));
  }

  if (preferredPromptTime) {
    updates.push(`preferred_prompt_time = $${paramIndex++}`);
    values.push(preferredPromptTime);
  }

  if (timezone) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(timezone);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE user_game_state SET ${updates.join(', ')} WHERE user_id = $1`,
      values
    );
  }

  res.json({ success: true });
}));

/**
 * GET /api/notifications/history
 * Get notification history
 */
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20 } = req.query;

  const notifications = await pool.query(
    `SELECT id, notification_type, subject, scheduled_for, sent_at
     FROM notification_queue
     WHERE user_id = $1
     ORDER BY scheduled_for DESC
     LIMIT $2`,
    [userId, parseInt(limit)]
  );

  res.json({
    success: true,
    data: notifications.rows
  });
}));

export default router;

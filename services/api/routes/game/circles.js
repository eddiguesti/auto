// /life-story/services/api/routes/game/circles.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import validate from '../../middleware/validate.js'
import { gameSchemas } from '../../schemas/index.js'
import { generateUniqueInviteCode } from '../../utils/inviteCode.js'
import { awardAchievement } from '../../services/gameService.js'

const router = Router()

// ============================================
// CIRCLE CRUD ENDPOINTS
// ============================================

/**
 * POST /api/game/circle/create
 * Create a new memory circle (family group)
 */
router.post(
  '/circle/create',
  validate(gameSchemas.createCircle),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { circleName } = req.validatedBody

    // Check if user already owns a circle
    const existing = await pool.query('SELECT id FROM memory_circles WHERE owner_user_id = $1', [
      userId
    ])

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a Memory Circle'
      })
    }

    // Generate unique invite code
    const inviteCode = await generateUniqueInviteCode(pool)

    // Set invite code to expire in 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create circle
    const circle = await pool.query(
      `INSERT INTO memory_circles (owner_user_id, circle_name, invite_code, invite_code_expires)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
      [userId, circleName || 'My Memory Circle', inviteCode, expiresAt]
    )

    // Add owner as member
    await pool.query(
      `INSERT INTO memory_circle_members (circle_id, user_id, role, display_name)
     VALUES ($1, $2, 'owner', (SELECT name FROM users WHERE id = $2))`,
      [circle.rows[0].id, userId]
    )

    // Award achievement
    await awardAchievement(userId, 'family_creator')

    res.json({
      success: true,
      data: {
        id: circle.rows[0].id,
        name: circle.rows[0].circle_name,
        inviteCode: circle.rows[0].invite_code,
        inviteCodeExpires: circle.rows[0].invite_code_expires
      }
    })
  })
)

/**
 * GET /api/game/circle
 * Get user's memory circle (owned or member)
 */
router.get(
  '/circle',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Find circle user is part of
    const membership = await pool.query(
      `SELECT mc.*, mcm.role
     FROM memory_circle_members mcm
     JOIN memory_circles mc ON mcm.circle_id = mc.id
     WHERE mcm.user_id = $1`,
      [userId]
    )

    if (membership.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      })
    }

    const circle = membership.rows[0]

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
    )

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
    )

    // Get pending prompts for this user
    const pendingPrompts = await pool.query(
      `SELECT fp.*, u.name as from_user_name
     FROM family_prompts fp
     JOIN users u ON fp.from_user_id = u.id
     WHERE fp.for_user_id = $1 AND fp.status = 'pending'
     ORDER BY fp.created_at DESC`,
      [userId]
    )

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
    })
  })
)

/**
 * POST /api/game/circle/join/:inviteCode
 * Join a memory circle with invite code
 */
router.post(
  '/circle/join/:inviteCode',
  validate(gameSchemas.joinCircle),
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { inviteCode } = req.validatedParams
    const { displayName } = req.validatedBody || {}

    // Find circle with this code
    const circle = await pool.query(
      `SELECT id, user_id, name, description, invite_code, invite_code_expires, created_at, updated_at
       FROM memory_circles
       WHERE invite_code = $1 AND invite_code_expires > NOW()`,
      [inviteCode.toUpperCase()]
    )

    if (circle.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invite code'
      })
    }

    const circleData = circle.rows[0]

    // Check if already a member
    const existing = await pool.query(
      'SELECT id FROM memory_circle_members WHERE circle_id = $1 AND user_id = $2',
      [circleData.id, userId]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this circle'
      })
    }

    // Check member limit
    const memberCount = await pool.query(
      'SELECT COUNT(*) FROM memory_circle_members WHERE circle_id = $1',
      [circleData.id]
    )

    if (parseInt(memberCount.rows[0].count) >= circleData.max_members) {
      return res.status(400).json({
        success: false,
        message: 'This circle is full'
      })
    }

    // Get user's name if displayName not provided
    let name = displayName
    if (!name) {
      const user = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
      name = user.rows[0]?.name
    }

    // Join circle
    await pool.query(
      `INSERT INTO memory_circle_members (circle_id, user_id, role, display_name)
     VALUES ($1, $2, 'helper', $3)`,
      [circleData.id, userId, name]
    )

    // Award achievement
    await awardAchievement(userId, 'family_joined')

    res.json({
      success: true,
      message: `Joined ${circleData.circle_name}`,
      data: {
        circleId: circleData.id,
        circleName: circleData.circle_name
      }
    })
  })
)

/**
 * POST /api/game/circle/regenerate-invite
 * Generate a new invite code (owner only)
 */
router.post(
  '/circle/regenerate-invite',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const circle = await pool.query('SELECT id FROM memory_circles WHERE owner_user_id = $1', [
      userId
    ])

    if (circle.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'You do not own a Memory Circle'
      })
    }

    const newCode = await generateUniqueInviteCode(pool)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await pool.query(
      `UPDATE memory_circles
     SET invite_code = $1, invite_code_expires = $2, updated_at = NOW()
     WHERE id = $3`,
      [newCode, expiresAt, circle.rows[0].id]
    )

    res.json({
      success: true,
      data: {
        inviteCode: newCode,
        expiresAt
      }
    })
  })
)

/**
 * DELETE /api/game/circle/member/:memberId
 * Remove a member from circle (owner only)
 */
router.delete(
  '/circle/member/:memberId',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { memberId } = req.params

    // Check user is owner
    const circle = await pool.query(
      `SELECT mc.id
     FROM memory_circles mc
     WHERE mc.owner_user_id = $1`,
      [userId]
    )

    if (circle.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only the circle owner can remove members'
      })
    }

    // Check member exists and is not the owner
    const member = await pool.query(
      `SELECT user_id, role FROM memory_circle_members
     WHERE id = $1 AND circle_id = $2`,
      [memberId, circle.rows[0].id]
    )

    if (member.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      })
    }

    if (member.rows[0].role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the owner'
      })
    }

    await pool.query('DELETE FROM memory_circle_members WHERE id = $1', [memberId])

    res.json({ success: true, message: 'Member removed' })
  })
)

/**
 * POST /api/game/circle/leave
 * Leave a memory circle (non-owner)
 */
router.post(
  '/circle/leave',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const membership = await pool.query(
      `SELECT mcm.id, mcm.role, mc.id as circle_id
     FROM memory_circle_members mcm
     JOIN memory_circles mc ON mcm.circle_id = mc.id
     WHERE mcm.user_id = $1`,
      [userId]
    )

    if (membership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'You are not in a Memory Circle'
      })
    }

    if (membership.rows[0].role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Owners cannot leave. Transfer ownership or delete the circle.'
      })
    }

    await pool.query('DELETE FROM memory_circle_members WHERE id = $1', [membership.rows[0].id])

    res.json({ success: true, message: 'Left the Memory Circle' })
  })
)

export default router

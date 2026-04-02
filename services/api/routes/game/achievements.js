// /life-story/services/api/routes/game/achievements.js

import { Router } from 'express'
import pool from '../../db/index.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

const router = Router()

/**
 * POST /api/game/achievements/mark-seen
 * Mark achievements as seen by user
 */
router.post(
  '/achievements/mark-seen',
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { achievementKeys } = req.body

    if (achievementKeys && achievementKeys.length > 0) {
      await pool.query(
        `UPDATE achievements
       SET seen_by_user = true
       WHERE user_id = $1 AND achievement_key = ANY($2)`,
        [userId, achievementKeys]
      )
    }

    res.json({ success: true })
  })
)

/**
 * GET /api/game/achievements
 * Get all achievements for user
 */
router.get(
  '/achievements',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const achievements = await pool.query(
      `SELECT achievement_key, achievement_name, achievement_description,
            achievement_icon, achievement_type, earned_at, seen_by_user
     FROM achievements
     WHERE user_id = $1
     ORDER BY earned_at DESC`,
      [userId]
    )

    res.json({
      success: true,
      data: achievements.rows
    })
  })
)

/**
 * Chapter definitions for memoir progress calculations.
 */
const CHAPTERS = [
  {
    id: 'earliest-memories',
    title: 'Earliest Memories',
    subtitle: 'Ages 0-5',
    totalQuestions: 8
  },
  { id: 'childhood', title: 'Childhood', subtitle: 'Ages 6-12', totalQuestions: 10 },
  { id: 'school-days', title: 'School Days', subtitle: 'Education Years', totalQuestions: 10 },
  {
    id: 'teenage-years',
    title: 'Teenage Years',
    subtitle: 'Coming of Age',
    totalQuestions: 11
  },
  {
    id: 'key-people',
    title: 'Key People',
    subtitle: 'Those Who Shaped You',
    totalQuestions: 8
  },
  {
    id: 'young-adulthood',
    title: 'Young Adulthood',
    subtitle: 'Starting Out',
    totalQuestions: 10
  },
  {
    id: 'family-career',
    title: 'Family & Career',
    subtitle: 'Building a Life',
    totalQuestions: 10
  },
  {
    id: 'world-around-you',
    title: 'The World Around You',
    subtitle: 'History & Culture',
    totalQuestions: 8
  },
  {
    id: 'passions-beliefs',
    title: 'Passions & Beliefs',
    subtitle: 'What Matters to You',
    totalQuestions: 8
  },
  {
    id: 'wisdom-reflections',
    title: 'Wisdom & Reflections',
    subtitle: 'Looking Back',
    totalQuestions: 10
  }
]

/**
 * GET /api/game/memoir-progress
 * Get detailed memoir progress - which chapters/questions are complete
 */
router.get(
  '/memoir-progress',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Get answered questions per chapter
    const answeredResult = await pool.query(
      `SELECT chapter_id, question_id,
            CASE WHEN answer IS NOT NULL AND answer != '' THEN true ELSE false END as is_answered
     FROM stories
     WHERE user_id = $1`,
      [userId]
    )

    // Build progress map
    const answeredMap = {}
    answeredResult.rows.forEach(row => {
      if (!answeredMap[row.chapter_id]) {
        answeredMap[row.chapter_id] = { answered: [], total: 0 }
      }
      if (row.is_answered) {
        answeredMap[row.chapter_id].answered.push(row.question_id)
      }
    })

    // Calculate progress for each chapter
    const chapterProgress = CHAPTERS.map(chapter => {
      const progress = answeredMap[chapter.id] || { answered: [], total: 0 }
      const completedCount = progress.answered.length
      const percentage = Math.round((completedCount / chapter.totalQuestions) * 100)

      return {
        id: chapter.id,
        title: chapter.title,
        subtitle: chapter.subtitle,
        totalQuestions: chapter.totalQuestions,
        completedQuestions: completedCount,
        percentage,
        status: percentage === 100 ? 'complete' : percentage > 0 ? 'in_progress' : 'not_started',
        answeredQuestionIds: progress.answered
      }
    })

    // Calculate overall memoir progress
    const totalQuestions = CHAPTERS.reduce((sum, c) => sum + c.totalQuestions, 0)
    const totalAnswered = chapterProgress.reduce((sum, c) => sum + c.completedQuestions, 0)
    const overallPercentage = Math.round((totalAnswered / totalQuestions) * 100)

    // Identify gaps - chapters that need attention
    const gaps = chapterProgress
      .filter(c => c.status !== 'complete')
      .sort((a, b) => {
        // Prioritize chapters that are in progress but incomplete
        if (a.status === 'in_progress' && b.status === 'not_started') return -1
        if (a.status === 'not_started' && b.status === 'in_progress') return 1
        // Then by percentage (lower first)
        return a.percentage - b.percentage
      })
      .slice(0, 3)
      .map(c => ({
        chapterId: c.id,
        chapterTitle: c.title,
        reason:
          c.status === 'not_started'
            ? `You haven't started "${c.title}" yet`
            : `"${c.title}" is ${c.percentage}% complete`
      }))

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
    })
  })
)

export default router

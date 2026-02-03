// /life-story/server/utils/promptSelector.js

import pool from '../db/index.js';
import { personalizePrompt, isPromptAppropriate, getPromptTypeForStreak } from './promptUtils.js';

/**
 * Select a daily prompt for a user
 * Prioritizes questions from chapters with gaps in the memoir
 */
export async function selectDailyPrompt(userId, userContext = {}) {
  try {
    // Get user's game state
    const gameState = await pool.query(
      `SELECT current_streak, last_activity_date
       FROM user_game_state
       WHERE user_id = $1`,
      [userId]
    );

    const streak = gameState.rows[0]?.current_streak || 0;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Determine appropriate prompt type
    const targetType = getPromptTypeForStreak(streak, dayOfWeek);

    // Get prompts this user hasn't seen recently
    const recentPrompts = await pool.query(
      `SELECT linked_chapter_id, linked_question_id, prompt_text
       FROM daily_prompts
       WHERE user_id = $1
       ORDER BY prompt_date DESC
       LIMIT 30`,
      [userId]
    );

    const recentQuestionIds = recentPrompts.rows
      .filter(p => p.linked_question_id)
      .map(p => p.linked_question_id);

    const recentPromptTexts = recentPrompts.rows.map(p => p.prompt_text);

    // Get user's answered questions to avoid duplicates AND calculate chapter gaps
    const answeredQuestions = await pool.query(
      `SELECT chapter_id, question_id FROM stories
       WHERE user_id = $1 AND answer IS NOT NULL AND answer != ''`,
      [userId]
    );

    const answeredIds = answeredQuestions.rows.map(r => r.question_id);

    // Calculate chapter progress to identify gaps
    const chapterTotals = {
      'earliest-memories': 8, 'childhood': 10, 'school-days': 10,
      'teenage-years': 11, 'key-people': 8, 'young-adulthood': 10,
      'family-career': 10, 'world-around-you': 8, 'passions-beliefs': 8,
      'wisdom-reflections': 10
    };

    const chapterAnswered = {};
    answeredQuestions.rows.forEach(r => {
      if (!chapterAnswered[r.chapter_id]) chapterAnswered[r.chapter_id] = 0;
      chapterAnswered[r.chapter_id]++;
    });

    // Find chapters with gaps (not complete, prioritize in-progress over not-started)
    const chapterGaps = Object.entries(chapterTotals)
      .map(([id, total]) => ({
        id,
        total,
        answered: chapterAnswered[id] || 0,
        percentage: Math.round(((chapterAnswered[id] || 0) / total) * 100)
      }))
      .filter(c => c.percentage < 100)
      .sort((a, b) => {
        // Prioritize in-progress chapters over not-started
        const aStarted = a.answered > 0;
        const bStarted = b.answered > 0;
        if (aStarted && !bStarted) return -1;
        if (!aStarted && bStarted) return 1;
        // Then by percentage (lower = more gaps)
        return a.percentage - b.percentage;
      });

    // Get the top 3 chapters to focus on
    const priorityChapters = chapterGaps.slice(0, 3).map(c => c.id);

    // Get user context (birth year, memory graph)
    const userInfo = await pool.query(
      `SELECT u.birth_year, uo.birth_place, uo.birth_country
       FROM users u
       LEFT JOIN user_onboarding uo ON u.id = uo.user_id
       WHERE u.id = $1`,
      [userId]
    );

    const birthYear = userInfo.rows[0]?.birth_year;

    // Get recent memory graph entities for personalization
    const recentPeople = await pool.query(
      `SELECT name FROM memory_entities
       WHERE user_id = $1 AND entity_type = 'person'
       ORDER BY updated_at DESC
       LIMIT 5`,
      [userId]
    );

    const recentPlaces = await pool.query(
      `SELECT name FROM memory_entities
       WHERE user_id = $1 AND entity_type = 'place'
       ORDER BY updated_at DESC
       LIMIT 5`,
      [userId]
    );

    const fullContext = {
      ...userContext,
      birthYear,
      birthPlace: userInfo.rows[0]?.birth_place,
      recentPeople: recentPeople.rows,
      recentPlaces: recentPlaces.rows
    };

    // Build query to find appropriate prompt
    let query = `
      SELECT * FROM prompt_library
      WHERE is_active = true
        AND prompt_type = $1
        AND (min_streak_days IS NULL OR min_streak_days <= $2)
        AND prompt_text NOT IN (SELECT unnest($3::text[]))
    `;

    const params = [targetType, streak, recentPromptTexts];

    // Prefer prompts for unanswered questions
    if (answeredIds.length > 0) {
      query += ` AND (linked_question_id IS NULL OR linked_question_id NOT IN (SELECT unnest($${params.length + 1}::text[])))`;
      params.push(answeredIds);
    }

    // Prefer prompts not recently shown
    if (recentQuestionIds.length > 0) {
      query += ` AND (linked_question_id IS NULL OR linked_question_id NOT IN (SELECT unnest($${params.length + 1}::text[])))`;
      params.push(recentQuestionIds);
    }

    // Check day of week preference for deep prompts
    if (targetType === 'deep') {
      query += ` AND (preferred_day_of_week IS NULL OR preferred_day_of_week = $${params.length + 1})`;
      params.push(dayOfWeek);
    }

    // Add some randomness
    query += ` ORDER BY RANDOM() LIMIT 10`;

    const candidates = await pool.query(query, params);

    if (candidates.rows.length === 0) {
      // Fallback: get any prompt of the right type
      const fallback = await pool.query(
        `SELECT * FROM prompt_library
         WHERE is_active = true AND prompt_type = $1
         ORDER BY RANDOM() LIMIT 1`,
        [targetType]
      );

      if (fallback.rows.length === 0) {
        // Ultimate fallback
        const anyPrompt = await pool.query(
          `SELECT * FROM prompt_library WHERE is_active = true ORDER BY RANDOM() LIMIT 1`
        );
        return personalizePrompt(anyPrompt.rows[0], fullContext);
      }

      return personalizePrompt(fallback.rows[0], fullContext);
    }

    // Score candidates and pick the best one
    // PRIORITY: Fill gaps in the memoir by selecting prompts from incomplete chapters
    let bestPrompt = candidates.rows[0];
    let bestScore = 0;

    for (const prompt of candidates.rows) {
      let score = 0;

      // HIGHEST PRIORITY: Prompts from chapters with gaps (incomplete chapters)
      if (prompt.linked_chapter_id && priorityChapters.includes(prompt.linked_chapter_id)) {
        // Higher score for more incomplete chapters
        const chapterIndex = priorityChapters.indexOf(prompt.linked_chapter_id);
        score += 20 - (chapterIndex * 3); // 20 for most gaps, 17 for second, 14 for third
      }

      // Prefer prompts that link to unanswered questions
      if (prompt.linked_question_id && !answeredIds.includes(prompt.linked_question_id)) {
        score += 10;
      }

      // Prefer era-specific prompts if we have birth year
      if (prompt.era_specific && birthYear) {
        score += 5;
      }

      // Prefer prompts that can use memory graph
      if (prompt.requires_person_mention && recentPeople.rows.length > 0) {
        score += 3;
      }

      if (prompt.requires_place_mention && recentPlaces.rows.length > 0) {
        score += 3;
      }

      // Add small random factor
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestPrompt = prompt;
      }
    }

    // Add context about why this prompt was selected
    const selectedChapter = bestPrompt.linked_chapter_id;
    const chapterGap = chapterGaps.find(c => c.id === selectedChapter);
    if (chapterGap) {
      fullContext.selectionReason = chapterGap.answered === 0
        ? `Starting your "${selectedChapter.replace(/-/g, ' ')}" chapter`
        : `Continuing your "${selectedChapter.replace(/-/g, ' ')}" chapter (${chapterGap.percentage}% complete)`;
    }

    return personalizePrompt(bestPrompt, fullContext);
  } catch (error) {
    console.error('Error selecting daily prompt:', error);
    throw error;
  }
}

/**
 * Create today's prompt for a user
 */
export async function createDailyPrompt(userId) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if today's prompt already exists
    const existing = await pool.query(
      `SELECT * FROM daily_prompts WHERE user_id = $1 AND prompt_date = $2`,
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Select a new prompt
    const selectedPrompt = await selectDailyPrompt(userId);

    // Insert into daily_prompts
    const result = await pool.query(
      `INSERT INTO daily_prompts (
         user_id, prompt_date, prompt_type, prompt_category,
         prompt_text, prompt_hint, linked_chapter_id, linked_question_id,
         personalization_context
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        today,
        selectedPrompt.prompt_type,
        selectedPrompt.prompt_category,
        selectedPrompt.prompt_text,
        selectedPrompt.prompt_hint,
        selectedPrompt.linked_chapter_id,
        selectedPrompt.linked_question_id,
        JSON.stringify(selectedPrompt.personalization_context || {})
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating daily prompt:', error);
    throw error;
  }
}

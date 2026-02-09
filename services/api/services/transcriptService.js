import { getMemoryContext } from '../utils/memoryContext.js'
import { grokChat } from '../services/grokService.js'
import { sanitizeForPrompt } from '../utils/security.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('transcript-service')

/**
 * Compile raw voice transcripts into polished memoir prose.
 * Shared between web voice sessions and Telnyx phone call sessions.
 *
 * @param {object} db - Database pool/client
 * @param {number} userId - User ID
 * @param {number} sessionId - Voice session ID
 * @param {string[]} questionIds - Question IDs to compile
 */
export async function compileTranscripts(db, userId, sessionId, questionIds) {
  const memoryContext = await getMemoryContext(db, userId)

  for (const questionId of questionIds) {
    try {
      // Get raw transcript for this question
      const storyResult = await db.query(
        `SELECT id, answer, chapter_id FROM stories
         WHERE user_id = $1 AND voice_session_id = $2 AND question_id = $3
         AND compiled_content IS NULL`,
        [userId, sessionId, questionId]
      )

      if (!storyResult.rows[0]?.answer) continue

      const story = storyResult.rows[0]
      const safeAnswer = sanitizeForPrompt(story.answer, 5000)

      // Compile using AI
      const result = await grokChat({
        systemPrompt: `You are helping compile voice interview transcripts into polished memoir prose.

GUIDELINES:
1. Write in FIRST PERSON (I, me, my) - this is THEIR story
2. Keep their authentic voice and vocabulary - don't impose literary style
3. Organize the raw transcript into flowing narrative
4. Fill in natural transitions between thoughts
5. Keep it genuine - don't invent facts not mentioned
6. Aim for 150-300 words
7. Write ONLY the story - no meta-commentary or introductions

${memoryContext ? `Known context about their story: ${memoryContext}` : ''}`,
        userPrompt: `Raw voice transcript:\n\n${safeAnswer}\n\nPlease write the polished memoir passage.`,
        maxTokens: 600,
        temperature: 0.7
      })

      if (result.content) {
        // Save compiled content
        await db.query(
          `UPDATE stories
           SET compiled_content = $1, compiled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [result.content, story.id]
        )

        logger.info('Compiled transcript', { userId, sessionId, questionId })
      }
    } catch (err) {
      logger.error('Failed to compile transcript', {
        userId,
        sessionId,
        questionId,
        error: err.message
      })
    }
  }

  // Update session
  await db.query(
    `UPDATE voice_sessions
     SET questions_since_compile = 0, last_compile_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sessionId]
  )
}

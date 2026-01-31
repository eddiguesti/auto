import { Router } from 'express'
import crypto from 'crypto'

const router = Router()

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  apiUrl: 'https://api.telegram.org/bot',
  timeout: 10000
}

// Chapters data (subset for Telegram interview)
const TELEGRAM_CHAPTERS = [
  {
    id: 'earliest-memories',
    title: 'Earliest Memories',
    questions: [
      { id: 'birth-details', question: "Where were you born?", prompt: "The hospital, city, or country. Do you know any stories about the day you arrived?" },
      { id: 'first-memory', question: "What's your very first memory?", prompt: "Don't worry if it's fuzzy - even fragments are precious." },
      { id: 'childhood-home', question: "What did your childhood home look like?", prompt: "Walk me through the front door. What would I see, smell, hear?" }
    ]
  },
  {
    id: 'childhood',
    title: 'Childhood',
    questions: [
      { id: 'childhood-games', question: "What games did you play as a child?", prompt: "Who did you play with? Were you outside or inside?" },
      { id: 'summer-holidays', question: "Describe a typical summer day during the holidays.", prompt: "From when you woke up to when you went to bed." },
      { id: 'best-friend', question: "Who was your best friend?", prompt: "What adventures did you have together?" }
    ]
  },
  {
    id: 'key-people',
    title: 'Key People',
    questions: [
      { id: 'mother', question: "Tell me about your mother.", prompt: "What was she like? What do you remember most about her?" },
      { id: 'father', question: "Tell me about your father.", prompt: "What was he like? What do you remember most about him?" },
      { id: 'grandparents', question: "What do you remember about your grandparents?", prompt: "Did you know them? Where did they live?" }
    ]
  }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send message to Telegram chat
 */
async function sendTelegramMessage(chatId, text, options = {}) {
  if (!CONFIG.botToken) {
    console.error('[Telegram] Bot token not configured')
    return false
  }

  try {
    const response = await fetch(
      `${CONFIG.apiUrl}${CONFIG.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          ...options
        })
      }
    )

    const data = await response.json()
    if (!data.ok) {
      console.error('[Telegram] API error:', data.description)
      return false
    }
    return data.result
  } catch (err) {
    console.error('[Telegram] Send error:', err.message)
    return false
  }
}

/**
 * Generate a unique link code
 */
function generateLinkCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

/**
 * Get or create Telegram user
 */
async function getOrCreateTelegramUser(db, telegramData) {
  const { chat_id, username, first_name, last_name } = telegramData

  // Check if user exists
  let result = await db.query(
    'SELECT * FROM telegram_users WHERE telegram_chat_id = $1',
    [chat_id.toString()]
  )

  if (result.rows.length > 0) {
    return result.rows[0]
  }

  // Create new user
  result = await db.query(`
    INSERT INTO telegram_users (telegram_chat_id, telegram_username, telegram_first_name, telegram_last_name)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [chat_id.toString(), username || null, first_name || null, last_name || null])

  return result.rows[0]
}

/**
 * Get or create session for user
 */
async function getOrCreateSession(db, telegramUserId) {
  let result = await db.query(
    'SELECT * FROM telegram_sessions WHERE telegram_user_id = $1',
    [telegramUserId]
  )

  if (result.rows.length > 0) {
    return result.rows[0]
  }

  result = await db.query(`
    INSERT INTO telegram_sessions (telegram_user_id, session_state, context)
    VALUES ($1, 'idle', '{}')
    RETURNING *
  `, [telegramUserId])

  return result.rows[0]
}

/**
 * Update session state
 */
async function updateSession(db, sessionId, updates) {
  const { state, chapter_id, question_id, context } = updates

  await db.query(`
    UPDATE telegram_sessions
    SET session_state = COALESCE($1, session_state),
        current_chapter_id = COALESCE($2, current_chapter_id),
        current_question_id = COALESCE($3, current_question_id),
        context = COALESCE($4, context),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
  `, [state, chapter_id, question_id, context ? JSON.stringify(context) : null, sessionId])
}

/**
 * Save message to database
 */
async function saveMessage(db, telegramUserId, messageId, direction, content) {
  await db.query(`
    INSERT INTO telegram_messages (telegram_user_id, message_id, direction, content)
    VALUES ($1, $2, $3, $4)
  `, [telegramUserId, messageId?.toString(), direction, content])
}

/**
 * Get next question for interview
 */
function getNextQuestion(currentChapterId, currentQuestionId) {
  if (!currentChapterId) {
    // Start with first chapter, first question
    const chapter = TELEGRAM_CHAPTERS[0]
    return { chapter, question: chapter.questions[0], isFirst: true }
  }

  const chapterIndex = TELEGRAM_CHAPTERS.findIndex(c => c.id === currentChapterId)
  if (chapterIndex === -1) return null

  const chapter = TELEGRAM_CHAPTERS[chapterIndex]
  const questionIndex = chapter.questions.findIndex(q => q.id === currentQuestionId)

  // Try next question in same chapter
  if (questionIndex < chapter.questions.length - 1) {
    return { chapter, question: chapter.questions[questionIndex + 1] }
  }

  // Try next chapter
  if (chapterIndex < TELEGRAM_CHAPTERS.length - 1) {
    const nextChapter = TELEGRAM_CHAPTERS[chapterIndex + 1]
    return { chapter: nextChapter, question: nextChapter.questions[0], newChapter: true }
  }

  // End of interview
  return null
}

/**
 * Save story answer
 */
async function saveStoryAnswer(db, userId, chapterId, questionId, answer) {
  await db.query(`
    INSERT INTO stories (user_id, chapter_id, question_id, answer)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, chapter_id, question_id)
    DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
  `, [userId, chapterId, questionId, answer])
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Handle /start command
 */
async function handleStart(db, telegramUser, session, chatId) {
  const firstName = telegramUser.telegram_first_name || 'there'

  if (telegramUser.user_id) {
    // Linked user - they're already connected
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [telegramUser.user_id])
    const userName = userResult.rows[0]?.name || firstName

    await sendTelegramMessage(chatId,
      `👋 Welcome back, ${userName}!\n\n` +
      `Your Telegram is connected to your Easy Memoir account.\n\n` +
      `Commands:\n` +
      `/interview - Continue your memoir interview\n` +
      `/progress - See your story progress\n` +
      `/help - Get help`
    )
    await updateSession(db, session.id, { state: 'idle' })
    return
  }

  if (telegramUser.is_registered && telegramUser.guest_name) {
    // Guest user who already registered
    await sendTelegramMessage(chatId,
      `👋 Welcome back, ${telegramUser.guest_name}!\n\n` +
      `Commands:\n` +
      `/interview - Continue your memoir interview\n` +
      `/link - Connect to your Easy Memoir web account\n` +
      `/help - Get help`
    )
    await updateSession(db, session.id, { state: 'idle' })
    return
  }

  // New user - start registration
  await sendTelegramMessage(chatId,
    `👋 Welcome to *Easy Memoir*!\n\n` +
    `I'm here to help you capture your life story through guided questions.\n\n` +
    `To get started, I just need a few details.\n\n` +
    `*What should I call you?*\n` +
    `(Please type your name)`
  )
  await updateSession(db, session.id, { state: 'registering', context: { step: 'name' } })
}

/**
 * Handle registration flow
 */
async function handleRegistration(db, telegramUser, session, chatId, text) {
  const context = typeof session.context === 'string' ? JSON.parse(session.context) : (session.context || {})

  if (context.step === 'name') {
    // Save name
    await db.query(
      'UPDATE telegram_users SET guest_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [text.trim(), telegramUser.id]
    )

    await sendTelegramMessage(chatId,
      `Nice to meet you, *${text.trim()}*! 🌟\n\n` +
      `Now, what's your email address?\n` +
      `(This helps us keep your stories safe and lets you access them on the web)`
    )
    await updateSession(db, session.id, { context: { step: 'email', name: text.trim() } })
    return
  }

  if (context.step === 'email') {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text.trim())) {
      await sendTelegramMessage(chatId,
        `That doesn't look like a valid email. Please try again:`
      )
      return
    }

    // Save email and complete registration
    await db.query(
      'UPDATE telegram_users SET guest_email = $1, is_registered = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [text.trim().toLowerCase(), telegramUser.id]
    )

    await sendTelegramMessage(chatId,
      `✅ Perfect! You're all set, *${context.name}*!\n\n` +
      `You can now:\n` +
      `• /interview - Start capturing your memories\n` +
      `• /link - Connect to an existing Easy Memoir account\n\n` +
      `Ready to begin? Type /interview to start your memoir journey! 📖`
    )
    await updateSession(db, session.id, { state: 'idle', context: {} })
  }
}

/**
 * Handle /interview command - start or continue interview
 */
async function handleInterview(db, telegramUser, session, chatId) {
  if (!telegramUser.is_registered && !telegramUser.user_id) {
    await sendTelegramMessage(chatId,
      `Please complete registration first by typing /start`
    )
    return
  }

  const next = getNextQuestion(session.current_chapter_id, session.current_question_id)

  if (!next) {
    await sendTelegramMessage(chatId,
      `🎉 Amazing! You've completed all the interview questions!\n\n` +
      `Visit easymemoir.co.uk to see your full memoir and export it as a beautiful book.`
    )
    return
  }

  let message = ''
  if (next.isFirst) {
    message = `📖 *Let's begin your memoir!*\n\n` +
      `We'll start with *${next.chapter.title}*.\n\n`
  } else if (next.newChapter) {
    message = `📖 *${next.chapter.title}*\n\n` +
      `Great progress! Let's move on to a new chapter.\n\n`
  }

  message += `*${next.question.question}*\n\n` +
    `_${next.question.prompt}_`

  await sendTelegramMessage(chatId, message)
  await updateSession(db, session.id, {
    state: 'waiting_answer',
    chapter_id: next.chapter.id,
    question_id: next.question.id
  })
}

/**
 * Handle interview answer
 */
async function handleAnswer(db, telegramUser, session, chatId, text) {
  // Get the user ID to save the story
  const userId = telegramUser.user_id

  if (!userId) {
    // For guest users, just store in context for now
    const context = typeof session.context === 'string' ? JSON.parse(session.context) : (session.context || {})
    const answers = context.answers || {}
    answers[`${session.current_chapter_id}:${session.current_question_id}`] = text
    await updateSession(db, session.id, { context: { ...context, answers } })
  } else {
    // Save to stories table for linked users
    await saveStoryAnswer(db, userId, session.current_chapter_id, session.current_question_id, text)
  }

  await sendTelegramMessage(chatId, `✨ Beautifully captured! Thank you for sharing.\n\nLet me get the next question...`)

  // Move to next question
  const next = getNextQuestion(session.current_chapter_id, session.current_question_id)

  if (!next) {
    await sendTelegramMessage(chatId,
      `🎉 *Congratulations!*\n\n` +
      `You've completed all the interview questions!\n\n` +
      `Your stories are safe and waiting for you at easymemoir.co.uk\n\n` +
      (userId ? `They're already synced with your account.` : `Type /link to connect your account and access them online.`)
    )
    await updateSession(db, session.id, { state: 'completed' })
    return
  }

  let message = ''
  if (next.newChapter) {
    message = `📖 *New Chapter: ${next.chapter.title}*\n\n`
  }

  message += `*${next.question.question}*\n\n_${next.question.prompt}_`

  await sendTelegramMessage(chatId, message)
  await updateSession(db, session.id, {
    chapter_id: next.chapter.id,
    question_id: next.question.id
  })
}

/**
 * Handle /link command - generate link code
 */
async function handleLink(db, telegramUser, session, chatId) {
  if (telegramUser.user_id) {
    await sendTelegramMessage(chatId,
      `✅ Your Telegram is already connected to your Easy Memoir account!`
    )
    return
  }

  // Generate link code
  const linkCode = generateLinkCode()
  const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await db.query(`
    UPDATE telegram_users
    SET link_code = $1, link_code_expires = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [linkCode, expires, telegramUser.id])

  await sendTelegramMessage(chatId,
    `🔗 *Connect Your Account*\n\n` +
    `To link your Easy Memoir web account:\n\n` +
    `1. Go to easymemoir.co.uk\n` +
    `2. Log in or create an account\n` +
    `3. Go to Settings → Connect Telegram\n` +
    `4. Enter this code:\n\n` +
    `\`${linkCode}\`\n\n` +
    `_This code expires in 15 minutes._`
  )
}

/**
 * Handle /progress command
 */
async function handleProgress(db, telegramUser, session, chatId) {
  let answeredCount = 0
  const totalQuestions = TELEGRAM_CHAPTERS.reduce((sum, c) => sum + c.questions.length, 0)

  if (telegramUser.user_id) {
    // Count from stories table
    const result = await db.query(
      'SELECT COUNT(*) as count FROM stories WHERE user_id = $1 AND answer IS NOT NULL',
      [telegramUser.user_id]
    )
    answeredCount = parseInt(result.rows[0].count) || 0
  } else {
    // Count from session context
    const context = typeof session.context === 'string' ? JSON.parse(session.context) : (session.context || {})
    answeredCount = Object.keys(context.answers || {}).length
  }

  const progress = Math.round((answeredCount / totalQuestions) * 100)

  await sendTelegramMessage(chatId,
    `📊 *Your Progress*\n\n` +
    `Questions answered: ${answeredCount}/${totalQuestions}\n` +
    `Progress: ${progress}%\n\n` +
    `${progress < 100 ? 'Type /interview to continue!' : '🎉 You\'ve completed all questions!'}`
  )
}

/**
 * Handle /help command
 */
async function handleHelp(chatId) {
  await sendTelegramMessage(chatId,
    `📚 *Easy Memoir Help*\n\n` +
    `Commands:\n` +
    `/start - Start or restart\n` +
    `/interview - Continue your memoir\n` +
    `/progress - See your progress\n` +
    `/link - Connect web account\n` +
    `/skip - Skip current question\n` +
    `/help - Show this message\n\n` +
    `Need support? Email support@easymemoir.co.uk`
  )
}

/**
 * Handle /skip command
 */
async function handleSkip(db, telegramUser, session, chatId) {
  if (session.session_state !== 'waiting_answer') {
    await sendTelegramMessage(chatId, `There's no question to skip. Type /interview to start.`)
    return
  }

  // Move to next question
  const next = getNextQuestion(session.current_chapter_id, session.current_question_id)

  if (!next) {
    await sendTelegramMessage(chatId,
      `That was the last question! 🎉\n\n` +
      `Visit easymemoir.co.uk to see your memoir.`
    )
    await updateSession(db, session.id, { state: 'completed' })
    return
  }

  let message = '⏭️ Skipped.\n\n'
  if (next.newChapter) {
    message += `📖 *New Chapter: ${next.chapter.title}*\n\n`
  }
  message += `*${next.question.question}*\n\n_${next.question.prompt}_`

  await sendTelegramMessage(chatId, message)
  await updateSession(db, session.id, {
    chapter_id: next.chapter.id,
    question_id: next.question.id
  })
}

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * Handle incoming Telegram webhook
 */
export async function handleTelegramWebhook(req, res, db) {
  try {
    const update = req.body

    // Acknowledge receipt immediately
    res.json({ ok: true })

    // Only handle messages
    if (!update.message || !update.message.text) {
      return
    }

    const message = update.message
    const chatId = message.chat.id
    const text = message.text.trim()
    const messageId = message.message_id

    // Get or create telegram user
    const telegramUser = await getOrCreateTelegramUser(db, {
      chat_id: chatId,
      username: message.from?.username,
      first_name: message.from?.first_name,
      last_name: message.from?.last_name
    })

    // Get or create session
    const session = await getOrCreateSession(db, telegramUser.id)

    // Save incoming message
    await saveMessage(db, telegramUser.id, messageId, 'incoming', text)

    // Handle commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase()

      switch (command) {
        case '/start':
          await handleStart(db, telegramUser, session, chatId)
          break
        case '/interview':
          await handleInterview(db, telegramUser, session, chatId)
          break
        case '/link':
          await handleLink(db, telegramUser, session, chatId)
          break
        case '/progress':
          await handleProgress(db, telegramUser, session, chatId)
          break
        case '/help':
          await handleHelp(chatId)
          break
        case '/skip':
          await handleSkip(db, telegramUser, session, chatId)
          break
        default:
          await sendTelegramMessage(chatId, `Unknown command. Type /help for available commands.`)
      }
      return
    }

    // Handle based on session state
    switch (session.session_state) {
      case 'registering':
        await handleRegistration(db, telegramUser, session, chatId, text)
        break
      case 'waiting_answer':
        await handleAnswer(db, telegramUser, session, chatId, text)
        break
      default:
        // Idle state - prompt them to start
        await sendTelegramMessage(chatId,
          `Type /interview to continue your memoir, or /help for commands.`
        )
    }
  } catch (err) {
    console.error('[Telegram] Webhook error:', err)
    // Don't send error response - already sent ok
  }
}

// ============================================================================
// LINK CODE VERIFICATION (called from webapp)
// ============================================================================

router.post('/verify-link', async (req, res) => {
  try {
    const { code } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!code) {
      return res.status(400).json({ error: 'Link code required' })
    }

    const db = req.app.locals.db
    if (!db) {
      return res.status(500).json({ error: 'Database not available' })
    }

    // Find telegram user with this code
    const result = await db.query(`
      SELECT * FROM telegram_users
      WHERE link_code = $1 AND link_code_expires > CURRENT_TIMESTAMP
    `, [code.toUpperCase()])

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    const telegramUser = result.rows[0]

    // Link the accounts
    await db.query(`
      UPDATE telegram_users
      SET user_id = $1, link_code = NULL, link_code_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [userId, telegramUser.id])

    // If the telegram user has guest answers in their session, migrate them
    const sessionResult = await db.query(
      'SELECT context FROM telegram_sessions WHERE telegram_user_id = $1',
      [telegramUser.id]
    )

    if (sessionResult.rows.length > 0) {
      const context = typeof sessionResult.rows[0].context === 'string'
        ? JSON.parse(sessionResult.rows[0].context)
        : (sessionResult.rows[0].context || {})

      if (context.answers) {
        // Migrate answers to stories table
        for (const [key, answer] of Object.entries(context.answers)) {
          const [chapterId, questionId] = key.split(':')
          await db.query(`
            INSERT INTO stories (user_id, chapter_id, question_id, answer)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, chapter_id, question_id)
            DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
          `, [userId, chapterId, questionId, answer])
        }

        // Clear answers from session context
        delete context.answers
        await db.query(
          'UPDATE telegram_sessions SET context = $1 WHERE telegram_user_id = $2',
          [JSON.stringify(context), telegramUser.id]
        )
      }
    }

    // Send confirmation to Telegram
    await sendTelegramMessage(telegramUser.telegram_chat_id,
      `✅ *Account Linked!*\n\n` +
      `Your Telegram is now connected to your Easy Memoir account.\n\n` +
      `Your stories will automatically sync between Telegram and the web.`
    )

    res.json({ success: true, message: 'Account linked successfully' })
  } catch (err) {
    console.error('[Telegram] Link verification error:', err)
    res.status(500).json({ error: 'Failed to verify link code' })
  }
})

// Get link status (check if user has telegram connected)
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const db = req.app.locals.db
    if (!db) {
      return res.json({ connected: false })
    }

    const result = await db.query(
      'SELECT telegram_username, telegram_first_name FROM telegram_users WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({ connected: false })
    }

    const telegramUser = result.rows[0]
    res.json({
      connected: true,
      username: telegramUser.telegram_username,
      firstName: telegramUser.telegram_first_name
    })
  } catch (err) {
    console.error('[Telegram] Status check error:', err)
    res.json({ connected: false })
  }
})

export default router

import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger('support')

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    apiUrl: 'https://api.telegram.org/bot',
    timeout: 10000
  },
  escalation: {
    maxMessagesBeforeEscalation: 3,
    humanRequestPatterns: /\b(human|person|real|agent|support|help me|speak to|talk to|someone)\b/i
  }
}

// Validate Telegram config on startup
const isTelegramConfigured = Boolean(CONFIG.telegram.botToken && CONFIG.telegram.chatId)
if (!isTelegramConfigured) {
  logger.warn('Telegram not configured - escalation will be disabled')
}

// ============================================================================
// FAQ DATABASE
// ============================================================================

const FAQ_DATABASE = {
  // Account & Login
  login: {
    category: 'Account',
    keywords: [
      'login',
      'sign in',
      'cant login',
      "can't login",
      'password',
      'forgot password',
      'reset password'
    ],
    answer:
      "To login, go to the login page and enter your email and password. If you forgot your password, click 'Forgot Password' to reset it. You can also sign in with Google for easier access."
  },
  account: {
    category: 'Account',
    keywords: ['account', 'create account', 'register', 'sign up', 'new account'],
    answer:
      "To create an account, click 'Get Started' on the homepage and fill in your details. You can register with email/password or use Google sign-in for a quicker setup."
  },

  // Book & Export
  export: {
    category: 'Book',
    keywords: ['export', 'download', 'pdf', 'print', 'get my book'],
    answer:
      "To export your memoir, go to 'Preview & Export' from your home page. You can download as PDF for free, or order a professionally printed book in paperback, hardcover, or deluxe edition."
  },
  cover: {
    category: 'Book',
    keywords: ['cover', 'book cover', 'design', 'ai art', 'generate cover', 'artwork'],
    answer:
      "To design your book cover, click 'Style Your Memoir' from the home page. You can generate AI artwork, upload your own images, customize text, and choose from various templates."
  },

  // Voice & Writing
  voice: {
    category: 'Features',
    keywords: ['voice', 'talk', 'speak', 'microphone', 'recording', 'speech'],
    answer:
      "To use voice mode, click 'Talk' on any chapter. Make sure your browser has microphone permissions enabled. Speak naturally and the AI will transcribe and help expand your stories."
  },
  writing: {
    category: 'Features',
    keywords: ['write', 'typing', 'chapter', 'question', 'answer', 'how to write'],
    answer:
      "Click 'Write' on any chapter to answer questions by typing. Take your time - your progress is saved automatically. The AI can help expand your answers into full stories."
  },

  // Pricing & Orders
  pricing: {
    category: 'Orders',
    keywords: ['price', 'cost', 'how much', 'pricing', 'payment', 'pay'],
    answer:
      'Our complete memoir package is £299 (50% off £599) and includes a beautiful colour royal hardcover book in cloth, a professional audiobook, and talk over the phone features. You can also pay over 3 months at £99.67/month. All prices include shipping.'
  },
  order: {
    category: 'Orders',
    keywords: ['order', 'shipping', 'delivery', 'track', 'where is my', 'arrived', 'dispatch'],
    answer:
      "After ordering, you'll receive a confirmation email with tracking info. Books typically arrive in 7-14 business days. For order status, check your email or contact support."
  },

  // Technical Issues
  technical: {
    category: 'Technical',
    keywords: [
      'not working',
      'broken',
      'error',
      'bug',
      'problem',
      'issue',
      'stuck',
      'crash',
      'failed'
    ],
    answer:
      "Try refreshing the page or clearing your browser cache. Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge). If the problem persists, I'll connect you with our support team."
  },
  slow: {
    category: 'Technical',
    keywords: ['slow', 'loading', 'takes long', 'waiting', 'forever', 'spinning'],
    answer:
      'AI generation can take 10-30 seconds. If pages are loading slowly, try refreshing or check your internet connection. For cover generation, please wait for the progress indicator to complete.'
  }
}

// Build keyword index for O(1) lookup
const keywordIndex = new Map()
for (const [topicId, topic] of Object.entries(FAQ_DATABASE)) {
  for (const keyword of topic.keywords) {
    keywordIndex.set(keyword.toLowerCase(), { topicId, ...topic })
  }
}

// ============================================================================
// RESPONSE MESSAGES
// ============================================================================

const MESSAGES = {
  escalationSuccess:
    "I've notified our support team about your question. They'll get back to you via email shortly. Is there anything else I can help with in the meantime?",
  escalationFailure:
    "I'm having trouble reaching our support team right now. Please try again later or email us directly at support@easymemoir.co.uk",
  fallback: `I'm not sure I understand your question. Could you tell me more about what you need help with? For example:

• Login or account issues
• Exporting or printing your book
• Voice or writing features
• Pricing and orders
• Technical problems

Or type 'speak to support' to connect with a real person.`,
  missingMessage: 'Message is required'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize text for Telegram Markdown
 */
function escapeMarkdown(text) {
  if (!text) return ''
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

/**
 * Find FAQ response by matching keywords in message
 */
function findFAQResponse(message) {
  const words = message.toLowerCase().split(/\s+/)

  // First try exact phrase matches (more specific)
  const lowerMessage = message.toLowerCase()
  for (const [keyword, topic] of keywordIndex) {
    if (keyword.includes(' ') && lowerMessage.includes(keyword)) {
      return {
        matched: true,
        answer: topic.answer,
        topicId: topic.topicId,
        category: topic.category
      }
    }
  }

  // Then try single word matches
  for (const word of words) {
    const topic = keywordIndex.get(word)
    if (topic) {
      return {
        matched: true,
        answer: topic.answer,
        topicId: topic.topicId,
        category: topic.category
      }
    }
  }

  return { matched: false }
}

/**
 * Check if user wants human support
 */
function wantsHumanSupport(message) {
  return CONFIG.escalation.humanRequestPatterns.test(message)
}

/**
 * Send message to Telegram
 */
async function sendToTelegram({ message, userEmail, userName, conversationHistory = [] }) {
  if (!isTelegramConfigured) {
    logger.error('Cannot send to Telegram - not configured')
    return false
  }

  try {
    const historyText =
      conversationHistory.length > 0
        ? '\n\n📜 *Previous messages:*\n' +
          conversationHistory
            .map(m => `${m.role === 'user' ? '👤' : '🤖'} ${escapeMarkdown(m.content)}`)
            .join('\n')
        : ''

    const text = `🆘 *Support Request*

👤 *User:* ${escapeMarkdown(userName) || 'Unknown'}
📧 *Email:* ${escapeMarkdown(userEmail) || 'Not provided'}

💬 *Message:*
${escapeMarkdown(message)}${historyText}

───────────────
_Sent from Easy Memoir Help Chat_`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.telegram.timeout)

    const response = await fetch(
      `${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.telegram.chatId,
          text,
          parse_mode: 'Markdown'
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    const data = await response.json()

    if (!data.ok) {
      logger.error('Telegram API error', { error: data.description })
      return false
    }

    logger.info('Message sent to Telegram successfully')
    return true
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.error('Telegram request timed out')
    } else {
      logger.error('Failed to send to Telegram', { error: err.message })
    }
    return false
  }
}

// ============================================================================
// ESCALATION FLOOD PROTECTION (in-memory, per-IP)
// ============================================================================

const escalationTracker = new Map()
const MAX_ESCALATIONS_PER_HOUR = 3

function canEscalate(ip) {
  const now = Date.now()
  const key = `esc:${ip}`
  const timestamps = escalationTracker.get(key) || []
  // Remove entries older than 1 hour
  const recent = timestamps.filter(t => now - t < 3600000)
  escalationTracker.set(key, recent)
  return recent.length < MAX_ESCALATIONS_PER_HOUR
}

function recordEscalation(ip) {
  const key = `esc:${ip}`
  const timestamps = escalationTracker.get(key) || []
  timestamps.push(Date.now())
  escalationTracker.set(key, timestamps)
}

// Periodic cleanup (every 10 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of escalationTracker) {
    const recent = timestamps.filter(t => now - t < 3600000)
    if (recent.length === 0) escalationTracker.delete(key)
    else escalationTracker.set(key, recent)
  }
}, 600000)

// ============================================================================
// ROUTES
// ============================================================================

const MAX_MESSAGE_LENGTH = 1000

/**
 * POST /chat - Main chat endpoint
 * Tries FAQ first, escalates to Telegram if needed
 */
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message, userEmail, userName, conversationHistory = [] } = req.body

    // Validate input
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: MESSAGES.missingMessage })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res
        .status(400)
        .json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` })
    }

    const trimmedMessage = message.trim()

    // Try FAQ match first
    const faqResult = findFAQResponse(trimmedMessage)
    if (faqResult.matched) {
      return res.json({
        response: faqResult.answer,
        source: 'faq',
        topic: faqResult.topicId,
        category: faqResult.category,
        escalated: false
      })
    }

    // Check if escalation is needed
    const shouldEscalate =
      wantsHumanSupport(trimmedMessage) ||
      conversationHistory.length >= CONFIG.escalation.maxMessagesBeforeEscalation

    if (shouldEscalate) {
      // Flood protection: limit escalations per IP
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown'
      if (!canEscalate(clientIp)) {
        return res.json({
          response:
            "You've already contacted support recently. Our team will get back to you via email shortly.",
          source: 'escalation_limited',
          escalated: false
        })
      }

      const escalated = await sendToTelegram({
        message: trimmedMessage,
        userEmail,
        userName,
        conversationHistory
      })

      if (escalated) {
        recordEscalation(clientIp)
      }

      return res.json({
        response: escalated ? MESSAGES.escalationSuccess : MESSAGES.escalationFailure,
        source: 'escalation',
        escalated
      })
    }

    // Return fallback response
    return res.json({
      response: MESSAGES.fallback,
      source: 'fallback',
      escalated: false
    })
  })
)

/**
 * POST /escalate - Direct escalation endpoint
 * For when user explicitly wants to contact support
 */
router.post(
  '/escalate',
  asyncHandler(async (req, res) => {
    const { message, userEmail, userName, issue } = req.body

    if (!message && !issue) {
      return res.status(400).json({ error: 'Message or issue is required' })
    }

    if (
      (message && message.length > MAX_MESSAGE_LENGTH) ||
      (issue && issue.length > MAX_MESSAGE_LENGTH)
    ) {
      return res
        .status(400)
        .json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` })
    }

    // Flood protection
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown'
    if (!canEscalate(clientIp)) {
      return res.json({
        success: false,
        error:
          "You've already contacted support recently. Our team will get back to you via email shortly."
      })
    }

    const fullMessage = issue
      ? `*Issue:* ${issue}\n\n*Details:* ${message || 'No additional details'}`
      : message

    const success = await sendToTelegram({
      message: fullMessage,
      userEmail,
      userName,
      conversationHistory: []
    })

    if (success) {
      recordEscalation(clientIp)
    }

    return res.json({ success })
  })
)

export default router

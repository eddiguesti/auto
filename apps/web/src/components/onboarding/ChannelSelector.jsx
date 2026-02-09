import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CHANNEL_OPTIONS - The 5 ways users can contribute to their memoir.
 *
 * FUTURE DEVS: When adding a new channel:
 * 1. Add it here with a unique `id` string
 * 2. Add the id to the `validChannels` array in services/api/routes/onboarding.js
 * 3. Build the activation flow that triggers when this channel is in a user's preferences
 *
 * Decision tree after selection (built separately, not in this component):
 *   phone    -> Collect phone number -> Schedule call -> Telnyx integration
 *   email    -> Already wired into weekly cron (services/api/cron/)
 *   telegram -> Show TelegramLinkModal -> Bot linking flow
 *   app      -> Show app store download links (coming soon)
 *   webapp   -> No additional action (user is already here)
 */
const CHANNEL_OPTIONS = [
  {
    id: 'phone',
    label: 'Phone Call',
    description:
      "I'll call you on any phone. If it's not a good time, just tell me when and I'll ring you then.",
    icon: 'phone',
    color: 'emerald'
  },
  {
    id: 'email',
    label: 'Weekly Email',
    description:
      "Each week you'll get an email with a topic. Click the link, and we'll chat about it.",
    icon: 'email',
    color: 'blue'
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Chat with me anytime through the Telegram app. Quick, easy, works on any device.',
    icon: 'telegram',
    color: 'sky'
  },
  {
    id: 'app',
    label: 'Mobile App',
    description: 'Use our app on your phone or tablet. Record memories anywhere, anytime.',
    icon: 'app',
    color: 'violet'
  },
  {
    id: 'webapp',
    label: 'Web App',
    description: 'Use this website right here in your browser. No downloads needed.',
    icon: 'webapp',
    color: 'amber'
  }
]

const INTRO_TEXT =
  'There are a few different ways we can work together. Pick whichever ones suit you best — you can always change your mind later.'

// --- Framer Motion Variants ---

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.9
  },
  visible: index => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
      delay: 1.5 + index * 0.7
    }
  }),
  idle: index => ({
    y: [0, -4, 0],
    transition: {
      y: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.4
      }
    }
  })
}

const checkmarkVariants = {
  hidden: { scale: 0, rotate: -90 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 500, damping: 15 }
  },
  exit: {
    scale: 0,
    rotate: 90,
    transition: { duration: 0.2 }
  }
}

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.2 }
  }
}

// --- Icon Components ---

function ChannelIcon({ type }) {
  const className = 'w-5 h-5 text-sepia'

  switch (type) {
    case 'phone':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      )
    case 'email':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      )
    case 'app':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    case 'webapp':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      )
    default:
      return null
  }
}

// --- Channel Card ---

/**
 * Individual channel option card.
 *
 * Animation lifecycle:
 *   1. hidden -> visible: Springs in from below during presentation phase
 *   2. visible -> idle: Gentle floating/breathing after landing
 *   3. Interactive: Hover lift, tap compress, selection glow + checkmark
 */
function ChannelCard({ channel, index, isSelected, isSelectable, hasLanded, onToggle }) {
  // Color mapping for selected state accents
  const colorStyles = {
    emerald: {
      border: 'border-emerald-400',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-300/50',
      iconBg: 'bg-emerald-100',
      glow: '0 0 20px rgba(16, 185, 129, 0.15)'
    },
    blue: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      ring: 'ring-blue-300/50',
      iconBg: 'bg-blue-100',
      glow: '0 0 20px rgba(59, 130, 246, 0.15)'
    },
    sky: {
      border: 'border-sky-400',
      bg: 'bg-sky-50',
      ring: 'ring-sky-300/50',
      iconBg: 'bg-sky-100',
      glow: '0 0 20px rgba(14, 165, 233, 0.15)'
    },
    violet: {
      border: 'border-violet-400',
      bg: 'bg-violet-50',
      ring: 'ring-violet-300/50',
      iconBg: 'bg-violet-100',
      glow: '0 0 20px rgba(139, 92, 246, 0.15)'
    },
    amber: {
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      ring: 'ring-amber-300/50',
      iconBg: 'bg-amber-100',
      glow: '0 0 20px rgba(245, 158, 11, 0.15)'
    }
  }

  const colors = colorStyles[channel.color]

  return (
    <motion.button
      onClick={onToggle}
      disabled={!isSelectable}
      className={`
        relative p-4 rounded-xl border-2 text-left transition-colors duration-200
        ${
          isSelected
            ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
            : 'border-sepia/15 bg-white hover:border-sepia/30'
        }
        ${isSelectable ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={isSelected ? { boxShadow: colors.glow } : {}}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate={hasLanded ? 'idle' : 'visible'}
      whileHover={isSelectable ? { y: -2, transition: { duration: 0.2 } } : {}}
      whileTap={isSelectable ? { scale: 0.98 } : {}}
    >
      {/* Icon circle */}
      <div
        className={`w-10 h-10 mb-3 mx-auto rounded-lg flex items-center justify-center transition-colors duration-200 ${
          isSelected ? colors.iconBg : 'bg-sepia/10'
        }`}
      >
        <ChannelIcon type={channel.icon} />
      </div>

      {/* Label */}
      <h3 className="text-sm font-medium text-ink mb-1 text-center">{channel.label}</h3>

      {/* Description */}
      <p className="text-xs text-warmgray leading-relaxed text-center">{channel.description}</p>

      {/* Selection checkmark badge */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 bg-sepia rounded-full flex items-center justify-center shadow-md"
            variants={checkmarkVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// --- Main Component ---

/**
 * ChannelSelector - Onboarding step where users pick how they want
 * to contribute to their memoir.
 *
 * Two phases:
 *   1. Presentation: Clio introduces each channel with animated text + cards
 *   2. Selection: User multi-selects preferred channels
 *
 * Props:
 *   - firstName: string - User's first name (for future personalisation)
 *   - onComplete: (channels: string[]) => void - Called with selected channel IDs
 *
 * FUTURE DEVS:
 *   The returned channel IDs drive what happens next in the user journey.
 *   See the comment block above CHANNEL_OPTIONS for the full decision tree.
 */
export default function ChannelSelector({ firstName, onComplete }) {
  const [phase, setPhase] = useState('presenting') // 'presenting' | 'selecting'
  const [selectedChannels, setSelectedChannels] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cardsLanded, setCardsLanded] = useState(0)

  // Auto-transition to selection phase after all cards have appeared
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('selecting')
    }, 5500) // All cards visible by ~5s, plus 500ms buffer
    return () => clearTimeout(timer)
  }, [])

  // Track when each card's entrance animation completes (for switching to idle float)
  useEffect(() => {
    const timers = CHANNEL_OPTIONS.map((_, i) =>
      setTimeout(
        () => setCardsLanded(prev => prev + 1),
        // Entrance delay (1.5 + i*0.7s) + spring settle time (~600ms)
        (1.5 + i * 0.7) * 1000 + 600
      )
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const toggleChannel = useCallback(
    channelId => {
      if (phase !== 'selecting') return
      setSelectedChannels(prev =>
        prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
      )
    },
    [phase]
  )

  const handleContinue = async () => {
    if (selectedChannels.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    await onComplete(selectedChannels)
  }

  // Split intro text into words for staggered reveal
  const words = INTRO_TEXT.split(' ')

  return (
    <div className="text-center">
      {/* Heading */}
      <motion.h2
        className="text-2xl font-display text-ink mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Now, how would you like to share your stories?
      </motion.h2>

      {/* Clio's intro — word-by-word reveal */}
      <p className="text-warmgray mb-6 leading-relaxed">
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="inline-block mr-[0.3em]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
          >
            {word}
          </motion.span>
        ))}
      </p>

      {/* Channel cards — flex-wrap, centered, 3 per row on desktop */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {CHANNEL_OPTIONS.map((channel, index) => (
          <div key={channel.id} className="w-full sm:w-[calc(33.333%-0.5rem)]">
            <ChannelCard
              channel={channel}
              index={index}
              isSelected={selectedChannels.includes(channel.id)}
              isSelectable={phase === 'selecting'}
              hasLanded={cardsLanded > index}
              onToggle={() => toggleChannel(channel.id)}
            />
          </div>
        ))}
      </div>

      {/* Prompt — fades in after all cards shown */}
      <motion.p
        className="text-sm text-warmgray/70 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.0, duration: 0.5 }}
      >
        Select as many as you like, then hit Continue.
      </motion.p>

      {/* Continue button — appears when 1+ channels selected */}
      <AnimatePresence>
        {selectedChannels.length > 0 && (
          <motion.button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition disabled:opacity-50"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {isSubmitting ? 'Setting things up...' : 'Continue'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

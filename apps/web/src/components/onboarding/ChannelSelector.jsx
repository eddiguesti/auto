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
export const CHANNEL_OPTIONS = [
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

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20 }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 }
  }
}

const buttonVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: {
    opacity: 0,
    y: 8,
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

function ChannelCard({ channel, index, isSelected, isSelectable, onToggle, entranceDelay }) {
  const colorStyles = {
    emerald: {
      border: 'border-emerald-400/70',
      bg: 'bg-emerald-50/50',
      iconBg: 'bg-emerald-100/80',
      glow: '0 0 24px rgba(16, 185, 129, 0.12)'
    },
    blue: {
      border: 'border-blue-400/70',
      bg: 'bg-blue-50/50',
      iconBg: 'bg-blue-100/80',
      glow: '0 0 24px rgba(59, 130, 246, 0.12)'
    },
    sky: {
      border: 'border-sky-400/70',
      bg: 'bg-sky-50/50',
      iconBg: 'bg-sky-100/80',
      glow: '0 0 24px rgba(14, 165, 233, 0.12)'
    },
    violet: {
      border: 'border-violet-400/70',
      bg: 'bg-violet-50/50',
      iconBg: 'bg-violet-100/80',
      glow: '0 0 24px rgba(139, 92, 246, 0.12)'
    },
    amber: {
      border: 'border-amber-400/70',
      bg: 'bg-amber-50/50',
      iconBg: 'bg-amber-100/80',
      glow: '0 0 24px rgba(245, 158, 11, 0.12)'
    }
  }

  const colors = colorStyles[channel.color]

  return (
    <motion.button
      onClick={onToggle}
      disabled={!isSelectable}
      className={`
        relative p-4 rounded-xl border text-left transition-all duration-300
        ${
          isSelected
            ? `${colors.border} ${colors.bg}`
            : 'border-sepia/10 bg-white/80 hover:border-sepia/25 hover:bg-white'
        }
        ${isSelectable ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{
        boxShadow: isSelected ? colors.glow : 'none'
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: entranceDelay
      }}
      whileHover={isSelectable ? { y: -2, transition: { duration: 0.25, ease: 'easeOut' } } : {}}
      whileTap={isSelectable ? { scale: 0.98 } : {}}
    >
      {/* Icon circle */}
      <div
        className={`w-10 h-10 mb-3 mx-auto rounded-lg flex items-center justify-center transition-colors duration-300 ${
          isSelected ? colors.iconBg : 'bg-sepia/8'
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
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-sepia rounded-full flex items-center justify-center shadow-sm"
            variants={checkmarkVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <svg
              className="w-3 h-3 text-white"
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

// --- Shared Cards + Selection UI (used by both standalone and inline modes) ---

/**
 * ChannelCards - The card grid + continue button, shared between
 * standalone mode (type form path) and inline mode (voice interview).
 *
 * Props:
 *   - selectedChannels / setSelectedChannels: selection state
 *   - isSelectable: whether cards can be toggled
 *   - entranceBase: base delay in seconds before first card appears
 *   - onContinue: called with selected channels when Continue is clicked
 *   - showPrompt: show the "Select as many..." text
 */
export function ChannelCards({
  selectedChannels,
  setSelectedChannels,
  isSelectable,
  entranceBase = 0.5,
  onContinue,
  showPrompt = true
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleChannel = useCallback(
    channelId => {
      if (!isSelectable) return
      setSelectedChannels(prev =>
        prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
      )
    },
    [isSelectable, setSelectedChannels]
  )

  const handleContinue = async () => {
    if (selectedChannels.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    await onContinue(selectedChannels)
  }

  return (
    <>
      {/* Channel cards */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {CHANNEL_OPTIONS.map((channel, index) => (
          <div key={channel.id} className="w-full sm:w-[calc(33.333%-0.5rem)]">
            <ChannelCard
              channel={channel}
              index={index}
              isSelected={selectedChannels.includes(channel.id)}
              isSelectable={isSelectable}
              onToggle={() => toggleChannel(channel.id)}
              entranceDelay={entranceBase + index * 0.12}
            />
          </div>
        ))}
      </div>

      {/* Prompt */}
      {showPrompt && (
        <motion.p
          className="text-sm text-warmgray/60 mb-4 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: entranceBase + 5 * 0.12 + 0.3, duration: 0.6 }}
        >
          Select as many as you like, then hit Continue.
        </motion.p>
      )}

      {/* Continue button */}
      <AnimatePresence>
        {selectedChannels.length > 0 && (
          <motion.button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition-colors duration-300 disabled:opacity-50"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {isSubmitting ? 'Setting things up...' : 'Continue'}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

// --- Main Component (standalone mode, used by type form path) ---

/**
 * ChannelSelector - Standalone onboarding step for TYPE FORM users.
 * Voice interview users see channel cards inline within the voice interview.
 *
 * Props:
 *   - firstName: string
 *   - onComplete: (channels: string[]) => void
 */
export default function ChannelSelector({ firstName, onComplete }) {
  const [phase, setPhase] = useState('presenting')
  const [selectedChannels, setSelectedChannels] = useState([])

  // Auto-transition to selection phase after cards have appeared
  useEffect(() => {
    const timer = setTimeout(() => setPhase('selecting'), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="text-center">
      {/* Heading */}
      <motion.h2
        className="text-2xl font-display text-ink mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        How would you like to share your stories?
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        className="text-warmgray mb-6 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {INTRO_TEXT}
      </motion.p>

      <ChannelCards
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
        isSelectable={phase === 'selecting'}
        entranceBase={0.5}
        onContinue={onComplete}
        showPrompt={true}
      />
    </div>
  )
}

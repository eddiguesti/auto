import { useState, useCallback } from 'react'
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
    description: "I'll call you and we'll chat naturally, just like talking to a friend.",
    icon: 'phone'
  },
  {
    id: 'email',
    label: 'Weekly Email',
    description: 'A new topic each week, delivered to your inbox. Reply whenever suits you.',
    icon: 'email'
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Message me anytime through Telegram. Quick and easy on any device.',
    icon: 'telegram'
  },
  {
    id: 'app',
    label: 'Mobile App',
    description: 'Record memories on the go with our app. Anywhere, anytime.',
    icon: 'app'
  },
  {
    id: 'webapp',
    label: 'This Website',
    description: 'Continue right here in your browser. Nothing to download.',
    icon: 'webapp'
  }
]

// --- Icon Components ---

function ChannelIcon({ type, className = 'w-6 h-6' }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
  const pathProps = { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.5 }

  switch (type) {
    case 'phone':
      return (
        <svg {...props}>
          <path
            {...pathProps}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      )
    case 'email':
      return (
        <svg {...props}>
          <path
            {...pathProps}
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
        <svg {...props}>
          <path
            {...pathProps}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    case 'webapp':
      return (
        <svg {...props}>
          <path
            {...pathProps}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      )
    default:
      return null
  }
}

// --- Framer Motion Variants (Apple-style: subtle, purposeful) ---

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: i => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
      delay: 0.1 + i * 0.06
    }
  })
}

const checkVariants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: { scale: 0.5, opacity: 0, transition: { duration: 0.15 } }
}

// --- Channel Card ---

function ChannelCard({ channel, index, isSelected, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`
        group relative w-full p-5 rounded-2xl text-left
        transition-[background,box-shadow,ring-color] duration-300 ease-out
        ${
          isSelected
            ? 'bg-white ring-2 ring-sepia/40 shadow-lg shadow-sepia/8'
            : 'bg-white/60 ring-1 ring-black/[0.04] hover:bg-white hover:ring-black/[0.08] hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
            transition-all duration-300
            ${isSelected ? 'bg-sepia text-white' : 'bg-sepia/[0.06] text-sepia group-hover:bg-sepia/[0.1]'}
          `}
        >
          <ChannelIcon type={channel.icon} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] font-semibold mb-0.5 transition-colors duration-300 ${
              isSelected ? 'text-ink' : 'text-ink/80'
            }`}
          >
            {channel.label}
          </h3>
          <p className="text-[13px] text-warmgray leading-relaxed">{channel.description}</p>
        </div>

        {/* Selection indicator */}
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`
              rounded-full border-2 flex items-center justify-center
              transition-all duration-300
              ${isSelected ? 'bg-sepia border-sepia' : 'border-black/15 group-hover:border-black/25'}
            `}
            style={{ width: 22, height: 22 }}
          >
            <AnimatePresence>
              {isSelected && (
                <motion.svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  variants={checkVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// --- Shared Cards + Selection UI ---

export function ChannelCards({
  selectedChannels,
  setSelectedChannels,
  onContinue,
  showPrompt = true
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleChannel = useCallback(
    channelId => {
      setSelectedChannels(prev =>
        prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
      )
    },
    [setSelectedChannels]
  )

  const handleContinue = async () => {
    if (selectedChannels.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    await onContinue(selectedChannels)
  }

  return (
    <>
      {/* Channel cards */}
      <div className="flex flex-col gap-2.5 mb-5">
        {CHANNEL_OPTIONS.map((channel, index) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            index={index}
            isSelected={selectedChannels.includes(channel.id)}
            onToggle={() => toggleChannel(channel.id)}
          />
        ))}
      </div>

      {/* Subtle prompt */}
      {showPrompt && (
        <motion.p
          className="text-[13px] text-warmgray/50 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Select as many as you like
        </motion.p>
      )}

      {/* Continue button */}
      <AnimatePresence>
        {selectedChannels.length > 0 && (
          <motion.button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full bg-sepia text-white px-8 py-4 rounded-2xl text-[17px] font-semibold hover:bg-ink transition-colors duration-300 disabled:opacity-50"
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
            }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
          >
            {isSubmitting ? 'Setting things up...' : 'Continue'}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

// --- Main Component ---

export default function ChannelSelector({ firstName, onComplete }) {
  const [selectedChannels, setSelectedChannels] = useState([])

  return (
    <div>
      {/* Heading */}
      <motion.h2
        className="text-2xl font-display text-ink mb-1.5 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        Choose how to share your story
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        className="text-warmgray text-center mb-6 text-[15px] leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        Pick the ways that work best for you — you can always change later.
      </motion.p>

      <ChannelCards
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
        onContinue={onComplete}
        showPrompt={true}
      />
    </div>
  )
}

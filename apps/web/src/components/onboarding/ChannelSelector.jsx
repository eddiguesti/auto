import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPhone, IconMail, IconWorld, IconCheck } from '@tabler/icons-react'
import { Button } from '../ui'

/**
 * CHANNEL_OPTIONS - The 5 ways users can contribute to their memoir.
 *
 * FUTURE DEVS: When adding a new channel:
 * 1. Add it here with a unique `id` string
 * 2. Add the id to the `validChannels` array in services/api/v1/routes/onboarding.js
 * 3. Build the activation flow that triggers when this channel is in a user's preferences
 *
 * Decision tree after selection (built separately, not in this component):
 *   phone    -> Collect phone number -> Schedule call -> Telnyx integration
 *   email    -> Already wired into weekly cron (services/api/v1/cron/)
 *   webapp   -> No additional action (user is already here)
 *
 * Removed until their activation flows exist (offering them was a dead end):
 *   telegram -> needs the bot-linking flow surfaced (backend routes/telegram.js exists)
 *   app      -> needs the mobile app shipped (apps/mobile is parked)
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
    id: 'webapp',
    label: 'This Website',
    description: 'Continue right here in your browser. Nothing to download.',
    icon: 'webapp'
  }
]

// --- Icons (Tabler) keyed by the `icon` field on CHANNEL_OPTIONS ---

const CHANNEL_ICONS = {
  phone: IconPhone,
  email: IconMail,
  webapp: IconWorld
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
  const Icon = CHANNEL_ICONS[channel.icon]

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      aria-pressed={isSelected}
      className={`group relative w-full p-5 rounded-2xl text-left bg-surface border transition-all duration-200 ease-out ${
        isSelected
          ? 'border-bronze-400 ring-4 ring-bronze-500/10'
          : 'border-sepia-200 hover:border-sepia-300'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200 ${
            isSelected ? 'bg-bronze-100 text-bronze-700' : 'bg-sepia-100 text-sepia-600'
          }`}
        >
          {Icon && <Icon size={24} stroke={1.5} />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-ink mb-0.5">{channel.label}</h3>
          <p className="text-sm text-sepia-600 leading-relaxed">{channel.description}</p>
        </div>

        {/* Selection indicator */}
        <div className="shrink-0 mt-0.5">
          <div
            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-200 ${
              isSelected
                ? 'bg-bronze-500 border-bronze-500 text-white'
                : 'border-sepia-300 group-hover:border-sepia-400'
            }`}
          >
            <AnimatePresence>
              {isSelected && (
                <motion.span
                  className="flex"
                  variants={checkVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <IconCheck size={14} stroke={3} />
                </motion.span>
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
          className="text-sm text-sepia-500 mb-4"
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
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
            }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
          >
            <Button size="xl" loading={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? 'Setting things up...' : 'Continue'}
            </Button>
          </motion.div>
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
        className="text-sepia-600 text-center mb-6 text-base leading-relaxed"
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

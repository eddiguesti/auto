import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconMap } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Modal, Button } from './ui'
import PreferenceSelector from './onboarding/PreferenceSelector'
import OnboardingVoiceInterview from './onboarding/OnboardingVoiceInterview'
import OnboardingTypeForm from './onboarding/OnboardingTypeForm'
import ChannelSelector from './onboarding/ChannelSelector'
import OnboardingOffer from './onboarding/OnboardingOffer'

// Onboarding steps
const STEPS = {
  WELCOME: 'welcome',
  PREFERENCE: 'preference',
  VOICE_INTERVIEW: 'voice_interview',
  TYPE_FORM: 'type_form',
  CHANNEL_SELECTION: 'channel_selection',
  OFFER: 'offer',
  TOUR_OFFER: 'tour_offer',
  PROCESSING: 'processing'
}

// Maps each step to its progress dot index (0–4)
const STEP_INDEX = {
  [STEPS.WELCOME]: 0,
  [STEPS.PREFERENCE]: 1,
  [STEPS.VOICE_INTERVIEW]: 2,
  [STEPS.TYPE_FORM]: 2,
  [STEPS.CHANNEL_SELECTION]: 3,
  [STEPS.TOUR_OFFER]: 4
}

const TOTAL_STEPS = 5

// Steps that show the progress indicator (offer step hides dots for focus)
const INDICATOR_STEPS = new Set([
  STEPS.WELCOME,
  STEPS.PREFERENCE,
  STEPS.VOICE_INTERVIEW,
  STEPS.TYPE_FORM,
  STEPS.CHANNEL_SELECTION,
  STEPS.TOUR_OFFER
])

// Steps that need the wider modal
const WIDE_STEPS = new Set([STEPS.CHANNEL_SELECTION, STEPS.VOICE_INTERVIEW])

// Smooth step crossfade — slides up on enter, fades up on exit
const stepVariants = {
  enter: { opacity: 0, y: 20 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

// Gentler fade for the processing state
const fadeVariants = {
  enter: { opacity: 0, scale: 0.98 },
  center: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
}

export default function OnboardingModal({ onClose, initialStep }) {
  const { authFetch, user, refreshUser } = useAuth()
  const [step, setStep] = useState(initialStep || STEPS.WELCOME)
  const [preference, setPreference] = useState(null)
  const [extractedContext, setExtractedContext] = useState(null)

  // Handle close — pass options through to the host page
  const handleClose = (options = {}) => {
    onClose(options)
  }

  // Save preference and move to next step
  const handlePreferenceSelect = async pref => {
    setPreference(pref)

    try {
      await authFetch('/api/onboarding/preference', {
        method: 'POST',
        body: JSON.stringify({ preference: pref })
      })
    } catch (err) {
      console.error('Failed to save preference:', err)
    }

    setStep(pref === 'voice' ? STEPS.VOICE_INTERVIEW : STEPS.TYPE_FORM)
  }

  // Handle voice interview completion — go straight to channels, extract context in background
  const handleVoiceComplete = transcripts => {
    setStep(STEPS.CHANNEL_SELECTION)

    // Extract context in the background — don't block the UI
    authFetch('/api/onboarding/context', {
      method: 'POST',
      body: JSON.stringify({ transcripts })
    })
      .then(res => res.json())
      .then(data => {
        setExtractedContext(data.extracted)
        if (data.userName) refreshUser()
      })
      .catch(err => console.error('Context extraction failed:', err))
  }

  // Handle type form submission — save context, then move to channel selection
  const handleTypeFormSubmit = async formData => {
    setStep(STEPS.PROCESSING)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const res = await authFetch('/api/onboarding/context-form', {
        method: 'POST',
        body: JSON.stringify(formData),
        signal: controller.signal
      })

      const data = await res.json()

      setExtractedContext({
        birth_place: formData.birthPlace,
        birth_country: formData.birthCountry,
        birth_year: formData.birthYear
      })

      if (data.userName) await refreshUser()
    } catch (err) {
      console.error('Form context save failed (continuing):', err)
    } finally {
      clearTimeout(timeout)
    }

    setStep(STEPS.CHANNEL_SELECTION)
  }

  // Handle channel selection completion — save preferences in background, show offer
  const handleChannelSelectionComplete = async selectedChannels => {
    // Save channel preferences in background — don't block the UI
    authFetch('/api/onboarding/channel-preferences', {
      method: 'POST',
      body: JSON.stringify({ channels: selectedChannels })
    }).catch(err => console.error('Channel save failed:', err))

    setStep(STEPS.OFFER)
  }

  // Handle "try free" from offer — mark onboarding complete, show tour
  const handleTryFree = () => {
    authFetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {})
    setStep(STEPS.TOUR_OFFER)
  }

  // Get first name for personalization
  const firstName = user?.name?.split(' ')[0] || 'there'
  const activeIndex = STEP_INDEX[step] ?? -1

  return (
    <Modal
      dismissable={false}
      ariaLabel="Welcome to Easy Memoir"
      size={WIDE_STEPS.has(step) ? 'xl' : 'lg'}
      className="transition-all duration-500"
    >
      {/* Content — AnimatePresence crossfades between steps */}
      <AnimatePresence mode="wait" initial={false}>
        {/* Welcome Step */}
        {step === STEPS.WELCOME && (
          <motion.div
            key="welcome"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center">
              <span className="font-display text-3xl">L</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display text-ink mb-3">
              Welcome, {firstName}!
            </h2>

            <p className="text-sepia-600 text-base mb-8 leading-relaxed">
              I'm Clio, and I'll be helping you capture your life story. Before we dive in, let me
              get to know you a little better.
            </p>

            <Button size="xl" onClick={() => setStep(STEPS.PREFERENCE)}>
              Let's Get Started
            </Button>
          </motion.div>
        )}

        {/* Preference Step */}
        {step === STEPS.PREFERENCE && (
          <motion.div
            key="preference"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <PreferenceSelector onSelect={handlePreferenceSelect} />
          </motion.div>
        )}

        {/* Voice Interview Step */}
        {step === STEPS.VOICE_INTERVIEW && (
          <motion.div
            key="voice"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <OnboardingVoiceInterview
              onComplete={handleVoiceComplete}
              onBack={() => setStep(STEPS.PREFERENCE)}
            />
          </motion.div>
        )}

        {/* Type Form Step */}
        {step === STEPS.TYPE_FORM && (
          <motion.div
            key="typeform"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <OnboardingTypeForm
              onSubmit={handleTypeFormSubmit}
              onBack={() => setStep(STEPS.PREFERENCE)}
            />
          </motion.div>
        )}

        {/* Channel Selection Step */}
        {step === STEPS.CHANNEL_SELECTION && (
          <motion.div
            key="channels"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <ChannelSelector firstName={firstName} onComplete={handleChannelSelectionComplete} />
          </motion.div>
        )}

        {/* Offer Step */}
        {step === STEPS.OFFER && (
          <motion.div
            key="offer"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <OnboardingOffer firstName={firstName} onTryFree={handleTryFree} />
          </motion.div>
        )}

        {/* Tour Offer Step */}
        {step === STEPS.TOUR_OFFER && (
          <motion.div
            key="tour"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center">
              <IconMap size={28} stroke={1.5} />
            </div>

            <h2 className="text-2xl font-display text-ink mb-2">You're all set, {firstName}!</h2>

            <p className="text-sepia-600 text-base mb-8 leading-relaxed">
              Would you like a quick tour of your memoir dashboard? It only takes a moment.
            </p>

            <div className="flex flex-col gap-3">
              <Button size="xl" onClick={() => handleClose({ showTour: true })}>
                Yes, show me around
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => handleClose({ showTour: false })}
              >
                No thanks, I'll explore on my own
              </Button>
            </div>
          </motion.div>
        )}

        {/* Processing Step */}
        {step === STEPS.PROCESSING && (
          <motion.div
            key="processing"
            variants={fadeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="text-center py-8"
          >
            <div
              className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-sepia-200 border-t-bronze-500 animate-spin"
              style={{ animationDuration: '1.2s' }}
            />
            <h3 className="text-xl font-display text-ink mb-2">Setting Up Your Journey</h3>
            <p className="text-sepia-600 text-base">
              Creating personalized chapter artwork just for you...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator — bronze pill dots with a quiet step count */}
      <AnimatePresence>
        {INDICATOR_STEPS.has(step) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    i === activeIndex
                      ? 'w-5 bg-bronze-500'
                      : i < activeIndex
                        ? 'w-1.5 bg-bronze-300'
                        : 'w-1.5 bg-sepia-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-sepia-500">
              Step {activeIndex + 1} of {TOTAL_STEPS}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

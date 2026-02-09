import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import PreferenceSelector from './onboarding/PreferenceSelector'
import OnboardingVoiceInterview from './onboarding/OnboardingVoiceInterview'
import OnboardingTypeForm from './onboarding/OnboardingTypeForm'
import ChannelSelector from './onboarding/ChannelSelector'

// Onboarding steps
const STEPS = {
  WELCOME: 'welcome',
  PREFERENCE: 'preference',
  VOICE_INTERVIEW: 'voice_interview',
  TYPE_FORM: 'type_form',
  CHANNEL_SELECTION: 'channel_selection',
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

// Steps that show the progress indicator
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
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [extractedContext, setExtractedContext] = useState(null)
  const rafIdRef = useRef(null)

  // Animate in on mount
  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(() => setIsVisible(true))
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  // Handle close with animation
  const handleClose = (options = {}) => {
    setIsClosing(true)
    setTimeout(() => onClose(options), 400)
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

  // Handle channel selection completion — save preferences, then ask about tour
  const handleChannelSelectionComplete = async selectedChannels => {
    setStep(STEPS.PROCESSING)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      await authFetch('/api/onboarding/channel-preferences', {
        method: 'POST',
        body: JSON.stringify({ channels: selectedChannels }),
        signal: controller.signal
      })

      await authFetch('/api/onboarding/complete', {
        method: 'POST',
        signal: controller.signal
      })
    } catch (err) {
      console.error('Channel save failed (continuing):', err)
    } finally {
      clearTimeout(timeout)
    }

    setStep(STEPS.TOUR_OFFER)
  }

  // Get first name for personalization
  const firstName = user?.name?.split(' ')[0] || 'there'
  const activeIndex = STEP_INDEX[step] ?? -1

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-out ${
        isVisible && !isClosing ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`relative w-full ${WIDE_STEPS.has(step) ? 'max-w-2xl' : 'max-w-lg'} mx-4 bg-gradient-to-b from-cream to-amber-50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-out ${
          isVisible && !isClosing
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.97] translate-y-3'
        }`}
      >
        {/* Decorative header — voice interview overlays this with animated version */}
        <div className="h-2 bg-gradient-to-r from-sepia via-amber-500 to-sepia" />

        {/* Content — AnimatePresence crossfades between steps */}
        <div className="p-6 sm:p-8">
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sepia to-amber-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-display text-3xl">L</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-display text-ink mb-3">
                  Welcome, {firstName}!
                </h2>

                <p className="text-warmgray mb-8 leading-relaxed">
                  I'm Clio, and I'll be helping you capture your life story. Before we dive in, let
                  me get to know you a little better.
                </p>

                <button
                  onClick={() => setStep(STEPS.PREFERENCE)}
                  className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition-colors duration-300"
                >
                  Let's Get Started
                </button>
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
                <ChannelSelector
                  firstName={firstName}
                  onComplete={handleChannelSelectionComplete}
                />
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
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-sepia/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-sepia"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-display text-ink mb-2">
                  You're all set, {firstName}!
                </h2>

                <p className="text-warmgray mb-8 leading-relaxed">
                  Would you like a quick tour of your memoir dashboard? It only takes a moment.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleClose({ showTour: true })}
                    className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition-colors duration-300"
                  >
                    Yes, show me around
                  </button>
                  <button
                    onClick={() => handleClose({ showTour: false })}
                    className="w-full px-8 py-3 text-warmgray hover:text-ink transition-colors duration-300 text-sm font-medium"
                  >
                    No thanks, I'll explore on my own
                  </button>
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
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-sepia/20 rounded-full" />
                  <div
                    className="absolute inset-0 border-4 border-sepia border-t-transparent rounded-full animate-spin"
                    style={{ animationDuration: '1.2s' }}
                  />
                  <motion.div
                    className="absolute inset-0 border-4 border-sepia/10 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <h3 className="text-xl font-display text-ink mb-2">Setting Up Your Journey</h3>
                <p className="text-warmgray">
                  Creating personalized chapter artwork just for you...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress indicator — pill-shaped active dot */}
        <AnimatePresence>
          {INDICATOR_STEPS.has(step) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pb-6 flex justify-center items-center gap-1.5"
            >
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    i === activeIndex
                      ? 'w-5 bg-sepia'
                      : i < activeIndex
                        ? 'w-1.5 bg-sepia/50'
                        : 'w-1.5 bg-sepia/20'
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

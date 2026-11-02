import { useState, useEffect, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { readDraft } from '../hooks/useDraftAutosave'
import PreferenceSelector from './onboarding/PreferenceSelector'
import OnboardingVoiceInterview from './onboarding/OnboardingVoiceInterview'
import OnboardingTypeForm from './onboarding/OnboardingTypeForm'
import ChannelSelector from './onboarding/ChannelSelector'
import OnboardingOffer from './onboarding/OnboardingOffer'
import '../styles/onboarding.css'

// Onboarding steps
const STEPS = {
  WELCOME: 'welcome',
  PREFERENCE: 'preference',
  VOICE_INTERVIEW: 'voice_interview',
  TYPE_FORM: 'type_form',
  CHANNEL_SELECTION: 'channel_selection',
  OFFER: 'offer',
  TOUR_OFFER: 'tour_offer',
  PROCESSING: 'processing',
  SAVE_ERROR: 'save_error'
}

const SAVE_PATHS = {
  preference: '/api/onboarding/preference',
  voice: '/api/onboarding/context',
  type: '/api/onboarding/context-form',
  channels: '/api/onboarding/channel-preferences',
  complete: '/api/onboarding/complete'
}
function pendingDraft(key) {
  const draft = readDraft(key)
  return draft &&
    Object.hasOwn(SAVE_PATHS, draft.kind) &&
    draft.payload &&
    typeof draft.payload === 'object' &&
    !Array.isArray(draft.payload)
    ? draft
    : null
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

export default function OnboardingModal(props) {
  const { user } = useAuth()
  return <OnboardingFlow key={user?.id ?? 'anonymous'} {...props} />
}

function OnboardingFlow({ onClose, initialStep }) {
  const { authFetch, user, refreshUser } = useAuth()
  const draftKey = `memoir-draft:${user?.id ?? 'anonymous'}:onboarding`
  const [pendingSave, setPendingSave] = useState(() => pendingDraft(draftKey))
  const [step, setStep] = useState(pendingSave ? STEPS.SAVE_ERROR : initialStep || STEPS.WELCOME)
  const [saveError, setSaveError] = useState(null)
  const [preference, setPreference] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [extractedContext, setExtractedContext] = useState(null)
  const rafIdRef = useRef(null)
  const dialogRef = useRef(null)
  const mountedRef = useRef(true)
  const savingRef = useRef(false)
  const saveControllerRef = useRef(null)
  const reducedMotion = useReducedMotion()
  useFocusTrap(dialogRef)

  useEffect(() => {
    const focusTimer = setTimeout(
      () => {
        const heading = dialogRef.current?.querySelector('h2, h3')
        if (heading) {
          heading.tabIndex = -1
          heading.focus({ preventScroll: true })
        }
      },
      reducedMotion ? 0 : 500
    )
    return () => clearTimeout(focusTimer)
  }, [step, reducedMotion])

  // Animate in on mount
  useEffect(() => {
    mountedRef.current = true
    rafIdRef.current = requestAnimationFrame(() => setIsVisible(true))
    return () => {
      mountedRef.current = false
      saveControllerRef.current?.abort()
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  // Handle close with animation
  const handleClose = (options = {}) => {
    setIsClosing(true)
    setTimeout(() => onClose(options), reducedMotion ? 0 : 200)
  }

  async function saveDetails(pending) {
    if (savingRef.current) return
    savingRef.current = true
    const saved = { ...pending, requestId: pending.requestId || crypto.randomUUID() }
    setPendingSave(saved)
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(saved))
    } catch {
      /* server save still works when tab storage is unavailable */
    }
    setSaveError(null)
    setStep(STEPS.PROCESSING)
    const controller = new AbortController()
    saveControllerRef.current = controller
    const timeout = setTimeout(() => controller.abort(), saved.kind === 'voice' ? 90000 : 15000)
    try {
      const response = await authFetch(SAVE_PATHS[saved.kind], {
        method: 'POST',
        headers: { 'Idempotency-Key': saved.requestId },
        body: JSON.stringify(saved.payload),
        signal: controller.signal
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok)
        throw new Error(
          data.message || data.error || 'Could not save your details. Please try again.'
        )
      if (!mountedRef.current) return
      if (data.userName) {
        try {
          await refreshUser()
        } catch {
          /* the details already committed; profile refresh can retry independently */
        }
      }
      if (!mountedRef.current) return
      if (saved.kind === 'voice') setExtractedContext(data.extracted)
      if (saved.kind === 'type')
        setExtractedContext({
          birth_place: saved.payload.birthPlace,
          birth_country: saved.payload.birthCountry,
          birth_year: saved.payload.birthYear
        })
      try {
        sessionStorage.removeItem(draftKey)
      } catch {
        /* do not turn a committed save into an error */
      }
      setPendingSave(null)
      if (saved.kind === 'preference') {
        setPreference(saved.payload.preference)
        setStep(saved.payload.preference === 'voice' ? STEPS.VOICE_INTERVIEW : STEPS.TYPE_FORM)
      } else if (saved.kind === 'voice' || saved.kind === 'type') setStep(STEPS.CHANNEL_SELECTION)
      else if (saved.kind === 'channels') setStep(STEPS.OFFER)
      else setStep(STEPS.TOUR_OFFER)
    } catch (err) {
      if (mountedRef.current) {
        setSaveError(
          err.name === 'AbortError'
            ? 'Saving took too long. Your details are still kept in this tab.'
            : err.message
        )
        setStep(STEPS.SAVE_ERROR)
      }
    } finally {
      clearTimeout(timeout)
      savingRef.current = false
    }
  }
  const handlePreferenceSelect = pref =>
    saveDetails({ kind: 'preference', payload: { preference: pref } })
  const handleVoiceComplete = transcripts =>
    saveDetails({ kind: 'voice', payload: { transcripts } })
  const handleTypeFormSubmit = formData => saveDetails({ kind: 'type', payload: formData })
  const handleChannelSelectionComplete = channels =>
    saveDetails({ kind: 'channels', payload: { channels } })
  const handleTryFree = () => saveDetails({ kind: 'complete', payload: {} })

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Easy Memoir"
        className={`memoir-onboarding relative w-full max-w-2xl mx-4 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          isVisible && !isClosing
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.97] translate-y-3'
        }`}
      >
        <div className="memoir-onboarding-controls">
          <span aria-live="polite">
            {activeIndex >= 0
              ? `Step ${activeIndex + 1} of 5`
              : step === STEPS.PROCESSING
                ? 'Saving your details…'
                : 'Your next chapter'}
          </span>
          {step !== STEPS.PROCESSING && (
            <button onClick={() => handleClose()}>
              Finish later <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {/* Content — AnimatePresence crossfades between steps */}
        <div className="memoir-onboarding-content p-6 sm:p-8">
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
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#233a32] flex items-center justify-center">
                  <span className="text-white font-display text-3xl">C</span>
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
                  initialData={pendingSave?.kind === 'type' ? pendingSave.payload : undefined}
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
            {step === STEPS.SAVE_ERROR && (
              <motion.div
                key="save-error"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center py-6"
              >
                <h3 className="text-xl font-display text-ink mb-3">
                  Your details are kept in this tab
                </h3>
                <p role="alert" className="text-warmgray mb-6">
                  {saveError ||
                    'You have details waiting to be saved. Retry to continue setting up your memoir.'}
                </p>
                <button
                  onClick={() => pendingSave && saveDetails(pendingSave)}
                  className="w-full bg-sepia text-white px-6 py-3 rounded-xl"
                >
                  Retry saving details
                </button>
                {pendingSave?.kind === 'type' && (
                  <button
                    onClick={() => setStep(STEPS.TYPE_FORM)}
                    className="mt-3 px-6 py-3 text-sepia underline"
                  >
                    Edit your details
                  </button>
                )}
              </motion.div>
            )}
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
                    animate={reducedMotion ? { opacity: 0.4 } : { opacity: [0.4, 0.2, 0.4] }}
                    transition={{
                      duration: 2,
                      repeat: reducedMotion ? 0 : Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                </div>
                <h3 className="text-xl font-display text-ink mb-2">Saving your details</h3>
                <p className="text-warmgray">Getting your memoir ready. This may take a moment.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

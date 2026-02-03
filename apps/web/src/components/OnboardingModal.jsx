import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import PreferenceSelector from './onboarding/PreferenceSelector'
import OnboardingVoiceInterview from './onboarding/OnboardingVoiceInterview'
import OnboardingTypeForm from './onboarding/OnboardingTypeForm'

// Onboarding steps
const STEPS = {
  WELCOME: 'welcome',
  PREFERENCE: 'preference',
  VOICE_INTERVIEW: 'voice_interview',
  TYPE_FORM: 'type_form',
  PROCESSING: 'processing'
}

export default function OnboardingModal({ onClose }) {
  const { authFetch, user, refreshUser } = useAuth()
  const [step, setStep] = useState(STEPS.WELCOME)
  const [preference, setPreference] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [extractedContext, setExtractedContext] = useState(null)

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Handle close with animation
  const handleClose = (options = {}) => {
    setIsClosing(true)
    setTimeout(() => onClose(options), 300)
  }

  // Save preference and move to next step
  const handlePreferenceSelect = async (pref) => {
    setPreference(pref)

    try {
      await authFetch('/api/onboarding/preference', {
        method: 'POST',
        body: JSON.stringify({ preference: pref })
      })
    } catch (err) {
      console.error('Failed to save preference:', err)
    }

    if (pref === 'voice') {
      setStep(STEPS.VOICE_INTERVIEW)
    } else {
      setStep(STEPS.TYPE_FORM)
    }
  }

  // Handle voice interview completion
  const handleVoiceComplete = async (transcripts) => {
    setStep(STEPS.PROCESSING)

    let wantsTour = false

    try {
      // Send transcripts for AI extraction
      const res = await authFetch('/api/onboarding/context', {
        method: 'POST',
        body: JSON.stringify({ transcripts })
      })

      const data = await res.json()
      setExtractedContext(data.extracted)
      wantsTour = data.extracted?.wants_tour || false

      // Refresh user data if name was updated
      if (data.userName) {
        await refreshUser()
      }

      // Complete onboarding
      await authFetch('/api/onboarding/complete', {
        method: 'POST'
      })

      // Go straight to dashboard, with optional tour
      handleClose({ showTour: wantsTour })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      // Still close and go to dashboard even if errors
      handleClose({ showTour: false })
    }
  }

  // Handle type form submission
  const handleTypeFormSubmit = async (formData) => {
    setStep(STEPS.PROCESSING)

    try {
      // Save form data directly
      const res = await authFetch('/api/onboarding/context-form', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      setExtractedContext({
        birth_place: formData.birthPlace,
        birth_country: formData.birthCountry,
        birth_year: formData.birthYear
      })

      // Refresh user data if name was updated
      if (data.userName) {
        await refreshUser()
      }

      // Complete onboarding
      await authFetch('/api/onboarding/complete', {
        method: 'POST'
      })

      // Go straight to dashboard (no tour for type form users)
      handleClose({ showTour: false })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      handleClose({ showTour: false })
    }
  }

  // Get first name for personalization
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible && !isClosing ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`relative w-full max-w-lg mx-4 bg-gradient-to-b from-cream to-amber-50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isVisible && !isClosing
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Decorative header - voice interview overlays this with animated version */}
        <div className="h-2 bg-gradient-to-r from-sepia via-amber-500 to-sepia" />

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Welcome Step */}
          {step === STEPS.WELCOME && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sepia to-amber-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-display text-3xl">L</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display text-ink mb-3">
                Welcome, {firstName}!
              </h2>

              <p className="text-warmgray mb-8 leading-relaxed">
                I'm Lisa, and I'll be helping you capture your life story.
                Before we dive in, let me get to know you a little better.
              </p>

              <button
                onClick={() => setStep(STEPS.PREFERENCE)}
                className="w-full bg-sepia text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-ink transition"
              >
                Let's Get Started
              </button>
            </div>
          )}

          {/* Preference Step */}
          {step === STEPS.PREFERENCE && (
            <PreferenceSelector onSelect={handlePreferenceSelect} />
          )}

          {/* Voice Interview Step */}
          {step === STEPS.VOICE_INTERVIEW && (
            <OnboardingVoiceInterview
              onComplete={handleVoiceComplete}
              onBack={() => setStep(STEPS.PREFERENCE)}
            />
          )}

          {/* Type Form Step */}
          {step === STEPS.TYPE_FORM && (
            <OnboardingTypeForm
              onSubmit={handleTypeFormSubmit}
              onBack={() => setStep(STEPS.PREFERENCE)}
            />
          )}

          {/* Processing Step */}
          {step === STEPS.PROCESSING && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-sepia/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-sepia border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-display text-ink mb-2">
                Setting Up Your Journey
              </h3>
              <p className="text-warmgray">
                Creating personalized chapter artwork just for you...
              </p>
            </div>
          )}
        </div>

        {/* Step indicator (for multi-step flow) */}
        {[STEPS.WELCOME, STEPS.PREFERENCE, STEPS.VOICE_INTERVIEW, STEPS.TYPE_FORM].includes(step) && (
          <div className="pb-6 flex justify-center gap-2">
            {[STEPS.WELCOME, STEPS.PREFERENCE, 'interview'].map((s, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  (s === step || (s === 'interview' && (step === STEPS.VOICE_INTERVIEW || step === STEPS.TYPE_FORM)))
                    ? 'bg-sepia'
                    : 'bg-sepia/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

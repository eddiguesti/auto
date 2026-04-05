import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const SettingsContext = createContext(null)

// Voice options (xAI voices) - British-sounding voices preferred for UK audience
export const VOICE_OPTIONS = {
  female: {
    label: 'Female',
    voice: 'Sage',
    description: 'Warm, gentle British female voice'
  },
  male: {
    label: 'Male',
    voice: 'Ash',
    description: 'Calm, thoughtful British male voice'
  }
}

// Speaking pace presets — silence_duration_ms is how long to wait after the user
// stops talking before the AI responds. Threshold controls how confident the VAD
// must be that the user has stopped (higher = waits longer, less likely to cut in).
// prefix_padding_ms captures audio before detected speech start (prevents clipped words).
export const SPEAKING_PACE = {
  slow: {
    label: 'Slow',
    description: 'Extra time to think between sentences',
    silence_duration_ms: 4000,
    threshold: 0.7,
    prefix_padding_ms: 800
  },
  normal: {
    label: 'Normal',
    description: 'Natural conversational pace',
    silence_duration_ms: 2500,
    threshold: 0.6,
    prefix_padding_ms: 600
  },
  fast: {
    label: 'Fast',
    description: 'Quick back-and-forth',
    silence_duration_ms: 1500,
    threshold: 0.5,
    prefix_padding_ms: 400
  }
}

export function SettingsProvider({ children }) {
  const [speakingPace, setSpeakingPace] = useState(() => {
    const saved = localStorage.getItem('speakingPace')
    return saved || 'normal'
  })

  const [voiceGender, setVoiceGender] = useState(() => {
    const saved = localStorage.getItem('voiceGender')
    return saved || 'female'
  })

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('speakingPace', speakingPace)
  }, [speakingPace])

  useEffect(() => {
    localStorage.setItem('voiceGender', voiceGender)
  }, [voiceGender])

  // Get the current pace settings
  const getPaceSettings = useCallback(
    () => SPEAKING_PACE[speakingPace] || SPEAKING_PACE.normal,
    [speakingPace]
  )

  // Get the current voice
  const getVoice = useCallback(() => VOICE_OPTIONS[voiceGender]?.voice || 'Alloy', [voiceGender])

  const value = useMemo(
    () => ({
      speakingPace,
      setSpeakingPace,
      getPaceSettings,
      voiceGender,
      setVoiceGender,
      getVoice,
      SPEAKING_PACE,
      VOICE_OPTIONS
    }),
    [speakingPace, voiceGender, getPaceSettings, getVoice]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

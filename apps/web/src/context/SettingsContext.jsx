import { createContext, useContext, useState, useEffect } from 'react'

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

// Speaking pace presets - very generous silence durations to let people finish their thoughts
export const SPEAKING_PACE = {
  slow: {
    label: 'Slow',
    description: 'Maximum time to think and share your story fully',
    silence_duration_ms: 25000,
    threshold: 0.92,
    prefix_padding_ms: 2000
  },
  normal: {
    label: 'Normal',
    description: 'Plenty of time to speak without interruption',
    silence_duration_ms: 18000,
    threshold: 0.88,
    prefix_padding_ms: 1500
  },
  fast: {
    label: 'Fast',
    description: 'Quicker responses but still patient',
    silence_duration_ms: 10000,
    threshold: 0.8,
    prefix_padding_ms: 1000
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
  const getPaceSettings = () => SPEAKING_PACE[speakingPace] || SPEAKING_PACE.normal

  // Get the current voice
  const getVoice = () => VOICE_OPTIONS[voiceGender]?.voice || 'Alloy'

  const value = {
    speakingPace,
    setSpeakingPace,
    getPaceSettings,
    voiceGender,
    setVoiceGender,
    getVoice,
    SPEAKING_PACE,
    VOICE_OPTIONS
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

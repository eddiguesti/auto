import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

// Voice options (xAI voices)
export const VOICE_OPTIONS = {
  female: {
    label: 'Female',
    voice: 'Alloy',
    description: 'Warm, friendly female voice'
  },
  male: {
    label: 'Male',
    voice: 'Echo',
    description: 'Clear, calm male voice'
  }
}

// Speaking pace presets - generous silence durations to let people think
export const SPEAKING_PACE = {
  slow: {
    label: 'Slow',
    description: 'Plenty of time to think and respond',
    silence_duration_ms: 12000,
    threshold: 0.85,
    prefix_padding_ms: 1200
  },
  normal: {
    label: 'Normal',
    description: 'Balanced conversation pace',
    silence_duration_ms: 8000,
    threshold: 0.75,
    prefix_padding_ms: 900
  },
  fast: {
    label: 'Fast',
    description: 'Quick back-and-forth dialogue',
    silence_duration_ms: 5000,
    threshold: 0.65,
    prefix_padding_ms: 600
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

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

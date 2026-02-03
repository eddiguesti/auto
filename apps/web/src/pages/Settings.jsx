import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings, SPEAKING_PACE, VOICE_OPTIONS } from '../context/SettingsContext'

export default function Settings() {
  const { speakingPace, setSpeakingPace, voiceGender, setVoiceGender } = useSettings()
  const [activeTab, setActiveTab] = useState('speaking')

  const tabs = [
    { id: 'speaking', label: 'Speaking', icon: '🎤' },
    { id: 'account', label: 'Account', icon: '👤' }
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-sepia/10 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/home" className="text-sepia hover:text-ink transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-display text-ink">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-sepia text-white'
                  : 'bg-white text-warmgray hover:bg-sepia/10'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Speaking Tab */}
        {activeTab === 'speaking' && (
          <>
          <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
            <div className="p-5 border-b border-sepia/10">
              <h2 className="text-lg font-display text-ink mb-1">Conversation Pace</h2>
              <p className="text-sm text-warmgray">
                Choose how quickly Lisa responds after you stop speaking
              </p>
            </div>

            <div className="p-5 space-y-3">
              {Object.entries(SPEAKING_PACE).map(([key, pace]) => (
                <label
                  key={key}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                    speakingPace === key
                      ? 'border-sepia bg-sepia/5'
                      : 'border-sepia/10 hover:border-sepia/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="speakingPace"
                    value={key}
                    checked={speakingPace === key}
                    onChange={() => setSpeakingPace(key)}
                    className="mt-1 accent-sepia"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{pace.label}</span>
                      {key === 'normal' && (
                        <span className="text-xs bg-sepia/10 text-sepia px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-warmgray mt-1">{pace.description}</p>
                    <p className="text-xs text-warmgray/60 mt-1">
                      Waits {pace.silence_duration_ms / 1000} seconds after you stop speaking
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="px-5 py-4 bg-amber-50/50 border-t border-sepia/10">
              <p className="text-sm text-warmgray">
                <span className="font-medium text-ink">Tip:</span> If Lisa interrupts you often, try "Slow".
                If conversations feel sluggish, try "Fast".
              </p>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden mt-6">
            <div className="p-5 border-b border-sepia/10">
              <h2 className="text-lg font-display text-ink mb-1">Voice</h2>
              <p className="text-sm text-warmgray">
                Choose your preferred voice for Lisa
              </p>
            </div>

            <div className="p-5 flex gap-3">
              {Object.entries(VOICE_OPTIONS).map(([key, option]) => (
                <label
                  key={key}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    voiceGender === key
                      ? 'border-sepia bg-sepia/5'
                      : 'border-sepia/10 hover:border-sepia/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="voiceGender"
                    value={key}
                    checked={voiceGender === key}
                    onChange={() => setVoiceGender(key)}
                    className="accent-sepia"
                  />
                  <div>
                    <span className="font-medium text-ink">{option.label}</span>
                    <p className="text-xs text-warmgray">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          </>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
            <div className="p-5 border-b border-sepia/10">
              <h2 className="text-lg font-display text-ink mb-1">Account Settings</h2>
              <p className="text-sm text-warmgray">Manage your account preferences</p>
            </div>

            <div className="p-5 text-center text-warmgray">
              <p>Account settings coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

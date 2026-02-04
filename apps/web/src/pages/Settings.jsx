import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings, SPEAKING_PACE, VOICE_OPTIONS } from '../context/SettingsContext'

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout, authFetch, refreshUser } = useAuth()
  const { speakingPace, setSpeakingPace, voiceGender, setVoiceGender } = useSettings()
  const [activeTab, setActiveTab] = useState('account')

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileBirthYear, setProfileBirthYear] = useState(user?.birth_year || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Export data state
  const [exportLoading, setExportLoading] = useState(false)

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'speaking', label: 'Speaking', icon: '🎤' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' }
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleProfileSave = async () => {
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileName,
          birthYear: profileBirthYear ? parseInt(profileBirthYear) : null
        })
      })

      if (res.ok) {
        await refreshUser()
        setProfileSuccess(true)
        setIsEditingProfile(false)
        setTimeout(() => setProfileSuccess(false), 3000)
      } else {
        const data = await res.json()
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setProfileError('Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      const res = await authFetch('/api/user/export-data')
      if (res.ok) {
        const data = await res.json()
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `my-memoir-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const res = await authFetch('/api/user/delete-account', {
        method: 'DELETE'
      })

      if (res.ok) {
        await logout()
        navigate('/login', { state: { message: 'Your account has been deleted.' } })
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete account')
      }
    } catch (err) {
      setDeleteError('Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-sepia/10 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/home" className="text-sepia hover:text-ink transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-display text-ink">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
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

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
              <div className="p-5 border-b border-sepia/10">
                <h2 className="text-lg font-display text-ink mb-1">Profile</h2>
                <p className="text-sm text-warmgray">Your account information</p>
              </div>

              <div className="p-5">
                {/* Avatar and basic info */}
                <div className="flex items-center gap-4 mb-6">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-16 h-16 rounded-full border-2 border-sepia/20"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center border-2 border-sepia/20">
                      <span className="text-2xl text-sepia font-display">
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-ink text-lg">{user?.name || 'Unknown'}</h3>
                    <p className="text-sm text-warmgray">{user?.email}</p>
                  </div>
                </div>

                {profileSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    Profile updated successfully!
                  </div>
                )}

                {profileError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {profileError}
                  </div>
                )}

                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-sepia/30"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Birth Year</label>
                      <input
                        type="number"
                        value={profileBirthYear}
                        onChange={e => setProfileBirthYear(e.target.value)}
                        className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-sepia/30"
                        placeholder="e.g., 1950"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                      <p className="text-xs text-warmgray mt-1">
                        This helps personalize your memoir experience
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleProfileSave}
                        disabled={profileLoading}
                        className="px-4 py-2 bg-sepia text-white rounded-lg hover:bg-ink transition disabled:opacity-50"
                      >
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false)
                          setProfileName(user?.name || '')
                          setProfileBirthYear(user?.birth_year || '')
                          setProfileError(null)
                        }}
                        className="px-4 py-2 border border-sepia/20 text-ink rounded-lg hover:bg-sepia/5 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-sepia/10">
                      <span className="text-warmgray">Name</span>
                      <span className="text-ink">{user?.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-sepia/10">
                      <span className="text-warmgray">Email</span>
                      <span className="text-ink">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-sepia/10">
                      <span className="text-warmgray">Birth Year</span>
                      <span className="text-ink">{user?.birth_year || 'Not set'}</span>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-2 px-4 py-2 border border-sepia/20 text-sepia rounded-lg hover:bg-sepia/5 transition text-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Section */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
              <div className="p-5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-white rounded-lg hover:bg-sepia transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
              <div className="p-5 border-b border-sepia/10">
                <h2 className="text-lg font-display text-ink mb-1">Help & Support</h2>
              </div>
              <div className="divide-y divide-sepia/10">
                <a
                  href="mailto:support@easymemoir.co.uk"
                  className="flex items-center justify-between p-4 hover:bg-sepia/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📧</span>
                    <span className="text-ink">Contact Support</span>
                  </div>
                  <svg
                    className="w-5 h-5 text-warmgray"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
                <Link
                  to="/terms"
                  className="flex items-center justify-between p-4 hover:bg-sepia/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <span className="text-ink">Terms of Service</span>
                  </div>
                  <svg
                    className="w-5 h-5 text-warmgray"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
                <Link
                  to="/privacy"
                  className="flex items-center justify-between p-4 hover:bg-sepia/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔐</span>
                    <span className="text-ink">Privacy Policy</span>
                  </div>
                  <svg
                    className="w-5 h-5 text-warmgray"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

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
                  <span className="font-medium text-ink">Tip:</span> If Lisa interrupts you often,
                  try "Slow". If conversations feel sluggish, try "Fast".
                </p>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden mt-6">
              <div className="p-5 border-b border-sepia/10">
                <h2 className="text-lg font-display text-ink mb-1">Voice</h2>
                <p className="text-sm text-warmgray">Choose your preferred voice for Lisa</p>
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

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            {/* Export Data */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
              <div className="p-5 border-b border-sepia/10">
                <h2 className="text-lg font-display text-ink mb-1">Export Your Data</h2>
                <p className="text-sm text-warmgray">
                  Download all your memoir data including stories, answers, and images
                </p>
              </div>
              <div className="p-5">
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-sepia/10 text-sepia rounded-lg hover:bg-sepia/20 transition disabled:opacity-50"
                >
                  {exportLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Preparing download...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download My Data
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cookie Preferences */}
            <div className="bg-white rounded-xl border border-sepia/10 overflow-hidden">
              <div className="p-5 border-b border-sepia/10">
                <h2 className="text-lg font-display text-ink mb-1">Cookie Preferences</h2>
                <p className="text-sm text-warmgray">Manage your cookie and tracking preferences</p>
              </div>
              <div className="p-5">
                <button
                  onClick={() => {
                    localStorage.removeItem('cookie-consent')
                    localStorage.removeItem('cookie-consent-date')
                    window.location.reload()
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-sepia/20 text-ink rounded-lg hover:bg-sepia/5 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Manage Cookie Settings
                </button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="p-5 border-b border-red-100">
                <h2 className="text-lg font-display text-red-700 mb-1">Danger Zone</h2>
                <p className="text-sm text-red-600/70">Irreversible and destructive actions</p>
              </div>
              <div className="p-5">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-700 font-medium mb-2">Are you absolutely sure?</p>
                      <p className="text-sm text-red-600/80">
                        This action cannot be undone. This will permanently delete your account and
                        remove all your data including your memoir stories, images, and personal
                        information.
                      </p>
                    </div>

                    {deleteError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                        {deleteError}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">
                        Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to
                        confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                        placeholder="DELETE"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                          setDeleteError(null)
                        }}
                        className="px-4 py-2 border border-sepia/20 text-ink rounded-lg hover:bg-sepia/5 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* App Version */}
        <div className="mt-8 text-center text-xs text-warmgray/60">
          <p>Easy Memoir v1.0</p>
        </div>
      </div>
    </div>
  )
}

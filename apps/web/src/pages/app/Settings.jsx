import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconCircleCheck,
  IconChevronRight,
  IconMail,
  IconFileText,
  IconShieldLock,
  IconLogout,
  IconTrash,
  IconCookie
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { useSettings, SPEAKING_PACE, VOICE_OPTIONS } from '../../context/SettingsContext'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Field, Input, Badge } from '../../components/ui'

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout, authFetch, refreshUser } = useAuth()
  const { speakingPace, setSpeakingPace, voiceGender, setVoiceGender } = useSettings()

  // Profile editing state - always editable
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileBirthYear, setProfileBirthYear] = useState(user?.birth_year || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [hasProfileChanges, setHasProfileChanges] = useState(false)

  // Email verification state
  const [resendingVerification, setResendingVerification] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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
        setHasProfileChanges(false)
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

  const handleProfileFieldChange = (field, value) => {
    if (field === 'name') setProfileName(value)
    if (field === 'birthYear') setProfileBirthYear(value)
    setHasProfileChanges(true)
    setProfileSuccess(false)
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

  const handleResendVerification = async () => {
    setResendingVerification(true)
    setVerificationMessage('')
    try {
      const res = await authFetch('/api/auth/resend-verification', {
        method: 'POST'
      })
      const data = await res.json()
      setVerificationMessage(res.ok ? 'Verification email sent!' : data.error || 'Failed')
      if (res.ok) setTimeout(() => refreshUser(), 2000)
    } catch {
      setVerificationMessage('Failed to send email')
    } finally {
      setResendingVerification(false)
    }
  }

  const handleManageCookies = () => {
    localStorage.removeItem('cookie-consent')
    localStorage.removeItem('cookie-consent-date')
    window.location.reload()
  }

  return (
    <AppShell back="/home" title="Settings">
      <div className="py-8 page-enter">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-display text-ink">Settings</h1>
          <p className="text-sepia-600 mt-1">Your account information and preferences</p>
        </header>

        {/* Account */}
        <section className="mb-10">
          <p className="eyebrow mb-3">Account</p>
          <Card className="stagger-item">
            {/* Avatar and email (non-editable) */}
            <div className="flex items-center gap-4 mb-6">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-16 h-16 rounded-full border border-sepia-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-sepia-100 border border-sepia-200 flex items-center justify-center">
                  <span className="text-2xl text-sepia-600 font-display">
                    {profileName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <p className="text-sm text-sepia-600">{user?.email}</p>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-4 bg-success-soft text-success-strong rounded-xl text-sm flex items-center gap-2">
                <IconCircleCheck size={20} stroke={1.75} className="shrink-0" />
                Saved! Your memoir will use the updated details.
              </div>
            )}

            {profileError && (
              <div className="mb-4 p-4 bg-error-soft text-error-strong rounded-xl text-sm">
                {profileError}
              </div>
            )}

            {/* Always-visible editable fields */}
            <div className="space-y-4">
              <Field
                label={
                  <>
                    Your Name{' '}
                    <span className="text-sepia-500 font-normal">(appears on your book cover)</span>
                  </>
                }
              >
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="text"
                    value={profileName}
                    onChange={e => handleProfileFieldChange('name', e.target.value)}
                    placeholder="Your full name"
                  />
                )}
              </Field>

              <Field
                label={
                  <>
                    Birth Year{' '}
                    <span className="text-sepia-500 font-normal">(helps personalise prompts)</span>
                  </>
                }
              >
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    value={profileBirthYear}
                    onChange={e => handleProfileFieldChange('birthYear', e.target.value)}
                    placeholder="e.g., 1950"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                )}
              </Field>

              <div>
                <Field label="Email">
                  {id => <Input id={id} type="email" value={user?.email || ''} disabled />}
                </Field>

                {/* Email verification status */}
                <div className="mt-2">
                  {user?.email_verified ? (
                    <Badge variant="success" icon={<IconCircleCheck size={16} stroke={1.75} />}>
                      Email verified
                    </Badge>
                  ) : !user?.google_id ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-warning-strong">Email not verified</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resendingVerification}
                        className="underline"
                      >
                        {resendingVerification ? 'Sending...' : 'Resend verification'}
                      </Button>
                      {verificationMessage && (
                        <span
                          className={`text-xs ${
                            verificationMessage.includes('sent')
                              ? 'text-success-strong'
                              : 'text-error'
                          }`}
                        >
                          {verificationMessage}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Save button - only shows when changes are made */}
              {hasProfileChanges && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" loading={profileLoading} onClick={handleProfileSave}>
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProfileName(user?.name || '')
                      setProfileBirthYear(user?.birth_year || '')
                      setHasProfileChanges(false)
                      setProfileError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Preferences */}
        <section className="mb-10">
          <p className="eyebrow mb-3">Preferences</p>

          <Card className="stagger-item">
            <h2 className="text-lg font-display text-ink mb-1">Conversation Pace</h2>
            <p className="text-sm text-sepia-600 mb-4">
              Choose how quickly Clio responds after you stop speaking
            </p>

            <div className="space-y-3">
              {Object.entries(SPEAKING_PACE).map(([key, pace]) => (
                <label
                  key={key}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    speakingPace === key
                      ? 'border-bronze-400 ring-4 ring-bronze-500/10'
                      : 'border-sepia-200 hover:border-sepia-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="speakingPace"
                    value={key}
                    checked={speakingPace === key}
                    onChange={() => setSpeakingPace(key)}
                    className="mt-1 accent-bronze-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{pace.label}</span>
                      {key === 'normal' && <Badge variant="bronze">Recommended</Badge>}
                    </div>
                    <p className="text-sm text-sepia-600 mt-1">{pace.description}</p>
                    <p className="text-sm text-sepia-500 mt-0.5">
                      Waits {pace.silence_duration_ms / 1000} seconds after you stop speaking
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 p-4 bg-cream rounded-xl">
              <p className="text-sm text-sepia-700">
                <span className="font-medium text-ink">Tip:</span> If Clio interrupts you often, try
                "Slow". If conversations feel sluggish, try "Fast".
              </p>
            </div>
          </Card>

          <Card className="stagger-item mt-4">
            <h2 className="text-lg font-display text-ink mb-1">Voice</h2>
            <p className="text-sm text-sepia-600 mb-4">Choose your preferred voice for Clio</p>

            <div className="flex flex-col sm:flex-row gap-3">
              {Object.entries(VOICE_OPTIONS).map(([key, option]) => (
                <label
                  key={key}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    voiceGender === key
                      ? 'border-bronze-400 ring-4 ring-bronze-500/10'
                      : 'border-sepia-200 hover:border-sepia-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="voiceGender"
                    value={key}
                    checked={voiceGender === key}
                    onChange={() => setVoiceGender(key)}
                    className="accent-bronze-500"
                  />
                  <div>
                    <span className="font-medium text-ink">{option.label}</span>
                    <p className="text-sm text-sepia-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card padding="none" className="stagger-item mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
                  <IconCookie size={24} stroke={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink">Cookie Preferences</p>
                  <p className="text-sm text-sepia-600">
                    Manage your cookie and tracking preferences
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={handleManageCookies}
              >
                Manage Cookie Settings
              </Button>
            </div>
          </Card>
        </section>

        {/* Help & Support */}
        <section className="mb-10">
          <p className="eyebrow mb-3">Help &amp; Support</p>
          <Card padding="none" className="stagger-item">
            <div className="divide-y divide-sepia-100">
              <SupportRow
                href="mailto:support@easymemoir.co.uk"
                icon={<IconMail size={20} stroke={1.75} />}
                label="Contact Support"
              />
              <SupportRow
                to="/terms"
                icon={<IconFileText size={20} stroke={1.75} />}
                label="Terms of Service"
              />
              <SupportRow
                to="/privacy"
                icon={<IconShieldLock size={20} stroke={1.75} />}
                label="Privacy Policy"
              />
            </div>
          </Card>
        </section>

        {/* Sign out — quiet secondary */}
        <div className="mb-12">
          <Button
            variant="secondary"
            icon={<IconLogout size={20} stroke={1.75} />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>

        {/* Danger zone */}
        <section className="mb-8">
          <p className="eyebrow mb-3">Danger zone</p>
          <Card className="stagger-item">
            {!showDeleteConfirm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">Delete My Account</p>
                  <p className="text-sm text-sepia-600">Irreversible and destructive actions</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 self-start sm:self-auto text-error hover:text-error-strong hover:bg-error-soft"
                  icon={<IconTrash size={20} stroke={1.75} />}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete My Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-error-soft rounded-xl">
                  <p className="text-error-strong font-medium mb-1">Are you absolutely sure?</p>
                  <p className="text-sm text-error-strong">
                    This action cannot be undone. This will permanently delete your account and
                    remove all your data including your memoir stories, images, and personal
                    information.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-4 bg-error-soft text-error-strong rounded-xl text-sm">
                    {deleteError}
                  </div>
                )}

                <Field
                  label={
                    <>
                      Type{' '}
                      <span className="font-mono bg-error-soft text-error-strong px-1 rounded">
                        DELETE
                      </span>{' '}
                      to confirm
                    </>
                  }
                >
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                    />
                  )}
                </Field>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="danger"
                    disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                    loading={deleteLoading}
                    onClick={handleDeleteAccount}
                  >
                    {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                      setDeleteError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* App Version */}
        <div className="mt-4 pb-4 text-center text-xs text-sepia-500">
          <p>Easy Memoir v1.0</p>
        </div>
      </div>
    </AppShell>
  )
}

function SupportRow({ to, href, icon, label }) {
  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sepia-500">{icon}</span>
        <span className="text-ink">{label}</span>
      </div>
      <IconChevronRight size={20} stroke={1.75} className="text-sepia-400 shrink-0" />
    </>
  )
  const classes =
    'flex items-center justify-between gap-4 p-4 sm:px-6 hover:bg-sepia-50 transition-colors'

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }
  return (
    <a href={href} className={classes}>
      {content}
    </a>
  )
}

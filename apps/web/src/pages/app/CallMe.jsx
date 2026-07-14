import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconPhone, IconPhoneCall } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Field, Input } from '../../components/ui'

export default function CallMe() {
  const { authFetch, user } = useAuth()
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [calling, setCalling] = useState(false)
  const [callRequested, setCallRequested] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.phone_number) setPhoneNumber(user.phone_number)
  }, [user])

  const handleRequestCall = async () => {
    const cleaned = phoneNumber.trim().replace(/\s/g, '')
    if (!cleaned.startsWith('+')) {
      setError('Please include your country code (e.g. +44 for UK, +1 for US)')
      return
    }
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      setError('Please enter a valid phone number with country code')
      return
    }

    setError(null)
    setCalling(true)

    try {
      const res = await authFetch('/api/telnyx/request-call', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: cleaned })
      })
      const data = await res.json()
      if (res.ok) {
        setCallRequested(true)
      } else {
        const msg = data.error || 'Failed to initiate call.'
        setError(
          msg.includes('configured') || res.status === 500
            ? 'Phone calls are not available yet. Please use the voice chat instead.'
            : msg
        )
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
    } finally {
      setCalling(false)
    }
  }

  if (callRequested) {
    return (
      <AppShell back="/home" title="Call me">
        <div className="max-w-lg mx-auto py-16 text-center page-enter">
          <div className="w-20 h-20 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <IconPhoneCall size={36} stroke={1.5} />
          </div>
          <h2 className="text-2xl font-display text-ink mb-3">Calling you now!</h2>
          <p className="text-sepia-600 mb-8">
            Pick up to start sharing your story. Our AI interviewer Clio will guide the
            conversation.
          </p>
          <Button variant="secondary" size="lg" onClick={() => navigate('/home')}>
            Back to Home
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/home" title="Call me">
      <div className="max-w-lg mx-auto py-8 page-enter">
        <header className="text-center mb-8">
          <div className="w-11 h-11 bg-bronze-100 text-bronze-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <IconPhone size={24} stroke={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display text-ink mb-2">Call Me</h1>
          <p className="text-sepia-600">
            We'll call you right away. Our AI interviewer Clio will have a friendly chat about your
            life and memories.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3"
          >
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
        )}

        <Card padding="lg">
          <Field
            label="Your phone number"
            hint="Include your country code (e.g. +44 for UK, +1 for US)"
          >
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+44 7700 900000"
              />
            )}
          </Field>

          <p className="mt-5 text-sepia-500 text-sm leading-relaxed">
            By requesting a call, you consent to receiving a phone call from EasyMemoir. The call
            will be with our AI interviewer who will help you capture your memories. Your phone
            number will be saved to your profile.
          </p>

          <Button
            size="xl"
            className="mt-6"
            onClick={handleRequestCall}
            disabled={!phoneNumber.trim() || calling}
            loading={calling}
          >
            {calling ? 'Connecting...' : 'Call Me Now'}
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}

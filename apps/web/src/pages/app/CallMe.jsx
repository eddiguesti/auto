import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

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
        setError(data.error || 'Failed to initiate call. Please try again.')
      }
    } catch (err) {
      console.error('Call request error:', err)
      setError('Something went wrong. Please check your connection and try again.')
    } finally {
      setCalling(false)
    }
  }

  if (callRequested) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center page-enter">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-display text-ink mb-3">Calling you now!</h2>
        <p className="text-sepia/60 mb-8">
          Pick up to start sharing your story. Our AI interviewer Clio will guide the conversation.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-3 bg-sepia/10 text-sepia rounded-xl font-medium hover:bg-sepia/20 transition"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 page-enter">
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 text-sepia/60 hover:text-sepia transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display text-ink mb-2">Call Me</h1>
        <p className="text-sepia/60">
          We'll call you right away. Our AI interviewer Clio will have a friendly chat about your
          life and memories.
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="bg-white border border-sepia/10 rounded-2xl p-6 mb-6">
        <label className="block text-ink font-medium text-sm mb-2">Your phone number</label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={e => setPhoneNumber(e.target.value)}
          placeholder="+44 7700 900000"
          className="w-full px-4 py-3 border border-sepia/15 rounded-xl text-lg bg-white focus:border-sepia/40 focus:outline-none focus:ring-2 focus:ring-sepia/10 transition placeholder:text-sepia/30"
        />
        <p className="text-sepia/40 text-xs mt-2">
          Include your country code (e.g. +44 for UK, +1 for US)
        </p>
      </div>

      <div className="bg-amber-50/50 border border-amber-200/30 rounded-xl p-4 mb-6">
        <p className="text-amber-800/70 text-xs leading-relaxed">
          By requesting a call, you consent to receiving a phone call from EasyMemoir. The call will
          be with our AI interviewer who will help you capture your memories. Your phone number will
          be saved to your profile.
        </p>
      </div>

      <button
        onClick={handleRequestCall}
        disabled={!phoneNumber.trim() || calling}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium text-lg hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {calling ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </span>
        ) : (
          'Call Me Now'
        )}
      </button>
    </div>
  )
}

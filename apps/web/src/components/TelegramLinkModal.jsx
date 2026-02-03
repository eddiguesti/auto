import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function TelegramLinkModal({ onClose }) {
  const { authFetch } = useAuth()
  const [linkCode, setLinkCode] = useState('')
  const [status, setStatus] = useState('loading') // loading, not_connected, connected, linking, error
  const [telegramInfo, setTelegramInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    checkTelegramStatus()
  }, [])

  const checkTelegramStatus = async () => {
    try {
      const res = await authFetch('/api/telegram/status')
      if (res.ok) {
        const data = await res.json()
        if (data.connected) {
          setStatus('connected')
          setTelegramInfo(data)
        } else {
          setStatus('not_connected')
        }
      } else {
        setStatus('not_connected')
      }
    } catch (err) {
      console.error('Error checking Telegram status:', err)
      setStatus('not_connected')
    }
  }

  const handleLinkAccount = async () => {
    if (!linkCode.trim()) {
      setError('Please enter the link code from Telegram')
      return
    }

    setStatus('linking')
    setError('')

    try {
      const res = await authFetch('/api/telegram/verify-link', {
        method: 'POST',
        body: JSON.stringify({ code: linkCode.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('connected')
        setTelegramInfo({ connected: true })
      } else {
        setError(data.error || 'Failed to link account')
        setStatus('not_connected')
      }
    } catch (err) {
      console.error('Error linking Telegram:', err)
      setError('Something went wrong. Please try again.')
      setStatus('not_connected')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0088cc]/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">Connect Telegram</h2>
              <p className="text-sepia/60 text-sm">Capture memories on the go</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content based on status */}
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-sepia/30 border-t-sepia rounded-full animate-spin" />
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-ink mb-2">Connected!</h3>
            <p className="text-sepia/70 mb-4">
              Your Telegram is linked. Stories you share via Telegram will automatically sync here.
            </p>
            {telegramInfo?.username && (
              <p className="text-sm text-sepia/50">@{telegramInfo.username}</p>
            )}
          </div>
        )}

        {status === 'not_connected' && (
          <>
            <div className="bg-gradient-to-br from-[#0088cc]/5 to-[#0088cc]/10 rounded-xl p-5 mb-6">
              <h3 className="font-medium text-ink mb-3">How to connect:</h3>
              <ol className="space-y-3 text-sm text-sepia/80">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-[#0088cc]/10 rounded-full flex items-center justify-center flex-shrink-0 text-[#0088cc] font-medium text-xs">1</span>
                  <span>Open Telegram and search for <strong>@EasyMemoirBot</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-[#0088cc]/10 rounded-full flex items-center justify-center flex-shrink-0 text-[#0088cc] font-medium text-xs">2</span>
                  <span>Send <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/start</code> to the bot</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-[#0088cc]/10 rounded-full flex items-center justify-center flex-shrink-0 text-[#0088cc] font-medium text-xs">3</span>
                  <span>Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/link</code> to get a code</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-[#0088cc]/10 rounded-full flex items-center justify-center flex-shrink-0 text-[#0088cc] font-medium text-xs">4</span>
                  <span>Enter the code below</span>
                </li>
              </ol>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Link Code</label>
                <input
                  type="text"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  className="w-full px-4 py-3 border border-sepia/20 rounded-lg focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc]/30 outline-none transition text-center text-lg tracking-widest font-mono"
                  maxLength={8}
                />
              </div>

              <button
                onClick={handleLinkAccount}
                className="w-full py-3 bg-[#0088cc] text-white rounded-lg font-medium hover:bg-[#0077b5] transition"
              >
                Link Account
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-center text-sepia/60 text-sm">
                With Telegram, you can answer memoir questions anytime, anywhere - even without internet on the web.
              </p>
            </div>
          </>
        )}

        {status === 'linking' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#0088cc]/30 border-t-[#0088cc] rounded-full animate-spin mb-4" />
            <p className="text-sepia/70">Linking your account...</p>
          </div>
        )}
      </div>
    </div>
  )
}

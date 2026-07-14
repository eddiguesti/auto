import { useState, useEffect } from 'react'
import { IconBrandTelegram, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Modal, Button, Field, Input, Skeleton } from './ui'

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
    <Modal onClose={onClose} title="Connect Telegram" eyebrow="Capture memories on the go">
      {/* Content based on status */}
      {status === 'loading' && (
        <div className="space-y-3 py-2" aria-label="Checking Telegram status">
          <Skeleton className="h-28" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12 w-2/3" />
        </div>
      )}

      {status === 'connected' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-4">
            <IconCheck size={32} stroke={2} />
          </div>
          <h3 className="text-xl font-display text-ink mb-2">Connected!</h3>
          <p className="text-sepia-600 text-base mb-4">
            Your Telegram is linked. Stories you share via Telegram will automatically sync here.
          </p>
          {telegramInfo?.username && (
            <p className="text-sm text-sepia-500">@{telegramInfo.username}</p>
          )}
        </div>
      )}

      {status === 'not_connected' && (
        <>
          <div className="bg-sepia-50 border border-sepia-200/60 rounded-xl p-5 mb-6">
            <h3 className="font-display text-lg text-ink mb-3 flex items-center gap-2">
              <IconBrandTelegram size={20} stroke={1.75} className="text-info-strong" />
              How to connect:
            </h3>
            <ol className="space-y-3 text-sm text-ink-soft">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-info-soft text-info-strong rounded-full flex items-center justify-center shrink-0 font-medium text-xs">
                  1
                </span>
                <span>
                  Open Telegram and search for <strong>@EasyMemoirBot</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-info-soft text-info-strong rounded-full flex items-center justify-center shrink-0 font-medium text-xs">
                  2
                </span>
                <span>
                  Send <code className="bg-sepia-100 px-1.5 py-0.5 rounded text-xs">/start</code> to
                  the bot
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-info-soft text-info-strong rounded-full flex items-center justify-center shrink-0 font-medium text-xs">
                  3
                </span>
                <span>
                  Type <code className="bg-sepia-100 px-1.5 py-0.5 rounded text-xs">/link</code> to
                  get a code
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-info-soft text-info-strong rounded-full flex items-center justify-center shrink-0 font-medium text-xs">
                  4
                </span>
                <span>Enter the code below</span>
              </li>
            </ol>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
              <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field label="Link Code">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="text"
                  value={linkCode}
                  onChange={e => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={8}
                />
              )}
            </Field>

            <Button size="xl" onClick={handleLinkAccount}>
              Link Account
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-sepia-200/70">
            <p className="text-center text-sepia-600 text-sm">
              With Telegram, you can answer memoir questions anytime, anywhere - even without
              internet on the web.
            </p>
          </div>
        </>
      )}

      {status === 'linking' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-sepia-200 border-t-bronze-500 rounded-full animate-spin mb-4" />
          <p className="text-sepia-600 text-base">Linking your account...</p>
        </div>
      )}
    </Modal>
  )
}

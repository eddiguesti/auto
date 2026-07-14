import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { IconCircleCheck, IconAlertCircle, IconInfoCircle, IconX } from '@tabler/icons-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, opts) => addToast(message, opts), [addToast])
  toast.success = (msg, opts) => addToast(msg, { type: 'success', ...opts })
  toast.error = (msg, opts) => addToast(msg, { type: 'error', duration: 6000, ...opts })
  toast.info = (msg, opts) => addToast(msg, { type: 'info', ...opts })

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 sm:max-w-sm pb-safe"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

const TOAST_ICONS = {
  success: <IconCircleCheck size={20} stroke={1.75} className="text-success" />,
  error: <IconAlertCircle size={20} stroke={1.75} className="text-error" />,
  info: <IconInfoCircle size={20} stroke={1.75} className="text-info" />
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      role="status"
      className={`bg-surface border border-sepia-200/70 rounded-2xl px-4 py-3.5 shadow-lifted flex items-center gap-3 transition-all duration-300 ease-spring ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <span className="shrink-0">{TOAST_ICONS[toast.type] || TOAST_ICONS.info}</span>
      <p className="text-sm text-ink flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 -mr-1 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
      >
        <IconX size={16} stroke={2} />
      </button>
    </div>
  )
}

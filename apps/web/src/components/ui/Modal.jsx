import { useEffect, useRef } from 'react'
import { IconX } from '@tabler/icons-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
}

/**
 * System dialog. Backdrop blur, spring entrance, focus trap, Escape and
 * backdrop-click dismissal, body scroll lock. Compose header/body/footer
 * freely inside; pass `title` for the standard header with a close button.
 */
export default function Modal({
  onClose,
  title,
  eyebrow,
  ariaLabel,
  size = 'md',
  dismissable = true,
  className = '',
  children
}) {
  const panelRef = useRef(null)
  useFocusTrap(panelRef)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = e => {
      if (e.key === 'Escape' && dismissable) onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, dismissable])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={dismissable ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
        onClick={e => e.stopPropagation()}
        className={[
          'w-full bg-surface shadow-modal animate-scale-in',
          'rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto pb-safe',
          SIZES[size] ?? SIZES.md,
          className
        ].join(' ')}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
            <div className="min-w-0">
              {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
              {title && <h2 className="text-2xl font-display text-ink">{title}</h2>}
            </div>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-2 -mt-1 p-2 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
              >
                <IconX size={20} stroke={1.75} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-6 sm:px-8 sm:pb-8">{children}</div>
      </div>
    </div>
  )
}

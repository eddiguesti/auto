import { useEffect } from 'react'

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus within a modal container.
 * Focuses the first focusable element on mount, then cycles Tab/Shift+Tab within.
 *
 * @param {React.RefObject} ref - Ref to the modal container element.
 */
export function useFocusTrap(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const focusable = Array.from(el.querySelectorAll(FOCUSABLE_SELECTORS))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    const handleKeyDown = e => {
      if (e.key !== 'Tab') return
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [ref])
}

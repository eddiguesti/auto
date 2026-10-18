import { useEffect } from 'react'

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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

    const previousFocus = document.activeElement
    const getFocusable = () =>
      Array.from(el.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
        node => !node.closest('[hidden], [inert], [aria-hidden="true"]')
      )
    getFocusable()[0]?.focus()

    const handleKeyDown = e => {
      if (e.key !== 'Tab') return
      // Steps can replace their controls while the modal stays mounted.
      const focusable = getFocusable()
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        if (document.activeElement === first || !el.contains(document.activeElement)) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last || !el.contains(document.activeElement)) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [ref])
}

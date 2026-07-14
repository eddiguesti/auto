import { forwardRef, useId } from 'react'

const CONTROL_CLASSES = [
  'w-full px-4 py-3 rounded-xl text-base text-ink bg-surface',
  'border border-sepia-200 placeholder:text-sepia-400',
  'hover:border-sepia-300',
  'focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none',
  'disabled:bg-sepia-50 disabled:text-sepia-400 disabled:cursor-not-allowed',
  'transition-colors duration-150'
].join(' ')

/**
 * Labeled form field. Wires label, hint, and error to the control with
 * proper ids and aria attributes. Pass a render-prop-free child via
 * the dedicated Input/Textarea, or use `children(id, describedBy)`.
 */
export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-soft mb-1.5">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id, describedBy) : children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-sepia-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input({ className = '', invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={[
        CONTROL_CLASSES,
        invalid ? 'border-error focus:border-error focus:ring-error/10' : '',
        className
      ].join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea(
  { className = '', invalid, rows = 5, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={[
        CONTROL_CLASSES,
        'resize-y leading-relaxed',
        invalid ? 'border-error focus:border-error focus:ring-error/10' : '',
        className
      ].join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

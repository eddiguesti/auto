import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const VARIANTS = {
  // Ink — the one primary action per screen
  primary: 'bg-ink text-white hover:bg-ink-soft active:bg-ink shadow-button disabled:hover:bg-ink',
  // Quiet surface action
  secondary:
    'bg-surface text-ink border border-sepia-200 hover:border-sepia-300 hover:bg-sepia-50 shadow-xs',
  // Bronze — celebratory / upgrade moments only
  accent:
    'bg-bronze-500 text-white hover:bg-bronze-600 active:bg-bronze-600 shadow-button disabled:hover:bg-bronze-500',
  // Text-level action
  ghost: 'text-sepia-700 hover:bg-sepia-100/70 hover:text-ink',
  danger:
    'bg-error text-white hover:bg-error-strong active:bg-error-strong shadow-button disabled:hover:bg-error'
}

const SIZES = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
  xl: 'w-full px-7 py-4 text-base gap-2.5'
}

/**
 * System button. Renders a <Link> when `to` is given, an <a> when `href` is
 * given, otherwise a <button>. One `primary` per screen; everything else quiet.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon = null,
    iconRight = null,
    to,
    href,
    className = '',
    children,
    disabled,
    type,
    ...props
  },
  ref
) {
  const classes = [
    'inline-flex items-center justify-center font-medium rounded-full select-none',
    'transition-all duration-200 tap-bounce',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className
  ].join(' ')

  const content = (
    <>
      {loading ? <Spinner /> : icon}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }
  return (
    <button
      ref={ref}
      type={type || 'button'}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  )
})

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

export default Button

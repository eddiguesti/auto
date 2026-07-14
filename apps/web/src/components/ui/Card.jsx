import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8'
}

/**
 * System surface. `interactive` cards lift on hover and render as <Link>
 * when `to` is given or <button> when `onClick` is given.
 */
const Card = forwardRef(function Card(
  { interactive = false, padding = 'md', to, onClick, className = '', children, ...props },
  ref
) {
  const classes = [
    'block bg-surface border border-sepia-200/70 rounded-2xl shadow-soft',
    PADDING[padding] ?? PADDING.md,
    interactive ? 'card-hover text-left w-full cursor-pointer hover:border-sepia-300' : '',
    className
  ].join(' ')

  if (interactive && to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }
  if (interactive && onClick) {
    return (
      <button ref={ref} type="button" onClick={onClick} className={classes} {...props}>
        {children}
      </button>
    )
  }
  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  )
})

export default Card

const VARIANTS = {
  neutral: 'bg-sepia-100 text-sepia-700',
  bronze: 'bg-bronze-100 text-bronze-700',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  error: 'bg-error-soft text-error-strong',
  info: 'bg-info-soft text-info-strong',
  outline: 'bg-transparent border border-sepia-200 text-sepia-600'
}

export default function Badge({ variant = 'neutral', icon, className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        VARIANTS[variant] || VARIANTS.neutral,
        className
      ].join(' ')}
    >
      {icon}
      {children}
    </span>
  )
}

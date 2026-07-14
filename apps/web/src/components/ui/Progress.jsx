/**
 * Progress indicators — quiet bronze fills on warm tracks.
 */

export function ProgressBar({ value = 0, className = '', label }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`w-full h-2 bg-sepia-100 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full bg-gradient-to-r from-bronze-400 to-bronze-500 rounded-full progress-animate"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function ProgressRing({ value = 0, size = 120, strokeWidth = 7, children, label }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3ECE1"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-bronze)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="ring-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CC9C52" />
            <stop offset="100%" stopColor="#B88336" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

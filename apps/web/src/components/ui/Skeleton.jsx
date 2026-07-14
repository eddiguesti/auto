/**
 * Loading placeholder — warm shimmer block. Compose into page-shaped skeletons.
 */
export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden bg-sepia-100/80 rounded-xl ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
        style={{ animation: 'shimmer 1.6s ease-in-out infinite' }}
      />
    </div>
  )
}

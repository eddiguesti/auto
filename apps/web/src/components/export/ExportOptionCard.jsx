/**
 * A reusable card for export options in the ExportModal.
 *
 * @param {Object} props
 * @param {string} props.title - Card title.
 * @param {string} [props.badge] - Optional badge text (e.g. "AI", "New").
 * @param {string} props.description - Card body text.
 * @param {React.ReactNode} props.icon - SVG icon element.
 * @param {React.ReactNode} props.priceOrStatus - Price label or status indicator.
 * @param {React.ReactNode} [props.actionIcon] - Trailing icon (arrow/download).
 * @param {React.ReactNode} [props.children] - Extra content below price row.
 * @param {string} [props.className] - Outer wrapper classes (background, border, etc.).
 * @param {string} [props.iconWrapperClass] - Classes for the icon container.
 * @param {string} [props.badgeClass] - Classes for the badge.
 * @param {string} [props.cornerLabel] - Floating label in top-right corner.
 * @param {boolean} props.visible - Whether the entrance animation is active.
 * @param {string} props.delay - CSS transitionDelay value.
 * @param {Function} [props.onClick] - Click handler.
 */
export default function ExportOptionCard({
  title,
  badge,
  description,
  icon,
  priceOrStatus,
  actionIcon,
  children,
  className = '',
  iconWrapperClass = '',
  badgeClass = '',
  cornerLabel,
  visible,
  delay,
  onClick
}) {
  const visibilityClass = visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-300 group cursor-pointer transform hover:-translate-y-1 ${visibilityClass} ${className}`}
      style={{ transitionDelay: delay }}
      onClick={onClick}
    >
      {cornerLabel && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{cornerLabel}</span>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconWrapperClass}`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{title}</h3>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
            )}
          </div>
          <p className="text-sm mb-3">{description}</p>
          <div className="flex items-center justify-between">
            {priceOrStatus}
            {actionIcon}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

import { Card, Badge } from '../ui'

/**
 * A reusable card for export options in the ExportModal.
 *
 * @param {Object} props
 * @param {string} props.title - Card title.
 * @param {string} [props.badge] - Optional badge text (e.g. "AI", "New").
 * @param {string} props.description - Card body text.
 * @param {React.ReactNode} props.icon - Icon element.
 * @param {React.ReactNode} props.priceOrStatus - Price label or status indicator.
 * @param {React.ReactNode} [props.actionIcon] - Trailing icon (arrow/download).
 * @param {React.ReactNode} [props.children] - Extra content below price row.
 * @param {string} [props.className] - Outer wrapper classes (background, border, etc.).
 * @param {string} [props.iconWrapperClass] - Classes for the icon container.
 * @param {string} [props.badgeClass] - Classes appended to the badge.
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
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      padding="md"
      className={`relative ${className}`}
    >
      {cornerLabel && (
        <span className="absolute -top-2.5 right-4">
          <Badge variant="bronze">{cornerLabel}</Badge>
        </span>
      )}
      <div
        className={`transition-all duration-300 ${visibilityClass}`}
        style={{ transitionDelay: delay }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              iconWrapperClass || 'bg-sepia-100 text-sepia-600'
            }`}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-ink">{title}</h3>
              {badge && <Badge className={badgeClass}>{badge}</Badge>}
            </div>
            <p className="text-sm text-sepia-600 mb-3">{description}</p>
            <div className="flex items-center justify-between">
              {priceOrStatus}
              {actionIcon}
            </div>
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
}

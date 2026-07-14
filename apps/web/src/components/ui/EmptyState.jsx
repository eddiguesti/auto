/**
 * Meaningful empty state — icon, warm words, one clear next step.
 */
export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {icon && (
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sepia-100/80 text-sepia-500 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-display text-ink mb-1.5">{title}</h3>
      {description && <p className="text-sepia-600 text-sm max-w-xs mx-auto mb-6">{description}</p>}
      {action}
    </div>
  )
}

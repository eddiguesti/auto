import Skeleton from '../ui/Skeleton'

/**
 * Skeleton for a QuestionCard shown while chapter answers load from the API.
 * Mimics: question header + generous writing area.
 */
export default function QuestionCardSkeleton() {
  return (
    <div
      className="bg-surface border border-sepia-200/70 rounded-2xl shadow-soft overflow-hidden"
      aria-hidden="true"
    >
      {/* Question header area */}
      <div className="p-5 sm:p-8 border-b border-sepia-100">
        <Skeleton className="h-8 w-3/4 mb-3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Writing area */}
      <div className="p-5 sm:p-8 pt-5 sm:pt-6">
        <Skeleton className="h-56 sm:h-72 w-full" />
      </div>
    </div>
  )
}

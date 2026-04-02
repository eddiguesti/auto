/**
 * Skeleton for a QuestionCard shown while chapter answers load from the API.
 * Mimics: question header + textarea body + navigation dots.
 */
export default function QuestionCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {/* Question header area */}
      <div className="bg-sepia/5 rounded-t-2xl p-5 sm:p-6 border border-sepia/10">
        <div className="h-6 w-3/4 bg-stone-200 rounded mb-3" />
        <div className="h-4 w-1/2 bg-stone-200 rounded" />
      </div>

      {/* Textarea body */}
      <div className="bg-white rounded-b-2xl p-4 sm:p-6 border border-t-0 border-sepia/10 shadow-sm">
        <div className="h-48 sm:h-64 bg-stone-100 rounded" />
      </div>
    </div>
  )
}

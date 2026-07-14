import Skeleton from '../ui/Skeleton'

/**
 * Skeleton for the Home page progress card shown while story progress loads.
 * Mimics: progress ring + heading and subtitle lines.
 */
export default function HomeProgressSkeleton() {
  return (
    <div
      className="mb-10 bg-surface border border-sepia-200/70 rounded-2xl shadow-soft p-6 flex items-center gap-6"
      aria-hidden="true"
    >
      <Skeleton className="w-[104px] h-[104px] rounded-full shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

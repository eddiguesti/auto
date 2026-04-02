/**
 * Skeleton for the Home page progress section shown while story progress loads.
 * Mimics: large percentage number + subtitle line + progress bar.
 */
export default function HomeProgressSkeleton() {
  return (
    <div className="animate-pulse mb-10 text-center" aria-hidden="true">
      <div className="h-14 w-24 bg-stone-200 rounded-lg mx-auto mb-2" />
      <div className="h-4 w-48 bg-stone-200 rounded mx-auto mb-3" />
      <div className="w-full h-2 bg-stone-200 rounded-full" />
    </div>
  )
}

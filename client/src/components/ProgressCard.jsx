import { useMemo } from 'react'

const MILESTONES = [
  { percent: 0, message: "Every story begins with a single word", icon: "pencil" },
  { percent: 10, message: "You're just getting started - keep going!", icon: "seedling" },
  { percent: 25, message: "A quarter of your story captured", icon: "book-open" },
  { percent: 50, message: "Halfway there! Your memoir is taking shape", icon: "star" },
  { percent: 75, message: "Almost there - the finish line is in sight", icon: "flag" },
  { percent: 90, message: "Just a few more memories to capture", icon: "trophy" },
  { percent: 100, message: "Your life story is complete!", icon: "check-circle" }
]

const ICONS = {
  pencil: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  seedling: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V6M12 6C12 6 12 3 8 3C4 3 4 6 4 6C4 6 4 10 8 10M12 6C12 6 12 3 16 3C20 3 20 6 20 6C20 6 20 10 16 10" />
    </svg>
  ),
  'book-open': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  flag: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  trophy: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  'check-circle': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function ProgressCard({ totalProgress, totalQuestions, totalAnswered, onViewBook }) {
  const milestone = useMemo(() => {
    // Find the current milestone based on progress
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (totalProgress >= MILESTONES[i].percent) {
        return MILESTONES[i]
      }
    }
    return MILESTONES[0]
  }, [totalProgress])

  return (
    <div className="bg-gradient-to-br from-white/80 to-amber-50/50 backdrop-blur-sm rounded-2xl p-6 mb-10 border border-sepia/10 shadow-lg">
      {/* Main Progress Section */}
      <div className="flex items-start gap-4 mb-6">
        {/* Circular Progress */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-sepia/10"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - totalProgress / 100)}`}
              strokeLinecap="round"
              className="text-sepia transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold text-ink">{totalProgress}%</span>
          </div>
        </div>

        {/* Progress Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sepia mb-1">
            {ICONS[milestone.icon]}
            <span className="text-sm font-medium">Your Journey</span>
          </div>
          <p className="text-ink font-display text-lg leading-tight mb-2">
            {milestone.message}
          </p>
          <p className="text-sepia/70 text-sm">
            {totalAnswered} of {totalQuestions} stories captured
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">{totalAnswered}</div>
          <div className="text-xs text-sepia/70">Stories</div>
        </div>
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">10</div>
          <div className="text-xs text-sepia/70">Chapters</div>
        </div>
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">{Math.max(0, totalQuestions - totalAnswered)}</div>
          <div className="text-xs text-sepia/70">Remaining</div>
        </div>
      </div>

      {/* Book Preview Button */}
      <button
        onClick={onViewBook}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-ink to-stone-800 text-white rounded-xl hover:shadow-lg transition-all group"
      >
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="font-medium">Preview Your Book</span>
        <span className="text-white/60 text-sm ml-auto">See how it looks</span>
      </button>
    </div>
  )
}

import { useMemo, memo } from 'react'
import {
  IconBook2,
  IconCircleCheck,
  IconFlag,
  IconPencil,
  IconSeeding,
  IconStar,
  IconTrophy
} from '@tabler/icons-react'
import { Card, Button, ProgressRing } from './ui'

const MILESTONES = [
  { percent: 0, message: 'Every story begins with a single word', icon: 'pencil' },
  { percent: 10, message: "You're just getting started - keep going!", icon: 'seedling' },
  { percent: 25, message: 'A quarter of your story captured', icon: 'book-open' },
  { percent: 50, message: 'Halfway there! Your memoir is taking shape', icon: 'star' },
  { percent: 75, message: 'Almost there - the finish line is in sight', icon: 'flag' },
  { percent: 90, message: 'Just a few more memories to capture', icon: 'trophy' },
  { percent: 100, message: 'Your life story is complete!', icon: 'check-circle' }
]

const ICONS = {
  pencil: <IconPencil size={20} stroke={1.75} />,
  seedling: <IconSeeding size={20} stroke={1.75} />,
  'book-open': <IconBook2 size={20} stroke={1.75} />,
  star: <IconStar size={20} stroke={1.75} />,
  flag: <IconFlag size={20} stroke={1.75} />,
  trophy: <IconTrophy size={20} stroke={1.75} />,
  'check-circle': <IconCircleCheck size={20} stroke={1.75} />
}

export default memo(function ProgressCard({
  totalProgress,
  totalQuestions,
  totalAnswered,
  onViewBook
}) {
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
    <Card className="mb-10">
      {/* Main Progress Section */}
      <div className="flex items-start gap-5 mb-6">
        {/* Circular Progress */}
        <ProgressRing
          value={totalProgress}
          size={80}
          strokeWidth={6}
          label="Overall story progress"
        >
          <span className="text-xl font-semibold text-ink leading-none">{totalProgress}%</span>
        </ProgressRing>

        {/* Progress Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sepia-600 mb-1">
            {ICONS[milestone.icon]}
            <span className="text-sm font-medium">Your Journey</span>
          </div>
          <p className="text-ink font-display text-lg leading-tight mb-2">{milestone.message}</p>
          <p className="text-sepia-600 text-sm">
            {totalAnswered} of {totalQuestions} stories captured
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-sepia-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">{totalAnswered}</div>
          <div className="text-xs text-sepia-600">Stories</div>
        </div>
        <div className="bg-sepia-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">10</div>
          <div className="text-xs text-sepia-600">Chapters</div>
        </div>
        <div className="bg-sepia-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-semibold text-ink">
            {Math.max(0, totalQuestions - totalAnswered)}
          </div>
          <div className="text-xs text-sepia-600">Remaining</div>
        </div>
      </div>

      {/* Book Preview Button */}
      <Button size="xl" onClick={onViewBook} icon={<IconBook2 size={20} stroke={1.75} />}>
        Preview Your Book
        <span className="ml-2 text-white/60 text-sm font-normal">See how it looks</span>
      </Button>
    </Card>
  )
})

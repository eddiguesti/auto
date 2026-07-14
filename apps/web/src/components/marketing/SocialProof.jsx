import {
  IconUsers,
  IconBook2,
  IconStarFilled,
  IconLock,
  IconShieldCheck,
  IconRosetteDiscountCheck
} from '@tabler/icons-react'

/**
 * SocialProof - Stats banner and trust badges.
 * Displays key metrics and trust indicators using Keepsake tokens.
 */

const STATS = [
  { value: '500+', label: 'Families', icon: IconUsers },
  { value: '10,000+', label: 'Stories written', icon: IconBook2 },
  { value: '4.9/5', label: 'Rating', icon: IconStarFilled }
]

const BADGES = [
  { label: 'SSL encrypted', icon: IconLock },
  { label: 'Secure payment', icon: IconShieldCheck },
  { label: 'Money-back guarantee', icon: IconRosetteDiscountCheck }
]

function StatItem({ value, label, icon: Icon }) {
  return (
    <div className="stagger-item flex flex-col items-center gap-2">
      <div className="w-11 h-11 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center">
        <Icon size={24} stroke={1.5} aria-hidden="true" />
      </div>
      <span className="font-display text-2xl sm:text-3xl text-ink">{value}</span>
      <span className="text-sm text-sepia-500">{label}</span>
    </div>
  )
}

function BadgeItem({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 text-sepia-600">
      <Icon size={20} stroke={1.75} className="text-success shrink-0" aria-hidden="true" />
      <span className="text-xs sm:text-sm">{label}</span>
    </div>
  )
}

export default function SocialProof() {
  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 bg-cream">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-10 sm:gap-16 mb-10">
          {STATS.map(stat => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 border-t border-sepia-200/60 pt-6">
          {BADGES.map(badge => (
            <BadgeItem key={badge.label} {...badge} />
          ))}
        </div>
      </div>
    </section>
  )
}

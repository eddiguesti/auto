/**
 * SocialProof - Stats banner and trust badges.
 * Displays key metrics and trust indicators using heritage palette.
 */

const STATS = [
  {
    value: '500+',
    label: 'Families',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
  },
  {
    value: '10,000+',
    label: 'Stories Written',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  },
  {
    value: '4.9/5',
    label: 'Rating',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
  }
]

const BADGES = [
  {
    label: 'SSL Encrypted',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
  },
  {
    label: 'Secure Payment',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  },
  {
    label: 'Money-Back Guarantee',
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
  }
]

function StatItem({ value, label, icon }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        className="w-7 h-7 text-heritage-sepia"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      <span className="font-display text-2xl sm:text-3xl text-heritage-ink">{value}</span>
      <span className="font-sans text-sm text-heritage-text">{label}</span>
    </div>
  )
}

function BadgeItem({ label, icon }) {
  return (
    <div className="flex items-center gap-2 text-heritage-text">
      <svg
        className="w-5 h-5 text-heritage-sage"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
      <span className="font-sans text-xs sm:text-sm">{label}</span>
    </div>
  )
}

export default function SocialProof() {
  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 bg-heritage-cream">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-10 sm:gap-16 mb-10">
          {STATS.map(stat => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 border-t border-heritage-sepia-light/30 pt-6">
          {BADGES.map(badge => (
            <BadgeItem key={badge.label} {...badge} />
          ))}
        </div>
      </div>
    </section>
  )
}

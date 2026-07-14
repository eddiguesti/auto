import { IconCheck } from '@tabler/icons-react'
import { Button } from '../ui'

/**
 * CTASection - Final call-to-action section before the footer.
 *
 * Props:
 *   user         - Current authenticated user (or null)
 *   onGetStarted - Handler for CTA button click
 */
export default function CTASection({ user, onGetStarted }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-parchment">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6 [text-wrap:balance]">
          Your stories matter.
          <br />
          <span className="italic text-sepia-600">Start chapter 1 today.</span>
        </h2>
        <p className="text-lg text-sepia-600 mb-10 max-w-xl mx-auto">
          Record your first memories completely free. Once you see your story come to life, you'll
          understand why families treasure these forever.
        </p>
        <Button variant="primary" size="lg" onClick={onGetStarted}>
          {user ? 'Continue your story' : 'Start chapter 1 free'}
        </Button>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-sepia-500">
          <TrustBadge>No credit card required</TrustBadge>
          <TrustBadge>Start in seconds</TrustBadge>
        </div>
      </div>
    </section>
  )
}

function TrustBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconCheck size={18} stroke={2} className="text-success shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}

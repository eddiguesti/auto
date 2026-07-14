import { IconCheck } from '@tabler/icons-react'
import { Button, Card } from '../ui'

/**
 * HeroSection - Landing page hero area with headline, CTA, and book preview visual.
 *
 * Props:
 *   user           - Current authenticated user (or null)
 *   onGetStarted   - Handler for primary CTA click
 */
export default function HeroSection({ user, onGetStarted }) {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-parchment pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Hero Content */}
          <div className="page-enter text-center lg:text-left">
            <p className="eyebrow mb-5">Preserve your legacy</p>

            <h1 className="font-display text-5xl sm:text-6xl text-ink mb-6 [text-wrap:balance]">
              Your life story,
              <br />
              <span className="italic text-sepia-600">beautifully told</span>
            </h1>

            <p className="text-lg sm:text-xl text-sepia-600 mb-10 max-w-xl mx-auto lg:mx-0">
              Just talk about your memories. Clio listens, asks thoughtful questions, and transforms
              your stories into a beautifully written autobiography your family will treasure
              forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                className="w-full sm:w-auto"
              >
                {user ? 'Continue my story' : 'Write my first chapter — free'}
              </Button>
              <Button variant="ghost" size="lg" onClick={scrollToHowItWorks}>
                See how it works
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-sepia-500">
              <TrustBadge>Chapter 1 completely free</TrustBadge>
              <TrustBadge>No credit card needed</TrustBadge>
            </div>
          </div>

          {/* Hero Visual - Book Preview */}
          <div className="relative hidden lg:block">
            <Card padding="lg" className="relative shadow-lifted">
              <div className="border-b border-sepia-200/70 pb-4 mb-6">
                <p className="font-display text-3xl text-ink italic">Chapter One</p>
                <p className="text-sepia-500 text-sm mt-1">The Early Years</p>
              </div>
              <div className="space-y-4">
                <p className="font-serif text-ink-soft leading-relaxed text-base">
                  I still remember the summer of 1962, the way the sunlight filtered through
                  grandmother's lace curtains, casting patterns on the wooden floor of her
                  kitchen...
                </p>
                <p className="font-serif text-ink-soft leading-relaxed text-base">
                  Those were the days when time moved slowly, when a single afternoon could stretch
                  into an entire adventure.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sepia-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success" />
                  <p className="text-sm text-sepia-500">Clio is listening...</p>
                </div>
              </div>
            </Card>
            <Card padding="sm" className="absolute -bottom-4 -left-4 shadow-lifted">
              <p className="font-display text-sm text-ink italic">
                "What was your grandmother like?"
              </p>
            </Card>
          </div>
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

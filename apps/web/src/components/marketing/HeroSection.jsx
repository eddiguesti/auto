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
    <section className="min-h-screen flex items-center pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-6 font-medium">
              Preserve Your Legacy
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-heritage-ink leading-[1.1] mb-8">
              Your life story,
              <br />
              <span className="italic text-heritage-sepia">beautifully told</span>
            </h1>

            <p className="font-sans text-lg sm:text-xl text-heritage-text leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              Just talk about your memories. Clio listens, asks thoughtful questions, and transforms
              your stories into a beautifully written autobiography your family will treasure
              forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <button
                onClick={onGetStarted}
                className="group font-sans bg-heritage-cta text-white px-8 py-4 rounded-full text-base sm:text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25 hover:shadow-xl hover:shadow-heritage-cta/30 w-full sm:w-auto"
              >
                {user ? 'Continue My Story' : 'Write My First Chapter — Free'}
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="font-sans text-heritage-text px-6 py-4 hover:text-heritage-ink transition-colors text-base"
              >
                See how it works
              </button>
            </div>

            {/* Trust Signals */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-heritage-text">
              <TrustBadge>Chapter 1 completely free</TrustBadge>
              <TrustBadge>No credit card needed</TrustBadge>
            </div>
          </div>

          {/* Hero Visual - Book Preview */}
          <div className="relative hidden lg:block">
            <div className="absolute -top-10 -right-10 w-80 h-80 bg-heritage-sepia-light/20 rounded-full blur-3xl" />
            <div className="relative bg-heritage-card rounded-3xl shadow-2xl shadow-heritage-ink/10 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500 border border-heritage-sepia-light/20">
              <div className="border-b border-heritage-sepia-light/30 pb-4 mb-6">
                <p className="font-display text-3xl text-heritage-ink italic">Chapter One</p>
                <p className="font-sans text-heritage-sepia text-sm mt-1">The Early Years</p>
              </div>
              <div className="space-y-4">
                <p className="font-serif text-heritage-text leading-relaxed text-base">
                  I still remember the summer of 1962, the way the sunlight filtered through
                  grandmother's lace curtains, casting patterns on the wooden floor of her
                  kitchen...
                </p>
                <p className="font-serif text-heritage-text leading-relaxed text-base">
                  Those were the days when time moved slowly, when a single afternoon could stretch
                  into an entire adventure.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-heritage-sepia-light/20">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-heritage-sage animate-pulse" />
                  <p className="font-sans text-sm text-heritage-sepia">Clio is listening...</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-heritage-card rounded-2xl p-4 shadow-lg border border-heritage-sepia-light/20">
              <p className="font-display text-sm text-heritage-ink italic">
                "What was your grandmother like?"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="w-5 h-5 text-heritage-sage" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </span>
  )
}

/**
 * CTASection - Final call-to-action section before the footer.
 *
 * Props:
 *   user         - Current authenticated user (or null)
 *   onGetStarted - Handler for CTA button click
 */
export default function CTASection({ user, onGetStarted }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6 leading-tight">
          Your stories matter.
          <br />
          <span className="italic text-heritage-sepia">Start Chapter 1 today.</span>
        </h2>
        <p className="font-serif text-lg sm:text-xl text-heritage-text mb-10 max-w-xl mx-auto">
          Record your first memories completely free. Once you see your story come to life, you'll
          understand why families treasure these forever.
        </p>
        <button
          onClick={onGetStarted}
          className="group font-sans bg-heritage-cta text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25 hover:shadow-xl hover:shadow-heritage-cta/30"
        >
          {user ? 'Continue Your Story' : 'Start Chapter 1 Free'}
          <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </button>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-heritage-text">
          <TrustBadge>No credit card required</TrustBadge>
          <TrustBadge>Start in seconds</TrustBadge>
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

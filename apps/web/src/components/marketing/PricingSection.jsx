/**
 * PricingSection - Three-tier pricing cards with gift callout.
 *
 * Props:
 *   onGetStarted - Handler for CTA button clicks
 */
export default function PricingSection({ onGetStarted }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-cream">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
            Simple Pricing
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6">
            Start your first chapter{' '}
            <span className="italic text-heritage-sepia">completely free</span>
          </h2>
          <p className="font-serif text-lg sm:text-xl text-heritage-text max-w-2xl mx-auto">
            No credit card needed. Record your first memories, see your story come to life, then
            decide if you'd like to continue.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          <PricingCard
            tier="Chapter 1"
            price="Free"
            subtitle="Your first story, on us"
            features={FREE_FEATURES}
            buttonLabel="Start Chapter 1 Free"
            buttonClassName="w-full font-sans bg-heritage-sepia-light/40 text-heritage-ink px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-sepia-light/60 transition-all border border-heritage-sepia-light"
            onAction={onGetStarted}
          />

          <PricingCard
            tier="Full Story"
            tierClassName="font-sans text-heritage-cta text-sm uppercase tracking-wider font-semibold mb-2"
            price="\u00a3299"
            originalPrice="\u00a3599"
            subtitle="50% off \u2014 or 4 payments of \u00a3100/mo"
            features={FULL_STORY_FEATURES}
            buttonLabel="Write My First Chapter \u2014 Free"
            buttonClassName="w-full font-sans bg-heritage-cta text-white px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25"
            onAction={onGetStarted}
            highlighted
            vatNote
          />

          <PricingCard
            tier="Lifetime"
            price="\u00a3299"
            originalPrice="\u00a3599"
            subtitle="50% off \u2014 or 4 payments of \u00a3100/mo"
            features={LIFETIME_FEATURES}
            buttonLabel="Get Lifetime Access"
            buttonClassName="w-full font-sans bg-heritage-sepia text-white px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-sepia-dark transition-all shadow-md"
            onAction={onGetStarted}
            vatNote
          />
        </div>

        <GiftCallout />
      </div>
    </section>
  )
}

const FREE_FEATURES = [
  '3-5 guided story prompts',
  'Your first written chapter',
  'Book preview',
  'No credit card required'
]

const FULL_STORY_FEATURES = [
  '52 chapters \u2014 one per week',
  'Unlimited voice conversations',
  '4 colour royal hardcover books in cloth',
  'Family sharing',
  'Priority support'
]

const LIFETIME_FEATURES = [
  'Everything in Full Story',
  'Unlimited chapters forever',
  'All future features included',
  'Best long-term value'
]

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PricingCard({
  tier,
  tierClassName = 'font-sans text-heritage-sepia text-sm uppercase tracking-wider font-semibold mb-2',
  price,
  originalPrice,
  subtitle,
  features,
  buttonLabel,
  buttonClassName,
  onAction,
  highlighted = false,
  vatNote = false
}) {
  const cardBase = highlighted
    ? 'bg-heritage-card rounded-3xl p-8 border-2 border-heritage-cta shadow-xl relative md:-mt-4 md:mb-[-1rem]'
    : 'bg-heritage-card rounded-3xl p-8 border-2 border-heritage-sepia-light/40 shadow-md'

  return (
    <div className={cardBase}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="font-sans text-sm bg-heritage-cta text-white px-5 py-1.5 rounded-full font-medium shadow-md shadow-heritage-cta/20">
            Most Popular
          </span>
        </div>
      )}

      <div className={`mb-6 ${highlighted ? 'mt-2' : ''}`}>
        <p className={tierClassName}>{tier}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-5xl text-heritage-ink">{price}</span>
          {originalPrice && (
            <span className="font-sans text-heritage-text text-base line-through ml-2">
              {originalPrice}
            </span>
          )}
        </div>
        <p className="font-serif text-heritage-text text-base mt-2">{subtitle}</p>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3">
            <CheckIcon />
            <span className="font-serif text-heritage-text text-base">{feature}</span>
          </li>
        ))}
      </ul>

      <button onClick={onAction} className={buttonClassName}>
        {buttonLabel}
      </button>
      {vatNote && (
        <p className="font-sans text-heritage-text/60 text-sm text-center mt-3">VAT included</p>
      )}
    </div>
  )
}

function GiftCallout() {
  return (
    <div className="mt-12 bg-heritage-card rounded-2xl p-6 sm:p-8 border border-heritage-sepia-light/30 text-center shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-full bg-heritage-cta-light/20 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-7 h-7 text-heritage-cta"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-xl text-heritage-ink mb-1">
            The perfect gift for Mum, Dad, or Grandparents
          </p>
          <p className="font-serif text-heritage-text text-base">
            Give the gift of a lifetime of stories. Most popular at Christmas, birthdays, and
            Mother's/Father's Day.
          </p>
        </div>
      </div>
    </div>
  )
}

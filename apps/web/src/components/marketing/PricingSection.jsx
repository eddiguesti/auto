import { IconCheck, IconGift } from '@tabler/icons-react'
import { Badge, Button, Card } from '../ui'

/**
 * PricingSection - Three-tier pricing cards with gift callout.
 *
 * Props:
 *   onGetStarted - Handler for CTA button clicks
 */
export default function PricingSection({ onGetStarted }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-parchment">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="eyebrow mb-4">Simple pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-6 [text-wrap:balance]">
            Start your first chapter <span className="italic text-sepia-600">completely free</span>
          </h2>
          <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
            No credit card needed. Record your first memories, see your story come to life, then
            decide if you'd like to continue.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {TIERS.map(tier => (
            <PricingCard key={tier.tier} {...tier} onAction={onGetStarted} />
          ))}
        </div>

        <GiftCallout />
      </div>
    </section>
  )
}

const TIERS = [
  {
    tier: 'Chapter 1',
    price: 'Free',
    subtitle: 'Your first story, on us',
    features: [
      '3-5 guided story prompts',
      'Your first written chapter',
      'Book preview',
      'No credit card required'
    ],
    buttonLabel: 'Start chapter 1 free',
    buttonVariant: 'secondary'
  },
  {
    tier: 'Full Story',
    price: '£299',
    originalPrice: '£599',
    subtitle: '50% off — or 4 payments of £100/mo',
    features: [
      '52 chapters — one per week',
      'Unlimited voice conversations',
      '4 colour royal hardcover books in cloth',
      'Family sharing',
      'Priority support'
    ],
    buttonLabel: 'Write my first chapter — free',
    buttonVariant: 'primary',
    highlighted: true,
    vatNote: true
  },
  {
    tier: 'Lifetime',
    price: '£299',
    originalPrice: '£599',
    subtitle: '50% off — or 4 payments of £100/mo',
    features: [
      'Everything in Full Story',
      'Unlimited chapters forever',
      'All future features included',
      'Best long-term value'
    ],
    buttonLabel: 'Get lifetime access',
    buttonVariant: 'secondary',
    vatNote: true
  }
]

function PricingCard({
  tier,
  price,
  originalPrice,
  subtitle,
  features,
  buttonLabel,
  buttonVariant,
  onAction,
  highlighted = false,
  vatNote = false
}) {
  return (
    <Card
      padding="lg"
      className={`stagger-item relative ${
        highlighted ? 'border-bronze-400 shadow-lifted md:-mt-4 md:mb-[-1rem]' : ''
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="bronze">Most popular</Badge>
        </div>
      )}

      <div className={`mb-6 ${highlighted ? 'mt-2' : ''}`}>
        <p className={`eyebrow mb-2 ${highlighted ? '!text-bronze-600' : ''}`}>{tier}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-5xl text-ink">{price}</span>
          {originalPrice && (
            <span className="text-sepia-500 text-base line-through ml-2">{originalPrice}</span>
          )}
        </div>
        <p className="text-sepia-600 text-base mt-2">{subtitle}</p>
      </div>

      <ul className="space-y-3.5 mb-8">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3">
            <IconCheck
              size={20}
              stroke={2}
              className="text-success mt-1 shrink-0"
              aria-hidden="true"
            />
            <span className="text-ink-soft text-base">{feature}</span>
          </li>
        ))}
      </ul>

      <Button variant={buttonVariant} size="xl" onClick={onAction}>
        {buttonLabel}
      </Button>
      {vatNote && <p className="text-sepia-500 text-xs text-center mt-3">VAT included</p>}
    </Card>
  )
}

function GiftCallout() {
  return (
    <Card padding="lg" className="mt-12 text-center">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-bronze-100 text-bronze-600 flex items-center justify-center shrink-0">
          <IconGift size={24} stroke={1.5} aria-hidden="true" />
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-xl text-ink mb-1">
            The perfect gift for Mum, Dad, or Grandparents
          </p>
          <p className="text-sepia-600 text-base">
            Give the gift of a lifetime of stories. Most popular at Christmas, birthdays, and
            Mother's/Father's Day.
          </p>
        </div>
      </div>
    </Card>
  )
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconBook2, IconMicrophone, IconClock, IconCheck } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { Button, Badge } from '../ui'

const fade = delay => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }
})

// Three hero deliverables — chunked visual anchors
const DELIVERABLES = [
  {
    icon: IconBook2,
    lines: ['4 Royal Hardcover', 'Books in Cloth'],
    caption: 'Full colour, delivered'
  },
  {
    icon: IconMicrophone,
    lines: ['Professional', 'Audiobook'],
    caption: 'Narrated for you'
  },
  {
    icon: IconClock,
    lines: ['12 Months', 'Unlimited'],
    caption: 'Write at your pace'
  }
]

export default function OnboardingOffer({ firstName, onTryFree }) {
  const { authFetch } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleBuy = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      authFetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {})
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'onboarding_bundle',
          successUrl: `${window.location.origin}/home?premium_activated=true`,
          cancelUrl: `${window.location.origin}/home`
        })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Checkout failed:', err)
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Headline — ownership + emotional validation */}
      <motion.h2
        {...fade(0)}
        className="text-2xl sm:text-3xl font-display text-ink text-center mb-3"
      >
        {firstName ? `${firstName}, your` : 'Your'} life is worth
        <br />
        <span className="text-bronze-600">a real book.</span>
      </motion.h2>

      <motion.p
        {...fade(0.05)}
        className="text-sepia-600 text-center text-base leading-relaxed mb-7 max-w-xs mx-auto"
      >
        A professionally crafted memoir, written in your voice — printed and delivered to
        your&nbsp;door.
      </motion.p>

      {/* Three hero deliverables */}
      <motion.div {...fade(0.1)} className="grid grid-cols-3 gap-2 mb-7">
        {DELIVERABLES.map(({ icon: Icon, lines, caption }) => (
          <div
            key={caption}
            className="flex flex-col items-center text-center p-3 rounded-2xl bg-surface border border-sepia-200/70 shadow-soft"
          >
            <div className="w-11 h-11 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mb-2">
              <Icon size={24} stroke={1.5} />
            </div>
            {lines.map(line => (
              <p key={line} className="text-xs font-semibold text-ink leading-tight">
                {line}
              </p>
            ))}
            <p className="text-xs text-sepia-500 mt-1">{caption}</p>
          </div>
        ))}
      </motion.div>

      {/* Anchor + social proof — compact */}
      <motion.div {...fade(0.16)} className="mx-auto mb-6 text-center">
        <p className="text-sm text-sepia-600">
          A professional biographer costs <span className="font-semibold text-ink">£10,000+</span>
        </p>
        <p className="text-sm text-sepia-500 mt-0.5">
          95% of early users rated theirs just as&nbsp;good
        </p>
      </motion.div>

      {/* Secondary features — scannable 2-col grid */}
      <motion.div {...fade(0.2)} className="mb-7">
        <div className="h-px bg-sepia-200/70 mb-4" />
        <p className="eyebrow text-center mb-3">Also included</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {[
            '91 guided questions',
            '10 custom illustrations',
            'Unlimited Clio calls',
            'Multiple writing styles',
            'Talk over the phone',
            '10 full chapters'
          ].map(text => (
            <div key={text} className="flex items-center gap-2">
              <IconCheck size={16} stroke={2.5} className="text-success shrink-0" />
              <p className="text-sm text-ink-soft leading-tight">{text}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-sepia-200/70 mt-4" />
      </motion.div>

      {/* Price card — visual weight + anchoring cascade */}
      <motion.div
        {...fade(0.26)}
        className="text-center mb-5 py-5 px-4 mx-auto max-w-[280px] rounded-2xl bg-cream border border-sepia-200/70"
      >
        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          <span className="text-sepia-400 line-through text-sm">£599</span>
          <Badge variant="bronze">50% OFF</Badge>
        </div>
        <span className="text-5xl font-display text-ink leading-none">£299</span>
        <p className="text-sm text-sepia-500 mt-2">One payment · Everything included</p>
        <p className="text-xs text-sepia-500 mt-1">Or 4 monthly payments of £100</p>
        <p className="text-xs text-bronze-700 font-medium mt-1">
          Welcome price — only available right now
        </p>
      </motion.div>

      {/* CTA — concrete action + ownership language */}
      <motion.div {...fade(0.32)} className="mb-2">
        <Button variant="accent" size="xl" loading={isLoading} onClick={handleBuy}>
          {isLoading ? 'Redirecting...' : 'Get My Book — £299'}
        </Button>
      </motion.div>

      {/* Free option */}
      <motion.div {...fade(0.35)}>
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          onClick={onTryFree}
          disabled={isLoading}
        >
          Start with a free chapter
        </Button>
      </motion.div>

      {/* Trust signals */}
      <motion.p {...fade(0.38)} className="text-center text-xs text-sepia-500 mt-4">
        Secure payment via Stripe · 30-day money-back guarantee
      </motion.p>
    </div>
  )
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const fade = delay => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }
})

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
      if (data.url) window.location.href = data.url
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
        className="text-[24px] sm:text-[28px] font-display text-ink text-center mb-3 leading-[1.2] tracking-[-0.015em]"
      >
        {firstName ? `${firstName}, your` : 'Your'} life is worth
        <br />
        <span className="text-sepia">a real book.</span>
      </motion.h2>

      <motion.p
        {...fade(0.05)}
        className="text-warmgray text-center text-[14px] leading-[1.55] mb-7 max-w-[300px] mx-auto"
      >
        A professionally crafted memoir, written in your voice — printed and delivered to
        your&nbsp;door.
      </motion.p>

      {/* Three hero deliverables — chunked visual anchors */}
      <motion.div {...fade(0.1)} className="grid grid-cols-3 gap-2 mb-7">
        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/80 ring-1 ring-black/[0.04] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sepia/10 to-amber-100/60 flex items-center justify-center mb-2">
            <svg
              className="w-5 h-5 text-sepia/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">Hardcover</p>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">Book</p>
          <p className="text-[10.5px] text-warmgray/55 mt-1">Full colour, delivered</p>
        </div>

        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/80 ring-1 ring-black/[0.04] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sepia/10 to-amber-100/60 flex items-center justify-center mb-2">
            <svg
              className="w-5 h-5 text-sepia/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">Professional</p>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">Audiobook</p>
          <p className="text-[10.5px] text-warmgray/55 mt-1">Narrated for you</p>
        </div>

        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/80 ring-1 ring-black/[0.04] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sepia/10 to-amber-100/60 flex items-center justify-center mb-2">
            <svg
              className="w-5 h-5 text-sepia/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">12 Months</p>
          <p className="text-[12px] font-semibold text-ink/85 leading-tight">Unlimited</p>
          <p className="text-[10.5px] text-warmgray/55 mt-1">Write at your pace</p>
        </div>
      </motion.div>

      {/* Anchor + social proof — compact */}
      <motion.div {...fade(0.16)} className="mx-auto mb-6 text-center">
        <p className="text-[12.5px] text-warmgray/60 leading-[1.5]">
          A professional biographer costs{' '}
          <span className="font-semibold text-ink/70">£10,000+</span>
        </p>
        <p className="text-[12.5px] text-warmgray/50 mt-0.5">
          95% of early users rated theirs just as&nbsp;good
        </p>
      </motion.div>

      {/* Secondary features — scannable 2-col grid */}
      <motion.div {...fade(0.2)} className="mb-7">
        <div className="h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent mb-4" />
        <p className="text-[10.5px] font-semibold text-warmgray/40 uppercase tracking-[0.1em] mb-3 text-center">
          Also included
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {[
            '91 guided questions',
            '10 custom illustrations',
            'Unlimited Clio calls',
            'Multiple writing styles',
            'Voice-to-text',
            '10 full chapters'
          ].map(text => (
            <div key={text} className="flex items-center gap-2">
              <svg
                className="w-3 h-3 text-sepia/50 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-[12.5px] text-ink/55 leading-[1.3]">{text}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent mt-4" />
      </motion.div>

      {/* Price card — visual weight + anchoring cascade */}
      <motion.div
        {...fade(0.26)}
        className="text-center mb-5 py-5 mx-auto max-w-[280px] rounded-2xl bg-gradient-to-b from-white/90 to-amber-50/40 ring-1 ring-sepia/[0.08] shadow-[0_2px_8px_rgba(139,90,43,0.06)]"
      >
        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          <span className="text-warmgray/30 line-through text-sm">£300</span>
          <span className="text-[11px] font-semibold text-sepia/80 bg-sepia/[0.08] px-2 py-0.5 rounded-full tracking-wide">
            SAVE £201
          </span>
        </div>
        <span className="text-[46px] font-display text-ink tracking-[-0.03em] leading-none">
          £99
        </span>
        <p className="text-[12px] text-warmgray/50 mt-2">One payment · Everything included</p>
        <p className="text-[11px] text-sepia/60 font-medium mt-1">
          Welcome price — only available right now
        </p>
      </motion.div>

      {/* CTA — concrete action + ownership language */}
      <motion.button
        {...fade(0.32)}
        onClick={handleBuy}
        disabled={isLoading}
        className="w-full bg-sepia text-white px-8 py-[16px] rounded-2xl text-[16px] font-semibold tracking-[-0.01em] shadow-[0_2px_16px_rgba(139,90,43,0.3)] hover:bg-ink hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mb-2"
      >
        {isLoading ? 'Redirecting...' : 'Get My Book — £99'}
      </motion.button>

      {/* Free option */}
      <motion.button
        {...fade(0.35)}
        onClick={onTryFree}
        disabled={isLoading}
        className="w-full px-8 py-2 text-warmgray/55 hover:text-ink transition-colors duration-300 text-[13px]"
      >
        Start with a free chapter
      </motion.button>

      {/* Trust signals */}
      <motion.p
        {...fade(0.38)}
        className="text-center text-[10.5px] text-warmgray/30 mt-4 tracking-wide"
      >
        Secure payment via Stripe · 30-day money-back guarantee
      </motion.p>
    </div>
  )
}

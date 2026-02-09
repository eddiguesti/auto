import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const FEATURES = [
  'Full-colour hardcover book, delivered to your door',
  '12 months of unlimited access — write at your own pace',
  'All 10 chapters — 91 guided questions for your whole life story',
  'Professional audiobook narration of your memoir',
  'Unlimited voice calls with Clio, your personal interviewer',
  'Choose your writing style — literary, conversational, or inspired by famous authors',
  '10 unique personalised chapter illustrations',
  'Personal writing companion & voice-to-text transcription'
]

// Apple-style: gentle opacity fade with minimal vertical shift
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
      // Mark onboarding complete in background
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
      {/* Book icon */}
      <motion.div {...fade(0)} className="flex justify-center mb-6">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-sepia/10 via-amber-50 to-amber-100/80 flex items-center justify-center shadow-sm">
          <svg
            className="w-6 h-6 text-sepia/80"
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
      </motion.div>

      {/* Headline */}
      <motion.h2
        {...fade(0.06)}
        className="text-[22px] sm:text-[25px] font-display text-ink text-center mb-2.5 leading-[1.25] tracking-[-0.01em]"
      >
        Everyone has a book in them.
        <br />
        This is yours.
      </motion.h2>

      {/* Exclusivity copy */}
      <motion.p
        {...fade(0.12)}
        className="text-warmgray text-center text-[14.5px] leading-[1.6] mb-6 max-w-sm mx-auto"
      >
        A professionally crafted autobiography used to be reserved for presidents and celebrities.
        We changed that — so you can leave an eternal legacy for the people who matter most.
      </motion.p>

      {/* Social proof */}
      <motion.div
        {...fade(0.18)}
        className="mx-auto mb-7 px-5 py-4 rounded-2xl bg-white/70 ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <p className="text-[13px] text-ink/60 text-center leading-[1.65]">
          Hiring a professional biographer typically starts at{' '}
          <span className="font-semibold text-ink/75">£10,000</span>. In early testing, 95% of users
          rated their finished memoir as good as or better than professionally written
          autobiographies.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div {...fade(0.24)} className="space-y-3 mb-7">
        {FEATURES.map(text => (
          <div key={text} className="flex items-start gap-3">
            <div className="w-[18px] h-[18px] rounded-full bg-sepia/[0.08] flex items-center justify-center flex-shrink-0 mt-[3px]">
              <svg
                className="w-[10px] h-[10px] text-sepia"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-[13.5px] text-ink/75 leading-[1.45]">{text}</p>
          </div>
        ))}
      </motion.div>

      {/* Divider */}
      <motion.div
        {...fade(0.28)}
        className="h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent mb-6"
      />

      {/* Pricing */}
      <motion.div {...fade(0.3)} className="text-center mb-1.5">
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-warmgray/35 line-through text-base">£300</span>
          <span className="text-[38px] font-display text-ink tracking-[-0.02em]">£99</span>
        </div>
        <p className="text-[12.5px] text-warmgray/70 tracking-wide">
          One-time welcome price · Save £201
        </p>
      </motion.div>

      {/* Urgency — understated */}
      <motion.p {...fade(0.33)} className="text-center text-[11.5px] text-sepia/60 mb-6">
        This price is only available during signup
      </motion.p>

      {/* Buy CTA */}
      <motion.button
        {...fade(0.36)}
        onClick={handleBuy}
        disabled={isLoading}
        className="w-full bg-sepia text-white px-8 py-[15px] rounded-2xl text-[16px] font-semibold tracking-[-0.01em] shadow-[0_2px_12px_rgba(139,90,43,0.25)] hover:bg-ink hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-300 disabled:opacity-50 mb-2.5"
      >
        {isLoading ? 'Redirecting to checkout...' : 'Start My Story — £99'}
      </motion.button>

      {/* Try free */}
      <motion.button
        {...fade(0.39)}
        onClick={onTryFree}
        disabled={isLoading}
        className="w-full px-8 py-2.5 text-warmgray/70 hover:text-ink transition-colors duration-300 text-[13.5px] font-medium"
      >
        Start with the free chapter
      </motion.button>

      {/* Trust signal */}
      <motion.p
        {...fade(0.42)}
        className="text-center text-[11px] text-warmgray/35 mt-5 tracking-wide"
      >
        Secure payment via Stripe · 30-day money-back guarantee
      </motion.p>
    </div>
  )
}

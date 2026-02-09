import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const FEATURES = [
  'All 10 chapters — 91 guided questions for your whole life story',
  'Unlimited voice calls with Clio, your personal interviewer',
  'AI writing companion & voice-to-text transcription',
  '10 unique AI-generated chapter illustrations',
  'Professional audiobook narration of your memoir',
  'Full-colour hardcover book, delivered to your door',
  '12 months of unlimited access — write at your own pace'
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
      <motion.div {...fade(0)} className="flex justify-center mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sepia/10 to-amber-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        className="text-2xl sm:text-[26px] font-display text-ink text-center mb-3 leading-tight"
      >
        Everyone has a book in them.
        <br />
        This is yours.
      </motion.h2>

      {/* Exclusivity copy */}
      <motion.p
        {...fade(0.12)}
        className="text-warmgray text-center text-[15px] leading-relaxed mb-5"
      >
        A professionally crafted autobiography used to be reserved for presidents and celebrities.
        We changed that — so you can leave an eternal legacy for the people who matter most.
      </motion.p>

      {/* Social proof */}
      <motion.div
        {...fade(0.18)}
        className="mx-auto mb-6 px-5 py-3.5 rounded-xl bg-white/80 ring-1 ring-black/[0.04]"
      >
        <p className="text-[13px] text-ink/70 text-center leading-relaxed italic">
          "95% of early users rated their memoir as good as or better than professionally written
          autobiographies."
        </p>
      </motion.div>

      {/* Features */}
      <motion.div {...fade(0.24)} className="space-y-2.5 mb-6">
        {FEATURES.map(text => (
          <div key={text} className="flex items-start gap-3">
            <svg
              className="w-[18px] h-[18px] text-sepia flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-[13.5px] text-ink/80">{text}</p>
          </div>
        ))}
      </motion.div>

      {/* Pricing */}
      <motion.div {...fade(0.3)} className="text-center mb-2">
        <div className="flex items-baseline justify-center gap-2.5 mb-1">
          <span className="text-warmgray/40 line-through text-lg">£300</span>
          <span className="text-4xl font-display text-ink">£99</span>
        </div>
        <p className="text-[13px] text-warmgray">One-time welcome price · Save £201</p>
      </motion.div>

      {/* Urgency — understated */}
      <motion.p {...fade(0.33)} className="text-center text-[12px] text-sepia/70 mb-5">
        This price is only available during signup
      </motion.p>

      {/* Buy CTA */}
      <motion.button
        {...fade(0.36)}
        onClick={handleBuy}
        disabled={isLoading}
        className="w-full bg-sepia text-white px-8 py-4 rounded-2xl text-[17px] font-semibold hover:bg-ink transition-colors duration-300 disabled:opacity-50 mb-3"
      >
        {isLoading ? 'Redirecting to checkout...' : 'Start My Story — £99'}
      </motion.button>

      {/* Try free */}
      <motion.button
        {...fade(0.39)}
        onClick={onTryFree}
        disabled={isLoading}
        className="w-full px-8 py-3 text-warmgray hover:text-ink transition-colors duration-300 text-sm font-medium"
      >
        Start with the free chapter
      </motion.button>

      {/* Trust signal */}
      <motion.p {...fade(0.42)} className="text-center text-[11px] text-warmgray/40 mt-4">
        Secure payment via Stripe · 30-day money-back guarantee
      </motion.p>
    </div>
  )
}

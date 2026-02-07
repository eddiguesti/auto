import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const DISMISS_KEY = 'upgrade_dismissed_at'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// Get current month name for the pricing section
function getCurrentMonthName() {
  return new Date().toLocaleDateString('en-GB', { month: 'long' })
}

export default function UpgradeModal({ onClose, memoriesCount = 0, variant = 'default' }) {
  const { user, authFetch } = useAuth()
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const modalRef = useRef(null)
  const firstName = user?.name?.split(' ')[0] || 'there'

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'premium_bundle',
          successUrl: `${window.location.origin}/home?premium_activated=true`,
          cancelUrl: `${window.location.origin}/home?upgrade_dismissed=true`
        })
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Close on escape
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'}`}
      onClick={e => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <div
        ref={modalRef}
        className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-stone-400 hover:text-stone-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Section 1: Emotional hook */}
        <div className="bg-gradient-to-b from-amber-50 to-white px-6 pt-8 pb-6 rounded-t-2xl">
          <div className="text-center">
            {/* Decorative icon */}
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center shadow-sm">
              <svg
                className="w-8 h-8 text-amber-700"
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

            <h2 className="text-2xl font-display text-ink mb-3">
              {variant === 'cancelled'
                ? `Changed your mind, ${firstName}?`
                : `${firstName}, Your First Chapter is Beautiful`}
            </h2>

            <p className="text-base text-sepia/70 leading-relaxed">
              {memoriesCount > 0
                ? `You've captured ${memoriesCount} precious memories in 'Earliest Memories'. There are nine more chapters of your story waiting to be written.`
                : 'You\u2019ve started something wonderful. There are nine more chapters of your story waiting to be written \u2014 and preserved forever in a printed book.'}
            </p>
          </div>
        </div>

        {/* Section 2: What's included */}
        <div className="px-6 py-5">
          <h3 className="text-lg font-medium text-ink mb-4">The Complete Memoir Package</h3>

          <ul className="space-y-3">
            {[
              {
                text: 'All 10 chapters — 91 guided questions to capture your full life story',
                badge: null
              },
              { text: 'AI writing companion — helps you find the right words', badge: null },
              { text: "Voice-to-text — speak your memories, we'll write them down", badge: null },
              { text: 'Personalised chapter artwork — 10 unique AI illustrations', badge: null },
              {
                text: 'Full-colour printed hardcover book — delivered to your door',
                badge: 'Worth £99'
              },
              { text: '12 months access — write at your own pace, no rush', badge: null }
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
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
                <span className="text-sm text-stone-700 leading-relaxed">
                  {item.text}
                  {item.badge && (
                    <span className="ml-2 inline-flex px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                      {item.badge}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3: Pricing */}
        <div className="mx-6 p-5 bg-gradient-to-br from-amber-50/80 to-stone-50/50 rounded-xl border border-amber-100/50">
          <div className="text-center">
            <span className="text-stone-400 text-sm line-through">£300</span>
            <div className="text-4xl font-bold text-ink mt-1 mb-1">£149</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full mb-3">
              <span className="text-green-700 text-sm font-medium">
                Save £151 — available this {getCurrentMonthName()}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: CTA + trust */}
        <div className="px-6 pt-5 pb-3">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-4 px-6 bg-ink text-white rounded-xl text-lg font-medium hover:bg-ink/90 transition hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Opening checkout...
              </span>
            ) : (
              'Continue My Story'
            )}
          </button>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secure payment via Stripe
            </span>
            <span>30-day money-back guarantee</span>
          </div>
        </div>

        {/* Dismiss link */}
        <div className="text-center pb-5 pt-2">
          <button
            onClick={handleDismiss}
            className="text-sm text-sepia/40 hover:text-sepia/60 underline underline-offset-2 transition"
          >
            Not right now — I'll think about it
          </button>
        </div>

        {/* Section 5: Social proof */}
        <div className="border-t border-stone-100 px-6 py-5">
          <div className="text-center">
            <p className="text-sm text-sepia/50 italic mb-1">
              "The printed book made my mum cry with joy. Best gift I've ever given her."
            </p>
            <p className="text-xs text-stone-400">— Sarah T., Hampshire</p>
            <p className="text-xs text-stone-400 mt-3">
              Join 2,000+ people preserving their family stories
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper: Check if upgrade modal should auto-show (respects 7-day cooldown)
export function shouldShowUpgradeModal() {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return true
  return Date.now() - parseInt(dismissedAt) > DISMISS_COOLDOWN_MS
}

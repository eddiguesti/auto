import { useState } from 'react'
import { IconBook2, IconCheck } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Modal, Button, Badge } from './ui'

const DISMISS_KEY = 'upgrade_dismissed_at'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// Get current month name for the pricing section
function getCurrentMonthName() {
  return new Date().toLocaleDateString('en-GB', { month: 'long' })
}

const BENEFITS = [
  {
    text: 'All 10 chapters — 91 guided questions to capture your full life story',
    badge: null
  },
  { text: 'AI writing companion — helps you find the right words', badge: null },
  { text: "Voice-to-text — speak your memories, we'll write them down", badge: null },
  { text: 'Personalised chapter artwork — 10 unique AI illustrations', badge: null },
  {
    text: '4 beautiful colour royal hardcover books in cloth — delivered to your door',
    badge: 'Included'
  },
  { text: 'Professional audiobook — narrated in your voice', badge: 'Included' },
  { text: 'Talk over the phone — call in to record your stories', badge: 'Included' },
  { text: '12 months access — write at your own pace, no rush', badge: null }
]

export default function UpgradeModal({ onClose, memoriesCount = 0, variant = 'default' }) {
  const { user, authFetch } = useAuth()
  const [loading, setLoading] = useState(false)
  const firstName = user?.name?.split(' ')[0] || 'there'

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    onClose()
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/v1/payments/create-checkout', {
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

  return (
    <Modal onClose={handleDismiss} ariaLabel="Upgrade to Premium" size="lg">
      {/* Section 1: Emotional hook */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-5 bg-bronze-100 text-bronze-700 rounded-2xl flex items-center justify-center">
          <IconBook2 size={28} stroke={1.5} />
        </div>

        <h2 className="text-2xl font-display text-ink mb-3">
          {variant === 'cancelled'
            ? `Changed your mind, ${firstName}?`
            : `${firstName}, Your First Chapter is Beautiful`}
        </h2>

        <p className="text-base text-sepia-600 leading-relaxed">
          {memoriesCount > 0
            ? `You've captured ${memoriesCount} precious memories in 'Earliest Memories'. There are nine more chapters of your story waiting to be written.`
            : 'You’ve started something wonderful. There are nine more chapters of your story waiting to be written — and preserved forever in a printed book.'}
        </p>
      </div>

      {/* Section 2: What's included */}
      <div className="py-6">
        <h3 className="text-lg font-display text-ink mb-4">The Complete Memoir Package</h3>

        <ul className="space-y-3">
          {BENEFITS.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <IconCheck size={20} stroke={1.75} className="text-success shrink-0 mt-0.5" />
              <span className="text-base text-ink-soft leading-relaxed">
                {item.text}
                {item.badge && (
                  <Badge variant="success" className="ml-2">
                    {item.badge}
                  </Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3: Pricing */}
      <div className="p-5 bg-cream rounded-2xl border border-sepia-200/70">
        <div className="text-center">
          <span className="text-sepia-400 text-sm line-through">£599</span>
          <div className="text-5xl font-display text-ink mt-1 mb-2">£299</div>
          <Badge variant="bronze" className="mb-3">
            50% off — available this {getCurrentMonthName()}
          </Badge>
          <p className="text-sm text-sepia-500 mt-1">Or 4 monthly payments of £100</p>
        </div>
      </div>

      {/* Section 4: CTA + trust */}
      <div className="pt-5 pb-2">
        <Button variant="accent" size="xl" loading={loading} onClick={handleUpgrade}>
          {loading ? 'Opening checkout...' : 'Continue My Story'}
        </Button>

        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-sepia-500">
          <span>Secure payment via Stripe</span>
          <span>30-day money-back guarantee</span>
        </div>
      </div>

      {/* Dismiss link */}
      <div className="text-center pb-4 pt-1">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Not right now — I'll think about it
        </Button>
      </div>

      {/* Section 5: Social proof */}
      <div className="border-t border-sepia-200/70 pt-5">
        <div className="text-center">
          <p className="text-sm text-sepia-600 italic mb-1">
            "The printed book made my mum cry with joy. Best gift I've ever given her."
          </p>
          <p className="text-xs text-sepia-500">— Sarah T., Hampshire</p>
          <p className="text-xs text-sepia-500 mt-3">
            Join 2,000+ people preserving their family stories
          </p>
        </div>
      </div>
    </Modal>
  )
}

// Helper: Check if upgrade modal should auto-show (respects 7-day cooldown)
export function shouldShowUpgradeModal() {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return true
  return Date.now() - parseInt(dismissedAt) > DISMISS_COOLDOWN_MS
}

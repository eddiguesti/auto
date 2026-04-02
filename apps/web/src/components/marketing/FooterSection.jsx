import { Link } from 'react-router-dom'

/**
 * FooterSection - Site-wide marketing footer with brand, product links, and legal links.
 */

const PRODUCT_LINKS = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/blog', label: 'Blog' },
  { to: '/register', label: 'Start Free' }
]

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/cookies', label: 'Cookie Policy' },
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/cancellation', label: 'Cancellation Policy' }
]

export default function FooterSection() {
  return (
    <footer className="py-14 px-4 sm:px-6 border-t border-heritage-sepia-light/30 bg-heritage-card">
      <div className="max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="font-display text-2xl text-heritage-ink mb-4">
              Easy<span className="text-heritage-sepia">Memoir</span>
            </div>
            <p className="font-sans text-base text-heritage-text max-w-xs leading-relaxed">
              Helping families preserve their stories for future generations through AI-powered
              memoir writing.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-sans text-sm font-semibold text-heritage-ink mb-4 uppercase tracking-wide">
              Product
            </h4>
            <ul className="space-y-3 text-base">
              {PRODUCT_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-sans text-sm font-semibold text-heritage-ink mb-4 uppercase tracking-wide">
              Legal
            </h4>
            <ul className="space-y-3 text-base">
              {LEGAL_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-heritage-sepia-light/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans text-base text-heritage-text">
            © 2026 Easy Memoir Ltd. All rights reserved.
          </p>
          <p className="font-sans text-sm text-heritage-text/70">
            Made with care in the United Kingdom
          </p>
        </div>
      </div>
    </footer>
  )
}

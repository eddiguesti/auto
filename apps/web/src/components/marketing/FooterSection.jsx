import { Link } from 'react-router-dom'

/**
 * FooterSection - Site-wide marketing footer with brand, product links, and legal links.
 */

const PRODUCT_LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/compare', label: 'Compare' },
  { to: '/blog', label: 'Blog' },
  { to: '/register', label: 'Start free' }
]

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of service' },
  { to: '/cookies', label: 'Cookie policy' },
  { to: '/refund-policy', label: 'Refund policy' },
  { to: '/cancellation', label: 'Cancellation policy' }
]

function FooterLinkColumn({ heading, links }) {
  return (
    <div>
      <h4 className="eyebrow mb-4">{heading}</h4>
      <ul className="space-y-3 text-sm">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className="text-sepia-600 hover:text-ink transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FooterSection() {
  return (
    <footer className="py-14 px-4 sm:px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="font-display text-2xl text-ink mb-4">
              Easy<span className="text-bronze-600">Memoir</span>
            </div>
            <p className="text-base text-sepia-600 max-w-xs leading-relaxed">
              Helping families preserve their stories for future generations through AI-powered
              memoir writing.
            </p>
          </div>

          <FooterLinkColumn heading="Product" links={PRODUCT_LINKS} />
          <FooterLinkColumn heading="Legal" links={LEGAL_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-sepia-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-sepia-500">© 2026 Easy Memoir Ltd. All rights reserved.</p>
          <p className="text-sm text-sepia-500">Made with care in the United Kingdom</p>
        </div>
      </div>
    </footer>
  )
}

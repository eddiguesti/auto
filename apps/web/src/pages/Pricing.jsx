import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [hoveredPlan, setHoveredPlan] = useState(null)

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for getting started with your memoir journey',
      price: { monthly: 0, yearly: 0 },
      features: [
        '5 voice recording sessions',
        '3 AI-written chapters',
        'Basic editing tools',
        'PDF export',
        'Email support'
      ],
      cta: 'Start Free',
      popular: false,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      )
    },
    {
      id: 'storyteller',
      name: 'Storyteller',
      description: 'Everything you need to tell your complete life story',
      price: { monthly: 19, yearly: 190 },
      features: [
        'Unlimited voice recordings',
        'Unlimited AI-written chapters',
        'Advanced editing & styling',
        'Photo integration',
        'PDF & digital book export',
        'Priority email support',
        'Family sharing (3 members)'
      ],
      cta: 'Start Storytelling',
      popular: true,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      )
    },
    {
      id: 'legacy',
      name: 'Legacy',
      description: 'Create a timeless treasure for generations to come',
      price: { monthly: 39, yearly: 390 },
      features: [
        'Everything in Storyteller',
        '1 Hardcover book included',
        'Premium binding options',
        'Custom cover design',
        'Archival-quality printing',
        'Dedicated support',
        'Family sharing (unlimited)',
        'Multiple book formats'
      ],
      cta: 'Create Your Legacy',
      popular: false,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      )
    }
  ]

  const handleSelectPlan = planId => {
    if (user) {
      navigate('/home')
    } else {
      navigate('/register', { state: { plan: planId } })
    }
  }

  return (
    <div className="min-h-screen bg-heritage-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-cream/95 backdrop-blur-sm border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-heritage-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/how-it-works"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/gift"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              Gift a Memoir
            </Link>
            {user ? (
              <Link
                to="/home"
                className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
              >
                Start Free
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-sepia-light/30 border border-heritage-sepia-light/50 mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-heritage-cta animate-pulse" />
            <p className="font-sans uppercase tracking-[0.3em] text-xs text-heritage-sepia">
              Simple Pricing
            </p>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl text-heritage-ink mb-6 animate-slide-up">
            Choose your story
          </h1>

          <p className="font-serif text-xl text-heritage-text max-w-2xl mx-auto mb-10 animate-slide-up animation-delay-100">
            Start for free, upgrade when you're ready. No hidden fees, no surprises—just your story,
            beautifully preserved.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-heritage-card rounded-full border border-heritage-sepia-light/30 animate-slide-up animation-delay-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`font-sans px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-heritage-cta text-white shadow-lg'
                  : 'text-heritage-text hover:text-heritage-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`font-sans px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative ${
                billingCycle === 'yearly'
                  ? 'bg-heritage-cta text-white shadow-lg'
                  : 'text-heritage-text hover:text-heritage-ink'
              }`}
            >
              Yearly
              <span className="absolute -top-3 -right-2 bg-heritage-sage text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative bg-heritage-card rounded-3xl p-8 border-2 transition-all duration-500 animate-slide-up ${
                  plan.popular
                    ? 'border-heritage-cta shadow-2xl scale-105 z-10'
                    : 'border-heritage-sepia-light/30 hover:border-heritage-sepia-light hover:shadow-xl'
                } ${hoveredPlan === plan.id ? 'transform -translate-y-2' : ''}`}
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-heritage-cta text-white font-sans text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce-gentle">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                    plan.popular
                      ? 'bg-heritage-cta text-white'
                      : 'bg-heritage-sepia-light/30 text-heritage-sepia'
                  } ${hoveredPlan === plan.id ? 'scale-110 rotate-3' : ''}`}
                >
                  {plan.icon}
                </div>

                {/* Plan Info */}
                <h3 className="font-display text-2xl text-heritage-ink mb-2">{plan.name}</h3>
                <p className="font-sans text-sm text-heritage-text mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-5xl text-heritage-ink">
                      £{plan.price[billingCycle]}
                    </span>
                    {plan.price[billingCycle] > 0 && (
                      <span className="font-sans text-heritage-text">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  {plan.price[billingCycle] === 0 && (
                    <p className="font-sans text-sm text-heritage-sage mt-1">Free forever</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                          plan.popular
                            ? 'bg-heritage-cta/10 text-heritage-cta'
                            : 'bg-heritage-sage/10 text-heritage-sage'
                        } group-hover:scale-110`}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="font-sans text-sm text-heritage-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full font-sans py-4 rounded-full text-lg font-medium transition-all duration-300 ${
                    plan.popular
                      ? 'bg-heritage-cta text-white hover:bg-heritage-cta-hover shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      : 'bg-heritage-sepia-light/30 text-heritage-ink hover:bg-heritage-sepia-light/50 border border-heritage-sepia-light'
                  }`}
                >
                  {plan.cta}
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Print Add-ons */}
      <section className="py-20 px-6 bg-gradient-to-b from-heritage-card to-heritage-cream">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-heritage-ink mb-4">
            Beautiful printed books
          </h2>
          <p className="font-serif text-lg text-heritage-text mb-12 max-w-2xl mx-auto">
            Transform your digital memoir into a stunning hardcover book. Premium quality printing,
            archival paper, and elegant binding.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: 'Softcover', price: '£29', desc: 'Perfect-bound paperback' },
              { name: 'Hardcover', price: '£49', desc: 'Cloth-bound, dust jacket' },
              { name: 'Premium', price: '£79', desc: 'Leather-look, gold foil' }
            ].map((book, i) => (
              <div
                key={book.name}
                className="bg-white rounded-2xl p-6 border border-heritage-sepia-light/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-16 bg-heritage-sepia-light/20 rounded mx-auto mb-4 flex items-center justify-center">
                  <svg
                    className="w-6 h-8 text-heritage-sepia"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6zm0 2h12v16H6V4z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-heritage-ink mb-1">{book.name}</h3>
                <p className="font-sans text-heritage-cta text-2xl font-bold mb-2">{book.price}</p>
                <p className="font-sans text-sm text-heritage-text">{book.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl text-heritage-ink mb-4">Questions?</h2>
          <p className="font-serif text-lg text-heritage-text mb-8">
            We're here to help you preserve your story.
          </p>
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 font-sans text-heritage-cta hover:text-heritage-cta-hover transition-colors"
          >
            View all FAQs
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 bg-heritage-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl text-white mb-4">Ready to start your memoir?</h2>
          <p className="font-serif text-lg text-white/70 mb-8">
            Join thousands of families preserving their stories.
          </p>
          <button
            onClick={() => navigate(user ? '/home' : '/register')}
            className="font-sans bg-heritage-cta text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Write My First Chapter — Free
            <span className="inline-block ml-2">→</span>
          </button>
        </div>
      </section>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
      `}</style>
    </div>
  )
}

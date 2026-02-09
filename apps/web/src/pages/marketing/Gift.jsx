import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Gift() {
  const navigate = useNavigate()
  const [selectedGift, setSelectedGift] = useState('storyteller')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const giftOptions = [
    {
      id: 'storyteller',
      name: '6-Month Storyteller',
      price: '£99',
      savings: 'Save £15',
      description: 'Perfect for capturing a lifetime of memories',
      features: [
        'Unlimited voice recordings',
        'Unlimited AI chapters',
        'Photo integration',
        'PDF export',
        '6 months of access'
      ]
    },
    {
      id: 'legacy',
      name: '1-Year Legacy + Book',
      price: '£299',
      savings: 'Best Value',
      description: 'The complete package with a printed keepsake',
      features: [
        'Everything in Storyteller',
        '1 Premium hardcover book',
        'Custom cover design',
        'Family sharing',
        '12 months of access'
      ],
      popular: true
    },
    {
      id: 'deluxe',
      name: 'Deluxe Family Package',
      price: '£499',
      savings: 'Perfect for families',
      description: 'Multiple books for the whole family',
      features: [
        'Everything in Legacy',
        '3 Premium hardcover books',
        'Leather-look binding',
        'Gold foil stamping',
        'Lifetime access'
      ]
    }
  ]

  const testimonials = [
    {
      quote:
        "I bought this for my father's 80th birthday. The book we received is now our family's most treasured possession.",
      author: 'Sarah M.',
      relation: 'Daughter',
      location: 'London'
    },
    {
      quote:
        "Mum was hesitant at first, but once she started talking, the stories just flowed. It's captured so much we never knew.",
      author: 'James T.',
      relation: 'Son',
      location: 'Manchester'
    },
    {
      quote:
        "The perfect retirement gift. Dad's been recording stories every week and loving every minute.",
      author: 'Emma L.',
      relation: 'Daughter',
      location: 'Edinburgh'
    }
  ]

  return (
    <div className="min-h-screen bg-heritage-cream overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-cream/95 backdrop-blur-sm border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-heritage-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/how-it-works"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/register"
              className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-heritage-cta/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-heritage-sepia/5 rounded-full blur-3xl animate-float-delayed" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div
              className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-cta/10 border border-heritage-cta/20 mb-6">
                <svg className="w-4 h-4 text-heritage-cta" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="font-sans text-sm text-heritage-cta font-medium">The Perfect Gift</p>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-heritage-ink mb-6 leading-tight">
                Give the gift of{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">their story</span>
                  <span className="absolute bottom-2 left-0 right-0 h-3 bg-heritage-cta/20 -rotate-1" />
                </span>
              </h1>

              <p className="font-serif text-xl text-heritage-text mb-8 leading-relaxed">
                Help your parents or grandparents preserve their precious memories. A meaningful
                gift they'll treasure—and so will generations to come.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() =>
                    document.getElementById('gift-options').scrollIntoView({ behavior: 'smooth' })
                  }
                  className="group font-sans bg-heritage-cta text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  Choose a Gift
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <Link
                  to="/sample"
                  className="font-sans border-2 border-heritage-sepia-light text-heritage-ink px-8 py-4 rounded-full text-lg font-medium hover:bg-heritage-sepia-light/20 transition-all"
                >
                  See a Sample Book
                </Link>
              </div>
            </div>

            {/* Right - Gift Card Visual */}
            <div
              className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
            >
              <div className="relative">
                {/* Main gift card */}
                <div className="bg-gradient-to-br from-heritage-card to-white rounded-3xl p-8 shadow-2xl border border-heritage-sepia-light/30 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-heritage-cta rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-sans text-sm text-heritage-sepia uppercase tracking-wider">
                        Gift Voucher
                      </p>
                      <p className="font-display text-2xl text-heritage-ink">Easy Memoir</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-heritage-sepia-light/50 pt-6 mt-6">
                    <p className="font-serif text-heritage-text italic mb-4">
                      "To help you share the stories that make you, you."
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-sans text-xs text-heritage-text/60">FROM</p>
                        <p className="font-sans text-heritage-ink font-medium">Your Name</p>
                      </div>
                      <div className="text-right">
                        <p className="font-sans text-xs text-heritage-text/60">FOR</p>
                        <p className="font-sans text-heritage-ink font-medium">Someone Special</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-heritage-cta/10 rounded-full blur-xl animate-pulse-soft" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-heritage-sepia/10 rounded-full blur-xl animate-pulse-soft animation-delay-500" />

                {/* Floating icons */}
                <div className="absolute -top-8 right-8 bg-white rounded-full p-3 shadow-lg animate-bounce-slow">
                  <svg
                    className="w-6 h-6 text-heritage-cta"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-heritage-ink">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50,000+', label: 'Stories preserved' },
              { value: '4.9★', label: 'Gift rating' },
              { value: '97%', label: 'Would recommend' },
              { value: '10,000+', label: 'Books printed' }
            ].map((stat, i) => (
              <div
                key={i}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="font-display text-4xl text-white mb-2">{stat.value}</p>
                <p className="font-sans text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gift Options */}
      <section id="gift-options" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              Gift Packages
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-heritage-ink mb-4">
              Choose the perfect package
            </h2>
            <p className="font-serif text-lg text-heritage-text max-w-2xl mx-auto">
              Each gift includes a beautiful digital card and easy activation for your recipient.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {giftOptions.map((option, index) => (
              <div
                key={option.id}
                onClick={() => setSelectedGift(option.id)}
                className={`relative bg-heritage-card rounded-3xl p-8 cursor-pointer transition-all duration-500 animate-slide-up ${
                  selectedGift === option.id
                    ? 'border-2 border-heritage-cta shadow-2xl scale-[1.02]'
                    : 'border border-heritage-sepia-light/30 hover:border-heritage-sepia-light hover:shadow-xl'
                } ${option.popular ? 'ring-2 ring-heritage-cta ring-offset-4 ring-offset-heritage-cream' : ''}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {option.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-heritage-cta text-white font-sans text-xs font-bold px-4 py-1.5 rounded-full">
                    Most Gifted
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-display text-2xl text-heritage-ink">{option.name}</h3>
                    <p className="font-sans text-sm text-heritage-sage font-medium">
                      {option.savings}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedGift === option.id
                        ? 'border-heritage-cta bg-heritage-cta'
                        : 'border-heritage-sepia-light'
                    }`}
                  >
                    {selectedGift === option.id && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                <p className="font-display text-5xl text-heritage-ink mb-2">{option.price}</p>
                <p className="font-sans text-sm text-heritage-text mb-6">{option.description}</p>

                <ul className="space-y-3">
                  {option.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-heritage-sage flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-sans text-sm text-heritage-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/register', { state: { gift: selectedGift } })}
              className="group font-sans bg-heritage-cta text-white px-12 py-5 rounded-full text-xl font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Buy This Gift
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
            <p className="font-sans text-sm text-heritage-text mt-4">
              Instant digital delivery • No expiration date
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-gradient-to-b from-heritage-card to-heritage-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              From Our Gift Recipients
            </p>
            <h2 className="font-display text-4xl text-heritage-ink">
              Stories that brought families together
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl p-8 shadow-lg border border-heritage-sepia-light/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-heritage-cta"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="font-serif text-lg text-heritage-text italic mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-heritage-sepia-light/30 flex items-center justify-center">
                    <span className="font-sans text-heritage-sepia font-medium">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-sans text-heritage-ink font-medium">{testimonial.author}</p>
                    <p className="font-sans text-sm text-heritage-text">
                      {testimonial.relation} • {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works for Gifts */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              Giving Made Simple
            </p>
            <h2 className="font-display text-4xl text-heritage-ink">How gift-giving works</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Choose',
                desc: 'Select the perfect gift package for your loved one'
              },
              {
                step: '2',
                title: 'Personalise',
                desc: 'Add a heartfelt message to your digital gift card'
              },
              { step: '3', title: 'Send', desc: 'Deliver instantly via email or print at home' },
              {
                step: '4',
                title: 'Enjoy',
                desc: 'They activate and start recording their memories'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-full bg-heritage-cta text-white font-display text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                <h3 className="font-display text-xl text-heritage-ink mb-2">{item.title}</h3>
                <p className="font-sans text-sm text-heritage-text">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-heritage-ink relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-heritage-cta rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-heritage-sepia rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="font-display text-4xl sm:text-5xl text-white mb-6">
            A gift they'll treasure forever
          </h2>
          <p className="font-serif text-xl text-white/70 mb-10">
            Give more than a present—give the chance to preserve a lifetime of memories.
          </p>
          <button
            onClick={() => navigate('/register', { state: { gift: selectedGift } })}
            className="group font-sans bg-heritage-cta text-white px-12 py-5 rounded-full text-xl font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Gift a Memoir Today
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </section>

      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-2deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-pulse-soft { animation: pulse-soft 4s ease-in-out infinite; }
        .animation-delay-500 { animation-delay: 500ms; }
      `}</style>
    </div>
  )
}

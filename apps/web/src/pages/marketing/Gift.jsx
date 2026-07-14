import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IconGift, IconCheck, IconStarFilled, IconArrowRight } from '@tabler/icons-react'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Card, Badge } from '../../components/ui'

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
      name: 'Complete Memoir Package',
      price: '£299',
      savings: '50% off',
      description: 'Everything you need to capture a lifetime of memories',
      features: [
        '4 colour royal hardcover books in cloth',
        'Professional audiobook',
        'Talk over the phone features',
        'Unlimited voice recordings',
        '12 months of access',
        'Pay over 4 months at £100/mo'
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
        '4 Premium hardcover books',
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
    <div className="min-h-screen bg-parchment page-enter">
      <SEO
        title="Gift a Memoir — The Most Meaningful Gift for Parents & Grandparents"
        description="Give the gift of a lifetime. Help your parents or grandparents capture their life story with Easy Memoir. Beautiful gift packages from £99. A keepsake your family will treasure for generations."
        path="/gift"
        jsonLd={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Gift a Memoir' }])]}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-parchment/90 backdrop-blur-sm border-b border-sepia-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link
              to="/how-it-works"
              className="text-sm text-sepia-600 hover:text-ink transition-colors"
            >
              How It Works
            </Link>
            <Button to="/register" size="sm">
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 sm:pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div
              className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <p className="eyebrow mb-4">The Perfect Gift</p>

              <h1 className="font-display text-4xl sm:text-5xl text-ink mb-6">
                Give the gift of <span className="text-bronze-600">their story</span>
              </h1>

              <p className="text-lg text-sepia-600 mb-8 max-w-2xl">
                Help your parents or grandparents preserve their precious memories. A meaningful
                gift they'll treasure—and so will generations to come.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() =>
                    document.getElementById('gift-options').scrollIntoView({ behavior: 'smooth' })
                  }
                  iconRight={<IconArrowRight size={20} stroke={1.75} />}
                >
                  Choose a Gift
                </Button>
                <Button to="/sample" variant="secondary" size="lg">
                  See a Sample Book
                </Button>
              </div>
            </div>

            {/* Right - Gift Card Visual */}
            <div
              className={`transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Card padding="lg" className="rounded-3xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-bronze-100 text-bronze-700 rounded-2xl flex items-center justify-center">
                    <IconGift size={28} stroke={1.5} />
                  </div>
                  <div>
                    <p className="eyebrow">Gift Voucher</p>
                    <p className="font-display text-2xl text-ink">Easy Memoir</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-sepia-200 pt-6 mt-6">
                  <p className="font-serif text-ink-soft italic mb-4">
                    "To help you share the stories that make you, you."
                  </p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-sepia-500">FROM</p>
                      <p className="text-ink font-medium">Your Name</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-sepia-500">FOR</p>
                      <p className="text-ink font-medium">Someone Special</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-ink">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50,000+', label: 'Stories preserved' },
              { value: '4.9★', label: 'Gift rating' },
              { value: '97%', label: 'Would recommend' },
              { value: '10,000+', label: 'Books printed' }
            ].map((stat, i) => (
              <div key={i} className="stagger-item">
                <p className="font-display text-4xl text-white mb-2">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gift Options */}
      <section id="gift-options" className="py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Gift Packages</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-4">
              Choose the perfect package
            </h2>
            <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
              Each gift includes a beautiful digital card and easy activation for your recipient.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">
            {giftOptions.map(option => (
              <div
                key={option.id}
                onClick={() => setSelectedGift(option.id)}
                className={`relative rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-200 stagger-item card-hover ${
                  selectedGift === option.id
                    ? 'bg-bronze-50 border-2 border-bronze-400 shadow-card'
                    : 'bg-surface border-2 border-sepia-200/70 hover:border-sepia-300 shadow-soft'
                }`}
              >
                {option.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="bronze">Most Gifted</Badge>
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-display text-2xl text-ink">{option.name}</h3>
                    <p className="text-sm text-success-strong font-medium">{option.savings}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedGift === option.id
                        ? 'border-bronze-500 bg-bronze-500'
                        : 'border-sepia-300'
                    }`}
                  >
                    {selectedGift === option.id && (
                      <IconCheck size={14} stroke={3} className="text-white" />
                    )}
                  </div>
                </div>

                <p className="font-display text-5xl text-ink mb-2">{option.price}</p>
                <p className="text-sm text-sepia-600 mb-6">{option.description}</p>

                <ul className="space-y-3">
                  {option.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <IconCheck size={18} stroke={2} className="text-success flex-shrink-0" />
                      <span className="text-sm text-ink-soft">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate('/register', { state: { gift: selectedGift } })}
              iconRight={<IconArrowRight size={20} stroke={1.75} />}
            >
              Buy This Gift
            </Button>
            <p className="text-sm text-sepia-500 mt-4">
              Instant digital delivery • No expiration date
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">From Our Gift Recipients</p>
            <h2 className="font-display text-4xl text-ink">
              Stories that brought families together
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} padding="lg" className="stagger-item rounded-3xl">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <IconStarFilled key={i} size={18} className="text-bronze-500" />
                  ))}
                </div>
                <p className="font-serif text-lg text-ink-soft italic mb-6">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sepia-100 flex items-center justify-center">
                    <span className="text-sepia-600 font-medium">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-ink font-medium">{testimonial.author}</p>
                    <p className="text-sm text-sepia-500">
                      {testimonial.relation} • {testimonial.location}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works for Gifts */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Giving Made Simple</p>
            <h2 className="font-display text-4xl text-ink">How gift-giving works</h2>
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
              <div key={i} className="text-center stagger-item">
                <div className="w-14 h-14 rounded-full bg-bronze-100 text-bronze-700 font-display text-2xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-xl text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-sepia-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-6 bg-cream border-t border-sepia-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            A gift they'll treasure forever
          </h2>
          <p className="text-lg text-sepia-600 mb-10">
            Give more than a present—give the chance to preserve a lifetime of memories.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register', { state: { gift: selectedGift } })}
            iconRight={<IconArrowRight size={20} stroke={1.75} />}
          >
            Gift a Memoir Today
          </Button>
        </div>
      </section>
    </div>
  )
}

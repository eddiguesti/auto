import { useNavigate, Link } from 'react-router-dom'
import {
  IconArrowNarrowRight,
  IconArrowRight,
  IconBook2,
  IconBuildingFactory2,
  IconBulb,
  IconCheck,
  IconGift,
  IconMapPin,
  IconMessageCircle,
  IconMicrophone,
  IconPencil,
  IconSparkles,
  IconStarFilled,
  IconUser
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import HowItWorksCarousel from '../../components/HowItWorksCarousel'
import { Badge, Button, Card } from '../../components/ui'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate(user ? '/voice' : '/register')
  }

  const handleModeSelect = mode => {
    if (user) {
      navigate(mode === 'voice' ? '/voice' : '/home')
    } else {
      navigate('/register')
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-parchment/85 backdrop-blur-md z-50 border-b border-sepia-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="font-display text-xl sm:text-2xl text-ink tracking-wide">
            Easy<span className="text-bronze-600">Memoir</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="text-sepia-500 text-sm hidden sm:inline">
                  Welcome, {user.name}
                </span>
                <Button variant="primary" size="sm" onClick={() => navigate('/home')}>
                  My stories
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="page-enter text-center lg:text-left">
            <p className="eyebrow mb-5">Preserve your legacy</p>
            <h1 className="font-display text-5xl sm:text-6xl text-ink mb-6 [text-wrap:balance]">
              Your life story,
              <br />
              <span className="italic text-sepia-600">beautifully told</span>
            </h1>
            <p className="text-lg sm:text-xl text-sepia-600 mb-10 max-w-lg mx-auto lg:mx-0">
              Just talk about your memories. Clio listens, asks thoughtful questions, and transforms
              your stories into a beautifully written autobiography your family will treasure
              forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGetStarted}
                className="w-full sm:w-auto"
              >
                {user ? 'Continue your story' : 'Start your memoir'}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() =>
                  document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })
                }
              >
                See how it works
              </Button>
            </div>
            <p className="text-sepia-500 text-sm mt-6 flex items-center justify-center lg:justify-start gap-1.5 flex-wrap">
              <IconCheck
                size={18}
                stroke={2}
                className="text-success shrink-0"
                aria-hidden="true"
              />
              Chapter 1 completely free · No credit card required
            </p>
          </div>

          {/* Hero Visual */}
          <div className="relative hidden lg:block">
            <Card padding="lg" className="relative shadow-lifted">
              <div className="border-b border-sepia-200/70 pb-4 mb-6">
                <p className="font-display text-3xl text-ink italic">Chapter One</p>
                <p className="text-sepia-500 text-sm mt-1">The Early Years</p>
              </div>
              <div className="space-y-4">
                <p className="font-serif text-ink-soft leading-relaxed">
                  I still remember the summer of 1962, the way the sunlight filtered through
                  grandmother's lace curtains, casting patterns on the wooden floor of her
                  kitchen...
                </p>
                <p className="font-serif text-ink-soft leading-relaxed">
                  Those were the days when time moved slowly, when a single afternoon could stretch
                  into an entire adventure.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sepia-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <p className="text-xs text-sepia-500">Clio is listening...</p>
                </div>
              </div>
            </Card>
            <Card padding="sm" className="absolute -bottom-4 -left-4 shadow-lifted">
              <p className="font-display text-sm text-ink italic">
                "What was your grandmother like?"
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Conversation promise band */}
      <section className="bg-cream py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center shrink-0">
              <IconMessageCircle size={24} stroke={1.5} aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-display text-base sm:text-lg text-ink">
                Designed to <span className="italic text-sepia-600">get you talking</span>
              </p>
              <p className="text-xs sm:text-sm text-sepia-500">
                No writing needed · Just have a conversation with Clio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Carousel */}
      <HowItWorksCarousel />

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="eyebrow mb-4">Why choose Easy Memoir</p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-8 [text-wrap:balance]">
                More than software—
                <br />
                <span className="italic text-sepia-600">a legacy tool</span>
              </h2>

              <div className="space-y-8 text-left">
                <FeatureItem
                  icon={<IconMessageCircle size={24} stroke={1.5} aria-hidden="true" />}
                  primary
                  title="Conversational & natural"
                  description="No awkward interviews or blank pages. Clio feels like talking to someone who genuinely wants to hear your stories."
                />
                <FeatureItem
                  icon={<IconBulb size={24} stroke={1.5} aria-hidden="true" />}
                  title="Memories unlocked"
                  description="Thoughtful follow-up questions help you remember details you haven't thought about in years."
                />
                <FeatureItem
                  icon={<IconSparkles size={24} stroke={1.5} aria-hidden="true" />}
                  title="Beautiful writing"
                  description="Your stories, transformed into eloquent prose that captures your authentic voice and personality."
                />
                <FeatureItem
                  icon={<IconBook2 size={24} stroke={1.5} aria-hidden="true" />}
                  title="Print-ready books"
                  description="Order professionally printed hardcover books—the perfect gift for children, grandchildren, and future generations."
                />
              </div>
            </div>

            {/* Feature Visual — sample conversation */}
            <div className="relative">
              <Card padding="lg" className="shadow-lifted">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-sepia-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-sepia-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-sepia-200" />
                </div>
                <div className="space-y-4">
                  <ChatBubble from="clio">
                    Tell me about your childhood home. What do you remember most vividly?
                  </ChatBubble>
                  <ChatBubble from="user">
                    Oh, the old farmhouse on Maple Street! I remember the creaky stairs and how the
                    kitchen always smelled like fresh bread...
                  </ChatBubble>
                  <ChatBubble from="clio">
                    That sounds wonderful. Who baked the bread? Tell me more about them.
                  </ChatBubble>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Memory Map Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-parchment">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">Intelligent connections</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6 [text-wrap:balance]">
              Your memories, <span className="italic text-sepia-600">beautifully connected</span>
            </h2>
            <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
              As you share your stories, Clio automatically identifies the people, places, and
              events in your life—building a rich map of your memories.
            </p>
          </div>

          {/* Memory Graph Diagram */}
          <Card padding="lg" className="relative shadow-lifted sm:p-12">
            {/* Flow: Story → AI → Memory Map */}
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Step 1: You Tell Your Story */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
                  <IconMessageCircle size={28} stroke={1.5} aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl text-ink mb-2">You share</h3>
                <p className="text-sm text-sepia-600">
                  "My father worked at the Ford factory in Birmingham with Uncle Joe..."
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center text-sepia-300">
                <IconArrowNarrowRight size={40} stroke={1.25} aria-hidden="true" />
              </div>

              {/* Mobile arrow */}
              <div className="md:hidden flex justify-center text-sepia-300">
                <IconArrowNarrowRight
                  size={32}
                  stroke={1.25}
                  className="rotate-90"
                  aria-hidden="true"
                />
              </div>

              {/* Step 2: Clio Extracts */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
                  <IconBulb size={28} stroke={1.5} aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl text-ink mb-2">Clio understands</h3>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <Badge variant="neutral" icon={<IconUser size={12} aria-hidden="true" />}>
                    Father
                  </Badge>
                  <Badge variant="bronze" icon={<IconMapPin size={12} aria-hidden="true" />}>
                    Birmingham
                  </Badge>
                  <Badge variant="neutral" icon={<IconUser size={12} aria-hidden="true" />}>
                    Uncle Joe
                  </Badge>
                  <Badge
                    variant="outline"
                    icon={<IconBuildingFactory2 size={12} aria-hidden="true" />}
                  >
                    Ford Factory
                  </Badge>
                </div>
              </div>
            </div>

            {/* Memory Map Visual */}
            <div className="mt-12 pt-8 border-t border-sepia-200/60">
              <p className="eyebrow text-center mb-8">Your growing memory map</p>

              {/* Visual Network Graph */}
              <div className="relative h-64 sm:h-80">
                {/* Center node - You */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-16 h-16 rounded-full bg-ink text-white flex items-center justify-center font-display text-sm shadow-lifted">
                    You
                  </div>
                </div>

                {/* Connection lines - SVG */}
                <svg
                  className="absolute inset-0 w-full h-full text-sepia-300"
                  style={{ zIndex: 1 }}
                  aria-hidden="true"
                >
                  {/* Lines from center to nodes */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="20%"
                    y2="20%"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="80%"
                    y2="25%"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="15%"
                    y2="70%"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="85%"
                    y2="75%"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="50%"
                    y2="10%"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  {/* Connection between nodes */}
                  <line
                    x1="20%"
                    y1="20%"
                    x2="15%"
                    y2="70%"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <line
                    x1="80%"
                    y1="25%"
                    x2="85%"
                    y2="75%"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                </svg>

                {/* Family nodes */}
                <MemoryNode
                  label="Father"
                  kind="person"
                  size="lg"
                  className="left-[15%] top-[15%]"
                  icon={<IconUser size={26} stroke={1.5} aria-hidden="true" />}
                />
                <MemoryNode
                  label="Mother"
                  kind="person"
                  size="lg"
                  className="left-[80%] top-[20%]"
                  icon={<IconUser size={26} stroke={1.5} aria-hidden="true" />}
                />
                <MemoryNode
                  label="Uncle Joe"
                  kind="person"
                  className="left-[50%] top-[5%] !-translate-y-0"
                  icon={<IconUser size={22} stroke={1.5} aria-hidden="true" />}
                />

                {/* Place nodes */}
                <MemoryNode
                  label="Birmingham"
                  kind="place"
                  className="left-[10%] top-[70%]"
                  icon={<IconMapPin size={22} stroke={1.5} aria-hidden="true" />}
                />
                <MemoryNode
                  label="Ford Factory"
                  kind="event"
                  className="left-[85%] top-[75%]"
                  icon={<IconBuildingFactory2 size={22} stroke={1.5} aria-hidden="true" />}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs">
                <LegendItem swatch="bg-sepia-100 border-sepia-300" label="People" />
                <LegendItem swatch="bg-bronze-100 border-bronze-300" label="Places" />
                <LegendItem swatch="bg-surface border-sepia-300" label="Events & things" />
                <div className="flex items-center gap-2">
                  <div className="w-8 border-t-2 border-dashed border-sepia-300" />
                  <span className="text-sepia-500">Connections</span>
                </div>
              </div>
            </div>

            {/* Benefit callout */}
            <div className="mt-8 bg-sepia-50 rounded-2xl p-6 text-center">
              <p className="text-sepia-600">
                <span className="text-ink font-medium">
                  The more you share, the smarter Clio gets.
                </span>{' '}
                Clio remembers everyone you mention—so when you talk about Dad later, she already
                knows he worked at Ford with Uncle Joe.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Choose Your Style */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-cream">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">Your choice</p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-4 [text-wrap:balance]">
              Talk or type—<span className="italic text-sepia-600">you decide</span>
            </h2>
            <p className="text-lg text-sepia-600">Choose the way that feels most natural to you.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Voice Mode */}
            <Card
              interactive
              onClick={() => handleModeSelect('voice')}
              padding="lg"
              className="stagger-item"
            >
              <div className="mb-5">
                <Badge variant="bronze">Recommended</Badge>
              </div>
              <div className="w-14 h-14 rounded-xl bg-bronze-100 text-bronze-600 flex items-center justify-center mb-6">
                <IconMicrophone size={28} stroke={1.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl text-ink mb-3">Voice interview</h3>
              <p className="text-sepia-600 mb-6">
                Just talk naturally. Clio listens, asks follow-up questions, and captures every
                detail of your stories.
              </p>
              <span className="text-bronze-600 text-sm font-medium inline-flex items-center gap-1.5">
                Start talking
                <IconArrowRight size={16} stroke={2} aria-hidden="true" />
              </span>
            </Card>

            {/* Type Mode */}
            <Card
              interactive
              onClick={() => handleModeSelect('type')}
              padding="lg"
              className="stagger-item"
            >
              <div className="mb-5 h-6" aria-hidden="true" />
              <div className="w-14 h-14 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mb-6">
                <IconPencil size={28} stroke={1.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl text-ink mb-3">Written memoir</h3>
              <p className="text-sepia-600 mb-6">
                Prefer typing? Answer guided questions at your own pace. Clio helps expand your
                notes into beautiful prose.
              </p>
              <span className="text-sepia-600 text-sm font-medium inline-flex items-center gap-1.5">
                Start writing
                <IconArrowRight size={16} stroke={2} aria-hidden="true" />
              </span>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section - Chapter 1 Free */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-parchment">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="eyebrow mb-4">Simple pricing</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-6 [text-wrap:balance]">
              Start your first chapter{' '}
              <span className="italic text-sepia-600">completely free</span>
            </h2>
            <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
              No credit card needed. Record your first memories, see your story come to life, then
              decide if you'd like to continue.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            <PricingCard
              tier="Chapter 1"
              price="Free"
              subtitle="Your first story, on us"
              features={[
                '3-5 guided story prompts',
                'Your first written chapter',
                'Book preview',
                'No credit card required'
              ]}
              buttonLabel="Start chapter 1 free"
              buttonVariant="secondary"
              onAction={handleGetStarted}
            />

            <PricingCard
              tier="Full Story"
              price="£299"
              originalPrice="£599"
              subtitle="50% off — or 4 payments of £100/mo"
              features={[
                '52 chapters — one per week',
                'Unlimited voice conversations',
                '4 colour royal hardcover books in cloth',
                'Family sharing',
                'Priority support'
              ]}
              buttonLabel="Start free, upgrade anytime"
              buttonVariant="primary"
              onAction={handleGetStarted}
              highlighted
              vatNote
            />

            <PricingCard
              tier="Lifetime"
              price="£299"
              originalPrice="£599"
              subtitle="50% off — or 4 payments of £100/mo"
              features={[
                'Everything in Full Story',
                'Unlimited chapters forever',
                'All future features included',
                'Best long-term value'
              ]}
              buttonLabel="Get lifetime access"
              buttonVariant="secondary"
              onAction={handleGetStarted}
              vatNote
            />
          </div>

          {/* Gift callout */}
          <Card padding="lg" className="mt-10 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-bronze-100 text-bronze-600 flex items-center justify-center shrink-0">
                <IconGift size={24} stroke={1.5} aria-hidden="true" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-display text-lg text-ink mb-1">
                  The perfect gift for Mum, Dad, or Grandparents
                </p>
                <p className="text-sm text-sepia-600">
                  Give the gift of a lifetime of stories. Most popular at Christmas, birthdays, and
                  Mother's/Father's Day.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-cream">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-1.5 mb-8" aria-label="Five star rating">
            {[...Array(5)].map((_, i) => (
              <IconStarFilled key={i} size={20} className="text-bronze-400" aria-hidden="true" />
            ))}
          </div>
          <blockquote className="font-serif italic text-2xl sm:text-3xl text-ink mb-8 [text-wrap:balance]">
            I never thought I'd write my life story. But talking to Clio felt so natural— like
            chatting with an old friend. Now my grandchildren will know who I really was.
          </blockquote>
          <div>
            <p className="text-ink font-medium">Margaret T.</p>
            <p className="text-sepia-500 text-sm mt-0.5">Age 78, Birmingham</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-parchment">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6 [text-wrap:balance]">
            Your stories matter.
            <br />
            <span className="italic text-sepia-600">Start chapter 1 today.</span>
          </h2>
          <p className="text-lg text-sepia-600 mb-10 max-w-lg mx-auto">
            Record your first memories completely free. Once you see your story come to life, you'll
            understand why families treasure these forever.
          </p>
          <Button variant="primary" size="lg" onClick={handleGetStarted}>
            {user ? 'Continue your story' : 'Start chapter 1 free'}
          </Button>
          <p className="text-sepia-500 text-sm mt-6 flex items-center justify-center gap-1.5 flex-wrap">
            <IconCheck size={18} stroke={2} className="text-success shrink-0" aria-hidden="true" />
            No credit card required · Start in seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="font-display text-xl text-ink mb-3">
                Easy<span className="text-bronze-600">Memoir</span>
              </div>
              <p className="text-sm text-sepia-600 max-w-xs">
                Helping families preserve their stories for future generations through AI-powered
                memoir writing.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="eyebrow mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/how-it-works"
                    className="text-sepia-600 hover:text-ink transition-colors"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-sepia-600 hover:text-ink transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-sepia-600 hover:text-ink transition-colors">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="eyebrow mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="text-sepia-600 hover:text-ink transition-colors">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sepia-600 hover:text-ink transition-colors">
                    Terms of service
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-sepia-600 hover:text-ink transition-colors">
                    Cookie policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-sepia-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-sepia-500">© 2026 Easy Memoir Ltd. All rights reserved.</p>
            <p className="text-sm text-sepia-500">Made with care in the United Kingdom</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Feature list row — 44px tinted icon square plus title and description.
 * The primary feature of the section carries the bronze tint.
 */
function FeatureItem({ icon, title, description, primary = false }) {
  return (
    <div className="flex gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          primary ? 'bg-bronze-100 text-bronze-600' : 'bg-sepia-100 text-sepia-600'
        }`}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-display text-xl text-ink mb-1">{title}</h3>
        <p className="text-sepia-600">{description}</p>
      </div>
    </div>
  )
}

/** Sample conversation bubble for the feature visual. */
function ChatBubble({ from, children }) {
  if (from === 'clio') {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-sepia-200 flex items-center justify-center text-xs font-medium text-sepia-700 shrink-0">
          C
        </div>
        <div className="bg-sepia-50 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
          <p className="font-serif text-sm text-ink-soft">{children}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 justify-end">
      <div className="bg-cream rounded-2xl rounded-tr-none p-4 max-w-[80%]">
        <p className="font-serif text-sm text-ink">{children}</p>
      </div>
    </div>
  )
}

const NODE_KINDS = {
  person: 'bg-sepia-100 border-sepia-300 text-sepia-600',
  place: 'bg-bronze-100 border-bronze-300 text-bronze-600',
  event: 'bg-surface border-sepia-300 text-sepia-500'
}

/** Node in the memory-map network diagram. */
function MemoryNode({ label, kind, icon, size = 'md', className = '' }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 ${className}`}>
      <div
        className={`${size === 'lg' ? 'w-14 h-14' : 'w-12 h-12'} rounded-full border-2 flex items-center justify-center shadow-soft ${NODE_KINDS[kind]}`}
        title={label}
      >
        {icon}
      </div>
      <p className="text-xs text-center mt-1 text-sepia-500">{label}</p>
    </div>
  )
}

function LegendItem({ swatch, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full border ${swatch}`} />
      <span className="text-sepia-500">{label}</span>
    </div>
  )
}

/** Pricing tier card. The highlighted tier carries the one bronze border. */
function PricingCard({
  tier,
  price,
  originalPrice,
  subtitle,
  features,
  buttonLabel,
  buttonVariant,
  onAction,
  highlighted = false,
  vatNote = false
}) {
  return (
    <Card
      padding="lg"
      className={`stagger-item relative ${
        highlighted ? 'border-bronze-400 shadow-lifted md:-mt-4 md:mb-[-1rem]' : ''
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="bronze">Most popular</Badge>
        </div>
      )}

      <div className={`mb-6 ${highlighted ? 'mt-2' : ''}`}>
        <p className={`eyebrow mb-2 ${highlighted ? '!text-bronze-600' : ''}`}>{tier}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-5xl text-ink">{price}</span>
          {originalPrice && (
            <span className="text-sepia-500 text-sm line-through ml-2">{originalPrice}</span>
          )}
        </div>
        <p className="text-sepia-600 mt-2">{subtitle}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3">
            <IconCheck
              size={20}
              stroke={2}
              className="text-success mt-1 shrink-0"
              aria-hidden="true"
            />
            <span className="text-ink-soft">{feature}</span>
          </li>
        ))}
      </ul>

      <Button variant={buttonVariant} size="xl" onClick={onAction}>
        {buttonLabel}
      </Button>
      {vatNote && <p className="text-sepia-500 text-xs text-center mt-3">VAT included</p>}
    </Card>
  )
}

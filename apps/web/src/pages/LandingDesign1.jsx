import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HowItWorksCarousel from '../components/HowItWorksCarousel'

/**
 * DESIGN 1: "Warm Heritage"
 *
 * Color Palette (optimized for seniors & memoir audience):
 * - Background: Warm cream (#FBF7F2) - reduces eye strain
 * - Text: Warm charcoal (#3D3833) - high contrast, softer than black
 * - CTA: Terracotta (#D97853) - warm, visible to aging eyes, high conversion
 * - Accents: Sepia tones (#9C7B5C) - nostalgic, trustworthy
 * - Success: Sage green (#7A9B76)
 *
 * Typography:
 * - Minimum 16px body text
 * - High contrast ratios (4.5:1+)
 * - Clear hierarchy
 *
 * Sources:
 * - https://www.tandfonline.com/doi/full/10.1080/10447318.2024.2338659
 * - https://www.numberanalytics.com/blog/ultimate-guide-color-scheme-seniors
 * - https://www.toptal.com/designers/ui/ui-design-for-older-adults
 */

export default function LandingDesign1() {
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
    <div className="min-h-screen bg-heritage-cream">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-heritage-cream/95 backdrop-blur-md z-50 border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-display text-2xl text-heritage-ink tracking-wide">
            Easy<span className="text-heritage-sepia">Memoir</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {user ? (
              <>
                <span className="text-heritage-text text-sm font-sans hidden sm:inline">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={() => navigate('/home')}
                  className="font-sans text-sm bg-heritage-sepia text-white px-5 py-2.5 rounded-full hover:bg-heritage-sepia-dark transition-colors"
                >
                  My Stories
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="font-sans text-sm bg-heritage-cta text-white px-5 py-2.5 rounded-full hover:bg-heritage-cta-hover transition-colors shadow-md shadow-heritage-cta/20"
                >
                  Start Free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left">
              <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-6 font-medium">
                Preserve Your Legacy
              </p>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-heritage-ink leading-[1.1] mb-8">
                Your life story,
                <br />
                <span className="italic text-heritage-sepia">beautifully told</span>
              </h1>

              <p className="font-sans text-lg sm:text-xl text-heritage-text leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                Just talk about your memories. Clio listens, asks thoughtful questions, and
                transforms your stories into a beautifully written autobiography your family will
                treasure forever.
              </p>

              {/* CTA Buttons - Aligned */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <button
                  onClick={handleGetStarted}
                  className="group font-sans bg-heritage-cta text-white px-8 py-4 rounded-full text-base sm:text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25 hover:shadow-xl hover:shadow-heritage-cta/30 w-full sm:w-auto"
                >
                  {user ? 'Continue My Story' : 'Write My First Chapter — Free'}
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </button>
                <button
                  onClick={() =>
                    document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })
                  }
                  className="font-sans text-heritage-text px-6 py-4 hover:text-heritage-ink transition-colors text-base"
                >
                  See how it works
                </button>
              </div>

              {/* Trust Signal */}
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-heritage-text">
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-heritage-sage"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Chapter 1 completely free
                </span>
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-heritage-sage"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  No credit card needed
                </span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -right-10 w-80 h-80 bg-heritage-sepia-light/20 rounded-full blur-3xl" />
              <div className="relative bg-heritage-card rounded-3xl shadow-2xl shadow-heritage-ink/10 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500 border border-heritage-sepia-light/20">
                <div className="border-b border-heritage-sepia-light/30 pb-4 mb-6">
                  <p className="font-display text-3xl text-heritage-ink italic">Chapter One</p>
                  <p className="font-sans text-heritage-sepia text-sm mt-1">The Early Years</p>
                </div>
                <div className="space-y-4">
                  <p className="font-serif text-heritage-text leading-relaxed text-base">
                    I still remember the summer of 1962, the way the sunlight filtered through
                    grandmother's lace curtains, casting patterns on the wooden floor of her
                    kitchen...
                  </p>
                  <p className="font-serif text-heritage-text leading-relaxed text-base">
                    Those were the days when time moved slowly, when a single afternoon could
                    stretch into an entire adventure.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-heritage-sepia-light/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-heritage-sage animate-pulse" />
                    <p className="font-sans text-sm text-heritage-sepia">Clio is listening...</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-heritage-card rounded-2xl p-4 shadow-lg border border-heritage-sepia-light/20">
                <p className="font-display text-sm text-heritage-ink italic">
                  "What was your grandmother like?"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Banner */}
      <section className="bg-gradient-to-r from-heritage-sepia-light/30 via-heritage-sepia-light/20 to-heritage-sepia-light/30 py-6 border-y border-heritage-sepia-light/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-heritage-card px-6 py-4 rounded-2xl shadow-sm border border-heritage-sepia-light/30">
            <div className="w-12 h-12 bg-heritage-sepia rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <p className="font-display text-lg sm:text-xl text-heritage-ink">
                Designed to <span className="italic text-heritage-sepia">get you talking</span>
              </p>
              <p className="font-sans text-sm text-heritage-text">
                No writing needed — Just have a conversation with Clio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Carousel */}
      <HowItWorksCarousel />

      {/* Features Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-card">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="text-center lg:text-left">
              <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
                Why Choose Easy Memoir
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-8 leading-tight">
                More than software—
                <br />
                <span className="italic text-heritage-sepia">a legacy tool</span>
              </h2>

              <div className="space-y-8">
                {/* Feature 1 */}
                <div className="flex gap-5 text-left">
                  <div className="w-12 h-12 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-heritage-sepia"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">
                      Conversational & Natural
                    </h3>
                    <p className="font-serif text-heritage-text text-base leading-relaxed">
                      No awkward interviews or blank pages. Clio feels like talking to someone who
                      genuinely wants to hear your stories.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex gap-5 text-left">
                  <div className="w-12 h-12 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-heritage-sepia"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">
                      Memories Unlocked
                    </h3>
                    <p className="font-serif text-heritage-text text-base leading-relaxed">
                      Thoughtful follow-up questions help you remember details you haven't thought
                      about in years.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex gap-5 text-left">
                  <div className="w-12 h-12 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-heritage-sepia"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">
                      Beautiful Writing
                    </h3>
                    <p className="font-serif text-heritage-text text-base leading-relaxed">
                      Your stories, transformed into eloquent prose that captures your authentic
                      voice and personality.
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex gap-5 text-left">
                  <div className="w-12 h-12 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-heritage-sepia"
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
                  <div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">
                      Print-Ready Books
                    </h3>
                    <p className="font-serif text-heritage-text text-base leading-relaxed">
                      Order professionally printed hardcover books—the perfect gift for children,
                      grandchildren, and future generations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Visual - Chat Demo */}
            <div className="relative">
              <div className="bg-heritage-cream rounded-3xl p-8 shadow-lg border border-heritage-sepia-light/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-400" />
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
                  <div className="w-3.5 h-3.5 rounded-full bg-green-400" />
                </div>
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-heritage-sepia/20 flex items-center justify-center text-sm font-medium text-heritage-sepia flex-shrink-0">
                      C
                    </div>
                    <div className="bg-heritage-card rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-heritage-sepia-light/20">
                      <p className="font-serif text-base text-heritage-text">
                        Tell me about your childhood home. What do you remember most vividly?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-heritage-sepia-light/30 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                      <p className="font-serif text-base text-heritage-ink">
                        Oh, the old farmhouse on Maple Street! I remember the creaky stairs and how
                        the kitchen always smelled like fresh bread...
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-heritage-sepia/20 flex items-center justify-center text-sm font-medium text-heritage-sepia flex-shrink-0">
                      C
                    </div>
                    <div className="bg-heritage-card rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-heritage-sepia-light/20">
                      <p className="font-serif text-base text-heritage-text">
                        That sounds wonderful. Who baked the bread? Tell me more about them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Memory Map Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-heritage-card to-heritage-cream">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
              Intelligent Connections
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6">
              Your memories,{' '}
              <span className="italic text-heritage-sepia">beautifully connected</span>
            </h2>
            <p className="font-serif text-lg sm:text-xl text-heritage-text max-w-2xl mx-auto">
              As you share your stories, Clio automatically identifies the people, places, and
              events in your life—building a rich map of your memories.
            </p>
          </div>

          {/* Memory Graph Diagram */}
          <div className="relative bg-heritage-card rounded-3xl p-8 sm:p-12 shadow-xl border border-heritage-sepia-light/20">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center mx-auto mb-4 border-2 border-heritage-sepia-light">
                  <svg
                    className="w-8 h-8 text-heritage-sepia"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-heritage-ink mb-2">You Share</h3>
                <p className="font-serif text-sm text-heritage-text">
                  "My father worked at the Ford factory in Birmingham with Uncle Joe..."
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center">
                <div className="flex items-center gap-2 text-heritage-sepia-light">
                  <div className="w-16 h-0.5 bg-heritage-sepia-light"></div>
                  <svg
                    className="w-6 h-6 text-heritage-sepia"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </div>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center mx-auto mb-4 border-2 border-heritage-sepia-light">
                  <svg
                    className="w-8 h-8 text-heritage-sepia"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-heritage-ink mb-2">Clio Understands</h3>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-sans">
                    Father
                  </span>
                  <span className="text-sm bg-heritage-sage-light text-green-800 px-3 py-1 rounded-full font-sans">
                    Birmingham
                  </span>
                  <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-sans">
                    Uncle Joe
                  </span>
                  <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-sans">
                    Ford Factory
                  </span>
                </div>
              </div>
            </div>

            {/* Benefit callout */}
            <div className="mt-10 bg-heritage-sepia-light/20 rounded-2xl p-6 text-center border border-heritage-sepia-light/30">
              <p className="font-serif text-heritage-text text-base">
                <span className="text-heritage-ink font-medium">
                  The more you share, the smarter Clio gets.
                </span>{' '}
                Clio remembers everyone you mention—so when you talk about Dad later, she already
                knows he worked at Ford with Uncle Joe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Style */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
              Your Choice
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-4">
              Talk or type—<span className="italic text-heritage-sepia">you decide</span>
            </h2>
            <p className="font-serif text-lg sm:text-xl text-heritage-text">
              Choose the way that feels most natural to you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Voice Mode */}
            <button
              onClick={() => handleModeSelect('voice')}
              className="group bg-heritage-card rounded-3xl p-8 border-2 border-heritage-sepia-light hover:border-heritage-cta hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="font-sans text-sm bg-heritage-cta text-white px-4 py-1.5 rounded-full font-medium">
                  Recommended
                </span>
              </div>
              <div className="w-16 h-16 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center mb-6 group-hover:bg-heritage-cta transition-colors">
                <svg
                  className="w-8 h-8 text-heritage-sepia group-hover:text-white transition-colors"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl text-heritage-ink mb-3 group-hover:text-heritage-cta transition-colors">
                Voice Interview
              </h3>
              <p className="font-serif text-heritage-text mb-6 text-base leading-relaxed">
                Just talk naturally. Clio listens, asks follow-up questions, and captures every
                detail of your stories.
              </p>
              <span className="font-sans text-heritage-cta text-sm flex items-center gap-2 font-medium">
                Start talking
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>

            {/* Type Mode */}
            <button
              onClick={() => handleModeSelect('type')}
              className="group bg-heritage-card rounded-3xl p-8 border border-heritage-sepia-light/50 hover:border-heritage-sepia hover:shadow-xl transition-all text-left"
            >
              <div className="h-9 mb-6" />
              <div className="w-16 h-16 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center mb-6 group-hover:bg-heritage-sepia/20 transition-colors">
                <svg
                  className="w-8 h-8 text-heritage-sepia"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-2xl text-heritage-ink mb-3 group-hover:text-heritage-sepia transition-colors">
                Written Memoir
              </h3>
              <p className="font-serif text-heritage-text mb-6 text-base leading-relaxed">
                Prefer typing? Answer guided questions at your own pace. Clio helps expand your
                notes into beautiful prose.
              </p>
              <span className="font-sans text-heritage-text text-sm flex items-center gap-2 group-hover:text-heritage-sepia transition-colors">
                Start writing
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section - Chapter 1 Free */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-cream">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
              Simple Pricing
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6">
              Start your first chapter{' '}
              <span className="italic text-heritage-sepia">completely free</span>
            </h2>
            <p className="font-serif text-lg sm:text-xl text-heritage-text max-w-2xl mx-auto">
              No credit card needed. Record your first memories, see your story come to life, then
              decide if you'd like to continue.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Free Tier - Chapter 1 */}
            <div className="bg-heritage-card rounded-3xl p-8 border-2 border-heritage-sepia-light/40 shadow-md">
              <div className="mb-6">
                <p className="font-sans text-heritage-sepia text-sm uppercase tracking-wider font-semibold mb-2">
                  Chapter 1
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-heritage-ink">Free</span>
                </div>
                <p className="font-serif text-heritage-text text-base mt-2">
                  Your first story, on us
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    3-5 guided story prompts
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Your first written chapter
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">Book preview</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    No credit card required
                  </span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-heritage-sepia-light/40 text-heritage-ink px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-sepia-light/60 transition-all border border-heritage-sepia-light"
              >
                Start Chapter 1 Free
              </button>
            </div>

            {/* Annual Tier - Recommended */}
            <div className="bg-heritage-card rounded-3xl p-8 border-2 border-heritage-cta shadow-xl relative md:-mt-4 md:mb-[-1rem]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="font-sans text-sm bg-heritage-cta text-white px-5 py-1.5 rounded-full font-medium shadow-md shadow-heritage-cta/20">
                  Most Popular
                </span>
              </div>

              <div className="mb-6 mt-2">
                <p className="font-sans text-heritage-cta text-sm uppercase tracking-wider font-semibold mb-2">
                  Full Story
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-heritage-ink">£99</span>
                  <span className="font-sans text-heritage-text text-base">/year</span>
                </div>
                <p className="font-serif text-heritage-text text-base mt-2">
                  A year of storytelling
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    52 chapters — one per week
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Unlimited voice conversations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Printed hardcover book
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">Family sharing</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">Priority support</span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-heritage-cta text-white px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25"
              >
                Write My First Chapter — Free
              </button>
              <p className="font-sans text-heritage-text/60 text-sm text-center mt-3">
                VAT included
              </p>
            </div>

            {/* Lifetime Tier */}
            <div className="bg-heritage-card rounded-3xl p-8 border-2 border-heritage-sepia-light/40 shadow-md">
              <div className="mb-6">
                <p className="font-sans text-heritage-sepia text-sm uppercase tracking-wider font-semibold mb-2">
                  Lifetime
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-heritage-ink">£149</span>
                  <span className="font-sans text-heritage-text text-base">once</span>
                </div>
                <p className="font-serif text-heritage-text text-base mt-2">
                  Pay once, yours forever
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Everything in Full Story
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Unlimited chapters forever
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    All future features included
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-heritage-sage mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-heritage-text text-base">
                    Best long-term value
                  </span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-heritage-sepia text-white px-6 py-4 rounded-full text-base font-medium hover:bg-heritage-sepia-dark transition-all shadow-md"
              >
                Get Lifetime Access
              </button>
              <p className="font-sans text-heritage-text/60 text-sm text-center mt-3">
                VAT included
              </p>
            </div>
          </div>

          {/* Gift callout */}
          <div className="mt-12 bg-heritage-card rounded-2xl p-6 sm:p-8 border border-heritage-sepia-light/30 text-center shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-heritage-cta-light/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-7 h-7 text-heritage-cta"
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
              <div className="text-center sm:text-left">
                <p className="font-display text-xl text-heritage-ink mb-1">
                  The perfect gift for Mum, Dad, or Grandparents
                </p>
                <p className="font-serif text-heritage-text text-base">
                  Give the gift of a lifetime of stories. Most popular at Christmas, birthdays, and
                  Mother's/Father's Day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <svg
            className="w-14 h-14 mx-auto mb-8 text-heritage-sepia-light opacity-60"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="font-display text-2xl sm:text-3xl italic mb-8 leading-relaxed text-white/95">
            I never thought I'd write my life story. But talking to Clio felt so natural— like
            chatting with an old friend. Now my grandchildren will know who I really was.
          </p>
          <div>
            <p className="font-sans text-white font-medium text-lg">Margaret T.</p>
            <p className="font-sans text-white/60 text-base">Age 78, Birmingham</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6 leading-tight">
            Your stories matter.
            <br />
            <span className="italic text-heritage-sepia">Start Chapter 1 today.</span>
          </h2>
          <p className="font-serif text-lg sm:text-xl text-heritage-text mb-10 max-w-xl mx-auto">
            Record your first memories completely free. Once you see your story come to life, you'll
            understand why families treasure these forever.
          </p>
          <button
            onClick={handleGetStarted}
            className="group font-sans bg-heritage-cta text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg shadow-heritage-cta/25 hover:shadow-xl hover:shadow-heritage-cta/30"
          >
            {user ? 'Continue Your Story' : 'Start Chapter 1 Free'}
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-heritage-text">
            <span className="inline-flex items-center gap-2">
              <svg className="w-5 h-5 text-heritage-sage" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              No credit card required
            </span>
            <span className="inline-flex items-center gap-2">
              <svg className="w-5 h-5 text-heritage-sage" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Start in seconds
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li>
                  <Link
                    to="/how-it-works"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    Start Free
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-sans text-sm font-semibold text-heritage-ink mb-4 uppercase tracking-wide">
                Legal
              </h4>
              <ul className="space-y-3 text-base">
                <li>
                  <Link
                    to="/privacy"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookies"
                    className="text-heritage-text hover:text-heritage-cta transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
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
    </div>
  )
}

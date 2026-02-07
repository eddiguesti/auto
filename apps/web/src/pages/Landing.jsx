import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HowItWorksCarousel from '../components/HowItWorksCarousel'

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
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-cream/80 backdrop-blur-md z-50 border-b border-sepia/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="font-display text-xl sm:text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            {user ? (
              <>
                <span className="text-warmgray text-xs sm:text-sm font-sans hidden sm:inline">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={() => navigate('/home')}
                  className="font-sans text-xs sm:text-sm bg-sepia text-white px-4 py-2 rounded-full hover:bg-ink transition"
                >
                  My Stories
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-sans text-xs sm:text-sm text-warmgray hover:text-ink transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="font-sans text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 sm:px-5 py-2 rounded-full hover:from-amber-600 hover:to-amber-700 transition-all shadow-md shadow-amber-500/20"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-16 sm:pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="page-enter text-center lg:text-left">
            <p className="font-sans text-sepia uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs mb-4 sm:mb-6">
              Preserve Your Legacy
            </p>
            <h1 className="hero-headline font-display text-4xl sm:text-5xl lg:text-7xl text-ink leading-[1.1] mb-6 sm:mb-8">
              Your life story,
              <br />
              <span className="italic text-sepia">beautifully told</span>
            </h1>
            <p className="hero-description font-serif text-lg sm:text-xl text-warmgray leading-relaxed mb-8 sm:mb-10 max-w-lg mx-auto lg:mx-0">
              Just talk about your memories. Clio listens, asks thoughtful questions, and transforms
              your stories into a beautifully written autobiography your family will treasure
              forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <button
                onClick={handleGetStarted}
                className="group font-sans bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
              >
                {user ? 'Continue Your Story' : 'Start Your Memoir'}
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>
              <button
                onClick={() =>
                  document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })
                }
                className="font-sans text-warmgray px-6 sm:px-8 py-3 sm:py-4 hover:text-ink transition text-sm sm:text-base"
              >
                See how it works
              </button>
            </div>
            <p className="font-sans text-warmgray/60 text-xs sm:text-sm mt-4 sm:mt-6">
              <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>{' '}
                Chapter 1 completely free
              </span>{' '}
              · No credit card required
            </p>
          </div>

          {/* Hero Visual */}
          <div className="relative hidden lg:block">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-sepia/5 rounded-full blur-3xl" />
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-ink/10 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="border-b border-sepia/20 pb-4 mb-6">
                <p className="font-display text-3xl text-ink italic">Chapter One</p>
                <p className="font-sans text-sepia text-sm mt-1">The Early Years</p>
              </div>
              <div className="space-y-4">
                <p className="font-serif text-warmgray leading-relaxed">
                  I still remember the summer of 1962, the way the sunlight filtered through
                  grandmother's lace curtains, casting patterns on the wooden floor of her
                  kitchen...
                </p>
                <p className="font-serif text-warmgray leading-relaxed">
                  Those were the days when time moved slowly, when a single afternoon could stretch
                  into an entire adventure.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sepia/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-sans text-xs text-sepia">Clio is listening...</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-sepia/10 rounded-2xl p-4 backdrop-blur">
              <p className="font-display text-sm text-ink italic">
                "What was your grandmother like?"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Adopter Offer */}
      <section className="bg-gradient-to-r from-sepia/10 via-sepia/5 to-sepia/10 py-4 sm:py-6 border-y border-sepia/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-white px-4 sm:px-6 py-3 rounded-2xl sm:rounded-full shadow-sm border border-sepia/20">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
              <svg
                className="w-5 h-5 text-white"
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
              <p className="font-display text-base sm:text-lg text-ink">
                Designed to <span className="italic text-sepia">get you talking</span>
              </p>
              <p className="font-sans text-[10px] sm:text-xs text-warmgray">
                No writing needed · Just have a conversation with Clio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Carousel */}
      <HowItWorksCarousel />

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="font-sans text-sepia uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs mb-3 sm:mb-4">
                Why Choose Easy Memoir
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-6 sm:mb-8 leading-tight">
                More than software—
                <br />
                <span className="italic text-sepia">a legacy tool</span>
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-sepia"
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
                    <h3 className="font-display text-xl text-ink mb-1">Conversational & Natural</h3>
                    <p className="font-serif text-warmgray">
                      No awkward interviews or blank pages. Clio feels like talking to someone who
                      genuinely wants to hear your stories.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-sepia"
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
                    <h3 className="font-display text-xl text-ink mb-1">Memories Unlocked</h3>
                    <p className="font-serif text-warmgray">
                      Thoughtful follow-up questions help you remember details you haven't thought
                      about in years.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-sepia"
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
                    <h3 className="font-display text-xl text-ink mb-1">Beautiful Writing</h3>
                    <p className="font-serif text-warmgray">
                      Your stories, transformed into eloquent prose that captures your authentic
                      voice and personality.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-sepia"
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
                    <h3 className="font-display text-xl text-ink mb-1">Print-Ready Books</h3>
                    <p className="font-serif text-warmgray">
                      Order professionally printed hardcover books—the perfect gift for children,
                      grandchildren, and future generations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Visual */}
            <div className="relative">
              <div className="bg-parchment rounded-3xl p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs font-medium text-sepia">
                      C
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                      <p className="font-serif text-sm text-warmgray">
                        Tell me about your childhood home. What do you remember most vividly?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-sepia/10 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                      <p className="font-serif text-sm text-ink">
                        Oh, the old farmhouse on Maple Street! I remember the creaky stairs and how
                        the kitchen always smelled like fresh bread...
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs font-medium text-sepia">
                      C
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                      <p className="font-serif text-sm text-warmgray">
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
      <section className="py-24 px-6 bg-gradient-to-b from-white to-cream">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-sepia uppercase tracking-[0.3em] text-xs mb-4">
              Intelligent Connections
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">
              Your memories, <span className="italic text-sepia">beautifully connected</span>
            </h2>
            <p className="font-serif text-lg text-warmgray max-w-2xl mx-auto">
              As you share your stories, Clio automatically identifies the people, places, and
              events in your life—building a rich map of your memories.
            </p>
          </div>

          {/* Memory Graph Diagram */}
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-sepia/10">
            {/* Flow: Story → AI → Memory Map */}
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Step 1: You Tell Your Story */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-sepia"
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
                <h3 className="font-display text-xl text-ink mb-2">You Share</h3>
                <p className="font-serif text-sm text-warmgray">
                  "My father worked at the Ford factory in Birmingham with Uncle Joe..."
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center">
                <div className="flex items-center gap-2 text-sepia/40">
                  <div className="w-16 h-px bg-sepia/30"></div>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </div>
              </div>

              {/* Mobile arrow */}
              <div className="md:hidden flex justify-center">
                <svg
                  className="w-6 h-6 text-sepia/40 rotate-90"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </div>

              {/* Step 2: Clio Extracts */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-sepia"
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
                <h3 className="font-display text-xl text-ink mb-2">Clio Understands</h3>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    Father
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Birmingham
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    Uncle Joe
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                    </svg>
                    Ford Factory
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Map Visual */}
            <div className="mt-12 pt-8 border-t border-sepia/10">
              <p className="text-center font-sans text-xs text-sepia uppercase tracking-wider mb-8">
                Your Growing Memory Map
              </p>

              {/* Visual Network Graph */}
              <div className="relative h-64 sm:h-80">
                {/* Center node - You */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-16 h-16 rounded-full bg-sepia text-white flex items-center justify-center font-display text-sm shadow-lg">
                    You
                  </div>
                </div>

                {/* Connection lines - SVG */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                  {/* Lines from center to nodes */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="20%"
                    y2="20%"
                    stroke="#d4b896"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="80%"
                    y2="25%"
                    stroke="#d4b896"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="15%"
                    y2="70%"
                    stroke="#d4b896"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="85%"
                    y2="75%"
                    stroke="#d4b896"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <line
                    x1="50%"
                    y1="50%"
                    x2="50%"
                    y2="10%"
                    stroke="#d4b896"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  {/* Connection between nodes */}
                  <line
                    x1="20%"
                    y1="20%"
                    x2="15%"
                    y2="70%"
                    stroke="#d4b896"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <line
                    x1="80%"
                    y1="25%"
                    x2="85%"
                    y2="75%"
                    stroke="#d4b896"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                </svg>

                {/* Family nodes */}
                <div className="absolute left-[15%] top-[15%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer"
                    title="Father"
                  >
                    <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Father</p>
                </div>

                <div className="absolute left-[80%] top-[20%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className="w-14 h-14 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer"
                    title="Mother"
                  >
                    <svg className="w-7 h-7 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Mother</p>
                </div>

                <div className="absolute left-[50%] top-[5%] -translate-x-1/2 z-10">
                  <div
                    className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer"
                    title="Uncle Joe"
                  >
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Uncle Joe</p>
                </div>

                {/* Place nodes */}
                <div className="absolute left-[10%] top-[70%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer"
                    title="Birmingham"
                  >
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Birmingham</p>
                </div>

                <div className="absolute left-[85%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer"
                    title="Ford Factory"
                  >
                    <svg
                      className="w-6 h-6 text-orange-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Ford Factory</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400"></div>
                  <span className="text-warmgray">People</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-200 border border-green-400"></div>
                  <span className="text-warmgray">Places</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-200 border border-orange-400"></div>
                  <span className="text-warmgray">Events & Things</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-px bg-sepia/50"
                    style={{ borderTop: '2px dashed #d4b896' }}
                  ></div>
                  <span className="text-warmgray">Connections</span>
                </div>
              </div>
            </div>

            {/* Benefit callout */}
            <div className="mt-8 bg-sepia/5 rounded-2xl p-6 text-center">
              <p className="font-serif text-warmgray">
                <span className="text-ink font-medium">
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
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-sepia uppercase tracking-[0.3em] text-xs mb-4">
              Your Choice
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-4">
              Talk or type—<span className="italic">you decide</span>
            </h2>
            <p className="font-serif text-lg text-warmgray">
              Choose the way that feels most natural to you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Voice Mode */}
            <button
              onClick={() => handleModeSelect('voice')}
              className="group bg-white rounded-3xl p-8 border-2 border-sepia/20 hover:border-sepia hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="font-sans text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1 rounded-full shadow-sm">
                  Recommended
                </span>
              </div>
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia group-hover:text-white transition">
                <svg
                  className="w-8 h-8 text-sepia group-hover:text-white transition"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl text-ink mb-3 group-hover:text-sepia transition">
                Voice Interview
              </h3>
              <p className="font-serif text-warmgray mb-6">
                Just talk naturally. Clio listens, asks follow-up questions, and captures every
                detail of your stories.
              </p>
              <span className="font-sans text-sepia text-sm flex items-center gap-2">
                Start talking
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition"
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
              className="group bg-white rounded-3xl p-8 border border-sepia/10 hover:border-sepia/40 hover:shadow-xl transition-all text-left"
            >
              <div className="h-7 mb-6" /> {/* Spacer to align with other card */}
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia/20 transition">
                <svg
                  className="w-8 h-8 text-sepia"
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
              <h3 className="font-display text-2xl text-ink mb-3 group-hover:text-sepia transition">
                Written Memoir
              </h3>
              <p className="font-serif text-warmgray mb-6">
                Prefer typing? Answer guided questions at your own pace. Clio helps expand your
                notes into beautiful prose.
              </p>
              <span className="font-sans text-warmgray text-sm flex items-center gap-2 group-hover:text-sepia transition">
                Start writing
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition"
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
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="font-sans text-sepia uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs mb-3 sm:mb-4">
              Simple Pricing
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-4 sm:mb-6">
              Start your first chapter <span className="italic text-sepia">completely free</span>
            </h2>
            <p className="font-serif text-base sm:text-lg text-warmgray max-w-2xl mx-auto">
              No credit card needed. Record your first memories, see your story come to life, then
              decide if you'd like to continue.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Free Tier - Chapter 1 */}
            <div className="bg-white rounded-3xl p-8 border border-sepia/20 shadow-md">
              <div className="mb-6">
                <p className="font-sans text-sepia text-sm uppercase tracking-wider font-medium mb-2">
                  Chapter 1
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-ink">Free</span>
                </div>
                <p className="font-serif text-warmgray mt-2">Your first story, on us</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">3-5 guided story prompts</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Your first written chapter</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Book preview</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">No credit card required</span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-sepia/10 text-ink px-6 py-3.5 rounded-full text-sm font-medium hover:bg-sepia/20 transition-all border border-sepia/20"
              >
                Start Chapter 1 Free
              </button>
            </div>

            {/* Annual Tier - Recommended */}
            <div className="bg-white rounded-3xl p-8 border-2 border-amber-500 shadow-xl relative md:-mt-4 md:mb-[-1rem]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="font-sans text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-1.5 rounded-full font-medium shadow-md shadow-amber-500/20">
                  Most Popular
                </span>
              </div>

              <div className="mb-6 mt-2">
                <p className="font-sans text-amber-600 text-sm uppercase tracking-wider font-medium mb-2">
                  Full Story
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-ink">£99</span>
                  <span className="font-sans text-warmgray">/year</span>
                </div>
                <p className="font-serif text-warmgray mt-2">A year of storytelling</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">52 chapters — one per week</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Unlimited voice conversations</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Printed hardcover book</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Family sharing</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Priority support</span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3.5 rounded-full text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25"
              >
                Start Free, Upgrade Anytime
              </button>
              <p className="font-sans text-warmgray/60 text-xs text-center mt-3">VAT included</p>
            </div>

            {/* Lifetime Tier */}
            <div className="bg-white rounded-3xl p-8 border border-sepia/20 shadow-md">
              <div className="mb-6">
                <p className="font-sans text-sepia text-sm uppercase tracking-wider font-medium mb-2">
                  Lifetime
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-ink">£149</span>
                  <span className="font-sans text-warmgray">once</span>
                </div>
                <p className="font-serif text-warmgray mt-2">Pay once, yours forever</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Everything in Full Story</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Unlimited chapters forever</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">All future features included</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-serif text-warmgray">Best long-term value</span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full font-sans bg-sepia text-white px-6 py-3.5 rounded-full text-sm font-medium hover:bg-ink transition-all shadow-md"
              >
                Get Lifetime Access
              </button>
              <p className="font-sans text-warmgray/60 text-xs text-center mt-3">VAT included</p>
            </div>
          </div>

          {/* Gift callout */}
          <div className="mt-10 bg-white rounded-2xl p-6 sm:p-8 border border-sepia/15 text-center shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-amber-600"
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
                <p className="font-display text-lg text-ink mb-1">
                  The perfect gift for Mum, Dad, or Grandparents
                </p>
                <p className="font-serif text-sm text-warmgray">
                  Give the gift of a lifetime of stories. Most popular at Christmas, birthdays, and
                  Mother's/Father's Day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <svg
            className="w-12 h-12 mx-auto mb-8 text-sepia opacity-50"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="font-display text-2xl sm:text-3xl italic mb-8 leading-relaxed text-white/90">
            I never thought I'd write my life story. But talking to Clio felt so natural— like
            chatting with an old friend. Now my grandchildren will know who I really was.
          </p>
          <div>
            <p className="font-sans text-white font-medium">Margaret T.</p>
            <p className="font-sans text-white/60 text-sm">Age 78, Birmingham</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6 leading-tight">
            Your stories matter.
            <br />
            <span className="italic text-sepia">Start Chapter 1 today.</span>
          </h2>
          <p className="font-serif text-lg text-warmgray mb-10 max-w-lg mx-auto">
            Record your first memories completely free. Once you see your story come to life, you'll
            understand why families treasure these forever.
          </p>
          <button
            onClick={handleGetStarted}
            className="group font-sans bg-gradient-to-r from-amber-500 to-amber-600 text-white px-10 py-5 rounded-full text-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
          >
            {user ? 'Continue Your Story' : 'Start Chapter 1 Free'}
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
          <p className="font-sans text-warmgray/60 text-sm mt-6">
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>{' '}
              No credit card required
            </span>{' '}
            · Start in seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-sepia/10 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="font-display text-xl text-ink mb-3">
                Easy<span className="text-sepia">Memoir</span>
              </div>
              <p className="font-sans text-sm text-warmgray max-w-xs">
                Helping families preserve their stories for future generations through AI-powered
                memoir writing.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-sans text-sm font-medium text-ink mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/how-it-works" className="text-warmgray hover:text-sepia transition">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-warmgray hover:text-sepia transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-warmgray hover:text-sepia transition">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-sans text-sm font-medium text-ink mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="text-warmgray hover:text-sepia transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-warmgray hover:text-sepia transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-warmgray hover:text-sepia transition">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-sepia/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-sans text-sm text-warmgray">
              © 2026 Easy Memoir Ltd. All rights reserved.
            </p>
            <p className="font-sans text-xs text-warmgray/60">
              Made with care in the United Kingdom
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

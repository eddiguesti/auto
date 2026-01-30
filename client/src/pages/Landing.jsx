import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate(user ? '/voice' : '/register')
  }

  const handleModeSelect = (mode) => {
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-display text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <span className="text-warmgray text-sm font-sans">Welcome, {user.name}</span>
                <button
                  onClick={() => navigate('/home')}
                  className="font-sans text-sm text-sepia hover:text-ink transition"
                >
                  My Stories
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-sans text-sm text-warmgray hover:text-ink transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="font-sans text-sm bg-ink text-white px-5 py-2 rounded-full hover:bg-sepia transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="page-enter">
            <p className="font-sans text-sepia uppercase tracking-[0.3em] text-xs mb-6">
              Preserve Your Legacy
            </p>
            <h1 className="hero-headline font-display text-5xl sm:text-6xl lg:text-7xl text-ink leading-[1.1] mb-8">
              Your life story,
              <br />
              <span className="italic text-sepia">beautifully told</span>
            </h1>
            <p className="hero-description font-serif text-xl text-warmgray leading-relaxed mb-10 max-w-lg">
              Just talk about your memories. Our AI listens, asks thoughtful questions,
              and transforms your stories into a beautifully written autobiography
              your family will treasure forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleGetStarted}
                className="group font-sans bg-ink text-white px-8 py-4 rounded-full text-base hover:bg-sepia transition-all"
              >
                {user ? 'Continue Your Story' : 'Start Your Memoir'}
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="font-sans text-warmgray px-8 py-4 hover:text-ink transition"
              >
                See how it works
              </button>
            </div>
            <p className="font-sans text-warmgray/60 text-sm mt-6">
              Free to start · No credit card required
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
                  I still remember the summer of 1962, the way the sunlight
                  filtered through grandmother's lace curtains, casting
                  patterns on the wooden floor of her kitchen...
                </p>
                <p className="font-serif text-warmgray leading-relaxed">
                  Those were the days when time moved slowly, when a single
                  afternoon could stretch into an entire adventure.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sepia/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-sans text-xs text-sepia">AI is listening...</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-sepia/10 rounded-2xl p-4 backdrop-blur">
              <p className="font-display text-sm text-ink italic">"What was your grandmother like?"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Adopter Offer */}
      <section className="bg-gradient-to-r from-sepia/10 via-sepia/5 to-sepia/10 py-6 border-y border-sepia/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-sepia/20">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="8" width="18" height="13" rx="2" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13M3 12h18" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c0 0-1.5-2-1.5-3.5a2.5 2.5 0 015 0C15.5 6 12 8 12 8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c0 0 1.5-2 1.5-3.5a2.5 2.5 0 00-5 0C8.5 6 12 8 12 8z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-display text-lg text-ink">
                First <span className="text-sepia">100</span> users get their memoir <span className="italic text-sepia">completely free</span>
              </p>
              <p className="font-sans text-xs text-warmgray">Be an early adopter · Help us shape the future of storytelling</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="font-sans text-sepia uppercase tracking-[0.3em] text-xs mb-4">
              How It Works
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">
              Three simple steps to your memoir
            </h2>
            <p className="font-serif text-lg text-warmgray max-w-2xl mx-auto">
              No writing skills needed. Just share your memories naturally, and we'll
              handle the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <p className="font-sans text-sepia text-sm uppercase tracking-wider mb-2">Step 1</p>
              <h3 className="font-display text-2xl text-ink mb-3 italic">Just Talk</h3>
              <p className="font-serif text-warmgray leading-relaxed">
                Our AI interviewer asks thoughtful questions about your life.
                Answer naturally, just like talking to a friend.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="font-sans text-sepia text-sm uppercase tracking-wider mb-2">Step 2</p>
              <h3 className="font-display text-2xl text-ink mb-3 italic">We Write</h3>
              <p className="font-serif text-warmgray leading-relaxed">
                AI transforms your spoken words into beautifully written prose.
                Your voice, your stories—polished and preserved.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="font-sans text-sepia text-sm uppercase tracking-wider mb-2">Step 3</p>
              <h3 className="font-display text-2xl text-ink mb-3 italic">Share Forever</h3>
              <p className="font-serif text-warmgray leading-relaxed">
                Download your memoir as a beautiful PDF or order a printed book.
                A gift your family will treasure for generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-sans text-sepia uppercase tracking-[0.3em] text-xs mb-4">
                Why Choose Easy Memoir
              </p>
              <h2 className="font-display text-4xl sm:text-5xl text-ink mb-8 leading-tight">
                More than software—<br />
                <span className="italic text-sepia">a legacy tool</span>
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-ink mb-1">Conversational & Natural</h3>
                    <p className="font-serif text-warmgray">
                      No awkward interviews or blank pages. Our AI feels like talking to
                      someone who genuinely wants to hear your stories.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-ink mb-1">Memories Unlocked</h3>
                    <p className="font-serif text-warmgray">
                      Thoughtful follow-up questions help you remember details you
                      haven't thought about in years.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-ink mb-1">Beautiful Writing</h3>
                    <p className="font-serif text-warmgray">
                      Your stories, transformed into eloquent prose that captures
                      your authentic voice and personality.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-ink mb-1">Print-Ready Books</h3>
                    <p className="font-serif text-warmgray">
                      Order professionally printed hardcover books—the perfect gift
                      for children, grandchildren, and future generations.
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
                    <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs">AI</div>
                    <div className="bg-white rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                      <p className="font-serif text-sm text-warmgray">
                        Tell me about your childhood home. What do you remember most vividly?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-sepia/10 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                      <p className="font-serif text-sm text-ink">
                        Oh, the old farmhouse on Maple Street! I remember the creaky
                        stairs and how the kitchen always smelled like fresh bread...
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs">AI</div>
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
              As you share your stories, our AI automatically identifies the people, places,
              and events in your life—building a rich map of your memories.
            </p>
          </div>

          {/* Memory Graph Diagram */}
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-sepia/10">
            {/* Flow: Story → AI → Memory Map */}
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Step 1: You Tell Your Story */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                </div>
              </div>

              {/* Mobile arrow */}
              <div className="md:hidden flex justify-center">
                <svg className="w-6 h-6 text-sepia/40 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                </svg>
              </div>

              {/* Step 2: AI Extracts */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-ink mb-2">AI Understands</h3>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Father
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    Birmingham
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Uncle Joe
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/></svg>
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
                <svg className="absolute inset-0 w-full h-full" style={{zIndex: 1}}>
                  {/* Lines from center to nodes */}
                  <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#d4b896" strokeWidth="2" strokeDasharray="4"/>
                  <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#d4b896" strokeWidth="2" strokeDasharray="4"/>
                  <line x1="50%" y1="50%" x2="15%" y2="70%" stroke="#d4b896" strokeWidth="2" strokeDasharray="4"/>
                  <line x1="50%" y1="50%" x2="85%" y2="75%" stroke="#d4b896" strokeWidth="2" strokeDasharray="4"/>
                  <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="#d4b896" strokeWidth="2" strokeDasharray="4"/>
                  {/* Connection between nodes */}
                  <line x1="20%" y1="20%" x2="15%" y2="70%" stroke="#d4b896" strokeWidth="1" strokeOpacity="0.5"/>
                  <line x1="80%" y1="25%" x2="85%" y2="75%" stroke="#d4b896" strokeWidth="1" strokeOpacity="0.5"/>
                </svg>

                {/* Family nodes */}
                <div className="absolute left-[15%] top-[15%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer" title="Father">
                    <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Father</p>
                </div>

                <div className="absolute left-[80%] top-[20%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-14 h-14 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer" title="Mother">
                    <svg className="w-7 h-7 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Mother</p>
                </div>

                <div className="absolute left-[50%] top-[5%] -translate-x-1/2 z-10">
                  <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer" title="Uncle Joe">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Uncle Joe</p>
                </div>

                {/* Place nodes */}
                <div className="absolute left-[10%] top-[70%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer" title="Birmingham">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <p className="text-xs text-center mt-1 text-warmgray">Birmingham</p>
                </div>

                <div className="absolute left-[85%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer" title="Ford Factory">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
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
                  <div className="w-8 h-px bg-sepia/50" style={{borderTop: '2px dashed #d4b896'}}></div>
                  <span className="text-warmgray">Connections</span>
                </div>
              </div>
            </div>

            {/* Benefit callout */}
            <div className="mt-8 bg-sepia/5 rounded-2xl p-6 text-center">
              <p className="font-serif text-warmgray">
                <span className="text-ink font-medium">The more you share, the smarter it gets.</span>
                {' '}Our AI remembers everyone you mention—so when you talk about Dad later,
                it already knows he worked at Ford with Uncle Joe.
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
                <span className="font-sans text-xs bg-sepia text-white px-3 py-1 rounded-full">Recommended</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia group-hover:text-white transition">
                <svg className="w-8 h-8 text-sepia group-hover:text-white transition" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <h3 className="font-display text-2xl text-ink mb-3 group-hover:text-sepia transition">
                Voice Interview
              </h3>
              <p className="font-serif text-warmgray mb-6">
                Just talk naturally. Our AI listens, asks follow-up questions, and
                captures every detail of your stories.
              </p>
              <span className="font-sans text-sepia text-sm flex items-center gap-2">
                Start talking
                <svg className="w-4 h-4 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
                <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl text-ink mb-3 group-hover:text-sepia transition">
                Written Memoir
              </h3>
              <p className="font-serif text-warmgray mb-6">
                Prefer typing? Answer guided questions at your own pace. Our AI helps
                expand your notes into beautiful prose.
              </p>
              <span className="font-sans text-warmgray text-sm flex items-center gap-2 group-hover:text-sepia transition">
                Start writing
                <svg className="w-4 h-4 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <svg className="w-12 h-12 mx-auto mb-8 text-sepia opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
          <p className="font-display text-2xl sm:text-3xl italic mb-8 leading-relaxed text-white/90">
            I never thought I'd write my life story. But talking to the AI felt so natural—
            like chatting with an old friend. Now my grandchildren will know who I really was.
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
            Your stories matter.<br />
            <span className="italic text-sepia">Start preserving them today.</span>
          </h2>
          <p className="font-serif text-lg text-warmgray mb-10 max-w-lg mx-auto">
            Every life is full of moments worth remembering. Don't let them fade away.
            Create a memoir your family will treasure forever.
          </p>
          <button
            onClick={handleGetStarted}
            className="group font-sans bg-ink text-white px-10 py-5 rounded-full text-lg hover:bg-sepia transition-all"
          >
            {user ? 'Continue Your Story' : 'Start Your Free Memoir'}
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <p className="font-sans text-warmgray/60 text-sm mt-6">
            No credit card required · Start in seconds
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
                Helping families preserve their stories for future generations through AI-powered memoir writing.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-sans text-sm font-medium text-ink mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/how-it-works" className="text-warmgray hover:text-sepia transition">How It Works</Link></li>
                <li><Link to="/blog" className="text-warmgray hover:text-sepia transition">Blog</Link></li>
                <li><Link to="/register" className="text-warmgray hover:text-sepia transition">Get Started</Link></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-sans text-sm font-medium text-ink mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-warmgray hover:text-sepia transition">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-warmgray hover:text-sepia transition">Terms of Service</Link></li>
                <li><Link to="/cookies" className="text-warmgray hover:text-sepia transition">Cookie Policy</Link></li>
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

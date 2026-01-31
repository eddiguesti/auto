import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <div className="min-h-screen bg-cream overflow-x-hidden">
      {/* Navigation - Floating glass effect */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrollY > 50
          ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-ink/5'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-display text-xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/home')}
                className="font-sans text-xs bg-gradient-to-r from-sepia to-ink text-white px-4 py-2 rounded-full hover:shadow-lg transition-all"
              >
                My Stories
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-sans text-xs text-warmgray hover:text-ink transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="font-sans text-xs bg-gradient-to-r from-ink to-stone-800 text-white px-4 py-2 rounded-full hover:shadow-lg hover:scale-105 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Immersive mobile-first design */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-amber-50/50 to-orange-50/30" />

        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-sepia/10 to-amber-200/20 rounded-full blur-3xl"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          />
          <div
            className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-orange-100/30 to-amber-100/20 rounded-full blur-2xl"
            style={{ transform: `translateY(${scrollY * 0.15}px)` }}
          />
          <div
            className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-sepia/5 to-amber-100/30 rounded-full blur-xl"
            style={{ transform: `translateY(${scrollY * -0.1}px)` }}
          />

          {/* Floating quill icon */}
          <div
            className="absolute top-32 right-8 text-sepia/20 animate-[float_4s_ease-in-out_infinite]"
            style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.03 2.97a3.578 3.578 0 0 1 0 5.06L9.41 19.65a2 2 0 0 1-.97.53l-4.72 1.18a1 1 0 0 1-1.22-1.22l1.18-4.72a2 2 0 0 1 .53-.97L15.83 2.97a3.578 3.578 0 0 1 5.06 0l.14.14z"/>
            </svg>
          </div>

          {/* Floating book icon */}
          <div
            className="absolute bottom-40 left-6 text-sepia/15 animate-[float_5s_ease-in-out_infinite_0.5s]"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full px-6 pt-24 pb-16">
          <div className="max-w-lg mx-auto text-center">
            {/* Emotional urgency badge */}
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-sepia/10 mb-6 animate-[fadeSlideIn_0.6s_ease-out]">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="font-sans text-xs text-sepia tracking-wide">Every story deserves to be remembered</span>
            </div>

            {/* Hero headline */}
            <h1 className="font-display text-[2.75rem] leading-[1.1] text-ink mb-5 animate-[fadeSlideIn_0.6s_ease-out_0.1s_both]">
              Your life story,
              <br />
              <span className="italic bg-gradient-to-r from-sepia via-amber-700 to-orange-700 bg-clip-text text-transparent">
                beautifully told
              </span>
            </h1>

            {/* Description with better mobile spacing */}
            <p className="font-serif text-lg text-warmgray leading-relaxed mb-8 animate-[fadeSlideIn_0.6s_ease-out_0.2s_both]">
              Just talk about your memories. Our AI transforms your stories into a
              <span className="text-ink font-medium"> beautifully written autobiography</span> your
              family will treasure forever.
            </p>

            {/* CTA buttons - stacked on mobile with shine effect */}
            <div className="flex flex-col gap-3 mb-6 animate-[fadeSlideIn_0.6s_ease-out_0.3s_both]">
              <button
                onClick={handleGetStarted}
                className="group relative font-sans bg-gradient-to-r from-ink via-stone-800 to-ink text-white px-8 py-4 rounded-2xl text-base overflow-hidden hover:shadow-xl hover:shadow-ink/20 transition-all active:scale-[0.98]"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  {user ? 'Continue Your Story' : 'Start Your Memoir — It\'s Free'}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </button>

              <button
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="font-sans text-warmgray px-6 py-3 hover:text-ink transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                See how it works
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 text-warmgray/60 animate-[fadeSlideIn_0.6s_ease-out_0.4s_both]">
              <span className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free to start
              </span>
              <span className="w-1 h-1 bg-warmgray/30 rounded-full" />
              <span className="flex items-center gap-1 text-xs">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No writing needed
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-sepia/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* How It Works - Cards with 3D effect */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-lg mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-sepia/10 px-4 py-2 rounded-full mb-4">
              <span className="w-2 h-2 bg-sepia rounded-full" />
              <span className="font-sans text-xs text-sepia uppercase tracking-widest">How It Works</span>
            </div>
            <h2 className="font-display text-3xl text-ink mb-3">
              Three simple steps
            </h2>
            <p className="font-serif text-warmgray">
              No writing skills needed. Just share naturally.
            </p>
          </div>

          {/* Steps - vertical timeline on mobile */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="group relative bg-white rounded-3xl p-6 shadow-lg shadow-ink/5 border border-sepia/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -left-3 top-8 w-6 h-6 bg-gradient-to-br from-sepia to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                1
              </div>
              <div className="flex items-start gap-4 ml-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sepia/10 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-ink mb-1">Just Talk</h3>
                  <p className="font-serif text-sm text-warmgray leading-relaxed">
                    Our AI asks thoughtful questions. Answer naturally, like chatting with a friend.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white rounded-3xl p-6 shadow-lg shadow-ink/5 border border-sepia/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -left-3 top-8 w-6 h-6 bg-gradient-to-br from-sepia to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                2
              </div>
              <div className="flex items-start gap-4 ml-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sepia/10 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-ink mb-1">AI Transforms</h3>
                  <p className="font-serif text-sm text-warmgray leading-relaxed">
                    Your spoken words become beautifully written prose. Your voice, polished and preserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white rounded-3xl p-6 shadow-lg shadow-ink/5 border border-sepia/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -left-3 top-8 w-6 h-6 bg-gradient-to-br from-sepia to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                3
              </div>
              <div className="flex items-start gap-4 ml-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sepia/10 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-ink mb-1">Share Forever</h3>
                  <p className="font-serif text-sm text-warmgray leading-relaxed">
                    Download as eBook or order a printed book. A gift your family will treasure for generations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Preview - Interactive demo */}
      <section className="py-16 px-6 bg-gradient-to-b from-cream to-white">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl text-ink mb-2">
              Like chatting with an old friend
            </h2>
            <p className="font-serif text-sm text-warmgray">
              Natural conversation that unlocks forgotten memories
            </p>
          </div>

          {/* Chat mockup with glassmorphism */}
          <div className="relative">
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-sepia/20 via-amber-200/30 to-sepia/20 rounded-[2rem] blur-2xl" />

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-2xl shadow-ink/10 border border-white/50">
              {/* Window controls */}
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-sepia/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="flex-1 text-center font-sans text-xs text-warmgray">Easy Memoir AI</span>
              </div>

              {/* Chat messages */}
              <div className="space-y-4">
                {/* AI message */}
                <div className="flex gap-3 animate-[fadeSlideIn_0.5s_ease-out]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sepia to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div className="bg-sepia/5 rounded-2xl rounded-tl-md p-4 max-w-[85%]">
                    <p className="font-serif text-sm text-ink leading-relaxed">
                      Tell me about your childhood home. What do you remember most vividly?
                    </p>
                  </div>
                </div>

                {/* User message */}
                <div className="flex gap-3 justify-end animate-[fadeSlideIn_0.5s_ease-out_0.2s_both]">
                  <div className="bg-gradient-to-br from-sepia/10 to-amber-50 rounded-2xl rounded-tr-md p-4 max-w-[85%]">
                    <p className="font-serif text-sm text-ink leading-relaxed">
                      Oh, the farmhouse on Maple Street! The kitchen always smelled like fresh bread...
                    </p>
                  </div>
                </div>

                {/* AI follow-up */}
                <div className="flex gap-3 animate-[fadeSlideIn_0.5s_ease-out_0.4s_both]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sepia to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div className="bg-sepia/5 rounded-2xl rounded-tl-md p-4 max-w-[85%]">
                    <p className="font-serif text-sm text-ink leading-relaxed">
                      That sounds wonderful. Who baked the bread? Tell me more about them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Typing indicator */}
              <div className="mt-4 pt-4 border-t border-sepia/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-sans text-xs text-sepia">AI is listening...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Bento style */}
      <section className="py-16 px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl text-ink mb-2">
              Why families love it
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Feature 1 - Large */}
            <div className="col-span-2 bg-gradient-to-br from-sepia/5 to-amber-50 rounded-3xl p-6 border border-sepia/10">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-display text-lg text-ink mb-2">Natural Conversation</h3>
              <p className="font-serif text-sm text-warmgray">
                No awkward interviews. Just talk naturally like you're sharing stories with someone who genuinely cares.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-5 border border-sepia/10 shadow-sm">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-display text-base text-ink mb-1">Memory Unlocking</h3>
              <p className="font-serif text-xs text-warmgray">
                Thoughtful questions help recall forgotten details.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-5 border border-sepia/10 shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="font-display text-base text-ink mb-1">Beautiful Writing</h3>
              <p className="font-serif text-xs text-warmgray">
                Your voice transformed into eloquent prose.
              </p>
            </div>

            {/* Feature 4 - Wide */}
            <div className="col-span-2 bg-gradient-to-r from-ink to-stone-800 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-lg mb-1">Print-Ready Books</h3>
                  <p className="font-serif text-sm text-white/70">
                    Beautiful hardcover books delivered to your door. The perfect family gift.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Way */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-cream">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl text-ink mb-2">
              Choose your way
            </h2>
            <p className="font-serif text-sm text-warmgray">
              Talk or type—whatever feels natural
            </p>
          </div>

          <div className="space-y-4">
            {/* Voice Option */}
            <button
              onClick={() => handleModeSelect('voice')}
              className="group w-full text-left bg-white rounded-3xl p-5 border-2 border-sepia/20 hover:border-sepia hover:shadow-xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sepia to-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-lg text-ink">Voice Interview</h3>
                    <span className="text-[10px] bg-sepia text-white px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  <p className="font-serif text-sm text-warmgray">
                    Just talk naturally. AI listens and asks follow-up questions.
                  </p>
                </div>
                <svg className="w-5 h-5 text-sepia group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Type Option */}
            <button
              onClick={() => handleModeSelect('type')}
              className="group w-full text-left bg-white rounded-3xl p-5 border border-sepia/10 hover:border-sepia/40 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-sepia/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-sepia/20 transition">
                  <svg className="w-7 h-7 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-ink mb-1">Written Memoir</h3>
                  <p className="font-serif text-sm text-warmgray">
                    Prefer typing? Answer guided questions at your own pace.
                  </p>
                </div>
                <svg className="w-5 h-5 text-warmgray group-hover:text-sepia group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Emotional "Why Now" Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-amber-50/30">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-ink mb-4">
            The memories we wish we'd captured
          </h2>
          <p className="font-serif text-warmgray leading-relaxed mb-6">
            We all have that one relative whose stories we'd give anything to hear again.
            The way they described the old neighbourhood. That time they met someone famous.
            How they fell in love.
          </p>
          <p className="font-serif text-ink font-medium">
            Don't let your stories become the ones your family wishes they'd saved.
          </p>
        </div>
      </section>

      {/* Testimonials - Multiple stories */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-ink via-stone-900 to-ink overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-6 text-6xl text-white/5 font-serif">"</div>
        <div className="absolute bottom-10 right-6 text-6xl text-white/5 font-serif rotate-180">"</div>

        <div className="relative max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl text-white mb-2">Stories being preserved</h2>
            <p className="font-serif text-sm text-white/60">Real families, real memories</p>
          </div>

          <div className="space-y-6">
            {/* Testimonial 1 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <p className="font-serif text-white/90 italic leading-relaxed mb-4">
                "I never thought I'd write my life story. But talking to the AI felt so natural—
                like chatting with an old friend. Now my grandchildren will know who I really was."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sepia/30 rounded-full flex items-center justify-center">
                  <span className="text-white font-display">M</span>
                </div>
                <div>
                  <p className="font-sans text-white font-medium text-sm">Margaret T.</p>
                  <p className="font-sans text-white/50 text-xs">Age 78, Birmingham</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <p className="font-serif text-white/90 italic leading-relaxed mb-4">
                "Dad passed last year. Before he did, we captured 47 stories. Now my kids
                can hear their grandad talk about the war, his wedding day, the day I was born.
                It's priceless."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-600/30 rounded-full flex items-center justify-center">
                  <span className="text-white font-display">J</span>
                </div>
                <div>
                  <p className="font-sans text-white font-medium text-sm">James W.</p>
                  <p className="font-sans text-white/50 text-xs">Son of Harold W., Leeds</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <p className="font-serif text-white/90 italic leading-relaxed mb-4">
                "Mum has early dementia. We started capturing her memories before they fade.
                Some days she reads her own stories and remembers things she'd forgotten.
                It's brought her so much joy."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <span className="text-white font-display">S</span>
                </div>
                <div>
                  <p className="font-sans text-white font-medium text-sm">Sarah K.</p>
                  <p className="font-sans text-white/50 text-xs">Daughter, Manchester</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Capture - Life stages */}
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl text-ink mb-2">
              Every chapter of your life
            </h2>
            <p className="font-serif text-sm text-warmgray">
              91 thoughtful questions across 10 life stages
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💒', title: 'Childhood', desc: 'Early memories & family' },
              { icon: '🎓', title: 'Growing Up', desc: 'School days & friends' },
              { icon: '💑', title: 'Love & Family', desc: 'Romance & parenthood' },
              { icon: '💼', title: 'Career', desc: 'Work & achievements' },
              { icon: '🌍', title: 'Adventures', desc: 'Travel & experiences' },
              { icon: '💭', title: 'Wisdom', desc: 'Lessons & reflections' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-sepia/10 text-center">
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <h3 className="font-display text-sm text-ink">{item.title}</h3>
                <p className="font-sans text-xs text-warmgray">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Impactful */}
      <section className="py-20 px-6 bg-gradient-to-b from-cream to-amber-50/50">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sepia to-amber-600 rounded-3xl flex items-center justify-center shadow-xl shadow-sepia/30 mx-auto animate-[float_3s_ease-in-out_infinite]">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>

          <h2 className="font-display text-3xl text-ink mb-4 leading-tight">
            In 50 years, what will
            <br />
            <span className="italic text-sepia">your family remember?</span>
          </h2>

          <p className="font-serif text-warmgray mb-8 max-w-sm mx-auto">
            The stories you don't tell disappear forever. Your memories are worth saving.
            Your family deserves to know who you really are.
          </p>

          <button
            onClick={handleGetStarted}
            className="group relative font-sans bg-gradient-to-r from-ink via-stone-800 to-ink text-white px-10 py-5 rounded-2xl text-lg overflow-hidden hover:shadow-2xl hover:shadow-ink/30 transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2">
              {user ? 'Continue Your Story' : 'Start Preserving Your Memories'}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>

          <p className="font-sans text-warmgray/60 text-xs mt-4">
            Free to start · No credit card required · Takes 5 minutes
          </p>
        </div>
      </section>

      {/* Footer - Clean minimal */}
      <footer className="py-10 px-6 bg-white border-t border-sepia/10">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="font-display text-xl text-ink mb-2">
              Easy<span className="text-sepia">Memoir</span>
            </div>
            <p className="font-sans text-xs text-warmgray">
              Helping families preserve their stories for future generations
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs mb-8">
            <Link to="/how-it-works" className="text-warmgray hover:text-sepia transition">How It Works</Link>
            <Link to="/privacy" className="text-warmgray hover:text-sepia transition">Privacy</Link>
            <Link to="/terms" className="text-warmgray hover:text-sepia transition">Terms</Link>
          </div>

          <div className="text-center">
            <p className="font-sans text-xs text-warmgray/60">
              © 2026 Easy Memoir Ltd · Made with care in the UK
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

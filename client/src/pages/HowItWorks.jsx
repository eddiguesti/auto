import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HowItWorks() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <nav className="bg-cream border-b border-sepia/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/home')}
                className="font-sans text-sm bg-ink text-white px-5 py-2 rounded-full hover:bg-sepia transition"
              >
                My Stories
              </button>
            ) : (
              <>
                <Link to="/login" className="font-sans text-sm text-warmgray hover:text-ink transition">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="font-sans text-sm bg-ink text-white px-5 py-2 rounded-full hover:bg-sepia transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-to-b from-cream to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            How Easy Memoir Works
          </h1>
          <p className="font-serif text-xl text-warmgray max-w-2xl mx-auto">
            Transform your memories into a beautifully written autobiography in three simple steps.
            No writing skills required.
          </p>
        </div>
      </section>

      {/* Step 1 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sepia mb-4">
                <span className="w-8 h-8 rounded-full bg-sepia text-white flex items-center justify-center font-display">1</span>
                <span className="font-sans text-sm uppercase tracking-wider">Step One</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                Just Talk About Your Life
              </h2>
              <p className="font-serif text-lg text-warmgray leading-relaxed mb-6">
                Start a voice conversation with our AI interviewer. It's like chatting with a caring friend
                who genuinely wants to hear your stories.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Natural Voice Conversations</p>
                    <p className="text-warmgray text-sm">Speak naturally - no typing required</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Thoughtful Follow-up Questions</p>
                    <p className="text-warmgray text-sm">AI asks questions that unlock forgotten memories</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Guided Prompts</p>
                    <p className="text-warmgray text-sm">7 life chapters with 40+ thoughtful questions</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-parchment rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-sepia/20 flex items-center justify-center text-sm">AI</div>
                <div className="flex-1 bg-white rounded-2xl p-4">
                  <p className="font-serif text-warmgray">Tell me about your childhood home. What do you remember most vividly?</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end mb-6">
                <div className="bg-sepia/10 rounded-2xl p-4 max-w-[80%]">
                  <p className="font-serif text-ink">Oh, the farmhouse on Maple Street! The kitchen always smelled like fresh bread...</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center text-sm">You</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sepia/20 flex items-center justify-center text-sm">AI</div>
                <div className="flex-1 bg-white rounded-2xl p-4">
                  <p className="font-serif text-warmgray">That sounds wonderful! Who baked the bread? Tell me more about them.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-3xl p-8 shadow-lg">
                <div className="border-b border-sepia/20 pb-4 mb-6">
                  <p className="font-display text-2xl text-ink italic">Chapter One: Early Memories</p>
                </div>
                <div className="space-y-4">
                  <p className="font-serif text-warmgray leading-relaxed">
                    <span className="text-sepia">I</span> still remember the summer of 1962, the way
                    sunlight filtered through grandmother's lace curtains, casting delicate patterns
                    on the worn wooden floor of her kitchen.
                  </p>
                  <p className="font-serif text-warmgray leading-relaxed">
                    The aroma of fresh bread would fill every corner of that old farmhouse on Maple
                    Street, mixing with the sweet scent of her rose garden just outside the window.
                  </p>
                  <p className="font-serif text-warmgray leading-relaxed">
                    Those were the days when time moved slowly, when a single afternoon could
                    stretch into an entire adventure...
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-sepia/10 flex items-center gap-2 text-sm text-sepia">
                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
                    <path d="M19 15L19.9 17.1L22 18L19.9 18.9L19 21L18.1 18.9L16 18L18.1 17.1L19 15Z"/>
                    <path d="M5 3L5.5 4.5L7 5L5.5 5.5L5 7L4.5 5.5L3 5L4.5 4.5L5 3Z"/>
                  </svg>
                  <span>Written in your authentic voice</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-sepia mb-4">
                <span className="w-8 h-8 rounded-full bg-sepia text-white flex items-center justify-center font-display">2</span>
                <span className="font-sans text-sm uppercase tracking-wider">Step Two</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                AI Writes Your Story
              </h2>
              <p className="font-serif text-lg text-warmgray leading-relaxed mb-6">
                Our AI transforms your spoken words into beautifully written prose. It captures your
                unique voice, vocabulary, and personality - the final text sounds like you, not a robot.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Preserves Your Voice</p>
                    <p className="text-warmgray text-sm">AI mirrors your vocabulary and tone</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Adds Vivid Details</p>
                    <p className="text-warmgray text-sm">Enriches your stories with sensory descriptions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Professional Quality</p>
                    <p className="text-warmgray text-sm">Polished prose ready for publication</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sepia mb-4">
                <span className="w-8 h-8 rounded-full bg-sepia text-white flex items-center justify-center font-display">3</span>
                <span className="font-sans text-sm uppercase tracking-wider">Step Three</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                Share Your Legacy Forever
              </h2>
              <p className="font-serif text-lg text-warmgray leading-relaxed mb-6">
                Preview your complete autobiography, add photos, and choose how to share it.
                Download as a PDF or order a professionally printed book.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Download as PDF</p>
                    <p className="text-warmgray text-sm">Beautifully formatted, ready to print at home</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Order Printed Books</p>
                    <p className="text-warmgray text-sm">Hardcover, paperback, or spiral-bound options</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sepia/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-ink">Include Photos</p>
                    <p className="text-warmgray text-sm">Add images to bring your stories to life</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-parchment rounded-2xl p-6 shadow-lg transform -rotate-2">
                <div className="aspect-[3/4] bg-white rounded-lg shadow-inner flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="font-display text-lg text-ink italic">My Life Story</p>
                    <p className="text-sm text-sepia mt-2">A Memoir</p>
                    <div className="w-16 h-px bg-sepia/30 mx-auto mt-4" />
                    <p className="text-xs text-warmgray mt-4">by Margaret Thompson</p>
                  </div>
                </div>
                <p className="text-center text-xs text-warmgray mt-3">Hardcover</p>
              </div>
              <div className="bg-parchment rounded-2xl p-6 shadow-lg transform rotate-2 mt-8">
                <div className="aspect-[3/4] bg-white rounded-lg shadow-inner flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="font-display text-lg text-ink italic">Memories</p>
                    <p className="text-sm text-sepia mt-2">of a Lifetime</p>
                    <div className="w-16 h-px bg-sepia/30 mx-auto mt-4" />
                    <p className="text-xs text-warmgray mt-4">by John Williams</p>
                  </div>
                </div>
                <p className="text-center text-xs text-warmgray mt-3">Paperback</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 7 Chapters */}
      <section className="py-20 px-6 bg-ink text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl mb-4">The 7 Life Chapters</h2>
            <p className="font-serif text-lg text-white/70 max-w-2xl mx-auto">
              Your autobiography is organized into seven meaningful chapters, each with thoughtful
              prompts to guide you through every stage of your life.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: 1, title: 'Earliest Memories', desc: 'Ages 0-5', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12c-4 0-7 2.5-7 5.5V19h14v-1.5c0-3-3-5.5-7-5.5z" />
                </svg>
              )},
              { num: 2, title: 'Childhood', desc: 'Ages 6-12', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )},
              { num: 3, title: 'School Days', desc: 'Education years', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )},
              { num: 4, title: 'Teenage Years', desc: 'Coming of age', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              )},
              { num: 5, title: 'Young Adulthood', desc: 'Starting out', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )},
              { num: 6, title: 'Family & Career', desc: 'Building a life', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )},
              { num: 7, title: 'Wisdom & Reflections', desc: 'Looking back', icon: (
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )},
            ].map((chapter) => (
              <div key={chapter.num} className="bg-white/10 rounded-2xl p-6 backdrop-blur">
                <div className="mb-3">{chapter.icon}</div>
                <p className="font-display text-xl text-white mb-1">{chapter.title}</p>
                <p className="text-sm text-white/60">{chapter.desc}</p>
              </div>
            ))}
            <div className="bg-sepia/30 rounded-2xl p-6 flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-2xl text-white">40+</p>
                <p className="text-sm text-white/70">Guided Questions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
            Ready to Start Your Story?
          </h2>
          <p className="font-serif text-lg text-warmgray mb-8">
            Join thousands of people preserving their memories for future generations.
            Free to start, no credit card required.
          </p>
          <button
            onClick={() => navigate(user ? '/voice' : '/register')}
            className="group font-sans bg-ink text-white px-10 py-4 rounded-full text-lg hover:bg-sepia transition-all"
          >
            {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-sepia/10 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl text-ink">
            Easy<span className="text-sepia">Memoir</span>
          </Link>
          <div className="flex gap-6 text-sm text-warmgray">
            <Link to="/privacy" className="hover:text-sepia transition">Privacy</Link>
            <Link to="/terms" className="hover:text-sepia transition">Terms</Link>
            <Link to="/cookies" className="hover:text-sepia transition">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

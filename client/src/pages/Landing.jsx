import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate(user ? '/voice' : '/register')
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-cream/90 backdrop-blur-md z-50 border-b border-sepia/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-display text-xl text-ink">
            Easy<span className="text-sepia">Memoir</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/home')}
                className="text-sm bg-sepia text-white px-4 py-2 rounded-full hover:bg-ink transition"
              >
                My Stories
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-sm text-warmgray hover:text-ink">
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="text-sm bg-ink text-white px-5 py-2 rounded-full hover:bg-sepia transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-16 pb-12 px-4">
        <div className="max-w-5xl mx-auto w-full">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sepia uppercase tracking-[0.3em] text-xs mb-6">Preserve Your Legacy</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-ink leading-[1.1] mb-6">
              Your life story,<br />
              <span className="italic text-sepia">beautifully told</span>
            </h1>
            <p className="font-serif text-xl text-warmgray leading-relaxed mb-10 max-w-lg mx-auto">
              Just talk about your memories. Our AI interviewer, Lisa, transforms your stories
              into a beautiful autobiography your family will treasure forever.
            </p>
            <button
              onClick={handleGetStarted}
              className="group bg-ink text-white px-8 py-4 rounded-full text-lg hover:bg-sepia transition-all"
            >
              {user ? 'Continue Your Story' : 'Start Your Memoir — Free'}
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <p className="text-warmgray/60 text-sm mt-4">No credit card required</p>
          </div>

          {/* Chat Preview */}
          <div className="mt-16 max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-sepia/10">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs font-medium text-sepia flex-shrink-0">L</div>
                  <div className="bg-sepia/5 rounded-2xl rounded-tl-sm p-3">
                    <p className="font-serif text-sm text-warmgray">Tell me about your childhood home. What do you remember most vividly?</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-sepia/10 rounded-2xl rounded-tr-sm p-3">
                    <p className="font-serif text-sm text-ink">The old farmhouse on Maple Street! The kitchen always smelled like fresh bread...</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs font-medium text-sepia flex-shrink-0">L</div>
                  <div className="bg-sepia/5 rounded-2xl rounded-tl-sm p-3">
                    <p className="font-serif text-sm text-warmgray">Who baked the bread? Tell me more about them.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-sepia/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-sepia">Lisa is listening...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl text-ink mb-4">Three simple steps</h2>
            <p className="font-serif text-warmgray">No writing skills needed. Just share naturally.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                ),
                title: 'Just Talk',
                desc: 'Lisa asks thoughtful questions. Answer naturally, like talking to a friend.'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'We Write',
                desc: 'Your words become beautifully written prose. Your voice, polished and preserved.'
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: 'Share Forever',
                desc: 'Download as PDF or order a printed book for your family.'
              }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="font-display text-xl text-ink mb-2 italic">{step.title}</h3>
                <p className="font-serif text-warmgray text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Natural Conversation', desc: 'Like chatting with someone who genuinely wants to hear your stories.' },
              { title: 'Memory Unlocking', desc: 'Thoughtful questions help you remember forgotten details.' },
              { title: 'Beautiful Writing', desc: 'Your stories transformed into eloquent prose.' },
              { title: 'Print-Ready Books', desc: 'Order professionally printed hardcover books.' }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-sepia/10">
                <h3 className="font-display text-lg text-ink mb-2">{feature.title}</h3>
                <p className="font-serif text-sm text-warmgray">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-4 bg-ink text-white">
        <div className="max-w-2xl mx-auto text-center">
          <svg className="w-10 h-10 mx-auto mb-6 text-sepia/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
          <p className="font-display text-2xl italic mb-6 leading-relaxed text-white/90">
            I never thought I'd write my life story. But talking to Lisa felt so natural—
            now my grandchildren will know who I really was.
          </p>
          <p className="text-white font-medium">Margaret T.</p>
          <p className="text-white/60 text-sm">Age 78, Birmingham</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-4xl text-ink mb-4">
            Your stories matter.<br />
            <span className="italic text-sepia">Start preserving them today.</span>
          </h2>
          <p className="font-serif text-warmgray mb-8">
            Every life is full of moments worth remembering. Don't let them fade away.
          </p>
          <button
            onClick={handleGetStarted}
            className="group bg-ink text-white px-10 py-4 rounded-full text-lg hover:bg-sepia transition-all"
          >
            {user ? 'Continue Your Story' : 'Start For Free'}
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-sepia/10 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-display text-lg text-ink">
            Easy<span className="text-sepia">Memoir</span>
          </div>
          <div className="flex gap-6 text-sm text-warmgray">
            <Link to="/privacy" className="hover:text-sepia">Privacy</Link>
            <Link to="/terms" className="hover:text-sepia">Terms</Link>
          </div>
          <p className="text-xs text-warmgray/60">© 2026 Easy Memoir Ltd</p>
        </div>
      </footer>
    </div>
  )
}

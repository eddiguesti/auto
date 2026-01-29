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
                  <span className="text-sepia text-xl">🎤</span>
                  <div>
                    <p className="font-medium text-ink">Natural Voice Conversations</p>
                    <p className="text-warmgray text-sm">Speak naturally - no typing required</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">💭</span>
                  <div>
                    <p className="font-medium text-ink">Thoughtful Follow-up Questions</p>
                    <p className="text-warmgray text-sm">AI asks questions that unlock forgotten memories</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">📝</span>
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
                  <span className="animate-pulse">✨</span>
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
                  <span className="text-sepia text-xl">✍️</span>
                  <div>
                    <p className="font-medium text-ink">Preserves Your Voice</p>
                    <p className="text-warmgray text-sm">AI mirrors your vocabulary and tone</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">🎨</span>
                  <div>
                    <p className="font-medium text-ink">Adds Vivid Details</p>
                    <p className="text-warmgray text-sm">Enriches your stories with sensory descriptions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">📖</span>
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
                  <span className="text-sepia text-xl">📄</span>
                  <div>
                    <p className="font-medium text-ink">Download as PDF</p>
                    <p className="text-warmgray text-sm">Beautifully formatted, ready to print at home</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">📚</span>
                  <div>
                    <p className="font-medium text-ink">Order Printed Books</p>
                    <p className="text-warmgray text-sm">Hardcover, paperback, or spiral-bound options</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sepia text-xl">🖼️</span>
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
              { num: 1, title: 'Earliest Memories', desc: 'Ages 0-5', icon: '👶' },
              { num: 2, title: 'Childhood', desc: 'Ages 6-12', icon: '🏠' },
              { num: 3, title: 'School Days', desc: 'Education years', icon: '📚' },
              { num: 4, title: 'Teenage Years', desc: 'Coming of age', icon: '🎸' },
              { num: 5, title: 'Young Adulthood', desc: 'Starting out', icon: '🌟' },
              { num: 6, title: 'Family & Career', desc: 'Building a life', icon: '💼' },
              { num: 7, title: 'Wisdom & Reflections', desc: 'Looking back', icon: '🌅' },
            ].map((chapter) => (
              <div key={chapter.num} className="bg-white/10 rounded-2xl p-6 backdrop-blur">
                <span className="text-3xl mb-3 block">{chapter.icon}</span>
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

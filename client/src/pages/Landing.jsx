import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleTryIt = () => {
    if (user) {
      navigate('/voice')
    } else {
      navigate('/register')
    }
  }

  const handleModeSelect = (mode) => {
    if (user) {
      if (mode === 'voice') {
        navigate('/voice')
      } else {
        navigate('/home')
      }
    } else {
      navigate('/register')
    }
  }

  return (
    <div className="min-h-screen page-enter">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="text-sepia/30 text-3xl mb-8 tracking-[0.5em] float">❧</div>

        {user && (
          <p className="text-sepia/70 mb-4 text-lg">
            Welcome back, <span className="font-medium text-ink">{user.name}</span>
          </p>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-ink mb-6 tracking-wide text-center leading-tight">
          Your Life Story,<br />
          <span className="text-sepia">Told Your Way</span>
        </h1>

        <p className="text-xl sm:text-2xl text-sepia/80 text-center max-w-2xl mb-4 leading-relaxed">
          Just chat like you're talking to a friend.
        </p>

        <p className="text-lg text-sepia/60 text-center max-w-xl mb-10">
          Spend a few minutes a day sharing your memories. We'll turn your stories into a beautiful autobiography using the latest AI.
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleTryIt}
          className="group bg-sepia text-white px-10 py-4 rounded-full text-xl font-medium hover:bg-ink transition-all pulse-gentle tap-bounce mb-4"
        >
          {user ? 'Continue Your Story' : "Try It Now — It's Free"}
          <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
        </button>

        <p className="text-sepia/50 text-sm mb-12">
          {user ? 'Pick up where you left off.' : 'Free to sign up. Start talking in seconds.'}
        </p>

        {/* Social proof hint */}
        <div className="flex items-center gap-2 text-sepia/60 text-sm">
          <span className="flex -space-x-2">
            <span className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs">👨</span>
            <span className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs">👩</span>
            <span className="w-8 h-8 rounded-full bg-sepia/20 flex items-center justify-center text-xs">👴</span>
          </span>
          <span>Helping families preserve their stories</span>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl text-ink text-center mb-4">
            As Easy as Having a Conversation
          </h2>
          <p className="text-sepia/70 text-center mb-16 text-lg">
            No writing skills needed. Just talk, and we'll handle the rest.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center stagger-item">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎙️</span>
              </div>
              <div className="text-sepia font-medium text-sm mb-2">Step 1</div>
              <h3 className="text-xl text-ink mb-3">Just Talk</h3>
              <p className="text-sepia/70 leading-relaxed">
                Our friendly AI asks you questions about your life — childhood memories, adventures, lessons learned. Just answer naturally.
              </p>
            </div>

            <div className="text-center stagger-item">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✨</span>
              </div>
              <div className="text-sepia font-medium text-sm mb-2">Step 2</div>
              <h3 className="text-xl text-ink mb-3">We Write It</h3>
              <p className="text-sepia/70 leading-relaxed">
                Our AI transforms your spoken words into beautifully written chapters. Your voice, your stories — polished prose.
              </p>
            </div>

            <div className="text-center stagger-item">
              <div className="w-20 h-20 rounded-full bg-sepia/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📖</span>
              </div>
              <div className="text-sepia font-medium text-sm mb-2">Step 3</div>
              <h3 className="text-xl text-ink mb-3">Share Forever</h3>
              <p className="text-sepia/70 leading-relaxed">
                Download your finished autobiography as a beautiful PDF. Print it, share it with family, preserve your legacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl text-ink text-center mb-16">
            Why People Love It
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sepia/20 card-hover stagger-item">
              <div className="text-2xl mb-3">💬</div>
              <h3 className="text-lg text-ink font-medium mb-2">Like Talking to a Friend</h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                No awkward interviews or blank pages. Our AI feels like chatting with someone who genuinely wants to hear your stories.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sepia/20 card-hover stagger-item">
              <div className="text-2xl mb-3">⏱️</div>
              <h3 className="text-lg text-ink font-medium mb-2">Just Minutes a Day</h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                No pressure. Share one memory today, another tomorrow. Build your story bit by bit, at your own pace.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sepia/20 card-hover stagger-item">
              <div className="text-2xl mb-3">🧠</div>
              <h3 className="text-lg text-ink font-medium mb-2">Memories Unlocked</h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Our thoughtful questions help you remember things you haven't thought about in years. It's like guided reminiscing.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sepia/20 card-hover stagger-item">
              <div className="text-2xl mb-3">🎁</div>
              <h3 className="text-lg text-ink font-medium mb-2">A Gift for Generations</h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Create something your children and grandchildren will treasure. Your experiences and wisdom, preserved forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Style */}
      <section className="py-20 px-4 bg-white/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl text-ink text-center mb-4">
            Choose Your Style
          </h2>
          <p className="text-sepia/70 text-center mb-12 text-lg">
            Talk or type — whatever feels natural to you.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Voice Mode */}
            <button
              onClick={() => handleModeSelect('voice')}
              className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 border-2 border-sepia/30 hover:border-sepia transition text-left card-hover"
            >
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <div className="text-sepia text-sm font-medium mb-1">Recommended</div>
              <h3 className="text-xl text-ink font-medium mb-2 group-hover:text-sepia transition">
                Voice Interview
              </h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Just talk naturally. Our AI listens, asks follow-up questions, and captures every detail of your stories.
              </p>
              <div className="mt-4 flex items-center text-sepia text-sm font-medium">
                <span>Start talking</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Type Mode */}
            <button
              onClick={() => handleModeSelect('type')}
              className="group bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-sepia/20 hover:border-sepia/40 hover:bg-white/80 transition text-left card-hover"
            >
              <div className="w-16 h-16 rounded-full bg-sepia/10 flex items-center justify-center mb-6 group-hover:bg-sepia/20 transition">
                <svg className="w-8 h-8 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl text-ink font-medium mb-2 group-hover:text-sepia transition">
                Write Your Story
              </h3>
              <p className="text-sepia/70 text-sm leading-relaxed">
                Prefer typing? Answer guided questions at your own pace. Our AI helps expand your notes into beautiful prose.
              </p>
              <div className="mt-4 flex items-center text-sepia text-sm font-medium">
                <span>Start writing</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl text-ink mb-4">
            Your Stories Matter
          </h2>
          <p className="text-lg text-sepia/70 mb-8 leading-relaxed">
            Every life is full of moments worth remembering. Don't let them fade away. Start capturing your story today.
          </p>
          <button
            onClick={handleTryIt}
            className="group bg-sepia text-white px-10 py-4 rounded-full text-xl font-medium hover:bg-ink transition-all pulse-gentle tap-bounce"
          >
            Start Your Story
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <p className="text-sepia/50 text-sm mt-4">Free to try. No credit card needed.</p>
        </div>

        <div className="mt-16 text-sepia/20 text-xl float">✦</div>
      </section>
    </div>
  )
}

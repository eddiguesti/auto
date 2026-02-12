import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SEO, { breadcrumbSchema } from '../../components/SEO'

const competitors = [
  {
    name: 'Easy Memoir',
    highlight: true,
    logo: '/logo.png',
    tagline: 'AI-powered voice memoir writing',
    pricing: 'Free to start',
    pricingDetail: 'No credit card required',
    features: {
      voiceRecording: true,
      aiWriting: true,
      aiInterviewer: true,
      photoIntegration: true,
      bookPrinting: true,
      pdfExport: true,
      familySharing: true,
      mobileApp: true,
      offlineAccess: false,
      videoRecording: false,
      freeChapters: '2 free chapters',
      writingStyle: 'AI preserves your authentic voice',
      promptCount: '40+ prompts across 7 life chapters',
      languages: 'English',
      support: 'Live chat + email',
      dataPrivacy: 'GDPR compliant, UK servers, never trains AI'
    }
  },
  {
    name: 'StoryWorth',
    highlight: false,
    tagline: 'Weekly email questions for memoir writing',
    pricing: 'From $99/year',
    pricingDetail: 'Annual subscription',
    features: {
      voiceRecording: false,
      aiWriting: false,
      aiInterviewer: false,
      photoIntegration: true,
      bookPrinting: true,
      pdfExport: true,
      familySharing: true,
      mobileApp: false,
      offlineAccess: false,
      videoRecording: false,
      freeChapters: 'None - paid upfront',
      writingStyle: 'You write everything yourself',
      promptCount: '400+ questions (email-based)',
      languages: 'English',
      support: 'Email only',
      dataPrivacy: 'US-based servers'
    }
  },
  {
    name: 'Remento',
    highlight: false,
    tagline: 'Video recording for family stories',
    pricing: 'From $99/year',
    pricingDetail: 'Annual subscription',
    features: {
      voiceRecording: true,
      aiWriting: false,
      aiInterviewer: false,
      photoIntegration: true,
      bookPrinting: true,
      pdfExport: false,
      familySharing: true,
      mobileApp: true,
      offlineAccess: false,
      videoRecording: true,
      freeChapters: 'Limited free trial',
      writingStyle: 'Basic transcription only',
      promptCount: '200+ prompts',
      languages: 'English',
      support: 'Email support',
      dataPrivacy: 'US-based servers'
    }
  },
  {
    name: 'Storyfile',
    highlight: false,
    tagline: 'Video legacy with AI interaction',
    pricing: 'From $49/year',
    pricingDetail: 'Annual subscription',
    features: {
      voiceRecording: true,
      aiWriting: false,
      aiInterviewer: false,
      photoIntegration: false,
      bookPrinting: false,
      pdfExport: false,
      familySharing: true,
      mobileApp: true,
      offlineAccess: false,
      videoRecording: true,
      freeChapters: 'Limited free version',
      writingStyle: 'Video-only, no written memoir',
      promptCount: 'Custom questions',
      languages: 'English',
      support: 'Email support',
      dataPrivacy: 'US-based servers'
    }
  }
]

const featureRows = [
  {
    key: 'aiWriting',
    label: 'AI writes your story',
    tooltip: 'AI transforms your spoken words into beautifully written prose'
  },
  {
    key: 'aiInterviewer',
    label: 'AI interviewer',
    tooltip: 'An AI guide asks thoughtful questions to draw out your memories'
  },
  {
    key: 'voiceRecording',
    label: 'Voice recording',
    tooltip: 'Record your stories by speaking naturally'
  },
  {
    key: 'videoRecording',
    label: 'Video recording',
    tooltip: 'Record video of yourself telling stories'
  },
  {
    key: 'photoIntegration',
    label: 'Photo integration',
    tooltip: 'Add photos to accompany your stories'
  },
  {
    key: 'bookPrinting',
    label: 'Printed book',
    tooltip: 'Order a professionally printed hardcover book'
  },
  { key: 'pdfExport', label: 'PDF export', tooltip: 'Download your memoir as a PDF file' },
  {
    key: 'familySharing',
    label: 'Family sharing',
    tooltip: 'Share your memoir with family members'
  },
  { key: 'mobileApp', label: 'Works on mobile', tooltip: 'Use on smartphone or tablet' }
]

const textRows = [
  { key: 'freeChapters', label: 'Free tier' },
  { key: 'writingStyle', label: 'Writing approach' },
  { key: 'promptCount', label: 'Story prompts' },
  { key: 'support', label: 'Customer support' },
  { key: 'dataPrivacy', label: 'Data & privacy' }
]

export default function Compare() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)

  const visibleCompetitors = showAll ? competitors : competitors.slice(0, 3)

  const handleGetStarted = () => {
    navigate(user ? '/voice' : '/register')
  }

  return (
    <div className="min-h-screen bg-heritage-cream">
      <SEO
        title="Easy Memoir vs StoryWorth & Alternatives — Memoir Service Comparison 2026"
        description="Compare Easy Memoir with StoryWorth, Remento, and other memoir writing services. See features, pricing, and find the best way to preserve your family's life stories. AI-powered vs traditional approaches."
        path="/compare"
        jsonLd={[
          breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Compare Memoir Services' }]),
          {
            '@type': 'WebPage',
            name: 'Memoir Writing Service Comparison',
            description:
              'Compare Easy Memoir with StoryWorth, Remento, and other memoir writing platforms',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: competitors.map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: c.name,
                description: c.tagline
              }))
            }
          }
        ]}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-cream/95 backdrop-blur-sm border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-heritage-ink">
            Easy<span className="text-heritage-sepia">Memoir</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/how-it-works"
              className="text-heritage-text hover:text-heritage-sepia transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/pricing"
              className="text-heritage-text hover:text-heritage-sepia transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/blog"
              className="text-heritage-text hover:text-heritage-sepia transition-colors"
            >
              Blog
            </Link>
            <Link
              to="/faq"
              className="text-heritage-text hover:text-heritage-sepia transition-colors"
            >
              FAQ
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/home"
                className="px-5 py-2.5 bg-heritage-sepia text-white rounded-lg hover:bg-heritage-sepia-dark transition-colors font-medium"
              >
                My Memoir
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-heritage-text hover:text-heritage-sepia transition-colors hidden sm:block"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-heritage-sepia text-white rounded-lg hover:bg-heritage-sepia-dark transition-colors font-medium"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-heritage-sepia mb-4">
            Comparison Guide
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-heritage-ink mb-6 leading-tight">
            Find the Best Way to
            <br />
            <span className="text-heritage-sepia">Preserve Your Life Story</span>
          </h1>
          <p className="font-serif text-lg text-heritage-text/80 max-w-2xl mx-auto leading-relaxed">
            Comparing the top memoir writing services to help you choose the right one. See how Easy
            Memoir's AI-powered approach compares with traditional alternatives.
          </p>
        </div>
      </section>

      {/* Quick Summary Cards */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {competitors.map(comp => (
            <div
              key={comp.name}
              className={`rounded-2xl p-6 transition-all ${
                comp.highlight
                  ? 'bg-heritage-sepia text-white ring-2 ring-heritage-sepia shadow-xl scale-[1.02]'
                  : 'bg-white border border-heritage-sepia-light/20 shadow-sm'
              }`}
            >
              {comp.highlight && (
                <span className="inline-block text-xs font-sans uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full mb-3">
                  Our Pick
                </span>
              )}
              <h3
                className={`font-display text-xl mb-1 ${comp.highlight ? 'text-white' : 'text-heritage-ink'}`}
              >
                {comp.name}
              </h3>
              <p
                className={`text-sm mb-4 ${comp.highlight ? 'text-white/80' : 'text-heritage-text/60'}`}
              >
                {comp.tagline}
              </p>
              <div
                className={`font-display text-2xl mb-1 ${comp.highlight ? 'text-white' : 'text-heritage-ink'}`}
              >
                {comp.pricing}
              </div>
              <p
                className={`text-xs ${comp.highlight ? 'text-white/60' : 'text-heritage-text/50'}`}
              >
                {comp.pricingDetail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl text-heritage-ink text-center mb-10">
            Feature-by-Feature Comparison
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-heritage-sepia-light/20 bg-white shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-heritage-sepia-light/20">
                  <th className="text-left py-4 px-6 font-sans text-sm text-heritage-text/60 uppercase tracking-wider w-48">
                    Feature
                  </th>
                  {visibleCompetitors.map(comp => (
                    <th
                      key={comp.name}
                      className={`py-4 px-4 text-center font-display text-lg ${
                        comp.highlight
                          ? 'text-heritage-sepia bg-heritage-sepia/5'
                          : 'text-heritage-ink'
                      }`}
                    >
                      {comp.name}
                      {comp.highlight && (
                        <div className="text-xs font-sans font-normal text-heritage-sepia/60 mt-1">
                          Recommended
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Pricing row */}
                <tr className="border-b border-heritage-sepia-light/10 bg-heritage-cream/30">
                  <td className="py-4 px-6 font-sans text-sm font-medium text-heritage-ink">
                    Pricing
                  </td>
                  {visibleCompetitors.map(comp => (
                    <td
                      key={comp.name}
                      className={`py-4 px-4 text-center ${comp.highlight ? 'bg-heritage-sepia/5' : ''}`}
                    >
                      <div className="font-display text-lg text-heritage-ink">{comp.pricing}</div>
                      <div className="text-xs text-heritage-text/50">{comp.pricingDetail}</div>
                    </td>
                  ))}
                </tr>

                {/* Boolean feature rows */}
                {featureRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={`border-b border-heritage-sepia-light/10 ${i % 2 === 0 ? '' : 'bg-heritage-cream/30'}`}
                  >
                    <td
                      className="py-3.5 px-6 font-sans text-sm text-heritage-ink"
                      title={row.tooltip}
                    >
                      {row.label}
                    </td>
                    {visibleCompetitors.map(comp => (
                      <td
                        key={comp.name}
                        className={`py-3.5 px-4 text-center ${comp.highlight ? 'bg-heritage-sepia/5' : ''}`}
                      >
                        {comp.features[row.key] ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Text feature rows */}
                {textRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={`border-b border-heritage-sepia-light/10 ${(featureRows.length + i) % 2 === 0 ? '' : 'bg-heritage-cream/30'}`}
                  >
                    <td className="py-3.5 px-6 font-sans text-sm font-medium text-heritage-ink">
                      {row.label}
                    </td>
                    {visibleCompetitors.map(comp => (
                      <td
                        key={comp.name}
                        className={`py-3.5 px-4 text-center text-sm text-heritage-text/80 ${comp.highlight ? 'bg-heritage-sepia/5 font-medium' : ''}`}
                      >
                        {comp.features[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAll && competitors.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll(true)}
                className="text-heritage-sepia hover:text-heritage-sepia-dark font-medium text-sm underline underline-offset-4 transition-colors"
              >
                Show all {competitors.length} services
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Why Easy Memoir Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-heritage-ink text-center mb-4">
            Why Choose Easy Memoir?
          </h2>
          <p className="font-serif text-heritage-text/70 text-center max-w-2xl mx-auto mb-12">
            While other services ask you to write or simply record, Easy Memoir is the only platform
            where AI actually writes your story for you, preserving your authentic voice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-heritage-sepia/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-heritage-sepia"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-xl text-heritage-ink mb-2">Just Talk</h3>
              <p className="font-serif text-sm text-heritage-text/70">
                No typing, no writing. Speak naturally and our AI interviewer guides you through
                your memories with thoughtful questions.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-heritage-sepia/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-heritage-sepia"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-xl text-heritage-ink mb-2">AI Writes For You</h3>
              <p className="font-serif text-sm text-heritage-text/70">
                Unlike StoryWorth where you write everything yourself, our AI transforms your words
                into beautifully written prose.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-heritage-sepia/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-heritage-sepia"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="font-display text-xl text-heritage-ink mb-2">Real Printed Books</h3>
              <p className="font-serif text-sm text-heritage-text/70">
                Order beautifully printed hardcover books from just £29. Professional quality your
                family will treasure for generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Comparisons */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <div>
            <h2 className="font-display text-3xl text-heritage-ink mb-6">
              Easy Memoir vs StoryWorth
            </h2>
            <div className="font-serif text-heritage-text/80 space-y-4 leading-relaxed">
              <p>
                <strong>StoryWorth</strong> is one of the most well-known memoir services, sending
                weekly email questions that you answer in writing. It's a great concept, but many
                people find they struggle to write well, or simply don't enjoy the process of typing
                out their answers.
              </p>
              <p>
                <strong>Easy Memoir</strong> takes a fundamentally different approach. Instead of
                asking you to write, you simply <em>talk</em>. Our AI interviewer, Clio, asks
                thoughtful follow-up questions and then transforms your spoken words into
                beautifully written prose — preserving your authentic voice and personality.
              </p>
              <p>
                For people who love writing, StoryWorth is a solid choice. But for the vast majority
                who find writing intimidating, Easy Memoir makes the process effortless and
                enjoyable. It's particularly popular with seniors who prefer speaking to typing.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-3xl text-heritage-ink mb-6">Easy Memoir vs Remento</h2>
            <div className="font-serif text-heritage-text/80 space-y-4 leading-relaxed">
              <p>
                <strong>Remento</strong> focuses on video recording — you record yourself on camera
                answering prompts, and it compiles these into a video legacy. It also offers basic
                transcription and book printing.
              </p>
              <p>
                While video is wonderful for capturing facial expressions and emotion, many people
                (especially older adults) feel uncomfortable on camera. <strong>Easy Memoir</strong>{' '}
                uses voice-only recording, which feels as natural as a phone call. Plus, our AI
                doesn't just transcribe — it actively writes polished, eloquent prose from your
                stories.
              </p>
              <p>
                If you want a video keepsake, Remento is worth considering. If you want a
                beautifully written autobiography that reads like a real book, Easy Memoir is the
                better choice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-heritage-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl mb-4">Ready to Start Your Story?</h2>
          <p className="font-serif text-lg text-white/70 mb-8 max-w-xl mx-auto">
            Try Easy Memoir free — no credit card, no commitment. See how effortless it is to turn
            your memories into a beautiful book.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-heritage-terracotta text-white rounded-xl font-sans font-semibold text-lg hover:bg-heritage-terracotta/90 transition-all shadow-lg"
            >
              Start Your Free Memoir
            </button>
            <Link
              to="/sample"
              className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-sans font-semibold text-lg hover:bg-white/10 transition-all"
            >
              View Sample Book
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-heritage-cream border-t border-heritage-sepia-light/20 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl text-heritage-ink">
            Easy<span className="text-heritage-sepia">Memoir</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-heritage-text/60">
            <Link to="/how-it-works" className="hover:text-heritage-sepia transition-colors">
              How It Works
            </Link>
            <Link to="/pricing" className="hover:text-heritage-sepia transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="hover:text-heritage-sepia transition-colors">
              Blog
            </Link>
            <Link to="/faq" className="hover:text-heritage-sepia transition-colors">
              FAQ
            </Link>
            <Link to="/about" className="hover:text-heritage-sepia transition-colors">
              About
            </Link>
            <Link to="/terms" className="hover:text-heritage-sepia transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-heritage-sepia transition-colors">
              Privacy
            </Link>
          </div>
          <p className="text-xs text-heritage-text/40">
            &copy; {new Date().getFullYear()} Easy Memoir
          </p>
        </div>
      </footer>
    </div>
  )
}

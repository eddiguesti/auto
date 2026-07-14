import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconCheck,
  IconX,
  IconMicrophone,
  IconSparkles,
  IconBook2,
  IconArrowRight
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Card } from '../../components/ui'

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
    <div className="min-h-screen bg-parchment page-enter">
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-parchment/90 backdrop-blur-sm border-b border-sepia-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink">
            Easy<span className="text-sepia-500">Memoir</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/how-it-works"
              className="text-sm text-sepia-600 hover:text-ink transition-colors"
            >
              How It Works
            </Link>
            <Link to="/pricing" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Blog
            </Link>
            <Link to="/faq" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              FAQ
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button to="/home" size="sm">
                My Memoir
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-sepia-600 hover:text-ink transition-colors hidden sm:block"
                >
                  Log In
                </Link>
                <Button to="/register" size="sm">
                  Start Free
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-4">Comparison Guide</p>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">
            Find the Best Way to
            <br />
            <span className="text-bronze-600">Preserve Your Life Story</span>
          </h1>
          <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
            Comparing the top memoir writing services to help you choose the right one. See how Easy
            Memoir's AI-powered approach compares with traditional alternatives.
          </p>
        </div>
      </section>

      {/* Quick Summary Cards */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {competitors.map(comp => (
            <Card
              key={comp.name}
              className={`stagger-item ${comp.highlight ? '!bg-ink !border-ink' : ''}`}
            >
              {comp.highlight && (
                <span className="inline-block text-xs font-medium uppercase tracking-caps bg-bronze-500/25 text-bronze-200 px-3 py-1 rounded-full mb-3">
                  Our Pick
                </span>
              )}
              <h3
                className={`font-display text-xl mb-1 ${comp.highlight ? 'text-white' : 'text-ink'}`}
              >
                {comp.name}
              </h3>
              <p className={`text-sm mb-4 ${comp.highlight ? 'text-white/70' : 'text-sepia-600'}`}>
                {comp.tagline}
              </p>
              <div
                className={`font-display text-2xl mb-1 ${comp.highlight ? 'text-white' : 'text-ink'}`}
              >
                {comp.pricing}
              </div>
              <p className={`text-xs ${comp.highlight ? 'text-white/60' : 'text-sepia-500'}`}>
                {comp.pricingDetail}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl text-ink text-center mb-10">
            Feature-by-Feature Comparison
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-sepia-200 bg-surface shadow-soft">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-sepia-200">
                  <th className="text-left py-4 px-6 w-48">
                    <span className="eyebrow">Feature</span>
                  </th>
                  {visibleCompetitors.map(comp => (
                    <th
                      key={comp.name}
                      className={`py-4 px-4 text-center font-display text-lg ${
                        comp.highlight ? 'text-bronze-700 bg-bronze-50' : 'text-ink'
                      }`}
                    >
                      {comp.name}
                      {comp.highlight && (
                        <div className="text-xs font-sans font-normal text-bronze-600 mt-1">
                          Recommended
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Pricing row */}
                <tr className="border-b border-sepia-100 bg-cream/50">
                  <td className="py-4 px-6 text-sm font-medium text-ink">Pricing</td>
                  {visibleCompetitors.map(comp => (
                    <td
                      key={comp.name}
                      className={`py-4 px-4 text-center ${comp.highlight ? 'bg-bronze-50' : ''}`}
                    >
                      <div className="font-display text-lg text-ink">{comp.pricing}</div>
                      <div className="text-xs text-sepia-500">{comp.pricingDetail}</div>
                    </td>
                  ))}
                </tr>

                {/* Boolean feature rows */}
                {featureRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={`border-b border-sepia-100 ${i % 2 === 0 ? '' : 'bg-cream/50'}`}
                  >
                    <td className="py-3.5 px-6 text-sm text-ink" title={row.tooltip}>
                      {row.label}
                    </td>
                    {visibleCompetitors.map(comp => (
                      <td
                        key={comp.name}
                        className={`py-3.5 px-4 text-center ${comp.highlight ? 'bg-bronze-50' : ''}`}
                      >
                        {comp.features[row.key] ? (
                          <IconCheck
                            size={20}
                            stroke={2.5}
                            className="inline-block text-success"
                            aria-label="Included"
                          />
                        ) : (
                          <IconX
                            size={20}
                            stroke={2}
                            className="inline-block text-sepia-300"
                            aria-label="Not included"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Text feature rows */}
                {textRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={`border-b border-sepia-100 ${(featureRows.length + i) % 2 === 0 ? '' : 'bg-cream/50'}`}
                  >
                    <td className="py-3.5 px-6 text-sm font-medium text-ink">{row.label}</td>
                    {visibleCompetitors.map(comp => (
                      <td
                        key={comp.name}
                        className={`py-3.5 px-4 text-center text-sm text-sepia-600 ${comp.highlight ? 'bg-bronze-50 font-medium text-ink-soft' : ''}`}
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
                className="text-bronze-600 hover:text-bronze-700 font-medium text-sm underline underline-offset-4 transition-colors"
              >
                Show all {competitors.length} services
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Why Easy Memoir Section */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-ink text-center mb-4">
            Why Choose Easy Memoir?
          </h2>
          <p className="text-lg text-sepia-600 text-center max-w-2xl mx-auto mb-12">
            While other services ask you to write or simply record, Easy Memoir is the only platform
            where AI actually writes your story for you, preserving your authentic voice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center stagger-item">
              <div className="w-11 h-11 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
                <IconMicrophone size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">Just Talk</h3>
              <p className="text-sm text-sepia-600">
                No typing, no writing. Speak naturally and our AI interviewer guides you through
                your memories with thoughtful questions.
              </p>
            </div>

            <div className="text-center stagger-item">
              <div className="w-11 h-11 rounded-xl bg-bronze-100 text-bronze-700 flex items-center justify-center mx-auto mb-4">
                <IconSparkles size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">AI Writes For You</h3>
              <p className="text-sm text-sepia-600">
                Unlike StoryWorth where you write everything yourself, our AI transforms your words
                into beautifully written prose.
              </p>
            </div>

            <div className="text-center stagger-item">
              <div className="w-11 h-11 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
                <IconBook2 size={24} stroke={1.5} />
              </div>
              <h3 className="font-display text-xl text-ink mb-2">Real Printed Books</h3>
              <p className="text-sm text-sepia-600">
                Order beautifully printed hardcover books from just £29. Professional quality your
                family will treasure for generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Comparisons */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <div>
            <h2 className="font-display text-3xl text-ink mb-6">Easy Memoir vs StoryWorth</h2>
            <div className="text-sepia-600 space-y-4 max-w-reading">
              <p>
                <strong className="text-ink">StoryWorth</strong> is one of the most well-known
                memoir services, sending weekly email questions that you answer in writing. It's a
                great concept, but many people find they struggle to write well, or simply don't
                enjoy the process of typing out their answers.
              </p>
              <p>
                <strong className="text-ink">Easy Memoir</strong> takes a fundamentally different
                approach. Instead of asking you to write, you simply <em>talk</em>. Our AI
                interviewer, Clio, asks thoughtful follow-up questions and then transforms your
                spoken words into beautifully written prose — preserving your authentic voice and
                personality.
              </p>
              <p>
                For people who love writing, StoryWorth is a solid choice. But for the vast majority
                who find writing intimidating, Easy Memoir makes the process effortless and
                enjoyable. It's particularly popular with seniors who prefer speaking to typing.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-3xl text-ink mb-6">Easy Memoir vs Remento</h2>
            <div className="text-sepia-600 space-y-4 max-w-reading">
              <p>
                <strong className="text-ink">Remento</strong> focuses on video recording — you
                record yourself on camera answering prompts, and it compiles these into a video
                legacy. It also offers basic transcription and book printing.
              </p>
              <p>
                While video is wonderful for capturing facial expressions and emotion, many people
                (especially older adults) feel uncomfortable on camera.{' '}
                <strong className="text-ink">Easy Memoir</strong> uses voice-only recording, which
                feels as natural as a phone call. Plus, our AI doesn't just transcribe — it actively
                writes polished, eloquent prose from your stories.
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
      <section className="py-16 sm:py-20 px-6 bg-cream border-t border-sepia-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-ink mb-4">
            Ready to Start Your Story?
          </h2>
          <p className="text-lg text-sepia-600 mb-8 max-w-xl mx-auto">
            Try Easy Memoir free — no credit card, no commitment. See how effortless it is to turn
            your memories into a beautiful book.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              iconRight={<IconArrowRight size={20} stroke={1.75} />}
            >
              Start Your Free Memoir
            </Button>
            <Button to="/sample" variant="secondary" size="lg">
              View Sample Book
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-parchment border-t border-sepia-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="font-display text-xl text-ink">
            Easy<span className="text-sepia-500">Memoir</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-sepia-600">
            <Link to="/how-it-works" className="hover:text-ink transition-colors">
              How It Works
            </Link>
            <Link to="/pricing" className="hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="hover:text-ink transition-colors">
              Blog
            </Link>
            <Link to="/faq" className="hover:text-ink transition-colors">
              FAQ
            </Link>
            <Link to="/about" className="hover:text-ink transition-colors">
              About
            </Link>
            <Link to="/terms" className="hover:text-ink transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">
              Privacy
            </Link>
          </div>
          <p className="text-xs text-sepia-500">&copy; {new Date().getFullYear()} Easy Memoir</p>
        </div>
      </footer>
    </div>
  )
}

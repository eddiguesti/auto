import { Link, useNavigate } from 'react-router-dom'
import {
  IconMicrophone,
  IconMessageCircle,
  IconFileText,
  IconPencil,
  IconPalette,
  IconBook2,
  IconFileDownload,
  IconPhoto,
  IconSparkles,
  IconArrowRight,
  IconBabyCarriage,
  IconHome,
  IconMusic,
  IconStar,
  IconBriefcase,
  IconSun
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Card } from '../../components/ui'

function StepMarker({ number, label }) {
  return (
    <div className="inline-flex items-center gap-3 mb-4">
      <span className="w-9 h-9 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center font-display text-lg">
        {number}
      </span>
      <span className="eyebrow">{label}</span>
    </div>
  )
}

function FeatureItem({ icon: Icon, title, description }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-sepia-100 text-sepia-600 flex items-center justify-center flex-shrink-0">
        <Icon size={20} stroke={1.75} />
      </div>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sepia-600 text-sm">{description}</p>
      </div>
    </li>
  )
}

const CHAPTERS = [
  { num: 1, title: 'Earliest Memories', desc: 'Ages 0-5', icon: IconBabyCarriage },
  { num: 2, title: 'Childhood', desc: 'Ages 6-12', icon: IconHome },
  { num: 3, title: 'School Days', desc: 'Education years', icon: IconBook2 },
  { num: 4, title: 'Teenage Years', desc: 'Coming of age', icon: IconMusic },
  { num: 5, title: 'Young Adulthood', desc: 'Starting out', icon: IconStar },
  { num: 6, title: 'Family & Career', desc: 'Building a life', icon: IconBriefcase },
  { num: 7, title: 'Wisdom & Reflections', desc: 'Looking back', icon: IconSun }
]

export default function HowItWorks() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-parchment page-enter">
      <SEO
        title="How It Works — Write Your Memoir in 3 Simple Steps"
        description="Discover how Easy Memoir transforms your spoken memories into a beautifully written autobiography. Just talk naturally, our AI writes your story, then print a real book. No writing skills needed."
        path="/how-it-works"
        jsonLd={[
          breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'How It Works' }]),
          {
            '@type': 'HowTo',
            name: 'How to Write Your Autobiography with Easy Memoir',
            description: 'Create your life story memoir in three simple steps using AI assistance',
            totalTime: 'PT30M',
            step: [
              {
                '@type': 'HowToStep',
                position: 1,
                name: 'Just Talk',
                text: 'Click record and chat naturally with our AI interviewer. It asks thoughtful questions about your life.'
              },
              {
                '@type': 'HowToStep',
                position: 2,
                name: 'We Write',
                text: 'AI transforms your spoken words into beautifully written prose while preserving your authentic voice.'
              },
              {
                '@type': 'HowToStep',
                position: 3,
                name: 'Share Forever',
                text: 'Download as PDF or order a professionally printed hardcover book your family will treasure.'
              }
            ]
          }
        ]}
      />
      {/* Header */}
      <nav className="bg-parchment/90 backdrop-blur-sm border-b border-sepia-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia-500">Memoir</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button size="sm" onClick={() => navigate('/home')}>
                My Stories
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-sepia-600 hover:text-ink transition-colors"
                >
                  Sign In
                </Link>
                <Button to="/register" size="sm">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-4">How It Works</p>
          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-6">How Easy Memoir Works</h1>
          <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
            Transform your memories into a beautifully written autobiography in three simple steps.
            No writing skills required.
          </p>
        </div>
      </section>

      {/* Step 1 */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <StepMarker number={1} label="Step One" />
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                Just Talk About Your Life
              </h2>
              <p className="text-lg text-sepia-600 mb-6">
                Start a voice conversation with our AI interviewer. It's like chatting with a caring
                friend who genuinely wants to hear your stories.
              </p>
              <ul className="space-y-4">
                <FeatureItem
                  icon={IconMicrophone}
                  title="Natural Voice Conversations"
                  description="Speak naturally - no typing required"
                />
                <FeatureItem
                  icon={IconMessageCircle}
                  title="Thoughtful Follow-up Questions"
                  description="AI asks questions that unlock forgotten memories"
                />
                <FeatureItem
                  icon={IconFileText}
                  title="Guided Prompts"
                  description="7 life chapters with 40+ thoughtful questions"
                />
              </ul>
            </div>
            <Card padding="lg" className="rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-sepia-100 text-sepia-700 flex items-center justify-center text-sm shrink-0">
                  AI
                </div>
                <div className="flex-1 bg-cream rounded-2xl p-4">
                  <p className="text-sepia-600">
                    Tell me about your childhood home. What do you remember most vividly?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end mb-6">
                <div className="bg-sepia-100 rounded-2xl p-4 max-w-[80%]">
                  <p className="text-ink">
                    Oh, the farmhouse on Maple Street! The kitchen always smelled like fresh
                    bread...
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center text-sm shrink-0">
                  You
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sepia-100 text-sepia-700 flex items-center justify-center text-sm shrink-0">
                  AI
                </div>
                <div className="flex-1 bg-cream rounded-2xl p-4">
                  <p className="text-sepia-600">
                    That sounds wonderful! Who baked the bread? Tell me more about them.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Card padding="lg" className="rounded-3xl">
                <div className="border-b border-sepia-100 pb-4 mb-6">
                  <p className="font-display text-2xl text-ink italic">
                    Chapter One: Early Memories
                  </p>
                </div>
                <div className="prose-memoir">
                  <p className="drop-cap">
                    I still remember the summer of 1962, the way sunlight filtered through
                    grandmother's lace curtains, casting delicate patterns on the worn wooden floor
                    of her kitchen.
                  </p>
                  <p>
                    The aroma of fresh bread would fill every corner of that old farmhouse on Maple
                    Street, mixing with the sweet scent of her rose garden just outside the window.
                  </p>
                  <p>
                    Those were the days when time moved slowly, when a single afternoon could
                    stretch into an entire adventure...
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-sepia-100 flex items-center gap-2 text-sm text-bronze-600">
                  <IconSparkles size={18} stroke={1.75} />
                  <span>Written in your authentic voice</span>
                </div>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <StepMarker number={2} label="Step Two" />
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                AI Writes Your Story
              </h2>
              <p className="text-lg text-sepia-600 mb-6">
                Our AI transforms your spoken words into beautifully written prose. It captures your
                unique voice, vocabulary, and personality - the final text sounds like you, not a
                robot.
              </p>
              <ul className="space-y-4">
                <FeatureItem
                  icon={IconPencil}
                  title="Preserves Your Voice"
                  description="AI mirrors your vocabulary and tone"
                />
                <FeatureItem
                  icon={IconPalette}
                  title="Adds Vivid Details"
                  description="Enriches your stories with sensory descriptions"
                />
                <FeatureItem
                  icon={IconBook2}
                  title="Professional Quality"
                  description="Polished prose ready for publication"
                />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <StepMarker number={3} label="Step Three" />
              <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
                Share Your Legacy Forever
              </h2>
              <p className="text-lg text-sepia-600 mb-6">
                Preview your complete autobiography, add photos, and choose how to share it.
                Download as a PDF or order a professionally printed book.
              </p>
              <ul className="space-y-4">
                <FeatureItem
                  icon={IconFileDownload}
                  title="Download as PDF"
                  description="Beautifully formatted, ready to print at home"
                />
                <FeatureItem
                  icon={IconBook2}
                  title="Order Printed Books"
                  description="Hardcover, paperback, or spiral-bound options"
                />
                <FeatureItem
                  icon={IconPhoto}
                  title="Include Photos"
                  description="Add images to bring your stories to life"
                />
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card padding="md" className="rounded-3xl">
                <div className="aspect-[3/4] bg-cream rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="font-display text-lg text-ink italic">My Life Story</p>
                    <p className="text-sm text-sepia-500 mt-2">A Memoir</p>
                    <div className="w-16 h-px bg-sepia-200 mx-auto mt-4" />
                    <p className="text-xs text-sepia-500 mt-4">by Margaret Thompson</p>
                  </div>
                </div>
                <p className="text-center text-xs text-sepia-500 mt-3">Hardcover</p>
              </Card>
              <Card padding="md" className="rounded-3xl mt-8">
                <div className="aspect-[3/4] bg-cream rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="font-display text-lg text-ink italic">Memories</p>
                    <p className="text-sm text-sepia-500 mt-2">of a Lifetime</p>
                    <div className="w-16 h-px bg-sepia-200 mx-auto mt-4" />
                    <p className="text-xs text-sepia-500 mt-4">by John Williams</p>
                  </div>
                </div>
                <p className="text-center text-xs text-sepia-500 mt-3">Paperback</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The 7 Chapters */}
      <section className="py-16 sm:py-20 px-6 bg-ink text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl mb-4">The 7 Life Chapters</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Your autobiography is organized into seven meaningful chapters, each with thoughtful
              prompts to guide you through every stage of your life.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CHAPTERS.map(chapter => {
              const Icon = chapter.icon
              return (
                <div key={chapter.num} className="bg-white/10 rounded-2xl p-6">
                  <Icon size={28} stroke={1.5} className="text-white/80 mb-3" />
                  <p className="font-display text-xl text-white mb-1">{chapter.title}</p>
                  <p className="text-sm text-white/60">{chapter.desc}</p>
                </div>
              )
            })}
            <div className="bg-bronze-500/25 rounded-2xl p-6 flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-2xl text-bronze-200">40+</p>
                <p className="text-sm text-white/70">Guided Questions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-6">
            Ready to Start Your Story?
          </h2>
          <p className="text-lg text-sepia-600 mb-8">
            Join thousands of people preserving their memories for future generations. Free to
            start, no credit card required.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(user ? '/voice' : '/register')}
            iconRight={<IconArrowRight size={20} stroke={1.75} />}
          >
            {user ? 'Continue Your Memoir' : 'Start Your Free Memoir'}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-sepia-200 bg-parchment">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl text-ink">
            Easy<span className="text-sepia-500">Memoir</span>
          </Link>
          <div className="flex gap-6 text-sm text-sepia-600">
            <Link to="/privacy" className="hover:text-ink transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="hover:text-ink transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

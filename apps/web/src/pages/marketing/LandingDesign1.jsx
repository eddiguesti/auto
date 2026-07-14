import { useNavigate } from 'react-router-dom'
import {
  IconMessageCircle,
  IconBulb,
  IconSparkles,
  IconBook2,
  IconMicrophone,
  IconPencil,
  IconArrowRight,
  IconChevronRight
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import HowItWorksCarousel from '../../components/HowItWorksCarousel'
import SEO from '../../components/SEO'
import HeroSection from '../../components/marketing/HeroSection'
import TestimonialSection from '../../components/marketing/TestimonialSection'
import PricingSection from '../../components/marketing/PricingSection'
import CTASection from '../../components/marketing/CTASection'
import FooterSection from '../../components/marketing/FooterSection'
import StickyCTA from '../../components/marketing/StickyCTA'
import { Button, Card, Badge } from '../../components/ui'

/**
 * DESIGN 1: "Warm Heritage" — restyled to the Keepsake design system.
 *
 * Palette: parchment/cream surfaces, ink text, sepia secondary text,
 * bronze as the single accent. All colors come from the system tokens.
 */

export default function LandingDesign1() {
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
    <div className="min-h-screen bg-parchment">
      <SEO
        title="Write Your Life Story with AI | Autobiography Made Simple"
        description="Transform your memories into a beautifully written autobiography. Just talk naturally — our AI listens, asks thoughtful questions, and creates a professionally written memoir your family will treasure for generations. Free to start."
        path="/"
      />

      <NavigationBar user={user} navigate={navigate} />
      <HeroSection user={user} onGetStarted={handleGetStarted} />
      <ValuePropositionBanner />
      <HowItWorksCarousel />
      <FeaturesSection />
      <MemoryMapSection />
      <ChooseStyleSection onModeSelect={handleModeSelect} />
      <PricingSection onGetStarted={handleGetStarted} />
      <TestimonialSection />
      <CTASection user={user} onGetStarted={handleGetStarted} />
      <FooterSection />
      <StickyCTA />
    </div>
  )
}

/* ---------- Inline sub-components (page-specific) ---------- */

function NavigationBar({ user, navigate }) {
  return (
    <nav className="fixed top-0 w-full bg-parchment/90 backdrop-blur-md z-50 border-b border-sepia-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="font-display text-2xl text-ink tracking-wide">
          Easy<span className="text-sepia-500">Memoir</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {user ? (
            <>
              <span className="text-sepia-600 text-sm hidden sm:inline">Welcome, {user.name}</span>
              <Button size="sm" onClick={() => navigate('/home')}>
                My Stories
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-sepia-600 hover:text-ink transition-colors"
              >
                Sign In
              </button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Start Free
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function ValuePropositionBanner() {
  return (
    <section className="bg-cream py-6 border-y border-sepia-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <Card className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-6 py-4">
          <div className="w-11 h-11 bg-bronze-100 text-bronze-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <IconMessageCircle size={24} stroke={1.5} />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-lg sm:text-xl text-ink">
              Designed to <span className="italic text-bronze-600">get you talking</span>
            </p>
            <p className="text-sm text-sepia-600">
              No writing needed — Just have a conversation with Clio
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    title: 'Conversational & Natural',
    icon: IconMessageCircle,
    description:
      'No awkward interviews or blank pages. Clio feels like talking to someone who genuinely wants to hear your stories.'
  },
  {
    title: 'Memories Unlocked',
    icon: IconBulb,
    description:
      "Thoughtful follow-up questions help you remember details you haven't thought about in years."
  },
  {
    title: 'Beautiful Writing',
    icon: IconSparkles,
    description:
      'Your stories, transformed into eloquent prose that captures your authentic voice and personality.'
  },
  {
    title: 'Print-Ready Books',
    icon: IconBook2,
    description:
      'Order professionally printed hardcover books—the perfect gift for children, grandchildren, and future generations.'
  }
]

function SectionHeader({ label, title, subtitle, className = 'text-center mb-16' }) {
  return (
    <div className={className}>
      <p className="eyebrow mb-4">{label}</p>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink mb-6">{title}</h2>
      {subtitle && <p className="text-lg text-sepia-600 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  )
}

function FeaturesSection() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="text-center lg:text-left">
            <SectionHeader
              label="Why Choose Easy Memoir"
              title={
                <>
                  More than software—
                  <br />
                  <span className="italic text-bronze-600">a legacy tool</span>
                </>
              }
              className="text-center lg:text-left mb-8"
            />
            <div className="space-y-8">
              {FEATURES.map(feature => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="flex gap-5 text-left">
                    <div className="w-11 h-11 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={24} stroke={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-ink mb-2">{feature.title}</h3>
                      <p className="text-sepia-600 text-base">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feature Visual - Chat Demo */}
          <ChatDemoVisual />
        </div>
      </div>
    </section>
  )
}

function ChatDemoVisual() {
  return (
    <Card padding="lg" className="rounded-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3.5 h-3.5 rounded-full bg-sepia-200" />
        <div className="w-3.5 h-3.5 rounded-full bg-sepia-300" />
        <div className="w-3.5 h-3.5 rounded-full bg-bronze-300" />
      </div>
      <div className="space-y-5">
        <ChatBubble speaker="clio">
          Tell me about your childhood home. What do you remember most vividly?
        </ChatBubble>
        <ChatBubble speaker="user">
          Oh, the old farmhouse on Maple Street! I remember the creaky stairs and how the kitchen
          always smelled like fresh bread...
        </ChatBubble>
        <ChatBubble speaker="clio">
          That sounds wonderful. Who baked the bread? Tell me more about them.
        </ChatBubble>
      </div>
    </Card>
  )
}

function ChatBubble({ speaker, children }) {
  if (speaker === 'clio') {
    return (
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-sepia-100 flex items-center justify-center text-sm font-medium text-sepia-700 flex-shrink-0">
          C
        </div>
        <div className="bg-cream rounded-2xl rounded-tl-none p-4 max-w-[80%]">
          <p className="text-base text-sepia-600">{children}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 justify-end">
      <div className="bg-sepia-100 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
        <p className="text-base text-ink">{children}</p>
      </div>
    </div>
  )
}

const MEMORY_TAGS = [
  { label: 'Father', variant: 'neutral' },
  { label: 'Birmingham', variant: 'success' },
  { label: 'Uncle Joe', variant: 'bronze' },
  { label: 'Ford Factory', variant: 'info' }
]

function MemoryMapSection() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-parchment">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          label="Intelligent Connections"
          title={
            <>
              Your memories, <span className="italic text-bronze-600">beautifully connected</span>
            </>
          }
          subtitle="As you share your stories, Clio automatically identifies the people, places, and events in your life—building a rich map of your memories."
        />
        <Card padding="lg" className="rounded-3xl sm:p-12">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <MemoryMapStep
              icon={IconMessageCircle}
              title="You Share"
              description={'"My father worked at the Ford factory in Birmingham with Uncle Joe..."'}
            />
            <FlowArrow />
            <MemoryMapStep icon={IconBulb} title="Clio Understands" tags={MEMORY_TAGS} />
          </div>
          <div className="mt-10 bg-sepia-50 rounded-2xl p-6 text-center border border-sepia-100">
            <p className="text-sepia-600 text-base">
              <span className="text-ink font-medium">
                The more you share, the smarter Clio gets.
              </span>{' '}
              Clio remembers everyone you mention—so when you talk about Dad later, she already
              knows he worked at Ford with Uncle Joe.
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

function FlowArrow() {
  return (
    <div className="hidden md:flex justify-center">
      <div className="flex items-center gap-2">
        <div className="w-16 h-px bg-sepia-200" />
        <IconArrowRight size={24} stroke={1.75} className="text-sepia-500" />
      </div>
    </div>
  )
}

function MemoryMapStep({ icon: Icon, title, description, tags }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} stroke={1.5} />
      </div>
      <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
      {description && <p className="text-sm text-sepia-600">{description}</p>}
      {tags && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {tags.map(tag => (
            <Badge key={tag.label} variant={tag.variant}>
              {tag.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function ChooseStyleSection({ onModeSelect }) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-cream">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          label="Your Choice"
          title={
            <>
              Talk or type—<span className="italic text-bronze-600">you decide</span>
            </>
          }
          subtitle="Choose the way that feels most natural to you."
        />

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
          <StyleCard
            mode="voice"
            recommended
            title="Voice Interview"
            description="Just talk naturally. Clio listens, asks follow-up questions, and captures every detail of your stories."
            actionLabel="Start talking"
            onSelect={onModeSelect}
            icon={IconMicrophone}
          />
          <StyleCard
            mode="type"
            title="Written Memoir"
            description="Prefer typing? Answer guided questions at your own pace. Clio helps expand your notes into beautiful prose."
            actionLabel="Start writing"
            onSelect={onModeSelect}
            icon={IconPencil}
          />
        </div>
      </div>
    </section>
  )
}

function StyleCard({
  mode,
  recommended = false,
  title,
  description,
  actionLabel,
  onSelect,
  icon: Icon
}) {
  const cardClass = recommended
    ? 'group bg-bronze-50 rounded-3xl p-8 border-2 border-bronze-300 card-hover text-left w-full cursor-pointer shadow-soft'
    : 'group bg-surface rounded-3xl p-8 border-2 border-sepia-200/70 hover:border-sepia-300 card-hover text-left w-full cursor-pointer shadow-soft'

  return (
    <button type="button" onClick={() => onSelect(mode)} className={cardClass}>
      {recommended ? (
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="bronze">Recommended</Badge>
        </div>
      ) : (
        <div className="h-6 mb-6" />
      )}
      <div
        className={`w-14 h-14 rounded-2xl ${
          recommended ? 'bg-bronze-100 text-bronze-700' : 'bg-sepia-100 text-sepia-600'
        } flex items-center justify-center mb-6`}
      >
        <Icon size={28} stroke={1.5} />
      </div>
      <h3 className="font-display text-2xl text-ink mb-3">{title}</h3>
      <p className="text-sepia-600 mb-6 text-base">{description}</p>
      <span className="text-bronze-600 text-sm flex items-center gap-1.5 font-medium">
        {actionLabel}
        <IconChevronRight
          size={16}
          stroke={2}
          className="group-hover:translate-x-1 transition-transform"
        />
      </span>
    </button>
  )
}

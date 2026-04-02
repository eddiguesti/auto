import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import HowItWorksCarousel from '../../components/HowItWorksCarousel'
import SEO from '../../components/SEO'
import HeroSection from '../../components/marketing/HeroSection'
import TestimonialSection from '../../components/marketing/TestimonialSection'
import PricingSection from '../../components/marketing/PricingSection'
import CTASection from '../../components/marketing/CTASection'
import FooterSection from '../../components/marketing/FooterSection'
import StickyCTA from '../../components/marketing/StickyCTA'

/**
 * DESIGN 1: "Warm Heritage"
 *
 * Color Palette (optimized for seniors & memoir audience):
 * - Background: Warm cream (#FBF7F2) - reduces eye strain
 * - Text: Warm charcoal (#3D3833) - high contrast, softer than black
 * - CTA: Terracotta (#D97853) - warm, visible to aging eyes, high conversion
 * - Accents: Sepia tones (#9C7B5C) - nostalgic, trustworthy
 * - Success: Sage green (#7A9B76)
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
    <div className="min-h-screen bg-heritage-cream">
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
    <nav className="fixed top-0 w-full bg-heritage-cream/95 backdrop-blur-md z-50 border-b border-heritage-sepia-light/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="font-display text-2xl text-heritage-ink tracking-wide">
          Easy<span className="text-heritage-sepia">Memoir</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {user ? (
            <>
              <span className="text-heritage-text text-sm font-sans hidden sm:inline">
                Welcome, {user.name}
              </span>
              <button
                onClick={() => navigate('/home')}
                className="font-sans text-sm bg-heritage-sepia text-white px-5 py-2.5 rounded-full hover:bg-heritage-sepia-dark transition-colors"
              >
                My Stories
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="font-sans text-sm bg-heritage-cta text-white px-5 py-2.5 rounded-full hover:bg-heritage-cta-hover transition-colors shadow-md shadow-heritage-cta/20"
              >
                Start Free
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function ValuePropositionBanner() {
  return (
    <section className="bg-gradient-to-r from-heritage-sepia-light/30 via-heritage-sepia-light/20 to-heritage-sepia-light/30 py-6 border-y border-heritage-sepia-light/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-heritage-card px-6 py-4 rounded-2xl shadow-sm border border-heritage-sepia-light/30">
          <div className="w-12 h-12 bg-heritage-sepia rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-lg sm:text-xl text-heritage-ink">
              Designed to <span className="italic text-heritage-sepia">get you talking</span>
            </p>
            <p className="font-sans text-sm text-heritage-text">
              No writing needed — Just have a conversation with Clio
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const ICON_CHAT =
  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
const ICON_BULB =
  'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
const ICON_SPARKLE =
  'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
const ICON_BOOK =
  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'

const FEATURES = [
  {
    title: 'Conversational & Natural',
    icon: ICON_CHAT,
    description:
      'No awkward interviews or blank pages. Clio feels like talking to someone who genuinely wants to hear your stories.'
  },
  {
    title: 'Memories Unlocked',
    icon: ICON_BULB,
    description:
      "Thoughtful follow-up questions help you remember details you haven't thought about in years."
  },
  {
    title: 'Beautiful Writing',
    icon: ICON_SPARKLE,
    description:
      'Your stories, transformed into eloquent prose that captures your authentic voice and personality.'
  },
  {
    title: 'Print-Ready Books',
    icon: ICON_BOOK,
    description:
      'Order professionally printed hardcover books\u2014the perfect gift for children, grandchildren, and future generations.'
  }
]

function SectionHeader({ label, title, subtitle, className = 'text-center mb-16' }) {
  return (
    <div className={className}>
      <p className="font-sans text-heritage-sepia uppercase tracking-[0.25em] text-xs sm:text-sm mb-4 font-medium">
        {label}
      </p>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-heritage-ink mb-6 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="font-serif text-lg sm:text-xl text-heritage-text max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function FeaturesSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-heritage-card">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="text-center lg:text-left">
            <SectionHeader
              label="Why Choose Easy Memoir"
              title={
                <>
                  More than software—
                  <br />
                  <span className="italic text-heritage-sepia">a legacy tool</span>
                </>
              }
              className="text-center lg:text-left mb-8"
            />
            <div className="space-y-8">
              {FEATURES.map(feature => (
                <div key={feature.title} className="flex gap-5 text-left">
                  <div className="w-12 h-12 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-heritage-sepia"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={feature.icon}
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">{feature.title}</h3>
                    <p className="font-serif text-heritage-text text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
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
    <div className="relative">
      <div className="bg-heritage-cream rounded-3xl p-8 shadow-lg border border-heritage-sepia-light/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3.5 h-3.5 rounded-full bg-red-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-green-400" />
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
      </div>
    </div>
  )
}

function ChatBubble({ speaker, children }) {
  if (speaker === 'clio') {
    return (
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-heritage-sepia/20 flex items-center justify-center text-sm font-medium text-heritage-sepia flex-shrink-0">
          C
        </div>
        <div className="bg-heritage-card rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-heritage-sepia-light/20">
          <p className="font-serif text-base text-heritage-text">{children}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 justify-end">
      <div className="bg-heritage-sepia-light/30 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
        <p className="font-serif text-base text-heritage-ink">{children}</p>
      </div>
    </div>
  )
}

const TAG_BASE = 'text-sm px-3 py-1 rounded-full font-sans'
const MEMORY_TAGS = [
  { label: 'Father', className: `${TAG_BASE} bg-blue-100 text-blue-800` },
  { label: 'Birmingham', className: `${TAG_BASE} bg-heritage-sage-light text-green-800` },
  { label: 'Uncle Joe', className: `${TAG_BASE} bg-purple-100 text-purple-800` },
  { label: 'Ford Factory', className: `${TAG_BASE} bg-orange-100 text-orange-800` }
]

function MemoryMapSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-heritage-card to-heritage-cream">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          label="Intelligent Connections"
          title={
            <>
              Your memories,{' '}
              <span className="italic text-heritage-sepia">beautifully connected</span>
            </>
          }
          subtitle="As you share your stories, Clio automatically identifies the people, places, and events in your life—building a rich map of your memories."
        />
        <div className="relative bg-heritage-card rounded-3xl p-8 sm:p-12 shadow-xl border border-heritage-sepia-light/20">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <MemoryMapStep
              icon={ICON_CHAT}
              title="You Share"
              description={'"My father worked at the Ford factory in Birmingham with Uncle Joe..."'}
            />
            <FlowArrow />
            <MemoryMapStep icon={ICON_BULB} title="Clio Understands" tags={MEMORY_TAGS} />
          </div>
          <div className="mt-10 bg-heritage-sepia-light/20 rounded-2xl p-6 text-center border border-heritage-sepia-light/30">
            <p className="font-serif text-heritage-text text-base">
              <span className="text-heritage-ink font-medium">
                The more you share, the smarter Clio gets.
              </span>{' '}
              Clio remembers everyone you mention—so when you talk about Dad later, she already
              knows he worked at Ford with Uncle Joe.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FlowArrow() {
  return (
    <div className="hidden md:flex justify-center">
      <div className="flex items-center gap-2 text-heritage-sepia-light">
        <div className="w-16 h-0.5 bg-heritage-sepia-light" />
        <svg className="w-6 h-6 text-heritage-sepia" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      </div>
    </div>
  )
}

function MemoryMapStep({ icon, title, description, tags }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-heritage-sepia-light/40 flex items-center justify-center mx-auto mb-4 border-2 border-heritage-sepia-light">
        <svg
          className="w-8 h-8 text-heritage-sepia"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
      <h3 className="font-display text-xl text-heritage-ink mb-2">{title}</h3>
      {description && <p className="font-serif text-sm text-heritage-text">{description}</p>}
      {tags && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {tags.map(tag => (
            <span key={tag.label} className={tag.className}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ChooseStyleSection({ onModeSelect }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          label="Your Choice"
          title={
            <>
              Talk or type—<span className="italic text-heritage-sepia">you decide</span>
            </>
          }
          subtitle="Choose the way that feels most natural to you."
        />

        <div className="grid sm:grid-cols-2 gap-8">
          <StyleCard
            mode="voice"
            recommended
            title="Voice Interview"
            description="Just talk naturally. Clio listens, asks follow-up questions, and captures every detail of your stories."
            actionLabel="Start talking"
            onSelect={onModeSelect}
            icon={<VoiceIcon />}
          />
          <StyleCard
            mode="type"
            title="Written Memoir"
            description="Prefer typing? Answer guided questions at your own pace. Clio helps expand your notes into beautiful prose."
            actionLabel="Start writing"
            onSelect={onModeSelect}
            icon={<WriteIcon />}
          />
        </div>
      </div>
    </section>
  )
}

function StyleCard({ mode, recommended = false, title, description, actionLabel, onSelect, icon }) {
  const cardClass = recommended
    ? 'group bg-heritage-card rounded-3xl p-8 border-2 border-heritage-sepia-light hover:border-heritage-cta hover:shadow-xl transition-all text-left'
    : 'group bg-heritage-card rounded-3xl p-8 border border-heritage-sepia-light/50 hover:border-heritage-sepia hover:shadow-xl transition-all text-left'

  const labelClass = recommended
    ? 'font-sans text-heritage-cta text-sm flex items-center gap-2 font-medium'
    : 'font-sans text-heritage-text text-sm flex items-center gap-2 group-hover:text-heritage-sepia transition-colors'

  return (
    <button onClick={() => onSelect(mode)} className={cardClass}>
      {recommended ? (
        <div className="flex items-center gap-2 mb-6">
          <span className="font-sans text-sm bg-heritage-cta text-white px-4 py-1.5 rounded-full font-medium">
            Recommended
          </span>
        </div>
      ) : (
        <div className="h-9 mb-6" />
      )}
      <div
        className={`w-16 h-16 rounded-full ${recommended ? 'bg-heritage-sepia-light/40 group-hover:bg-heritage-cta' : 'bg-heritage-sepia-light/40 group-hover:bg-heritage-sepia/20'} flex items-center justify-center mb-6 transition-colors`}
      >
        {icon}
      </div>
      <h3
        className={`font-display text-2xl text-heritage-ink mb-3 ${recommended ? 'group-hover:text-heritage-cta' : 'group-hover:text-heritage-sepia'} transition-colors`}
      >
        {title}
      </h3>
      <p className="font-serif text-heritage-text mb-6 text-base leading-relaxed">{description}</p>
      <span className={labelClass}>
        {actionLabel}
        <svg
          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

function VoiceIcon() {
  return (
    <svg
      className="w-8 h-8 text-heritage-sepia group-hover:text-white transition-colors"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function WriteIcon() {
  return (
    <svg
      className="w-8 h-8 text-heritage-sepia"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

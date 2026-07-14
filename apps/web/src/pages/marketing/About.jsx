import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  IconHeart,
  IconSparkles,
  IconDiamond,
  IconLock,
  IconCamera,
  IconBuildingCastle,
  IconMapPin,
  IconArrowRight
} from '@tabler/icons-react'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Card } from '../../components/ui'

export default function About() {
  const [isVisible, setIsVisible] = useState({})
  const sectionRefs = useRef({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.2 }
    )

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  const team = [
    {
      name: 'Sarah Mitchell',
      role: 'Founder & CEO',
      bio: "After losing her grandmother, Sarah wished she'd recorded her stories. That regret became Easy Memoir.",
      image: null
    },
    {
      name: 'Dr. James Chen',
      role: 'Head of AI',
      bio: '15 years in NLP, James ensures our AI captures the nuance and emotion in every story.',
      image: null
    },
    {
      name: 'Emma Thompson',
      role: 'Head of Design',
      bio: 'Former book designer at Penguin, Emma crafts the beautiful layouts that bring stories to life.',
      image: null
    },
    {
      name: "Michael O'Brien",
      role: 'Customer Success',
      bio: 'Michael ensures every family has a magical experience preserving their memories.',
      image: null
    }
  ]

  const values = [
    {
      title: 'Every story matters',
      description:
        "Whether you're a war hero or a stay-at-home parent, your story deserves to be told and treasured.",
      icon: IconHeart
    },
    {
      title: 'Simplicity first',
      description:
        'Technology should fade into the background. We make recording memories as easy as having a conversation.',
      icon: IconSparkles
    },
    {
      title: 'Quality that lasts',
      description:
        'From our AI writing to our printed books, we never compromise on quality. These are heirlooms.',
      icon: IconDiamond
    },
    {
      title: 'Privacy is sacred',
      description:
        'Your stories are yours alone. We never sell data, never train AI on your content, never compromise your trust.',
      icon: IconLock
    }
  ]

  const timeline = [
    {
      year: '2022',
      event: 'Founded in Edinburgh',
      description: "Sarah's grandmother passes, inspiring the mission"
    },
    {
      year: '2023',
      event: 'First 1,000 memoirs',
      description: 'Families across the UK embrace Easy Memoir'
    },
    {
      year: '2024',
      event: 'Print partnership',
      description: 'Launch premium hardcover book printing'
    },
    { year: '2025', event: '50,000 stories', description: 'Growing community of storytellers' },
    {
      year: '2026',
      event: 'AI breakthrough',
      description: 'Clio becomes more conversational than ever'
    }
  ]

  return (
    <div className="min-h-screen bg-parchment page-enter">
      <SEO
        title="About Us — Our Mission to Preserve Life Stories"
        description="Easy Memoir was founded to help everyone preserve their life story. Learn about our mission, our team, and why we believe every life story deserves to be told and treasured by future generations."
        path="/about"
        jsonLd={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'About' }])]}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-parchment/90 backdrop-blur-sm border-b border-sepia-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link to="/faq" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              FAQ
            </Link>
            <Button to="/register" size="sm">
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 sm:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-4">Our Story</p>

          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            Preserving memories, one story at a time
          </h1>

          <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
            We believe every life is a story worth telling. Easy Memoir exists to help families
            capture, preserve, and share the memories that matter most.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section
        id="mission"
        ref={el => (sectionRefs.current.mission = el)}
        className="py-16 sm:py-20 px-6 bg-ink"
      >
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ${
            isVisible.mission ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <blockquote className="font-display text-3xl sm:text-4xl text-white mb-8">
            &ldquo;The stories we don&rsquo;t tell are the ones that are lost forever.&rdquo;
          </blockquote>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Every day, precious memories fade. Voices we love fall silent. At Easy Memoir, we're on
            a mission to ensure no story goes untold. We make it simple for anyone—regardless of age
            or technical ability—to capture their life story and share it with the people who matter
            most.
          </p>
        </div>
      </section>

      {/* The Origin Story */}
      <section
        id="origin"
        ref={el => (sectionRefs.current.origin = el)}
        className="py-16 sm:py-20 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              className={`transition-all duration-700 ${
                isVisible.origin ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <p className="eyebrow mb-4">The Beginning</p>
              <h2 className="font-display text-4xl text-ink mb-6">Born from a regret</h2>
              <div className="space-y-4 text-lg text-sepia-600">
                <p>
                  In 2022, our founder Sarah lost her grandmother Margaret. She was 94, had lived
                  through the Blitz, raised five children, and had a thousand stories to tell.
                </p>
                <p>
                  But in the busy rush of modern life, Sarah never sat down to record them. When
                  Margaret passed, those stories went with her.
                </p>
                <p>
                  That regret became Easy Memoir. Sarah assembled a team of AI experts, designers,
                  and storytellers with one goal: make it effortless for anyone to preserve their
                  memories before it's too late.
                </p>
                <p className="text-ink font-medium">
                  Today, we've helped over 50,000 families capture their stories—and we're just
                  getting started.
                </p>
              </div>
            </div>

            <div
              className={`transition-all duration-700 delay-150 ${
                isVisible.origin ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Card padding="lg" className="rounded-3xl">
                <div className="aspect-[4/3] bg-cream rounded-2xl flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-sepia-100 text-sepia-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconCamera size={32} stroke={1.5} />
                    </div>
                    <p className="text-sm text-sepia-600">Margaret, 1928-2022</p>
                  </div>
                </div>
                <p className="font-serif text-ink-soft italic text-center">
                  &ldquo;She had stories of dancing through air raids, of rationing and resilience,
                  of love letters during wartime. Stories we'll never hear.&rdquo;
                </p>
                <p className="text-sm text-sepia-500 text-center mt-4">— Sarah, Founder</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        id="values"
        ref={el => (sectionRefs.current.values = el)}
        className="py-16 sm:py-20 px-6 bg-cream"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">What Drives Us</p>
            <h2 className="font-display text-4xl text-ink">Our values</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Card
                  key={index}
                  padding="lg"
                  className={`transition-all duration-700 ${
                    isVisible.values ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} stroke={1.5} />
                  </div>
                  <h3 className="font-display text-xl text-ink mb-3">{value.title}</h3>
                  <p className="text-sepia-600">{value.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section
        id="timeline"
        ref={el => (sectionRefs.current.timeline = el)}
        className="py-16 sm:py-20 px-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Our Journey</p>
            <h2 className="font-display text-4xl text-ink">Milestones along the way</h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-sepia-200 hidden md:block" />

            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`relative flex items-start gap-8 transition-all duration-700 ${
                    isVisible.timeline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Year marker */}
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-surface border border-sepia-200 items-center justify-center flex-shrink-0 z-10">
                    <span className="text-sm font-semibold text-bronze-600">{item.year}</span>
                  </div>

                  {/* Content */}
                  <Card className="flex-1">
                    <div className="md:hidden mb-2">
                      <span className="text-sm font-semibold text-bronze-600">{item.year}</span>
                    </div>
                    <h3 className="font-display text-xl text-ink mb-2">{item.event}</h3>
                    <p className="text-sepia-600">{item.description}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section
        id="team"
        ref={el => (sectionRefs.current.team = el)}
        className="py-16 sm:py-20 px-6 bg-cream"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">The People</p>
            <h2 className="font-display text-4xl text-ink mb-4">Meet the team</h2>
            <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
              A small but mighty team dedicated to preserving the world's stories.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className={`text-center transition-all duration-700 ${
                  isVisible.team ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-sepia-100 flex items-center justify-center overflow-hidden">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-3xl text-sepia-500">
                      {member.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl text-ink mb-1">{member.name}</h3>
                <p className="text-sm text-bronze-600 mb-3">{member.role}</p>
                <p className="text-sm text-sepia-600">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sepia-100 mb-6">
            <IconMapPin size={16} stroke={1.75} className="text-sepia-600" />
            <p className="eyebrow">Made in Britain</p>
          </div>

          <h2 className="font-display text-4xl text-ink mb-4">Proudly based in Edinburgh</h2>
          <p className="text-lg text-sepia-600 max-w-2xl mx-auto mb-10">
            Our team works from the historic heart of Scotland, surrounded by centuries of
            storytelling tradition. Your data stays in the UK, protected by strong privacy laws.
          </p>

          <Card padding="lg" className="rounded-3xl">
            <div className="aspect-video bg-cream rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <IconBuildingCastle
                  size={48}
                  stroke={1.5}
                  className="text-sepia-400 mx-auto mb-4"
                />
                <p className="text-sepia-600">Edinburgh, Scotland</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-6 bg-cream border-t border-sepia-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            Ready to preserve your story?
          </h2>
          <p className="text-lg text-sepia-600 mb-10">
            Join 50,000+ families who've already captured their precious memories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button to="/register" size="lg" iconRight={<IconArrowRight size={20} stroke={1.75} />}>
              Write My First Chapter — Free
            </Button>
            <Button to="/gift" variant="secondary" size="lg">
              Gift a Memoir
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

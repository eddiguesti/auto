import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

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
      icon: '❤️'
    },
    {
      title: 'Simplicity first',
      description:
        'Technology should fade into the background. We make recording memories as easy as having a conversation.',
      icon: '✨'
    },
    {
      title: 'Quality that lasts',
      description:
        'From our AI writing to our printed books, we never compromise on quality. These are heirlooms.',
      icon: '💎'
    },
    {
      title: 'Privacy is sacred',
      description:
        'Your stories are yours alone. We never sell data, never train AI on your content, never compromise your trust.',
      icon: '🔒'
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
    <div className="min-h-screen bg-heritage-cream overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-cream/95 backdrop-blur-sm border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-heritage-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/faq"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              FAQ
            </Link>
            <Link
              to="/register"
              className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 -left-20 w-80 h-80 bg-heritage-cta/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-heritage-sepia/5 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-sepia-light/30 border border-heritage-sepia-light/50 mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-heritage-cta animate-pulse" />
            <p className="font-sans uppercase tracking-[0.3em] text-xs text-heritage-sepia">
              Our Story
            </p>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-heritage-ink mb-8 leading-tight animate-slide-up">
            Preserving memories,{' '}
            <span className="relative inline-block">
              <span className="relative z-10">one story at a time</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path
                  d="M2 10C50 4 150 4 298 10"
                  stroke="#D97853"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="animate-draw"
                />
              </svg>
            </span>
          </h1>

          <p className="font-serif text-xl text-heritage-text max-w-2xl mx-auto animate-slide-up animation-delay-200">
            We believe every life is a story worth telling. Easy Memoir exists to help families
            capture, preserve, and share the memories that matter most.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section
        id="mission"
        ref={el => (sectionRefs.current.mission = el)}
        className="py-24 px-6 bg-heritage-ink relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-heritage-cta rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div
          className={`max-w-4xl mx-auto text-center relative z-10 transition-all duration-1000 ${
            isVisible.mission ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <blockquote className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-relaxed mb-8">
            "The stories we don't tell are the ones that are lost forever."
          </blockquote>
          <p className="font-serif text-lg text-white/70 max-w-2xl mx-auto">
            Every day, precious memories fade. Voices we love fall silent. At Easy Memoir, we're on
            a mission to ensure no story goes untold. We make it simple for anyone—regardless of age
            or technical ability—to capture their life story and share it with the people who matter
            most.
          </p>
        </div>
      </section>

      {/* The Origin Story */}
      <section id="origin" ref={el => (sectionRefs.current.origin = el)} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              className={`transition-all duration-1000 ${
                isVisible.origin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
              }`}
            >
              <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
                The Beginning
              </p>
              <h2 className="font-display text-4xl text-heritage-ink mb-6">Born from a regret</h2>
              <div className="space-y-4 font-serif text-lg text-heritage-text leading-relaxed">
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
                <p className="text-heritage-cta font-medium">
                  Today, we've helped over 50,000 families capture their stories—and we're just
                  getting started.
                </p>
              </div>
            </div>

            <div
              className={`relative transition-all duration-1000 delay-300 ${
                isVisible.origin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              }`}
            >
              <div className="bg-heritage-card rounded-3xl p-8 shadow-xl border border-heritage-sepia-light/30 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="aspect-[4/3] bg-heritage-sepia-light/20 rounded-2xl flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-heritage-sepia/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📷</span>
                    </div>
                    <p className="font-sans text-sm text-heritage-text">Margaret, 1928-2022</p>
                  </div>
                </div>
                <p className="font-serif text-heritage-text italic text-center">
                  "She had stories of dancing through air raids, of rationing and resilience, of
                  love letters during wartime. Stories we'll never hear."
                </p>
                <p className="font-sans text-sm text-heritage-sepia text-center mt-4">
                  — Sarah, Founder
                </p>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-heritage-cta/10 rounded-full blur-xl" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-heritage-sepia/10 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        id="values"
        ref={el => (sectionRefs.current.values = el)}
        className="py-24 px-6 bg-gradient-to-b from-heritage-card to-heritage-cream"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              What Drives Us
            </p>
            <h2 className="font-display text-4xl text-heritage-ink">Our values</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className={`bg-white rounded-3xl p-8 shadow-lg border border-heritage-sepia-light/20 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                  isVisible.values ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <span className="text-4xl mb-4 block">{value.icon}</span>
                <h3 className="font-display text-xl text-heritage-ink mb-3">{value.title}</h3>
                <p className="font-serif text-heritage-text leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" ref={el => (sectionRefs.current.timeline = el)} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              Our Journey
            </p>
            <h2 className="font-display text-4xl text-heritage-ink">Milestones along the way</h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-heritage-sepia-light/50 hidden md:block" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`relative flex items-start gap-8 ${
                    isVisible.timeline ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms`, transition: 'all 0.8s ease-out' }}
                >
                  {/* Year bubble */}
                  <div className="hidden md:flex w-16 h-16 rounded-full bg-heritage-cta text-white items-center justify-center flex-shrink-0 shadow-lg z-10">
                    <span className="font-sans text-sm font-bold">{item.year}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-heritage-card rounded-2xl p-6 border border-heritage-sepia-light/30 hover:shadow-lg transition-all duration-300">
                    <div className="md:hidden mb-2">
                      <span className="font-sans text-sm font-bold text-heritage-cta">
                        {item.year}
                      </span>
                    </div>
                    <h3 className="font-display text-xl text-heritage-ink mb-2">{item.event}</h3>
                    <p className="font-sans text-heritage-text">{item.description}</p>
                  </div>
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
        className="py-24 px-6 bg-heritage-card"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-sans text-heritage-sepia uppercase tracking-[0.3em] text-xs mb-4">
              The People
            </p>
            <h2 className="font-display text-4xl text-heritage-ink mb-4">Meet the team</h2>
            <p className="font-serif text-lg text-heritage-text max-w-2xl mx-auto">
              A small but mighty team dedicated to preserving the world's stories.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className={`text-center group ${
                  isVisible.team ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms`, transition: 'all 0.8s ease-out' }}
              >
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-heritage-sepia-light/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-4xl text-heritage-sepia">
                      {member.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl text-heritage-ink mb-1">{member.name}</h3>
                <p className="font-sans text-sm text-heritage-cta mb-3">{member.role}</p>
                <p className="font-serif text-sm text-heritage-text">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-sepia-light/30 border border-heritage-sepia-light/50 mb-6">
            <span className="text-lg">🇬🇧</span>
            <p className="font-sans uppercase tracking-[0.3em] text-xs text-heritage-sepia">
              Made in Britain
            </p>
          </div>

          <h2 className="font-display text-4xl text-heritage-ink mb-4">
            Proudly based in Edinburgh
          </h2>
          <p className="font-serif text-lg text-heritage-text max-w-2xl mx-auto mb-8">
            Our team works from the historic heart of Scotland, surrounded by centuries of
            storytelling tradition. Your data stays in the UK, protected by strong privacy laws.
          </p>

          <div className="bg-heritage-card rounded-3xl p-8 border border-heritage-sepia-light/30 shadow-lg">
            <div className="aspect-video bg-heritage-sepia-light/20 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <span className="text-6xl mb-4 block">🏰</span>
                <p className="font-sans text-heritage-text">Edinburgh, Scotland</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-heritage-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-white mb-6">
            Ready to preserve your story?
          </h2>
          <p className="font-serif text-xl text-white/70 mb-10">
            Join 50,000+ families who've already captured their precious memories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group font-sans bg-heritage-cta text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Write My First Chapter — Free
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              to="/gift"
              className="font-sans border-2 border-white/30 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-white/10 transition-all"
            >
              Gift a Memoir
            </Link>
          </div>
        </div>
      </section>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes draw {
          from { stroke-dashoffset: 300; }
          to { stroke-dashoffset: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        .animate-draw {
          stroke-dasharray: 300;
          animation: draw 1.5s ease-out 0.5s forwards;
          stroke-dashoffset: 300;
        }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
      `}</style>
    </div>
  )
}

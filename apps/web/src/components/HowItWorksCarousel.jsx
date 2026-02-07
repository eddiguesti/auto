import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HowItWorksCarousel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const containerRef = useRef(null)
  const autoPlayRef = useRef(null)

  const AUTOPLAY_DURATION = 5000

  const steps = [
    {
      title: 'Clio interviews you',
      description:
        'Questions designed using reminiscence therapy techniques—sensory cues, spatial memory, and emotional anchors that unlock stories you forgot you had.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      media: null
    },
    {
      title: 'Just talk naturally',
      description:
        'No typing needed—just speak. Clio asks about smells, sounds, and places that trigger vivid memories. "Walk me through the front door of your childhood home..."',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ),
      media: null
    },
    {
      title: 'AI writes your chapter',
      description:
        'Your spoken words become beautifully written prose. Your voice, your personality, your stories—polished and preserved exactly as you told them.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      media: null
    },
    {
      title: 'Print your book',
      description:
        'Download as a PDF or order a professionally printed hardcover. A beautiful keepsake your family will treasure for generations.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      media: null
    }
  ]

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.3
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Auto-advance
  useEffect(() => {
    if (!isAutoPlaying || !isInView) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
      return
    }

    autoPlayRef.current = setInterval(() => {
      setActiveStep(prev => (prev + 1) % steps.length)
    }, AUTOPLAY_DURATION)

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, isInView, steps.length])

  const goToStep = useCallback(
    index => {
      setActiveStep(index)
      // Reset autoplay timer
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
      if (isAutoPlaying && isInView) {
        autoPlayRef.current = setInterval(() => {
          setActiveStep(prev => (prev + 1) % steps.length)
        }, AUTOPLAY_DURATION)
      }
    },
    [isAutoPlaying, isInView, steps.length]
  )

  const nextStep = useCallback(() => {
    goToStep((activeStep + 1) % steps.length)
  }, [activeStep, steps.length, goToStep])

  const prevStep = useCallback(() => {
    goToStep((activeStep - 1 + steps.length) % steps.length)
  }, [activeStep, steps.length, goToStep])

  const handleGetStarted = () => navigate(user ? '/voice' : '/register')

  // Check if at boundaries for arrow states
  const isAtStart = activeStep === 0
  const isAtEnd = activeStep === steps.length - 1

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="py-20 sm:py-28 bg-gradient-to-b from-heritage-cream via-white to-heritage-cream overflow-hidden relative"
    >
      {/* Decorative background elements - heritage sepia tones */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-heritage-sepia-light/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-heritage-sepia-light/20 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative max-w-6xl mx-auto px-6 text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-sepia-light/30 border border-heritage-sepia-light/50 mb-6">
          <span className="w-2 h-2 rounded-full bg-heritage-cta" />
          <p className="font-sans uppercase tracking-[0.3em] text-xs text-heritage-sepia">
            How It Works
          </p>
        </div>
        <h2 className="font-display text-4xl sm:text-5xl text-heritage-ink">Four simple steps</h2>
      </div>

      {/* Carousel */}
      <div className="relative max-w-6xl mx-auto px-6">
        {/* Navigation Arrows */}
        <button
          onClick={prevStep}
          className={`hidden md:flex absolute -left-4 lg:-left-16 top-1/2 -translate-y-1/2 z-20 w-14 h-14 items-center justify-center rounded-full bg-white border-2 border-heritage-sepia-light/50 text-heritage-sepia hover:text-heritage-ink hover:border-heritage-sepia transition-all shadow-md ${
            isAtStart ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
          }`}
          disabled={isAtStart}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={nextStep}
          className={`hidden md:flex absolute -right-4 lg:-right-16 top-1/2 -translate-y-1/2 z-20 w-14 h-14 items-center justify-center rounded-full bg-white border-2 border-heritage-sepia-light/50 text-heritage-sepia hover:text-heritage-ink hover:border-heritage-sepia transition-all shadow-md ${
            isAtEnd ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
          }`}
          disabled={isAtEnd}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slides - Fade only */}
        <div className="relative min-h-[450px]">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-150 ease-out ${
                index === activeStep ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center h-full">
                {/* Left: Text Content */}
                <div>
                  {/* Step badge with icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-heritage-cta text-white flex items-center justify-center shadow-lg">
                      {step.icon}
                    </div>
                    <span className="font-sans text-sm font-semibold uppercase tracking-wider text-heritage-cta">
                      Step {index + 1}
                    </span>
                  </div>

                  <h3 className="font-display text-3xl sm:text-4xl text-heritage-ink mb-6">
                    {step.title}
                  </h3>
                  <p className="font-serif text-lg text-heritage-text leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Right: Media */}
                <div className="flex justify-center">
                  {step.media ? (
                    <div className="w-full max-w-md">{step.media}</div>
                  ) : (
                    // Heritage-styled placeholder
                    <div className="w-full max-w-md aspect-[4/3] bg-gradient-to-br from-heritage-sepia-light/30 to-heritage-sepia-light/10 rounded-3xl border-2 border-dashed border-heritage-sepia-light flex items-center justify-center relative overflow-hidden shadow-xl">
                      {/* Decorative circles */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-heritage-cta/10 blur-2xl" />
                      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-heritage-sepia/10 blur-2xl" />

                      <div className="text-center relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-heritage-sepia text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <svg
                            className="w-10 h-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-heritage-sepia">
                          Step {index + 1} media
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step Indicators - Heritage style */}
        <div className="flex justify-center items-end gap-6 sm:gap-10 mt-12">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className="group flex flex-col items-center gap-3"
            >
              {/* Progress bar */}
              <div
                className={`w-16 sm:w-20 h-2 rounded-full transition-all duration-300 ${
                  index <= activeStep ? 'bg-heritage-cta shadow-sm' : 'bg-heritage-sepia-light/50'
                }`}
              />
              {/* Label */}
              <span
                className={`font-sans text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
                  index <= activeStep ? 'text-heritage-cta' : 'text-heritage-text/50'
                }`}
              >
                Step {index + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative max-w-6xl mx-auto px-6 text-center mt-16">
        <button
          onClick={handleGetStarted}
          className="group font-sans bg-heritage-cta text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg"
        >
          {user ? 'Continue Your Story' : 'Start Your Memoir'}
          <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </button>
      </div>
    </section>
  )
}

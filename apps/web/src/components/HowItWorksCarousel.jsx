import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconMessageCircle,
  IconMicrophone,
  IconPencil,
  IconBook2,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from './ui'

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
      icon: <IconMessageCircle size={24} stroke={1.5} aria-hidden="true" />,
      media: (
        <Card padding="none" className="w-full max-w-sm mx-auto shadow-lifted overflow-hidden">
          <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
            <p className="eyebrow mb-2">Earliest memories</p>
            <h4 className="font-display text-xl text-ink mb-8">Where were you born?</h4>
            {/* Particle circle */}
            <div className="relative w-40 h-40 mb-8">
              <div className="absolute inset-0 rounded-full bg-sepia-100/70" />
              {/* Scattered dots */}
              {[...Array(40)].map((_, i) => {
                const angle = (i / 40) * Math.PI * 2 + (i % 3) * 0.3
                const radius = 30 + (i % 5) * 12 + (i % 3) * 5
                const x = 50 + ((Math.cos(angle) * radius) / 80) * 50
                const y = 50 + ((Math.sin(angle) * radius) / 80) * 50
                const size = 2 + (i % 3)
                return (
                  <div
                    key={i}
                    className="absolute rounded-full bg-sepia-400/40"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${x}%`,
                      top: `${y}%`
                    }}
                  />
                )
              })}
            </div>
            <p className="font-display text-lg text-sepia-500 mb-1">Say hello to begin</p>
            <p className="text-xs text-sepia-400">Click to start</p>
          </div>
        </Card>
      )
    },
    {
      title: 'Just talk naturally',
      description:
        'No typing needed—just speak. Clio asks about smells, sounds, and places that trigger vivid memories. "Walk me through the front door of your childhood home..."',
      icon: <IconMicrophone size={24} stroke={1.5} aria-hidden="true" />,
      media: null
    },
    {
      title: 'AI writes your chapter',
      description:
        'Your spoken words become beautifully written prose. Your voice, your personality, your stories—polished and preserved exactly as you told them.',
      icon: <IconPencil size={24} stroke={1.5} aria-hidden="true" />,
      media: null
    },
    {
      title: 'Print your book',
      description:
        'Download as a PDF or order a professionally printed hardcover. A beautiful keepsake your family will treasure for generations.',
      icon: <IconBook2 size={24} stroke={1.5} aria-hidden="true" />,
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
    <section ref={containerRef} id="how-it-works" className="py-20 sm:py-28 bg-parchment">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 text-center mb-16">
        <p className="eyebrow mb-4">How it works</p>
        <h2 className="font-display text-4xl sm:text-5xl text-ink">Four simple steps</h2>
      </div>

      {/* Carousel */}
      <div className="relative max-w-6xl mx-auto px-6">
        {/* Navigation Arrows */}
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={isAtStart}
          aria-label="Previous step"
          icon={<IconChevronLeft size={22} stroke={1.75} />}
          className="hidden md:inline-flex absolute -left-4 lg:-left-16 top-1/2 -translate-y-1/2 z-20 !w-12 !h-12 !p-0"
        />
        <Button
          variant="secondary"
          onClick={nextStep}
          disabled={isAtEnd}
          aria-label="Next step"
          icon={<IconChevronRight size={22} stroke={1.75} />}
          className="hidden md:inline-flex absolute -right-4 lg:-right-16 top-1/2 -translate-y-1/2 z-20 !w-12 !h-12 !p-0"
        />

        {/* Slides - Fade only */}
        <div className="relative min-h-[450px]">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${
                index === activeStep ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center h-full">
                {/* Left: Text Content */}
                <div>
                  {/* Step badge with icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-bronze-100 text-bronze-600 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <span className="eyebrow !text-bronze-600">Step {index + 1}</span>
                  </div>

                  <h3 className="font-display text-3xl sm:text-4xl text-ink mb-5">{step.title}</h3>
                  <p className="text-lg text-sepia-600 leading-relaxed">{step.description}</p>
                </div>

                {/* Right: Media */}
                <div className="flex justify-center">
                  {step.media ? (
                    <div className="w-full max-w-md">{step.media}</div>
                  ) : (
                    <div className="w-full max-w-md aspect-[4/3] bg-cream rounded-3xl border border-sepia-200/70 flex items-center justify-center shadow-soft">
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center mx-auto mb-4">
                          {step.icon}
                        </div>
                        <p className="text-sm text-sepia-500">Step {index + 1} media</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center items-end gap-6 sm:gap-10 mt-12">
          {steps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToStep(index)}
              aria-label={`Go to step ${index + 1}`}
              aria-current={index === activeStep ? 'step' : undefined}
              className="group flex flex-col items-center gap-3 py-2"
            >
              {/* Progress bar */}
              <div
                className={`w-16 sm:w-20 h-1.5 rounded-full transition-colors duration-300 ${
                  index <= activeStep ? 'bg-bronze-500' : 'bg-sepia-200'
                }`}
              />
              {/* Label */}
              <span
                className={`text-xs font-medium uppercase tracking-caps transition-colors duration-150 ${
                  index <= activeStep ? 'text-bronze-600' : 'text-sepia-400'
                }`}
              >
                Step {index + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 text-center mt-16">
        <Button variant="primary" size="lg" onClick={handleGetStarted}>
          {user ? 'Continue your story' : 'Start your memoir'}
        </Button>
      </div>
    </section>
  )
}

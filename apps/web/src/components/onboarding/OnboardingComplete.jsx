import { useState, useEffect } from 'react'
import { IconCheck } from '@tabler/icons-react'
import { Button } from '../ui'

export default function OnboardingComplete({ context, onContinue }) {
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    // Animate checkmark in
    const timer = setTimeout(() => setShowCheck(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Build personalized message
  const getPersonalizedMessage = () => {
    if (!context) return 'Your personalized journey awaits!'

    const parts = []
    if (context.birth_place) {
      parts.push(context.birth_place)
    }
    if (context.birth_year) {
      parts.push(context.birth_year)
    }

    if (parts.length > 0) {
      return `Starting your story from ${parts.join(', ')}...`
    }
    return 'Your personalized journey awaits!'
  }

  return (
    <div className="text-center py-4">
      {/* Animated checkmark */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div
          className={`absolute inset-0 rounded-full bg-success-soft transition-transform duration-500 ${
            showCheck ? 'scale-100' : 'scale-0'
          }`}
        />
        <div
          className={`absolute inset-0 flex items-center justify-center text-success transition-all duration-500 delay-200 ${
            showCheck ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <IconCheck size={40} stroke={2.5} />
        </div>
      </div>

      <h2 className="text-3xl font-display text-ink mb-2">You're All Set!</h2>

      <p className="text-sepia-600 text-base mb-2">{getPersonalizedMessage()}</p>

      <p className="text-sm text-sepia-500 mb-8">
        We're creating personalized artwork for each chapter of your life.
        <br />
        This happens in the background while you explore.
      </p>

      {/* Preview illustration */}
      <div className="relative mb-8 mx-auto max-w-xs">
        <div className="aspect-video rounded-xl bg-cream border border-sepia-200/70 overflow-hidden">
          {/* Shimmer animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />

          {/* Chapter preview overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="eyebrow mb-1">Chapter 1</p>
              <p className="text-sm font-medium text-ink">Earliest Memories</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-sepia-500 mt-2">Your chapter artwork is being generated...</p>
      </div>

      <Button size="xl" onClick={onContinue}>
        Start Your Journey
      </Button>
    </div>
  )
}

import { useState, useEffect, useRef, useMemo } from 'react'

export default function ImageUnlockAnimation({ imageUrl, chapterTitle, onComplete }) {
  const [phase, setPhase] = useState('enter') // enter, reveal, hold, exit
  const containerRef = useRef(null)
  const hasSkipped = useRef(false)

  // Generate stable particle positions
  const particles = useMemo(() =>
    [...Array(30)].map((_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 1 + Math.random() * 2,
      size: 1 + Math.random() * 3
    })), []
  )

  // Light ray positions
  const rays = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      rotation: i * 45,
      delay: i * 0.1
    })), []
  )

  useEffect(() => {
    // Phase 1: Enter (background fades, anticipation builds)
    const revealTimer = setTimeout(() => {
      setPhase('reveal')
    }, 400)

    // Phase 2: Reveal (image appears with fanfare)
    const holdTimer = setTimeout(() => {
      setPhase('hold')
    }, 1200)

    // Phase 3: Hold for viewing (can click to skip)
    const exitTimer = setTimeout(() => {
      if (!hasSkipped.current) {
        setPhase('exit')
      }
    }, 4000)

    // Phase 4: Exit and callback
    const completeTimer = setTimeout(() => {
      if (!hasSkipped.current) {
        onComplete?.()
      }
    }, 4800)

    return () => {
      clearTimeout(revealTimer)
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  const handleSkip = () => {
    if (!hasSkipped.current) {
      hasSkipped.current = true
      setPhase('exit')
      setTimeout(() => onComplete?.(), 600)
    }
  }

  return (
    <div
      ref={containerRef}
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex items-center justify-center cursor-pointer transition-all duration-700 ${
        phase === 'enter' ? 'bg-black/0' : 'bg-black/95'
      }`}
    >
      {/* Radial light burst from center */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === 'reveal' || phase === 'hold' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(circle at center, rgba(217,164,65,0.15) 0%, transparent 60%)'
        }}
      />

      {/* Animated light rays */}
      <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        phase === 'reveal' ? 'opacity-100' : 'opacity-0'
      }`}>
        {rays.map((ray, i) => (
          <div
            key={i}
            className="absolute w-1 bg-gradient-to-t from-amber-400/40 via-amber-300/20 to-transparent"
            style={{
              height: '150vh',
              transform: `rotate(${ray.rotation}deg)`,
              animation: phase === 'reveal' ? `rayPulse 0.8s ease-out ${ray.delay}s both` : 'none'
            }}
          />
        ))}
      </div>

      {/* Floating sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full transition-all duration-1000 ${
              phase === 'hold' || phase === 'reveal' ? 'opacity-80' : 'opacity-0'
            }`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: 'radial-gradient(circle, #fcd34d 0%, #f59e0b 100%)',
              boxShadow: '0 0 6px 2px rgba(252,211,77,0.5)',
              animation: phase !== 'enter' ? `sparkleFloat ${p.duration}s ease-in-out ${p.delay}s infinite` : 'none'
            }}
          />
        ))}
      </div>

      {/* Main image container - book page style */}
      <div
        className={`relative transition-all ${
          phase === 'enter'
            ? 'duration-500 opacity-0 scale-50'
            : phase === 'reveal'
            ? 'duration-700 opacity-100 scale-100'
            : phase === 'hold'
            ? 'duration-300 opacity-100 scale-100'
            : 'duration-600 opacity-0 scale-90 translate-y-8'
        }`}
        style={{
          transform: phase === 'enter' ? 'scale(0.5) rotateX(30deg)' :
                     phase === 'exit' ? 'scale(0.9) translateY(32px)' : 'scale(1)'
        }}
      >
        {/* Outer animated glow */}
        <div
          className={`absolute -inset-6 rounded-3xl transition-opacity duration-700 ${
            phase === 'hold' || phase === 'reveal' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.4) 0%, rgba(180,83,9,0.2) 40%, transparent 70%)',
            animation: phase === 'hold' ? 'glowPulse 2s ease-in-out infinite' : 'none'
          }}
        />

        {/* Book page frame */}
        <div
          className="relative bg-gradient-to-br from-cream via-amber-50 to-cream rounded-xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(85vw, 900px)',
            aspectRatio: '16/10',
            boxShadow: phase === 'hold'
              ? '0 0 60px 20px rgba(245,158,11,0.3), 0 25px 50px -12px rgba(0,0,0,0.5)'
              : '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          {/* Page texture overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 pointer-events-none z-10" />

          {/* Gold border effect */}
          <div className="absolute inset-0 rounded-xl border-2 border-amber-400/30 pointer-events-none z-20" />

          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-500/50 rounded-tl-xl z-20" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-500/50 rounded-tr-xl z-20" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-500/50 rounded-bl-xl z-20" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-500/50 rounded-br-xl z-20" />

          {/* Image with elegant frame */}
          <div className="p-3 sm:p-5">
            <div className="relative rounded-lg overflow-hidden shadow-inner">
              <img
                src={imageUrl}
                alt={chapterTitle}
                className={`w-full h-full object-cover transition-all duration-1000 ${
                  phase === 'reveal' || phase === 'hold' ? 'brightness-100 saturate-100' : 'brightness-50 saturate-50'
                }`}
                style={{ aspectRatio: '16/9' }}
              />

              {/* Vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

              {/* Inner corner ornaments */}
              <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-amber-300/60 rounded-tl" />
              <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-amber-300/60 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-amber-300/60 rounded-bl" />
              <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-amber-300/60 rounded-br" />
            </div>
          </div>
        </div>

        {/* Chapter title reveal */}
        <div
          className={`absolute -bottom-20 left-1/2 -translate-x-1/2 text-center transition-all duration-700 ${
            phase === 'hold' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-amber-400/60" />
            <p className="text-amber-300/90 text-xs uppercase tracking-[0.4em] font-medium">
              ✦ Chapter Unlocked ✦
            </p>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
          <h2 className="text-white font-display text-2xl sm:text-4xl tracking-wide drop-shadow-lg">
            {chapterTitle}
          </h2>
        </div>
      </div>

      {/* Skip hint */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 ${
          phase === 'hold' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-white/30 text-sm animate-pulse">
          Tap anywhere to continue
        </p>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes sparkleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes rayPulse {
          0% { opacity: 0; transform: scaleY(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

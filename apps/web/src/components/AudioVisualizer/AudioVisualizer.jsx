import { useRef, useEffect, useCallback } from 'react'
import { Particle } from './Particle'
import { defaultColorSchemes, defaultSizes } from './config'

/**
 * AudioVisualizer - Premium Audio-Reactive Particle Animation
 *
 * A sophisticated voice activity indicator with multi-layered particles
 * and smooth color transitions between states.
 *
 * Color states:
 * - Idle: Warm sepia tones
 * - Active (listening): Subtle green
 * - Speaking (AI): Soft blue/violet
 * - Detected (user speaking): Vibrant emerald
 *
 * @param {MediaStream} stream - Microphone stream to visualize
 * @param {boolean} isActive - Whether recording/listening is active
 * @param {boolean} isSpeaking - Whether AI is speaking (blue)
 * @param {boolean} isSpeechDetected - Whether user speech is detected (green)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {object} colorSchemes - Custom color schemes (optional)
 * @param {boolean} showIcon - Whether to show center icon (default: false)
 * @param {boolean} showPulse - Whether to show pulse ring when speaking (default: true)
 */
export default function AudioVisualizer({
  stream,
  isActive = false,
  isSpeaking = false,
  isSpeechDetected = false,
  size = 'lg',
  colorSchemes = defaultColorSchemes,
  showIcon = false,
  showPulse = true
}) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const dataArrayRef = useRef(null)
  const particlesRef = useRef([])
  const smoothedLevelRef = useRef(0)
  const timeRef = useRef(0)

  // Smooth color transition refs
  const currentColorsRef = useRef(null)
  const targetColorsRef = useRef(null)

  const config = defaultSizes[size] || defaultSizes.lg

  // Helper to parse color string to RGB
  const parseColor = color => {
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      }
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1
      }
    }
    return { r: 155, g: 139, b: 122, a: 1 } // fallback sepia
  }

  // Helper to interpolate between two colors
  const lerpColor = (color1, color2, t) => {
    const c1 = typeof color1 === 'string' ? parseColor(color1) : color1
    const c2 = typeof color2 === 'string' ? parseColor(color2) : color2
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
      a: c1.a + (c2.a - c1.a) * t
    }
  }

  // Convert RGB object to CSS string
  const colorToString = (c, alphaOverride) => {
    const alpha = alphaOverride !== undefined ? alphaOverride : c.a
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
  }

  // Interpolate entire color scheme
  const lerpColorScheme = (scheme1, scheme2, t) => {
    return {
      primary: lerpColor(scheme1.primary, scheme2.primary, t),
      secondary: lerpColor(scheme1.secondary, scheme2.secondary, t),
      glow: lerpColor(scheme1.glow, scheme2.glow, t),
      center: lerpColor(scheme1.center, scheme2.center, t)
    }
  }

  // Initialize particles across 3 layers
  useEffect(() => {
    const centerX = config.width / 2
    const centerY = config.height / 2
    const particles = []

    config.particlesPerLayer.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(centerX, centerY, i, count, layer))
      }
    })

    particlesRef.current = particles
  }, [config.width, config.height, config.particlesPerLayer])

  // Initialize audio analyser
  useEffect(() => {
    if (!stream || !isActive) {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      return
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.75
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
    } catch (err) {
      console.error('[AudioVisualizer] Failed to initialize:', err)
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream, isActive])

  // Animation loop
  const draw = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width, height } = config
    const centerX = width / 2
    const centerY = height / 2

    timeRef.current += 0.016

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get audio level
    let audioLevel = 0
    if (analyserRef.current && dataArrayRef.current && isActive && !isSpeaking) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)
      // Weight lower frequencies more for voice
      let weightedSum = 0
      let totalWeight = 0
      for (let i = 0; i < dataArrayRef.current.length / 2; i++) {
        const weight = 1 - (i / (dataArrayRef.current.length / 2)) * 0.5
        weightedSum += dataArrayRef.current[i] * weight
        totalWeight += weight
      }
      audioLevel = weightedSum / (totalWeight * 255)
    } else if (isSpeaking) {
      // Organic simulated audio for AI speaking
      const t = timeRef.current
      audioLevel =
        0.35 +
        Math.sin(t * 6) * 0.12 +
        Math.sin(t * 9.5) * 0.08 +
        Math.sin(t * 14) * 0.05 +
        Math.random() * 0.03
    }

    // Smooth the audio level with different speeds for rise/fall
    const targetSmoothing = audioLevel > smoothedLevelRef.current ? 0.3 : 0.15
    smoothedLevelRef.current += (audioLevel - smoothedLevelRef.current) * targetSmoothing

    // Determine target color scheme
    let targetScheme = colorSchemes.idle
    if (isSpeaking) {
      targetScheme = colorSchemes.speaking
    } else if (isSpeechDetected) {
      targetScheme = colorSchemes.detected
    } else if (isActive) {
      targetScheme = colorSchemes.active
    }

    // Initialize color refs if needed
    if (!currentColorsRef.current) {
      currentColorsRef.current = {
        primary: parseColor(targetScheme.primary),
        secondary: parseColor(targetScheme.secondary),
        glow: parseColor(targetScheme.glow),
        center: parseColor(targetScheme.center)
      }
    }
    if (!targetColorsRef.current) {
      targetColorsRef.current = {
        primary: parseColor(targetScheme.primary),
        secondary: parseColor(targetScheme.secondary),
        glow: parseColor(targetScheme.glow),
        center: parseColor(targetScheme.center)
      }
    }

    // Update target colors
    targetColorsRef.current = {
      primary: parseColor(targetScheme.primary),
      secondary: parseColor(targetScheme.secondary),
      glow: parseColor(targetScheme.glow),
      center: parseColor(targetScheme.center)
    }

    // Smoothly interpolate current colors toward target (smooth transition speed)
    const colorTransitionSpeed = 0.08
    currentColorsRef.current = lerpColorScheme(
      currentColorsRef.current,
      targetColorsRef.current,
      colorTransitionSpeed
    )

    // Use interpolated colors
    const colors = {
      primary: colorToString(currentColorsRef.current.primary),
      secondary: colorToString(currentColorsRef.current.secondary),
      glow: colorToString(currentColorsRef.current.glow),
      center: colorToString(currentColorsRef.current.center)
    }

    const isIdle = !isActive && !isSpeaking

    // Draw subtle ambient glow
    const outerGlowRadius = 80 + smoothedLevelRef.current * 15
    const outerGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      20,
      centerX,
      centerY,
      outerGlowRadius
    )
    outerGradient.addColorStop(0, colorToString(currentColorsRef.current.center, 0.12))
    outerGradient.addColorStop(0.5, colorToString(currentColorsRef.current.glow, 0.06))
    outerGradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2)
    ctx.fillStyle = outerGradient
    ctx.fill()

    // Draw particles (outer to inner for proper layering)
    const sortedParticles = [...particlesRef.current].sort((a, b) => b.layer - a.layer)

    sortedParticles.forEach(particle => {
      particle.update(smoothedLevelRef.current, timeRef.current, isIdle)
      const particleColor =
        particle.layer === 0
          ? colors.primary
          : particle.layer === 1
            ? colors.secondary
            : colorToString(currentColorsRef.current.glow, 0.8)
      particle.draw(ctx, particleColor)
    })

    // Draw subtle connecting lines between nearby particles (only when active)
    if (smoothedLevelRef.current > 0.08) {
      ctx.lineWidth = 0.5

      for (let layer = 0; layer < 2; layer++) {
        const layerParticles = particlesRef.current.filter(p => p.layer === layer)
        const maxDist = 25 + layer * 8

        ctx.strokeStyle = colors.primary

        layerParticles.forEach((p1, i) => {
          layerParticles.slice(i + 1, i + 3).forEach(p2 => {
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
            if (dist < maxDist) {
              const lineOpacity = (1 - dist / maxDist) * smoothedLevelRef.current * 0.15
              ctx.globalAlpha = lineOpacity
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
            }
          })
        })
      }
      ctx.globalAlpha = 1
    }

    // Subtle pulse ring when speech detected
    if (showPulse && isSpeechDetected) {
      const pulsePhase = (timeRef.current * 1.5) % 1
      const pulseRadius = 75 + pulsePhase * 18
      const pulseOpacity = (1 - pulsePhase) * 0.25

      ctx.beginPath()
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2)
      ctx.strokeStyle = colors.primary
      ctx.lineWidth = 1.5
      ctx.globalAlpha = pulseOpacity
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [config, colorSchemes, isActive, isSpeaking, isSpeechDetected, showIcon, showPulse])

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])

  // Calculate glow effect based on state (matches config colors)
  const getGlowStyle = () => {
    if (isSpeechDetected) {
      // User speaking - vibrant emerald
      return 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4)) drop-shadow(0 0 40px rgba(16, 185, 129, 0.15))'
    }
    if (isSpeaking) {
      // AI/Clio speaking - soft blue
      return 'drop-shadow(0 0 18px rgba(107, 141, 217, 0.35)) drop-shadow(0 0 35px rgba(107, 141, 217, 0.12))'
    }
    if (isActive) {
      // Active/listening - subtle green
      return 'drop-shadow(0 0 12px rgba(90, 155, 107, 0.3)) drop-shadow(0 0 25px rgba(90, 155, 107, 0.1))'
    }
    // Idle - warm sepia
    return 'drop-shadow(0 0 8px rgba(155, 139, 122, 0.2))'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className="rounded-full"
        style={{
          filter: getGlowStyle(),
          transition: 'filter 0.4s ease'
        }}
      />
    </div>
  )
}

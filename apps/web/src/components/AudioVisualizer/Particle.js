/**
 * Particle - Audio-reactive particle with spring physics
 *
 * Each particle moves organically with unique properties:
 * - Different layers for depth perception
 * - Spring physics for smooth, organic motion
 * - Audio-reactive size and position
 * - Non-circular, living movement
 */

export class Particle {
  constructor(centerX, centerY, index, total, layer) {
    this.centerX = centerX
    this.centerY = centerY
    this.index = index
    this.total = total
    this.layer = layer // 0 = inner, 1 = middle, 2 = outer

    // Layer-specific properties - smaller particles
    const layerConfigs = [
      { baseRadius: 25, radiusVariance: 12, size: 0.75, speed: 0.01, opacity: 0.85 },
      { baseRadius: 42, radiusVariance: 15, size: 0.9, speed: 0.007, opacity: 0.65 },
      { baseRadius: 58, radiusVariance: 18, size: 1.1, speed: 0.004, opacity: 0.45 }
    ]
    const config = layerConfigs[layer] || layerConfigs[1]

    // Start position - randomized to break perfect circle
    this.angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    this.baseRadius = config.baseRadius + (Math.random() - 0.5) * config.radiusVariance * 2
    this.radius = this.baseRadius
    this.targetRadius = this.baseRadius

    // Particle size with variance (smaller variance for smaller particles)
    this.baseSize = config.size + (Math.random() - 0.5) * 0.3
    this.size = this.baseSize
    this.targetSize = this.baseSize

    // Unique movement character for each particle
    this.speed = config.speed * (0.5 + Math.random() * 1.0)
    this.phaseOffset = Math.random() * Math.PI * 2
    this.wobblePhase = Math.random() * Math.PI * 2
    this.wobbleFreq = 1.2 + Math.random() * 1.8
    this.driftPhase = Math.random() * Math.PI * 2
    this.driftAmount = 4 + Math.random() * 8

    // Spring physics
    this.velocityR = 0
    this.velocityS = 0
    this.velocityX = 0
    this.velocityY = 0

    // Visual
    this.baseOpacity = config.opacity
    this.opacity = this.baseOpacity
    this.targetOpacity = this.baseOpacity

    // Permanent offset for organic shape
    this.offsetX = (Math.random() - 0.5) * 15
    this.offsetY = (Math.random() - 0.5) * 15
    this.x = centerX + this.offsetX
    this.y = centerY + this.offsetY
  }

  update(audioLevel, time, isIdle) {
    // When idle: slow, organized orbit. When active: subtle movement
    const speedMultiplier = isIdle ? 0.5 : 1 + audioLevel * 0.6
    this.angle += this.speed * speedMultiplier

    // Idle: gentle breathing, organized. Active: subtle reaction (reduced by 80%)
    if (isIdle) {
      // Calm, organized state - subtle breathing only
      const breathe = Math.sin(time * 0.8 + this.phaseOffset) * 3
      this.targetRadius = this.baseRadius + breathe
      this.targetSize = this.baseSize
      this.targetOpacity = this.baseOpacity * 0.8
    } else {
      // Active state - gentle reaction to voice (80% reduction)
      const breatheSpeed = 1.2 + audioLevel * 0.6
      const breatheAmount = 3 + audioLevel * 7
      const breathe = Math.sin(time * breatheSpeed + this.phaseOffset) * breatheAmount

      // Subtle wobble when speaking
      const wobble1 = Math.sin(time * this.wobbleFreq * 2 + this.wobblePhase) * audioLevel * 4
      const wobble2 = Math.cos(time * this.wobbleFreq * 1.3 + this.wobblePhase) * audioLevel * 3
      const wobble = wobble1 + wobble2

      // Gentle expansion with audio
      const audioInfluence = audioLevel * (9 + this.layer * 3.5)

      this.targetRadius = this.baseRadius + audioInfluence + wobble + breathe

      // Size pulses subtly with audio
      const sizePulse = Math.sin(time * 5 + this.phaseOffset) * audioLevel * 0.15
      this.targetSize = this.baseSize + audioLevel * (0.3 + this.layer * 0.1) + sizePulse

      // Slightly brighter when active
      this.targetOpacity = Math.min(1, this.baseOpacity + audioLevel * 0.12)
    }

    // Spring physics - gentle when idle, slightly snappier when active
    const springStrength = isIdle ? 0.04 : 0.06 + audioLevel * 0.02
    const damping = isIdle ? 0.92 : 0.88

    this.velocityR = (this.velocityR + (this.targetRadius - this.radius) * springStrength) * damping
    this.radius += this.velocityR

    this.velocityS = (this.velocityS + (this.targetSize - this.size) * springStrength) * damping
    this.size += this.velocityS

    this.opacity += (this.targetOpacity - this.opacity) * (isIdle ? 0.05 : 0.08)

    // Drift: minimal when idle, subtle when active
    const driftMult = isIdle ? 0.2 : 0.4 + audioLevel * 0.8
    const driftX = Math.sin(time * 0.5 + this.driftPhase) * this.driftAmount * driftMult
    const driftY = Math.cos(time * 0.6 + this.driftPhase * 1.4) * this.driftAmount * driftMult

    // Jitter: none when idle, subtle when speaking
    const jitterAmount = isIdle ? 0 : audioLevel * 1.2
    const jitterX = Math.sin(time * 30 + this.index) * jitterAmount + Math.sin(time * 47 + this.index * 0.3) * jitterAmount * 0.7
    const jitterY = Math.cos(time * 33 + this.index) * jitterAmount + Math.cos(time * 51 + this.index * 0.7) * jitterAmount * 0.7

    // Offset: use when idle for organization, keep more when active
    const offsetMult = isIdle ? 1 : 0.7
    const targetX = this.centerX + Math.cos(this.angle) * this.radius + driftX + jitterX + this.offsetX * offsetMult
    const targetY = this.centerY + Math.sin(this.angle) * this.radius + driftY + jitterY + this.offsetY * offsetMult

    // Position smoothing - slower when idle, slightly faster when active
    const posSpring = isIdle ? 0.06 : 0.08 + audioLevel * 0.02
    const posDamping = isIdle ? 0.94 : 0.92
    this.velocityX = (this.velocityX + (targetX - this.x) * posSpring) * posDamping
    this.velocityY = (this.velocityY + (targetY - this.y) * posSpring) * posDamping
    this.x += this.velocityX
    this.y += this.velocityY
  }

  draw(ctx, color) {
    // Subtle glow effect
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.globalAlpha = this.opacity * 0.25
    ctx.fill()

    // Core particle - crisp and clean
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = this.opacity
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

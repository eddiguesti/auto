import { useRef, useEffect } from 'react'
import { readAiVoiceLevel } from '../../utils/aiVoiceTap'

/**
 * ClioSprite — the Blender-rendered Clio, brought to life in the browser.
 *
 * 8 pre-rendered frames (2 eye states x 4 lip-sync mouths) driven by live
 * voice signals; all motion (breathing, listening lean, voice bounce) runs
 * as CSS transforms at 60fps, so she is fluid with only ~40KB of images.
 *
 * Same public API as the shader visualizer:
 * @param {MediaStream} stream           Microphone stream (user voice)
 * @param {boolean}     isActive         Listening
 * @param {boolean}     isSpeaking       Clio is speaking (lip sync)
 * @param {boolean}     isSpeechDetected User speech detected
 * @param {string}      size             'sm' | 'md' | 'lg'
 */

const SIZES = { sm: 120, md: 160, lg: 200 }
const MOUTHS = ['smile', 'small', 'mid', 'wide']
const FRAME_SRC = (eyes, mouth) => `/clio/clio_${eyes}_${mouth}.webp`

// Preload all frames once per session
let preloaded = false
function preloadFrames() {
  if (preloaded || typeof window === 'undefined') return
  preloaded = true
  for (const eyes of ['open', 'closed']) {
    for (const mouth of MOUTHS) {
      const img = new Image()
      img.src = FRAME_SRC(eyes, mouth)
    }
  }
}

export default function ClioSprite({
  stream,
  isActive = false,
  isSpeaking = false,
  isSpeechDetected = false,
  size = 'lg'
}) {
  const px = SIZES[size] || SIZES.lg

  const imgRef = useRef(null)
  const rafRef = useRef(null)

  // Audio analysis (user microphone)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)

  const flagsRef = useRef({ isActive, isSpeaking, isSpeechDetected })
  flagsRef.current = { isActive, isSpeaking, isSpeechDetected }

  const animRef = useRef({
    time: 0,
    last: 0,
    level: 0,
    lean: 0,
    bounce: 0,
    mouth: 'smile',
    mouthHeldUntil: 0,
    eyes: 'open',
    nextBlink: 2.2,
    blinkAt: -1,
    src: ''
  })

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // --- Microphone analyser (same contract as the shader version) ------------
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
      analyser.smoothingTimeConstant = 0.7
      analyserRef.current = analyser
      audioContext.createMediaStreamSource(stream).connect(analyser)
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
    } catch (err) {
      console.error('[ClioSprite] Failed to initialize audio:', err)
    }
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream, isActive])

  // --- Animation loop ---------------------------------------------------------
  useEffect(() => {
    preloadFrames()
    const img = imgRef.current
    if (!img) return

    const frame = now => {
      const anim = animRef.current
      const flags = flagsRef.current
      const dt = anim.last ? Math.min((now - anim.last) / 1000, 0.05) : 0.016
      anim.last = now
      anim.time += dt
      const t = anim.time

      // -- Voice level --
      let raw = 0
      if (analyserRef.current && dataArrayRef.current && flags.isActive && !flags.isSpeaking) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const bins = dataArrayRef.current
        const half = bins.length / 2
        let sum = 0
        let weight = 0
        for (let i = 0; i < half; i++) {
          const w = 1 - (i / half) * 0.5
          sum += bins[i] * w
          weight += w
        }
        raw = sum / (weight * 255)
      } else if (flags.isSpeaking) {
        const real = readAiVoiceLevel()
        raw =
          real >= 0
            ? real
            : 0.32 + Math.sin(t * 6) * 0.12 + Math.sin(t * 9.5) * 0.08 + Math.random() * 0.03
      }
      anim.level += (raw - anim.level) * (raw > anim.level ? 0.4 : 0.12)

      // -- Mouth (lip sync) --
      let mouth = 'smile'
      if (flags.isSpeaking) {
        if (anim.level < 0.1) mouth = 'smile'
        else if (anim.level < 0.24) mouth = 'small'
        else if (anim.level < 0.42) mouth = 'mid'
        else mouth = 'wide'
        // Hold each mouth briefly so the flap reads, never strobes
        if (now < anim.mouthHeldUntil && mouth !== 'smile') mouth = anim.mouth
        else if (mouth !== anim.mouth) anim.mouthHeldUntil = now + 70
      }
      anim.mouth = mouth

      // -- Blink --
      if (t > anim.nextBlink) {
        anim.blinkAt = t
        anim.nextBlink = t + 2.4 + (Math.sin(t * 7.13) * 0.5 + 0.5) * 2.8
      }
      anim.eyes = anim.blinkAt >= 0 && t - anim.blinkAt < 0.14 ? 'closed' : 'open'

      // -- Frame swap (only when changed) --
      const src = FRAME_SRC(anim.eyes, anim.mouth)
      if (src !== anim.src) {
        anim.src = src
        img.src = src
      }

      // -- Posture: breathing, listening lean, voice bounce --
      const targetLean = flags.isActive && !flags.isSpeaking ? -3.5 : 0
      anim.lean += (targetLean - anim.lean) * 0.06
      const targetBounce = flags.isSpeechDetected || flags.isSpeaking ? anim.level : 0
      anim.bounce += (targetBounce - anim.bounce) * 0.3

      const breatheY = Math.sin(t * 0.9) * 1.6
      const breatheS = 1 + Math.sin(t * 0.9) * 0.006
      const squash = 1 - anim.bounce * 0.055
      const stretch = 1 + anim.bounce * 0.04

      img.style.transform =
        `translateY(${(breatheY - anim.bounce * 3).toFixed(2)}px) ` +
        `rotate(${anim.lean.toFixed(2)}deg) ` +
        `scale(${(breatheS * stretch).toFixed(4)}, ${(breatheS * squash).toFixed(4)})`

      rafRef.current = requestAnimationFrame(frame)
    }

    if (reducedMotion) {
      // Still frame, no loop — swap only on state change
      img.src = FRAME_SRC('open', isSpeaking ? 'small' : 'smile')
    } else {
      rafRef.current = requestAnimationFrame(frame)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [reducedMotion, isSpeaking])

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <img
        ref={imgRef}
        src={FRAME_SRC('open', 'smile')}
        alt=""
        draggable={false}
        style={{
          width: px,
          height: px,
          transformOrigin: '50% 88%', // she pivots at her feet
          willChange: 'transform'
        }}
      />
    </div>
  )
}

import { useRef, useEffect, useState } from 'react'
import { readAiVoiceLevel } from '../../utils/aiVoiceTap'
import ClioSprite from './ClioSprite'

/**
 * ClioMotion — real character animation: Blender-rendered deformation loops
 * (she bends, breathes, bounces and lip-flaps as one piece of flesh) played
 * as alpha video, crossfaded per state, with her talk loop speed modulated
 * by the live voice level.
 *
 * Falls back to the sprite renderer wherever alpha WebM can't play (Safari
 * without HEVC assets, old browsers).
 *
 * Same public API as always:
 * @param {MediaStream} stream           Microphone stream (user voice)
 * @param {boolean}     isActive         Listening
 * @param {boolean}     isSpeaking       Clio is speaking
 * @param {boolean}     isSpeechDetected User speech detected
 * @param {string}      size             'sm' | 'md' | 'lg'
 */

const SIZES = { sm: 120, md: 160, lg: 200 }
const LOOPS = ['idle', 'listen', 'talk', 'excited']
const SRC = name => `/clio/anim/${name}.webm`

function pickLoop({ isActive, isSpeaking, isSpeechDetected }) {
  if (isSpeaking) return 'talk'
  if (isSpeechDetected) return 'excited'
  if (isActive) return 'listen'
  return 'idle'
}

// Alpha WebM support check (Safari can't; it gets the sprite fallback)
function canPlayAlphaWebm() {
  if (typeof document === 'undefined') return false
  const v = document.createElement('video')
  return v.canPlayType('video/webm; codecs="vp9"') !== ''
}

export default function ClioMotion(props) {
  const {
    stream,
    isActive = false,
    isSpeaking = false,
    isSpeechDetected = false,
    size = 'lg'
  } = props
  const px = SIZES[size] || SIZES.lg

  const [supported] = useState(canPlayAlphaWebm)
  const [failed, setFailed] = useState(false)

  const frontRef = useRef(null)
  const backRef = useRef(null)
  const stateRef = useRef({ loop: 'idle', front: 0, fading: false })
  const rafRef = useRef(null)
  const flagsRef = useRef({ isActive, isSpeaking, isSpeechDetected })
  flagsRef.current = { isActive, isSpeaking, isSpeechDetected }

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const levelRef = useRef(0)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // --- Microphone analyser ---------------------------------------------------
  useEffect(() => {
    if (!supported || failed) return
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
      console.error('[ClioMotion] Audio init failed:', err)
    }
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream, isActive, supported, failed])

  // --- Loop switching with crossfade ------------------------------------------
  useEffect(() => {
    if (!supported || failed) return
    const target = pickLoop({ isActive, isSpeaking, isSpeechDetected })
    const st = stateRef.current
    if (target === st.loop) return
    st.loop = target

    const vids = [frontRef.current, backRef.current]
    const incoming = vids[1 - st.front]
    const outgoing = vids[st.front]
    if (!incoming || !outgoing) return

    incoming.src = SRC(target)
    incoming.load()
    const start = () => {
      incoming.play().catch(() => {})
      incoming.style.opacity = '1'
      outgoing.style.opacity = '0'
      st.front = 1 - st.front
      setTimeout(() => {
        try {
          outgoing.pause()
        } catch {
          /* noop */
        }
      }, 300)
    }
    if (incoming.readyState >= 3) start()
    else
      incoming.oncanplay = () => {
        incoming.oncanplay = null
        start()
      }
  }, [isActive, isSpeaking, isSpeechDetected, supported, failed])

  // --- Live modulation: talk speed + bounce follow the real voice -------------
  useEffect(() => {
    if (!supported || failed || reducedMotion) return
    const tick = () => {
      const flags = flagsRef.current
      let raw = 0
      if (analyserRef.current && dataArrayRef.current && flags.isActive && !flags.isSpeaking) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const bins = dataArrayRef.current
        let sum = 0
        for (let i = 0; i < bins.length / 2; i++) sum += bins[i]
        raw = sum / ((bins.length / 2) * 255)
      } else if (flags.isSpeaking) {
        const real = readAiVoiceLevel()
        raw = real >= 0 ? real : 0.3
      }
      levelRef.current += (raw - levelRef.current) * 0.25

      const st = stateRef.current
      const active = [frontRef.current, backRef.current][st.front]
      if (active) {
        if (flags.isSpeaking) {
          active.playbackRate = 0.85 + Math.min(levelRef.current, 0.8) * 0.7
        } else if (active.playbackRate !== 1) {
          active.playbackRate = 1
        }
        const bounce = flags.isSpeechDetected ? levelRef.current * 4 : 0
        const wrap = active.parentElement
        if (wrap) wrap.style.transform = `translateY(${(-bounce).toFixed(2)}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [supported, failed, reducedMotion])

  if (!supported || failed) {
    return <ClioSprite {...props} />
  }

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <video
        ref={frontRef}
        src={SRC('idle')}
        muted
        loop
        autoPlay
        playsInline
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: px,
          height: px,
          opacity: 1,
          transition: 'opacity 0.25s ease',
          objectFit: 'contain'
        }}
      />
      <video
        ref={backRef}
        muted
        loop
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: px,
          height: px,
          opacity: 0,
          transition: 'opacity 0.25s ease',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}

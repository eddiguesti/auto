import { useRef, useEffect, useState } from 'react'
import { ORB_VERTEX_SHADER, ORB_FRAGMENT_SHADER } from './orbShaders'
import { orbStates, defaultSizes } from './config'

/**
 * AudioVisualizer — the Clio Orb.
 *
 * A GPU-rendered, audio-reactive "living" orb (single fragment shader, raw
 * WebGL, zero dependencies). Same public API as the previous particle
 * visualizer, so all call sites work unchanged:
 *
 * @param {MediaStream} stream          Microphone stream to visualize
 * @param {boolean}     isActive        Recording/listening is active
 * @param {boolean}     isSpeaking      Clio is speaking (ink + bronze veins)
 * @param {boolean}     isSpeechDetected User speech detected (burnished bronze)
 * @param {string}      size            'sm' | 'md' | 'lg'
 *
 * Accessibility & resilience:
 * - prefers-reduced-motion: renders a still frame per state change, no loop
 * - No WebGL / context lost: falls back to a soft CSS gradient orb
 */

const hexToRgb = hex => {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ]
}

// Pre-parse palettes once
const STATE_PARAMS = Object.fromEntries(
  Object.entries(orbStates).map(([name, s]) => [
    name,
    {
      colA: hexToRgb(s.colA),
      colB: hexToRgb(s.colB),
      colC: hexToRgb(s.colC),
      rim: hexToRgb(s.rim),
      aura: hexToRgb(s.aura),
      flow: s.flow,
      wobble: s.wobble,
      lobe: s.lobe,
      petal: s.petal,
      rimAmt: s.rimAmt,
      auraAmt: s.auraAmt,
      spark: s.spark,
      breath: s.breath
    }
  ])
)

const UNIFORM_NAMES = [
  'uRes',
  'uTime',
  'uLevel',
  'uPulse',
  'uHighs',
  'uColA',
  'uColB',
  'uColC',
  'uRim',
  'uAura',
  'uFlow',
  'uWobble',
  'uLobe',
  'uPetal',
  'uRimAmt',
  'uAuraAmt',
  'uSpark',
  'uBreath'
]

const lerp = (a, b, t) => a + (b - a) * t
const lerpVec = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

function compileProgram(gl) {
  const make = (type, src) => {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh)
      gl.deleteShader(sh)
      throw new Error(`[ClioOrb] Shader compile failed: ${log}`)
    }
    return sh
  }
  const program = gl.createProgram()
  gl.attachShader(program, make(gl.VERTEX_SHADER, ORB_VERTEX_SHADER))
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, ORB_FRAGMENT_SHADER))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`[ClioOrb] Program link failed: ${gl.getProgramInfoLog(program)}`)
  }
  return program
}

export default function AudioVisualizer({
  stream,
  isActive = false,
  isSpeaking = false,
  isSpeechDetected = false,
  size = 'lg'
}) {
  const dims = defaultSizes[size] || defaultSizes.lg

  const canvasRef = useRef(null)
  const glStateRef = useRef(null) // { gl, program, uniforms }
  const rafRef = useRef(null)
  const [webglFailed, setWebglFailed] = useState(false)

  // Audio analysis
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)

  // Animated values (persist across frames)
  const animRef = useRef({
    time: 0,
    last: 0,
    level: 0,
    pulse: 0,
    highs: 0,
    params: null // lerped copy of STATE_PARAMS[state]
  })

  // Live flags readable from the render loop without re-creating it
  const flagsRef = useRef({ isActive, isSpeaking, isSpeechDetected })
  flagsRef.current = { isActive, isSpeaking, isSpeechDetected }

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // --- Audio analyser lifecycle (same contract as before) -------------------
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

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
    } catch (err) {
      console.error('[AudioVisualizer] Failed to initialize audio:', err)
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream, isActive])

  // --- WebGL lifecycle -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = dims.width * dpr
    canvas.height = dims.height * dpr

    let gl
    try {
      gl =
        canvas.getContext('webgl', {
          alpha: true,
          premultipliedAlpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: 'low-power'
        }) || canvas.getContext('experimental-webgl')
      if (!gl) throw new Error('WebGL unavailable')

      const program = compileProgram(gl)
      gl.useProgram(program)

      // Full-canvas quad
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), // oversized triangle
        gl.STATIC_DRAW
      )
      const aPos = gl.getAttribLocation(program, 'aPos')
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)
      gl.viewport(0, 0, canvas.width, canvas.height)

      const uniforms = {}
      UNIFORM_NAMES.forEach(n => {
        uniforms[n] = gl.getUniformLocation(program, n)
      })

      glStateRef.current = { gl, program, uniforms, renderFrame: null }
      setWebglFailed(false)
    } catch (err) {
      console.error('[AudioVisualizer] WebGL init failed, using fallback:', err)
      setWebglFailed(true)
      return
    }

    const handleLost = e => {
      e.preventDefault()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    const handleRestored = () => setWebglFailed(false) // triggers re-init via key state
    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)

    // --- Frame render --------------------------------------------------------
    const renderFrame = now => {
      const state = glStateRef.current
      if (!state) return
      const { gl: ctx, uniforms } = state
      const anim = animRef.current
      const flags = flagsRef.current

      const dt = anim.last ? Math.min((now - anim.last) / 1000, 0.05) : 0.016
      anim.last = now
      anim.time += dt

      // -- Voice energy --
      let rawLevel = 0
      let rawHighs = 0
      if (analyserRef.current && dataArrayRef.current && flags.isActive && !flags.isSpeaking) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const bins = dataArrayRef.current
        const half = bins.length / 2
        let weightedSum = 0
        let totalWeight = 0
        for (let i = 0; i < half; i++) {
          const weight = 1 - (i / half) * 0.5 // voice lives in the lows
          weightedSum += bins[i] * weight
          totalWeight += weight
        }
        rawLevel = weightedSum / (totalWeight * 255)

        let hi = 0
        for (let i = half; i < bins.length; i++) hi += bins[i]
        rawHighs = hi / (half * 255)
      } else if (flags.isSpeaking) {
        // Organic simulated cadence while Clio talks
        const t = anim.time
        rawLevel =
          0.35 +
          Math.sin(t * 6) * 0.12 +
          Math.sin(t * 9.5) * 0.08 +
          Math.sin(t * 14) * 0.05 +
          Math.random() * 0.03
        rawHighs = 0.2 + Math.sin(t * 11) * 0.1
      }

      // Fast attack, slow release
      const rise = rawLevel > anim.level ? 0.35 : 0.08
      anim.level += (rawLevel - anim.level) * rise
      anim.highs += (rawHighs - anim.highs) * 0.2
      const transient = Math.max(0, rawLevel - anim.level) * 5
      anim.pulse = Math.max(anim.pulse * 0.92, Math.min(transient, 1))

      // -- State params, continuously melted together --
      let target = STATE_PARAMS.idle
      if (flags.isSpeaking) target = STATE_PARAMS.speaking
      else if (flags.isSpeechDetected) target = STATE_PARAMS.detected
      else if (flags.isActive) target = STATE_PARAMS.active

      if (!anim.params) anim.params = JSON.parse(JSON.stringify(target))
      const p = anim.params
      const k = 0.09 // transition speed
      p.colA = lerpVec(p.colA, target.colA, k)
      p.colB = lerpVec(p.colB, target.colB, k)
      p.colC = lerpVec(p.colC, target.colC, k)
      p.rim = lerpVec(p.rim, target.rim, k)
      p.aura = lerpVec(p.aura, target.aura, k)
      p.flow = lerp(p.flow, target.flow, k)
      p.wobble = lerp(p.wobble, target.wobble, k)
      p.lobe = lerp(p.lobe, target.lobe, k)
      p.petal = lerp(p.petal, target.petal, k)
      p.rimAmt = lerp(p.rimAmt, target.rimAmt, k)
      p.auraAmt = lerp(p.auraAmt, target.auraAmt, k)
      p.spark = lerp(p.spark, target.spark, k)
      p.breath = lerp(p.breath, target.breath, k)

      // -- Draw --
      ctx.clear(ctx.COLOR_BUFFER_BIT)
      ctx.uniform2f(uniforms.uRes, canvas.width, canvas.height)
      ctx.uniform1f(uniforms.uTime, anim.time)
      ctx.uniform1f(uniforms.uLevel, anim.level)
      ctx.uniform1f(uniforms.uPulse, anim.pulse)
      ctx.uniform1f(uniforms.uHighs, anim.highs)
      ctx.uniform3fv(uniforms.uColA, p.colA)
      ctx.uniform3fv(uniforms.uColB, p.colB)
      ctx.uniform3fv(uniforms.uColC, p.colC)
      ctx.uniform3fv(uniforms.uRim, p.rim)
      ctx.uniform3fv(uniforms.uAura, p.aura)
      ctx.uniform1f(uniforms.uFlow, p.flow)
      ctx.uniform1f(uniforms.uWobble, p.wobble)
      ctx.uniform1f(uniforms.uLobe, p.lobe)
      ctx.uniform1f(uniforms.uPetal, p.petal)
      ctx.uniform1f(uniforms.uRimAmt, p.rimAmt)
      ctx.uniform1f(uniforms.uAuraAmt, p.auraAmt)
      ctx.uniform1f(uniforms.uSpark, p.spark)
      ctx.uniform1f(uniforms.uBreath, p.breath)
      ctx.drawArrays(ctx.TRIANGLES, 0, 3)
    }

    glStateRef.current.renderFrame = renderFrame

    if (!reducedMotion) {
      const loop = now => {
        renderFrame(now)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
      const state = glStateRef.current
      if (state) {
        const ext = state.gl.getExtension('WEBGL_lose_context')
        ext?.loseContext()
        glStateRef.current = null
      }
    }
    // The live loop reads flags/audio via refs; reduced-motion draws below
  }, [dims.width, dims.height, reducedMotion, webglFailed])

  // Reduced motion: one settled still frame per state change — no motion loop
  useEffect(() => {
    if (!reducedMotion) return
    const state = glStateRef.current
    if (!state?.renderFrame) return

    const anim = animRef.current
    anim.time = 12.4 // a hand-picked moment where the fluid looks good
    let target = STATE_PARAMS.idle
    if (isSpeaking) target = STATE_PARAMS.speaking
    else if (isSpeechDetected) target = STATE_PARAMS.detected
    else if (isActive) target = STATE_PARAMS.active
    anim.params = JSON.parse(JSON.stringify(target))
    anim.level = isActive || isSpeaking ? 0.25 : 0
    state.renderFrame(performance.now())
  }, [reducedMotion, isActive, isSpeaking, isSpeechDetected, webglFailed])

  // --- Fallback: soft CSS orb (no WebGL) -------------------------------------
  if (webglFailed) {
    const scheme = isSpeaking
      ? orbStates.speaking
      : isSpeechDetected
        ? orbStates.detected
        : isActive
          ? orbStates.active
          : orbStates.idle
    return (
      <div
        className="relative inline-flex items-center justify-center rounded-full"
        style={{
          width: dims.width,
          height: dims.height,
          background: `radial-gradient(circle at 34% 30%, ${scheme.colA} 0%, ${scheme.colB} 45%, ${scheme.colC} 100%)`,
          boxShadow: `0 0 ${dims.width / 5}px ${scheme.aura}55`,
          transition: 'background 0.6s ease, box-shadow 0.6s ease'
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="relative inline-flex items-center justify-center" aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{ width: dims.width, height: dims.height, display: 'block' }}
      />
    </div>
  )
}

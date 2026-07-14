// TEMPORARY demo page for the Clio Orb — not linked from the app; remove before deploy.
import { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import AudioVisualizer from './components/AudioVisualizer/AudioVisualizer'

const STATES = [
  { key: 'idle', label: 'Resting', props: {} },
  { key: 'listening', label: 'Listening', props: { isActive: true } },
  {
    key: 'user',
    label: 'You are speaking',
    props: { isActive: true, isSpeechDetected: true }
  },
  { key: 'clio', label: 'Clio is speaking', props: { isSpeaking: true } }
]

function OrbDemo() {
  const [mode, setMode] = useState('tour') // 'tour' | state key | 'mic'
  const [tourIndex, setTourIndex] = useState(0)
  const [stream, setStream] = useState(null)
  const [micLevelHot, setMicLevelHot] = useState(false)
  const vadRef = useRef(null)

  // Auto tour
  useEffect(() => {
    if (mode !== 'tour') return
    const id = setInterval(() => setTourIndex(i => (i + 1) % STATES.length), 4000)
    return () => clearInterval(id)
  }, [mode])

  // Live microphone mode with a tiny demo VAD
  useEffect(() => {
    if (mode !== 'mic') {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
        setStream(null)
      }
      if (vadRef.current) {
        cancelAnimationFrame(vadRef.current.raf)
        vadRef.current.ctx.close().catch(() => {})
        vadRef.current = null
      }
      return
    }

    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(s => {
        if (cancelled) {
          s.getTracks().forEach(t => t.stop())
          return
        }
        setStream(s)
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        ctx.createMediaStreamSource(s).connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length / 2; i++) sum += data[i]
          const level = sum / ((data.length / 2) * 255)
          setMicLevelHot(level > 0.06)
          vadRef.current.raf = requestAnimationFrame(tick)
        }
        vadRef.current = { ctx, raf: requestAnimationFrame(tick) }
      })
      .catch(err => {
        console.error('Mic unavailable:', err)
        setMode('tour')
      })

    return () => {
      cancelled = true
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const current =
    mode === 'tour'
      ? STATES[tourIndex]
      : mode === 'mic'
        ? {
            label: micLevelHot ? 'You are speaking' : 'Listening to your microphone…',
            props: { isActive: true, isSpeechDetected: micLevelHot }
          }
        : STATES.find(s => s.key === mode)

  const btn = (active, onClick, children) => (
    <button
      key={String(children)}
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: 999,
        border: active ? '1px solid #B88336' : '1px solid #E5D8C6',
        background: active ? '#B88336' : '#fff',
        color: active ? '#fff' : '#453E37',
        fontSize: 14,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}
    >
      {children}
    </button>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        fontFamily: 'Georgia, serif',
        color: '#292420'
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>The Clio Orb</h1>

      <AudioVisualizer stream={stream} size="lg" {...current.props} />

      <p style={{ margin: 0, color: '#6B6259', fontSize: 17, height: 24 }}>{current.label}</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {btn(mode === 'tour', () => setMode('tour'), 'Auto tour')}
        {STATES.map(s => btn(mode === s.key, () => setMode(s.key), s.label))}
        {btn(mode === 'mic', () => setMode('mic'), '🎤 Use my microphone')}
      </div>

      <p style={{ color: '#8C8579', fontSize: 13, maxWidth: 420, textAlign: 'center' }}>
        Microphone mode runs entirely in your browser — nothing is recorded or sent anywhere.
      </p>
    </div>
  )
}

createRoot(document.getElementById('orb-root')).render(<OrbDemo />)

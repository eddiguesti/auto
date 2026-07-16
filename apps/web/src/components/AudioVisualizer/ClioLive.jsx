import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { readAiVoiceLevel } from '../../utils/aiVoiceTap'
import ClioMotion from './ClioMotion'

/**
 * ClioLive — the real-time Clio. A rigged GLB rendered with three.js and
 * animated procedurally every frame:
 *
 *  - breathing (spine scale), organic sway (layered sines on the spine)
 *  - true eye contact: her pupils track the user's cursor, with idle saccades
 *  - natural blinking (lid meshes, irregular schedule)
 *  - REAL lip sync: mouth visemes driven by the live voice tap level
 *  - listening lean, voice bounce, brow raises (bone controls)
 *  - Blender-authored gesture clips (wave / nod / tilt) blended via
 *    AnimationMixer with crossfades — she waves hello when she first appears
 *
 * Falls back to ClioMotion (video loops) if WebGL is unavailable.
 * Same public API as every Clio renderer before it.
 */

const SIZES = { sm: 120, md: 160, lg: 200 }
const GLB_URL = '/clio/clio.glb'

const MOUTHS = ['Mouth', 'Mouth_small', 'Mouth_mid', 'Mouth_wide']
const EYE_PARTS = [
  'EyeL_white',
  'EyeL_iris',
  'EyeL_pupil',
  'EyeL_cl',
  'EyeR_white',
  'EyeR_iris',
  'EyeR_pupil',
  'EyeR_cl'
]

// Module-level GLB cache so many instances load once
let gltfPromise = null
function loadGltf() {
  if (!gltfPromise) {
    gltfPromise = new GLTFLoader().loadAsync(GLB_URL)
  }
  return gltfPromise
}

export default function ClioLive(props) {
  const {
    stream,
    isActive = false,
    isSpeaking = false,
    isSpeechDetected = false,
    size = 'lg'
  } = props
  const px = SIZES[size] || SIZES.lg

  const hostRef = useRef(null)
  const [failed, setFailed] = useState(false)

  const flagsRef = useRef({ isActive, isSpeaking, isSpeechDetected })
  flagsRef.current = { isActive, isSpeaking, isSpeechDetected }

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // --- Microphone analyser ----------------------------------------------------
  useEffect(() => {
    if (failed) return
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
      console.error('[ClioLive] Audio init failed:', err)
    }
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [stream, isActive, failed])

  // --- Scene ------------------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host || failed) return
    let disposed = false

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch (err) {
      console.error('[ClioLive] WebGL unavailable:', err)
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(px, px)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(23, 1, 0.1, 50)
    // Blender Z-up exported Y-up: she stands along +Y, faces -Z
    camera.position.set(0.06, 1.6, 8.1)
    camera.lookAt(0, 1.55, 0)

    // Warm golden studio (matches the renders)
    scene.add(new THREE.HemisphereLight(0xfff2dd, 0xcbb391, 1.1))
    const key = new THREE.DirectionalLight(0xffe9c8, 2.4)
    key.position.set(-3, 4.5, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xf2f6ff, 1.4)
    rim.position.set(2.5, 3.5, -3.5)
    scene.add(rim)

    const state = {
      t: 0,
      last: 0,
      level: 0,
      lean: 0,
      bounce: 0,
      browRaise: 0,
      mouth: 'Mouth',
      mouthHeldUntil: 0,
      nextBlink: 2.2,
      blinkAt: -1,
      gazeX: 0,
      gazeY: 0,
      gazeTX: 0,
      gazeTY: 0,
      nextSaccade: 1.5,
      nextGesture: 8,
      waved: false,
      bones: {},
      meshes: {},
      rest: {},
      mixer: null,
      actions: {},
      raf: 0
    }

    loadGltf()
      .then(gltf => {
        if (disposed) return
        const root = gltf.scene
        scene.add(root)

        root.traverse(o => {
          if (o.isBone) state.bones[o.name] = o
          if (o.isMesh || o.isSkinnedMesh) state.meshes[o.name] = o
        })
        // Rest poses for procedural layering
        for (const [name, b] of Object.entries(state.bones)) {
          state.rest[name] = { q: b.quaternion.clone(), p: b.position.clone() }
        }
        // Initial face state
        for (const m of MOUTHS) if (state.meshes[m]) state.meshes[m].visible = m === 'Mouth'
        if (state.meshes.Lid_L) state.meshes.Lid_L.visible = false
        if (state.meshes.Lid_R) state.meshes.Lid_R.visible = false

        state.mixer = new THREE.AnimationMixer(root)
        for (const clip of gltf.animations) {
          const action = state.mixer.clipAction(clip)
          action.setLoop(THREE.LoopOnce)
          action.clampWhenFinished = false
          state.actions[clip.name] = action
        }
        // She waves hello the first time she appears
        if (!reducedMotion && state.actions.wave) {
          setTimeout(() => {
            if (!disposed) playGesture('wave')
          }, 600)
        }
      })
      .catch(err => {
        console.error('[ClioLive] GLB load failed:', err)
        setFailed(true)
      })

    function playGesture(name) {
      const action = state.actions[name]
      if (!action || action.isRunning()) return
      action.reset().fadeIn(0.2).play()
      action.getMixer().addEventListener('finished', function onDone(e) {
        if (e.action === action) {
          action.fadeOut(0.25)
          action.getMixer().removeEventListener('finished', onDone)
        }
      })
    }

    // Eye contact: pupils follow the pointer anywhere on the page
    const onPointer = e => {
      const r = host.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      state.gazeTX = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)))
      state.gazeTY = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)))
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    const gestureRunning = () => Object.values(state.actions).some(a => a.isRunning())

    const setBone = (name, fn) => {
      const b = state.bones[name]
      const rest = state.rest[name]
      if (b && rest) fn(b, rest)
    }

    const frame = now => {
      const flags = flagsRef.current
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0.016
      state.last = now
      state.t += dt
      const t = state.t

      // -- Voice level --
      let raw = 0
      if (analyserRef.current && dataArrayRef.current && flags.isActive && !flags.isSpeaking) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const bins = dataArrayRef.current
        let sum = 0
        for (let i = 0; i < bins.length / 2; i++) sum += bins[i]
        raw = sum / ((bins.length / 2) * 255)
      } else if (flags.isSpeaking) {
        const real = readAiVoiceLevel()
        raw =
          real >= 0
            ? real
            : 0.3 + Math.sin(t * 6) * 0.12 + Math.sin(t * 9.5) * 0.07 + Math.random() * 0.03
      }
      state.level += (raw - state.level) * (raw > state.level ? 0.4 : 0.12)

      // -- Visemes (real lip sync) --
      let mouth = 'Mouth'
      if (flags.isSpeaking) {
        if (state.level < 0.1) mouth = 'Mouth'
        else if (state.level < 0.24) mouth = 'Mouth_small'
        else if (state.level < 0.42) mouth = 'Mouth_mid'
        else mouth = 'Mouth_wide'
        if (now < state.mouthHeldUntil && mouth !== 'Mouth') mouth = state.mouth
        else if (mouth !== state.mouth) state.mouthHeldUntil = now + 70
      }
      if (mouth !== state.mouth) {
        state.mouth = mouth
        for (const m of MOUTHS) if (state.meshes[m]) state.meshes[m].visible = m === mouth
      }

      // -- Blink --
      if (t > state.nextBlink) {
        state.blinkAt = t
        state.nextBlink = t + 2.4 + (Math.sin(t * 7.13) * 0.5 + 0.5) * 2.8
      }
      const blinking = state.blinkAt >= 0 && t - state.blinkAt < 0.13
      for (const n of EYE_PARTS) if (state.meshes[n]) state.meshes[n].visible = !blinking
      if (state.meshes.Lid_L) state.meshes.Lid_L.visible = blinking
      if (state.meshes.Lid_R) state.meshes.Lid_R.visible = blinking

      // -- Gaze: eye contact + idle saccades --
      if (t > state.nextSaccade) {
        state.nextSaccade = t + 1.2 + Math.abs(Math.sin(t * 3.7)) * 2.4
        if (!flags.isActive && !flags.isSpeaking) {
          state.gazeTX = Math.sin(t * 1.7) * 0.5
          state.gazeTY = Math.cos(t * 2.3) * 0.3
        }
      }
      // When engaged she looks straight at the user
      const engaged = flags.isActive || flags.isSpeaking || flags.isSpeechDetected
      const gx = engaged ? state.gazeTX * 0.4 : state.gazeTX
      const gy = engaged ? state.gazeTY * 0.4 : state.gazeTY
      state.gazeX += (gx - state.gazeX) * 0.12
      state.gazeY += (gy - state.gazeY) * 0.12
      for (const side of ['L', 'R']) {
        for (const part of ['iris', 'pupil', 'cl']) {
          const m = state.meshes[`Eye${side}_${part}`]
          if (m && !m.userData.rp) m.userData.rp = m.position.clone()
          if (m) {
            m.position.x = m.userData.rp.x + state.gazeX * 0.045
            m.position.y = m.userData.rp.y - state.gazeY * 0.03
          }
        }
      }

      // -- Posture (skip bones a gesture is animating) --
      const busy = gestureRunning()
      state.lean += ((flags.isActive && !flags.isSpeaking ? 1 : 0) - state.lean) * 0.05
      const targetBounce = flags.isSpeechDetected || flags.isSpeaking ? state.level : 0
      state.bounce += (targetBounce - state.bounce) * 0.3
      state.browRaise +=
        ((flags.isSpeechDetected ? 1 : flags.isActive ? 0.5 : 0) - state.browRaise) * 0.08

      if (!busy) {
        setBone('Spine1', (b, rest) => {
          b.quaternion.copy(rest.q)
          b.rotateZ(Math.sin(t * 0.9) * 0.03 + state.lean * 0.06)
          b.rotateX(Math.sin(t * 1.3 + 1) * 0.012)
          const s = 1 + Math.sin(t * 0.9) * 0.012 + state.bounce * 0.03
          b.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s))
        })
        setBone('Spine2', (b, rest) => {
          b.quaternion.copy(rest.q)
          b.rotateZ(Math.sin(t * 0.9 + 0.5) * 0.025 + state.lean * 0.05)
          b.rotateX(state.lean * 0.04 + Math.sin(t * 1.1) * 0.01)
        })
        setBone('Tip', (b, rest) => {
          b.quaternion.copy(rest.q)
          // The tip lags the sway — soft-body feel
          b.rotateZ(Math.sin(t * 0.9 - 0.7) * 0.05 + state.lean * 0.04)
        })
        setBone('ArmL', (b, rest) => {
          b.quaternion.copy(rest.q)
          b.rotateX(Math.sin(t * 0.9 + 2) * 0.03 + state.bounce * 0.25)
        })
        setBone('ArmR', (b, rest) => {
          b.quaternion.copy(rest.q)
          b.rotateX(Math.sin(t * 0.9 + 2.4) * 0.03 + state.bounce * 0.25)
        })
      }
      setBone('Root', (b, rest) => {
        b.position.copy(rest.p)
        b.position.y = rest.p.y + state.bounce * 0.06
      })
      for (const side of ['L', 'R']) {
        setBone(`BrowBone${side}`, (b, rest) => {
          b.position.copy(rest.p)
          b.position.y = rest.p.y + state.browRaise * 0.045
        })
      }

      // -- Contextual gestures --
      if (t > state.nextGesture && !busy && !reducedMotion) {
        state.nextGesture = t + 7 + Math.abs(Math.sin(t * 5.1)) * 8
        if (flags.isActive && !flags.isSpeaking) playGesture('nod')
        else if (!flags.isActive && !flags.isSpeaking && !flags.isSpeechDetected)
          playGesture('tilt')
      }

      if (state.mixer) state.mixer.update(dt)
      renderer.render(scene, camera)
      state.raf = requestAnimationFrame(frame)
    }

    if (reducedMotion) {
      // A couple of settling frames, then hold still
      let count = 0
      const still = now => {
        frame(now)
        cancelAnimationFrame(state.raf)
        if (++count < 5) state.raf = requestAnimationFrame(still)
      }
      state.raf = requestAnimationFrame(still)
    } else {
      state.raf = requestAnimationFrame(frame)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(state.raf)
      window.removeEventListener('pointermove', onPointer)
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [px, failed, reducedMotion])

  if (failed) return <ClioMotion {...props} />

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <div ref={hostRef} style={{ width: px, height: px }} />
      {/* Soft grounded shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: px * 0.06,
          left: '50%',
          transform: 'translateX(-50%)',
          width: px * 0.52,
          height: px * 0.09,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(60,48,30,0.28) 0%, rgba(60,48,30,0) 70%)'
        }}
      />
    </div>
  )
}

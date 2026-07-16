# Clio — AI Character & Animation Pipeline

_The complete pipeline behind Easy Memoir's animated companion, built entirely
with free/open-source tools, and the map for upgrading her. Everything here is
implemented and committed unless marked **Upgrade path**._

## Architecture (user input → living character)

```
 user voice ──► mic MediaStream ──► WebAudio AnalyserNode ─┐
 Clio's TTS ──► playback tap (aiVoiceTap.js AnalyserNode) ─┤
 app state  ──► isActive / isSpeaking / isSpeechDetected ──┤
                                                           ▼
                              ┌──────────── ClioLive controller (60fps rAF) ───────────┐
                              │ level → visemes (4 mouth meshes, anti-strobe hold)     │
                              │ blink scheduler → lid meshes (irregular 2.4–5.2s)      │
                              │ pointer → gaze (pupil/iris offset, idle saccades)      │
                              │ state → lean / bounce / brow-raise (bone controls)     │
                              │ sines+noise → breathing & sway (spine bones, tip lag)  │
                              │ context triggers → gesture clips (AnimationMixer,      │
                              │   crossfaded: wave / nod / tilt)                       │
                              └────────────────────┬───────────────────────────────────┘
                                                   ▼
                     three.js renderer ← clio.glb (rigged, 1.6MB, 3 baked clips)
                                                   ▼
                          fallback chain: ClioMotion (alpha video) → ClioSprite (webp)
```

## The stack (all free)

| Stage       | Tool                                                               | Notes                                                                                                                                            |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modeling    | **Blender** (scripted, headless)                                   | `build_clio.py` — metaball sculpt → fuse → voxel remesh; 100% reproducible, no GUI                                                               |
| Rig         | **Blender armature via script**                                    | `rig_clio.py` — Root/Spine1/Spine2/Tip + arms + brow bones. (Rigify is the humanoid equivalent; our blob needs 8 bones, not 100)                 |
| Weights     | **Automatic weights** (`ARMATURE_AUTO`)                            | Body skinned; face parts bone-parented (rigid)                                                                                                   |
| Face states | **Mesh visibility variants**                                       | 4 mouths + lids. (Shape keys are the humanoid equivalent; toggling reads identically at this scale and costs nothing)                            |
| Gestures    | **Blender actions → GLB clips**                                    | wave / nod / tilt keyframed in script; export `export_animation_mode='ACTIONS'`                                                                  |
| Format      | **GLB (glTF binary)**                                              | The web/real-time standard. Decimate 0.35 → 1.6MB                                                                                                |
| Engine      | **three.js** in the existing React app                             | No Unity/Godot/Unreal needed for an in-app avatar; three.js is the free, embeddable choice                                                       |
| Lip sync    | **WebAudio analyser** on the actual TTS playback (`aiVoiceTap.js`) | Amplitude → 4 visemes. **Upgrade path:** phoneme-timed visemes from TTS timestamps                                                               |
| TTS         | xAI realtime voice (existing)                                      | **Free upgrade path:** [Kokoro-82M](https://localaimaster.com/blog/best-local-tts-models) (Apache 2.0, faster than realtime) or Chatterbox (MIT) |
| LLM         | Existing app backend (Grok realtime)                               | Any LLM works — the character only consumes audio + state flags                                                                                  |

## Every requirement, mapped

- **Blink naturally** — irregular scheduler (2.4–5.2s), 130ms closes, lid meshes.
- **Breathe while idle** — spine-bone scale sine (volume-preserving), 0.9Hz.
- **Eye contact** — pupils/iris/catchlight track the user's pointer; when
  listening/speaking she centers on the user; idle = wandering saccades.
- **Lip-sync to AI speech** — analyser tap on the real TTS audio → viseme
  thresholds with hold-time (no strobing).
- **Context animations** — state machine: idle / listen (lean + brow raise) /
  excited (bounce follows user's live voice) / talk (visemes + speed-matched
  motion); gesture clips fire contextually (nod while listening, curious tilt
  when idle, wave on first appearance).
- **Smooth transitions** — every posture value is spring-lerped; gesture clips
  crossfade via `AnimationMixer.fadeIn/fadeOut`; procedural writes pause on
  bones a clip is driving.
- **Hand gestures while talking** — arm bones bob with voice; `wave` clip; add
  more clips in `rig_clio.py` (~10 lines each).
- **Alive, not robotic** — layered desynchronized sines (body, tip lag, arms),
  irregular blink/saccade/gesture timing, voice-reactive everything.
- **Real-time performance** — 1.6MB GLB (loads once, module-cached), ~15k tris,
  3 lights, no shadows maps (CSS shadow), DPR-capped; `prefers-reduced-motion`
  renders still frames; fallback chain for weak devices.

## Folder structure

```
tools/clio-character/
  build_clio.py      # the character (sculpt, materials, face, studio) — source of truth
  rig_clio.py        # armature, weights, gesture clips, GLB export
  animate_clio.py    # baked-loop pipeline (video fallback assets)
  PIPELINE.md        # this document
  renders/           # stills + frame sequences (not shipped)
apps/web/public/clio/
  clio.glb           # rigged real-time character
  anim/*.webm        # alpha-video loop fallbacks
  clio_*.webp        # sprite fallbacks
apps/web/src/components/AudioVisualizer/
  ClioLive.jsx       # real-time renderer + procedural controller (default)
  ClioMotion.jsx     # video-loop fallback
  ClioSprite.jsx     # sprite fallback
  index.jsx          # renderer chain, one shared API
```

## Rebuild commands

```bash
# Re-export the rigged character after any build_clio.py change
blender --background --python tools/clio-character/rig_clio.py -- \
  --glb "$(pwd)/apps/web/public/clio/clio.glb"

# Re-bake the video-loop fallbacks
for a in idle listen talk excited; do
  blender --background --python tools/clio-character/animate_clio.py -- \
    --anim $a --outdir "$(pwd)/tools/clio-character/renders/anim" --size 480 --transparent 1
  ffmpeg -y -framerate 30 -i "tools/clio-character/renders/anim/${a}_%04d.png" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 33 -auto-alt-ref 0 \
    "apps/web/public/clio/anim/${a}.webm"
done
```

## Common mistakes we hit (so you don't)

1. **Metaball surfaces render at ~0.57× element radius** — measure real
   geometry (`bound_box`), never trust nominal radii. Ray-cast features onto
   the actual mesh.
2. **Separate meshes = visible seams** — fuse limbs with voxel remesh; only
   deliberately-inserted parts (eyes) stay separate.
3. **`str.replace` patches fail silently** — always `assert old in s` and
   `compile()` before writing generated scripts.
4. **Voxel remesh is render-dense** — decimate (0.35) before rigging for
   real-time export.
5. **Procedural + clip animation fight over bones** — pause procedural writes
   on bones while a gesture clip `isRunning()`.
6. **Baked loops feel dead** — bake ambience at most; anything that should
   _respond_ (lips, gaze, bounce) must be computed per-frame from live signals.

## Upgrade paths

- **Phoneme-accurate lip sync**: pipe TTS phoneme timestamps (Kokoro/Piper
  emit them; Azure/ElevenLabs too) into the viseme switcher instead of
  amplitude thresholds. The mouth-mesh set is already viseme-shaped.
- **Local, free TTS**: [Kokoro-82M](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models)
  (Apache-2.0, ~40–70ms/sentence on GPU) behind the existing voice proxy.
- **Humanoid avatar someday**: the controller (state machine, voice tap,
  blink/gaze/viseme logic) is character-agnostic. Swap the GLB for a
  VRM/ARKit-blendshape humanoid and drive blendshapes instead of mesh
  visibility — or adopt [met4citizen/TalkingHead](https://github.com/met4citizen/TalkingHead)
  (MIT, three.js, does TTS+visemes+gestures for humanoid GLBs; note Ready
  Player Me avatars sunset Jan 2026 — use VRM/Blender-authored bodies).
- **Pro character animation**: commission a Rive rig (2D) or a rigged Blender
  file (3D) — `ClioLive` only needs matching bone/mesh names.
- **Webcam eye contact**: MediaPipe Face landmarker on the user's camera to
  drive gaze instead of the pointer (privacy-sensitive; keep opt-in).

```

```

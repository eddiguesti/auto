// Clio, the ink-drop companion. Renderer chain, best-first:
// ClioLive:   rigged GLB in real-time three.js — breathing, eye contact,
//             blinks, true lip sync, gestures. The default.
// ClioMotion: Blender-animated alpha-video loops — fallback when WebGL fails.
// ClioSprite: 8-frame sprite player — fallback of the fallback.
// ShaderOrb:  the original GPU shader orb, kept for reference.
export { default } from './ClioLive'
export { default as AudioVisualizer } from './ClioLive'
export { default as ClioMotion } from './ClioMotion'
export { default as ClioSprite } from './ClioSprite'
export { default as ShaderOrb } from './AudioVisualizer'
export { orbStates, defaultColorSchemes, defaultSizes } from './config'

/**
 * aiVoiceTap — a shared AnalyserNode on Clio's audio playback path.
 *
 * Playback code routes its BufferSource output through `getAiVoiceTap(ctx)`
 * instead of connecting straight to `ctx.destination`. The Clio Orb polls
 * `readAiVoiceLevel()` every frame to lip-sync the mouth with the real
 * waveform of Clio's voice (amplitude envelope, like cartoon lip flap).
 */

let tap = null // { ctx, analyser, data }

/**
 * Returns an analyser wired to the context's destination. Connect playback
 * sources to this node instead of ctx.destination. One tap per context;
 * a new context replaces the old tap automatically.
 */
export function getAiVoiceTap(ctx) {
  if (!tap || tap.ctx !== ctx || ctx.state === 'closed') {
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.5
    analyser.connect(ctx.destination)
    tap = { ctx, analyser, data: new Uint8Array(analyser.fftSize) }
  }
  return tap.analyser
}

/**
 * Current level of Clio's voice, 0..1 — or -1 when no live tap exists
 * (callers should fall back to simulated cadence).
 */
export function readAiVoiceLevel() {
  if (!tap || tap.ctx.state !== 'running') return -1
  tap.analyser.getByteTimeDomainData(tap.data)
  let sum = 0
  for (let i = 0; i < tap.data.length; i++) {
    const v = (tap.data[i] - 128) / 128
    sum += v * v
  }
  const rms = Math.sqrt(sum / tap.data.length)
  return Math.min(1, rms * 3.2)
}

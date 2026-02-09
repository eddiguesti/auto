/**
 * Audio format conversion for bridging Telnyx ↔ xAI Realtime
 *
 * Telnyx: L16 (signed 16-bit PCM, little-endian) at 16kHz
 * xAI:    PCM16 (signed 16-bit PCM, little-endian) at 24kHz
 *
 * Same encoding, different sample rates. Just need to resample.
 * 24000/16000 = 1.5x ratio — uses linear interpolation.
 */

/**
 * Resample PCM16 from 16kHz (Telnyx) to 24kHz (xAI)
 * @param {Buffer} input - L16 16kHz buffer from Telnyx
 * @returns {Buffer} PCM16 24kHz buffer for xAI
 */
export function resample16kTo24k(input) {
  const inputSamples = new Int16Array(input.buffer, input.byteOffset, input.length / 2)
  const outputLength = Math.floor(inputSamples.length * 1.5)
  const output = new Int16Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    // Map output index back to input position
    const srcPos = i / 1.5
    const srcIndex = Math.floor(srcPos)
    const fraction = srcPos - srcIndex

    if (srcIndex + 1 < inputSamples.length) {
      // Linear interpolation between two samples
      output[i] = Math.round(
        inputSamples[srcIndex] * (1 - fraction) + inputSamples[srcIndex + 1] * fraction
      )
    } else {
      output[i] = inputSamples[Math.min(srcIndex, inputSamples.length - 1)]
    }
  }

  return Buffer.from(output.buffer)
}

/**
 * Resample PCM16 from 24kHz (xAI) to 16kHz (Telnyx)
 * @param {Buffer} input - PCM16 24kHz buffer from xAI
 * @returns {Buffer} L16 16kHz buffer for Telnyx
 */
export function resample24kTo16k(input) {
  const inputSamples = new Int16Array(input.buffer, input.byteOffset, input.length / 2)
  const outputLength = Math.floor(inputSamples.length / 1.5)
  const output = new Int16Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    // Map output index to input position
    const srcPos = i * 1.5
    const srcIndex = Math.floor(srcPos)
    const fraction = srcPos - srcIndex

    if (srcIndex + 1 < inputSamples.length) {
      // Linear interpolation
      output[i] = Math.round(
        inputSamples[srcIndex] * (1 - fraction) + inputSamples[srcIndex + 1] * fraction
      )
    } else {
      output[i] = inputSamples[Math.min(srcIndex, inputSamples.length - 1)]
    }
  }

  return Buffer.from(output.buffer)
}

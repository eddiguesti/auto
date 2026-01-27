// AudioWorklet processor for low-latency microphone capture
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 2048
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const inputChannel = input[0]

    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i]

      if (this.bufferIndex >= this.bufferSize) {
        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(this.bufferSize)
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]))
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        // Send to main thread
        this.port.postMessage({
          type: 'audio',
          audio: pcm16.buffer
        }, [pcm16.buffer])

        this.buffer = new Float32Array(this.bufferSize)
        this.bufferIndex = 0
      }
    }

    return true
  }
}

registerProcessor('audio-processor', AudioProcessor)

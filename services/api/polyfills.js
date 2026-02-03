// Polyfill for File API - needed for epub-gen-memory on Node.js < 20
// This must be imported before any module that uses File

if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(bits, name, options = {}) {
      this.bits = bits
      this.name = name
      this.type = options.type || ''
      this.lastModified = options.lastModified || Date.now()
    }

    get size() {
      return this.bits.reduce((acc, bit) => {
        if (typeof bit === 'string') return acc + bit.length
        if (bit instanceof ArrayBuffer) return acc + bit.byteLength
        if (bit instanceof Uint8Array) return acc + bit.length
        return acc
      }, 0)
    }

    async text() {
      return this.bits.join('')
    }

    async arrayBuffer() {
      const encoder = new TextEncoder()
      return encoder.encode(this.bits.join('')).buffer
    }
  }
}

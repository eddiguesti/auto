// Detect supported media from bytes rather than trusting client filenames or MIME labels.
export function detectAudioType(buffer) {
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return { extension: 'wav', contentType: 'audio/wav' }
  }
  if (
    (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return { extension: 'mp3', contentType: 'audio/mpeg' }
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return { extension: 'ogg', contentType: 'audio/ogg' }
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'fLaC') {
    return { extension: 'flac', contentType: 'audio/flac' }
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12)
    if (['M4A ', 'M4B ', 'isom', 'mp42'].includes(brand))
      return { extension: 'm4a', contentType: 'audio/mp4' }
  }
  return null
}

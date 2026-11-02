export async function watchChapterArtwork(
  authFetch,
  chapterId,
  { signal, onUpdate, delayMs = 2500, maxWaitMs = 20 * 60 * 1000 } = {}
) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const response = await authFetch('/api/chapter-images', { signal })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(
        body.error || 'Could not check your illustration. Please try loading it again.'
      )
    }
    const body = await response.json()
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const artwork = body.images?.[chapterId] || null
    if (artwork && !['pending', 'generating', 'completed', 'failed'].includes(artwork.status))
      throw new Error('Invalid illustration status')
    if (artwork?.status === 'completed' && !artwork.imageUrl)
      throw new Error('The completed illustration has no image.')
    onUpdate?.(artwork)
    if (!artwork || !['pending', 'generating'].includes(artwork.status)) return artwork
    await new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
      const aborted = () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', aborted)
        resolve()
      }, delayMs)
      signal?.addEventListener('abort', aborted, { once: true })
    })
  }
  throw new Error('Your illustration is still processing. Check again later to resume it.')
}

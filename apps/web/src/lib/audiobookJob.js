function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const aborted = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', aborted)
      resolve()
    }, ms)
    signal?.addEventListener('abort', aborted, { once: true })
  })
}

export async function waitForAudiobook(
  authFetch,
  jobId,
  { signal, delayMs = 2000, maxWaitMs = 20 * 60 * 1000 } = {}
) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const response = await authFetch(`/api/audiobook/jobs/${encodeURIComponent(jobId)}`, { signal })
    if (!response.ok)
      throw new Error('Could not check your audiobook. Try again to resume this request.')
    const job = await response.json()
    if (job.status === 'completed') {
      if (typeof job.filename !== 'string' || !job.filename)
        throw new Error('The completed audiobook has no download file.')
      const download = await authFetch(
        `/api/audiobook/download/${encodeURIComponent(job.filename)}`,
        { signal }
      )
      if (!download.ok || !download.headers.get('content-type')?.startsWith('audio/'))
        throw new Error('Could not download the completed audiobook. Try again to resume.')
      return download.blob()
    }
    if (['failed', 'cancelled', 'expired'].includes(job.status)) {
      const error = new Error(job.error || 'Audiobook generation failed. Please try again.')
      error.terminal = true
      throw error
    }
    await pause(delayMs, signal)
  }
  throw new Error('Your audiobook is still processing. Try again later to resume this request.')
}

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

async function waitForJob(
  authFetch,
  kind,
  jobId,
  { signal, delayMs = 2000, maxWaitMs = 20 * 60 * 1000, onProgress } = {}
) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const response = await authFetch(`/api/${kind}/jobs/${encodeURIComponent(jobId)}`, { signal })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const error = new Error(body.error || 'Could not check this request. Try again to resume it.')
      error.terminal = response.status === 404
      throw error
    }
    const job = await response.json()
    onProgress?.(job)
    if (job.status === 'completed') return job
    if (['failed', 'cancelled', 'expired', 'needs_reconciliation'].includes(job.status)) {
      const error = new Error(job.error || 'This request could not be completed.')
      error.terminal = true
      throw error
    }
    if (!['created', 'queued', 'active', 'effect_started'].includes(job.status))
      throw new Error('The server returned an invalid job status.')
    await pause(delayMs, signal)
  }
  throw new Error('This request is still processing. Return later to resume it.')
}

export async function waitForEpub(authFetch, jobId, options = {}) {
  const job = await waitForJob(authFetch, 'export', jobId, options)
  if (typeof job.filename !== 'string' || !job.filename)
    throw new Error('The completed eBook has no download file.')
  const download = await authFetch(`/api/export/download/${encodeURIComponent(job.filename)}`, {
    signal: options.signal
  })
  if (!download.ok || !download.headers.get('content-type')?.startsWith('application/epub+zip'))
    throw new Error('Could not download the completed eBook. Try again to resume it.')
  return download.blob()
}

export function waitForStyle(authFetch, jobId, options) {
  return waitForJob(authFetch, 'style', jobId, options)
}

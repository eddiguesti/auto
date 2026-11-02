import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// A draft stays in this tab until the corresponding server write succeeds.
// Keys include account identity so recovery cannot cross signed-in accounts.
export function readDraft(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

export function useDraftAutosave({ draftKey, save, delay = 1000, onSaved }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(() => Object.keys(readDraft(draftKey)).length > 0)
  const work = useRef(new Map())
  const mounted = useRef(true)
  const saveRef = useRef(save)
  const savedRef = useRef(onSaved)
  saveRef.current = save
  savedRef.current = onSaved

  const persist = useCallback(() => {
    const drafts = Object.fromEntries([...work.current].map(([key, job]) => [key, job.value]))
    try {
      if (Object.keys(drafts).length) sessionStorage.setItem(draftKey, JSON.stringify(drafts))
      else sessionStorage.removeItem(draftKey)
    } catch {
      // Saving to the server must still work when browser storage is full/disabled.
    }
    if (mounted.current) setPending(work.current.size > 0)
  }, [draftKey])

  const run = useCallback(
    async key => {
      const job = work.current.get(key)
      if (!job) return true
      clearTimeout(job.timer)
      if (job.running) {
        const ok = await job.running
        return ok && work.current.has(key) ? run(key) : ok
      }
      const value = job.value
      job.running = (async () => {
        try {
          await job.save(key, value)
          if (mounted.current) savedRef.current?.(key, value)
          // A newer edit made while the request was running must not be discarded.
          if (job.value === value) work.current.delete(key)
          persist()
          if (mounted.current) {
            setStatus(work.current.size ? 'saving' : 'saved')
            setError(null)
          }
          return true
        } catch {
          if (mounted.current) {
            setStatus('error')
            setError(
              'Your changes are kept in this tab. Check your connection and try saving again.'
            )
          }
          return false
        } finally {
          job.running = null
        }
      })()
      const ok = await job.running
      if (ok && work.current.has(key)) return run(key)
      return ok
    },
    [persist]
  )

  const update = useCallback(
    (key, value) => {
      const job = work.current.get(key) || {}
      clearTimeout(job.timer)
      job.value = value
      job.save = saveRef.current
      work.current.set(key, job)
      persist()
      setStatus('saving')
      setError(null)
      job.timer = setTimeout(() => {
        void run(key)
      }, delay)
    },
    [delay, persist, run]
  )

  const flush = useCallback(async () => {
    const results = await Promise.all([...work.current.keys()].map(run))
    return results.every(Boolean)
  }, [run])

  useEffect(() => {
    mounted.current = true
    for (const [key, value] of Object.entries(readDraft(draftKey))) {
      if (!work.current.has(key)) work.current.set(key, { value, save: saveRef.current })
    }
    setPending(work.current.size > 0)
    if (work.current.size) void flush()
    return () => {
      mounted.current = false
      // Keep writes alive across SPA navigation; never abort a user's save on unmount.
      void flush()
    }
  }, [draftKey, flush])

  useEffect(() => {
    const beforeUnload = event => {
      if (work.current.size) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    const beforeLink = event => {
      if (
        !work.current.size ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = event.target.closest?.('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      event.preventDefault()
      event.stopPropagation()
      void flush().then(ok => {
        if (ok && mounted.current)
          navigate(destination.pathname + destination.search + destination.hash)
      })
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeLink, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeLink, true)
    }
  }, [flush, navigate])

  return { update, flush, status, error, pending }
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useVoiceRecording } from './useVoiceRecording'
import { waitForAudiobook } from '../lib/audiobookJob'
import { waitForEpub } from '../lib/writingJobs'

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  a.remove()
}

function readBlobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Core export operations shared between the Export page and the ExportModal.
 *
 * @param {Object} [options]
 * @param {string} [options.userName] - Used for download filenames.
 * @param {string} [options.successPath] - Path for payment success redirect (e.g. '/export').
 */
export function useExport({ userName = 'My', successPath = '/export' } = {}) {
  const { authFetch, user } = useAuth()
  const mountedRef = useRef(true)
  const jobController = useRef(null)
  const epubController = useRef(null)
  const jobKey = `memoir-audiobook-job:${user?.id}`
  const epubJobKey = `memoir-epub-job:${user?.id}`

  const [exportStatus, setExportStatus] = useState(null)
  const [audiobookStatus, setAudiobookStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [generatingAudiobook, setGeneratingAudiobook] = useState(false)
  const [audiobookJobPending, setAudiobookJobPending] = useState(() =>
    Boolean(sessionStorage.getItem(jobKey))
  )
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [error, setError] = useState(null)

  const voice = useVoiceRecording({ maxDuration: 30000 })

  const fetchStatus = useCallback(async () => {
    try {
      const [exportRes, audiobookRes] = await Promise.all([
        authFetch('/api/export/status'),
        authFetch('/api/audiobook/status')
      ])
      if (!mountedRef.current) return
      if (exportRes.ok) setExportStatus(await exportRes.json())
      if (audiobookRes.ok) setAudiobookStatus(await audiobookRes.json())
    } catch (err) {
      if (mountedRef.current) console.error('Status fetch error:', err)
    }
  }, [authFetch])

  useEffect(() => {
    mountedRef.current = true
    fetchStatus()
    return () => {
      mountedRef.current = false
      jobController.current?.abort()
      epubController.current?.abort()
    }
  }, [fetchStatus])

  const handlePayment = useCallback(
    async productId => {
      try {
        const res = await authFetch('/api/payments/create-checkout', {
          method: 'POST',
          body: JSON.stringify({
            productId,
            successUrl: `${window.location.origin}${successPath}?success=true`,
            cancelUrl: `${window.location.origin}${successPath}?cancelled=true`
          })
        })
        if (!res.ok) throw new Error('Payment setup failed')
        const { url } = await res.json()
        window.location.href = url
      } catch {
        if (mountedRef.current) setError('Failed to start payment.')
      }
    },
    [authFetch, successPath]
  )

  const handleDownloadEpub = useCallback(async () => {
    if (downloading) return
    let jobId = sessionStorage.getItem(epubJobKey)
    if (!jobId && !exportStatus?.canExport) {
      handlePayment('export_ebook')
      return
    }
    setDownloading(true)
    setError(null)
    const controller = new AbortController()
    epubController.current?.abort()
    epubController.current = controller
    try {
      let blob
      if (!jobId) {
        const res = await authFetch('/api/export/epub', {
          signal: controller.signal,
          headers: { 'Idempotency-Key': crypto.randomUUID() }
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || body.error || 'Failed to download eBook.')
        }
        if (res.status === 202) {
          const job = await res.json()
          if (typeof job.jobId !== 'string' || !job.jobId)
            throw new Error('Invalid eBook request response.')
          jobId = job.jobId
          sessionStorage.setItem(epubJobKey, jobId)
        } else {
          if (!res.headers.get('content-type')?.startsWith('application/epub+zip'))
            throw new Error('Invalid eBook download response.')
          blob = await res.blob()
        }
      }
      if (jobId) blob = await waitForEpub(authFetch, jobId, { signal: controller.signal })
      if (!mountedRef.current || controller.signal.aborted) return
      triggerDownload(blob, `${userName}_Life_Story.epub`)
      sessionStorage.removeItem(epubJobKey)
    } catch (err) {
      if (err.terminal) sessionStorage.removeItem(epubJobKey)
      if (mountedRef.current && err.name !== 'AbortError') setError(err.message)
    } finally {
      if (mountedRef.current) setDownloading(false)
    }
  }, [exportStatus, authFetch, userName, handlePayment, downloading, epubJobKey])

  const handleGenerateAudiobook = useCallback(
    async (useOwnVoice = false) => {
      if (generatingAudiobook) return
      let jobId = sessionStorage.getItem(jobKey)
      if (!jobId && !audiobookStatus?.canGenerate) {
        handlePayment('export_audiobook')
        return
      }
      setGeneratingAudiobook(true)
      setError(null)
      jobController.current?.abort()
      const controller = new AbortController()
      jobController.current = controller
      try {
        if (!jobId) {
          const res = await authFetch('/api/audiobook/generate', {
            method: 'POST',
            body: JSON.stringify({ useOwnVoice }),
            signal: controller.signal
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || 'Could not start audiobook generation.')
          }
          const job = await res.json()
          if (typeof job.jobId !== 'string' || !job.jobId)
            throw new Error('Invalid audiobook request response.')
          jobId = job.jobId
          sessionStorage.setItem(jobKey, jobId)
          setAudiobookJobPending(true)
        }
        const audio = await waitForAudiobook(authFetch, jobId, { signal: controller.signal })
        if (!mountedRef.current || controller.signal.aborted) return
        triggerDownload(audio, `${userName}_Life_Story_Audiobook.mp3`)
        sessionStorage.removeItem(jobKey)
        setAudiobookJobPending(false)
        await fetchStatus()
      } catch (err) {
        if (err.terminal) {
          sessionStorage.removeItem(jobKey)
          setAudiobookJobPending(false)
        }
        if (mountedRef.current && err.name !== 'AbortError') setError(err.message)
      } finally {
        if (mountedRef.current && !controller.signal.aborted) setGeneratingAudiobook(false)
      }
    },
    [audiobookStatus, authFetch, userName, handlePayment, jobKey, generatingAudiobook, fetchStatus]
  )

  const handleDownloadAudiobook = useCallback(
    async filename => {
      try {
        const res = await authFetch(`/api/audiobook/download/${encodeURIComponent(filename)}`)
        if (!res.ok || !res.headers.get('content-type')?.startsWith('audio/'))
          throw new Error('Could not download this audiobook. Please try again.')
        triggerDownload(await res.blob(), filename)
      } catch (err) {
        if (mountedRef.current) setError(err.message)
      }
    },
    [authFetch]
  )

  /**
   * Uploads the current voice recording. Returns true on success, false on failure.
   * Clears the recording and resets consent on success.
   */
  const uploadVoiceSample = useCallback(async () => {
    if (!voice.recordedAudio || !voiceConsent) return false
    setUploadingVoice(true)
    try {
      const base64 = await readBlobAsDataURL(voice.recordedAudio)
      if (!mountedRef.current) return false
      const res = await authFetch('/api/audiobook/voice-sample', {
        method: 'POST',
        body: JSON.stringify({ audioData: base64, consentGiven: voiceConsent })
      })
      if (!res.ok) throw new Error('Upload failed')
      if (!mountedRef.current) return false
      await fetchStatus()
      voice.clearRecording()
      setVoiceConsent(false)
      return true
    } catch {
      if (mountedRef.current) setError('Failed to upload voice sample.')
      return false
    } finally {
      if (mountedRef.current) setUploadingVoice(false)
    }
  }, [voice, voiceConsent, authFetch, fetchStatus])

  const deleteVoiceModel = useCallback(async () => {
    try {
      const res = await authFetch('/api/audiobook/voice-sample', { method: 'DELETE' })
      if (res.ok) await fetchStatus()
    } catch (err) {
      if (mountedRef.current) console.error('Delete voice error:', err)
    }
  }, [authFetch, fetchStatus])

  return {
    exportStatus,
    audiobookStatus,
    downloading,
    generatingAudiobook,
    audiobookJobPending,
    handleDownloadAudiobook,
    uploadingVoice,
    voiceConsent,
    setVoiceConsent,
    error,
    setError,
    voice,
    fetchStatus,
    handlePayment,
    handleDownloadEpub,
    handleGenerateAudiobook,
    uploadVoiceSample,
    deleteVoiceModel
  }
}

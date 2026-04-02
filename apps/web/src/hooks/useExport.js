import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useVoiceRecording } from './useVoiceRecording'

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
  const { authFetch } = useAuth()
  const mountedRef = useRef(true)

  const [exportStatus, setExportStatus] = useState(null)
  const [audiobookStatus, setAudiobookStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [generatingAudiobook, setGeneratingAudiobook] = useState(false)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [error, setError] = useState(null)

  const voice = useVoiceRecording({ maxDuration: 30000 })

  useEffect(() => {
    fetchStatus()
    return () => {
      mountedRef.current = false
    }
  }, [])

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
      } catch (err) {
        if (mountedRef.current) setError('Failed to start payment.')
      }
    },
    [authFetch, successPath]
  )

  const handleDownloadEpub = useCallback(async () => {
    if (!exportStatus?.canExport) {
      handlePayment('export_ebook')
      return
    }
    setDownloading(true)
    try {
      const res = await authFetch('/api/export/epub')
      if (!res.ok) throw new Error('Download failed')
      triggerDownload(await res.blob(), `${userName}_Life_Story.epub`)
    } catch (err) {
      if (mountedRef.current) setError('Failed to download eBook.')
    } finally {
      if (mountedRef.current) setDownloading(false)
    }
  }, [exportStatus, authFetch, userName, handlePayment])

  const handleGenerateAudiobook = useCallback(
    async (useOwnVoice = false) => {
      if (!audiobookStatus?.canGenerate) {
        handlePayment('export_audiobook')
        return
      }
      setGeneratingAudiobook(true)
      try {
        const res = await authFetch('/api/audiobook/generate', {
          method: 'POST',
          body: JSON.stringify({ useOwnVoice })
        })
        if (!res.ok) throw new Error('Generation failed')
        triggerDownload(await res.blob(), `${userName}_Life_Story_Audiobook.mp3`)
      } catch (err) {
        if (mountedRef.current) setError('Failed to generate audiobook.')
      } finally {
        if (mountedRef.current) setGeneratingAudiobook(false)
      }
    },
    [audiobookStatus, authFetch, userName, handlePayment]
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
    } catch (err) {
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
